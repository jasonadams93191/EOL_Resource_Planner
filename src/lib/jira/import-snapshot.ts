// ============================================================
// Jira Snapshot → Planning Model Import Pipeline
//
// Converts raw Jira snapshots (EOL + ATI) into PlanningProject[]
// using hard-coded initiative grouping rules.
//
// Algorithm:
//   1. Merge all raw issues from both snapshots
//   2. Match each issue to an initiative via grouping rules
//   3. Group matched issues into planning epics
//   4. Build PlanningProject per initiative rule
//   5. Collect unmatched issues as orphan epics
//   6. Promote orphan epics via promoteOrphanEpics()
//
// READ-ONLY — no Jira writes. Scope locked to EOL + ATI.
// ============================================================

import type { RawJiraIssue } from './client'
import type { JiraSnapshot } from './snapshot-store'
import {
  INITIATIVE_GROUPING_RULES,
  matchIssueToInitiative,
  matchIssueToEpic,
  type InitiativeGroupingRule,
} from './grouping-rules'
import { promoteOrphanEpics } from '@/lib/planning/promote-epics'
import { toPlanningStatus, toPlanningPriority } from '@/lib/planning/normalize-planning'
import type {
  PlanningProject,
  PlanningEpic,
  PlanningWorkItem,
  PlanningSourceRef,
  PlanningStatus,
  JiraIssueData,
} from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Raw issue → JiraIssueData ─────────────────────────────────

function rawToJiraIssueData(issue: RawJiraIssue, projectKey: 'EOL' | 'ATI'): JiraIssueData {
  const f = issue.fields
  const description =
    typeof f.description === 'string'
      ? f.description
      : typeof f.description === 'object' && f.description !== null
        ? '[structured content]'
        : undefined

  return {
    projectKey,
    issueKey: issue.key,
    issueId: issue.id,
    issueType: f.issuetype?.name,
    status: f.status?.name,
    statusCategory: f.status?.statusCategory?.name,
    priority: f.priority?.name,
    summary: f.summary,
    description,
    assignee: f.assignee
      ? { accountId: f.assignee.accountId, displayName: f.assignee.displayName }
      : undefined,
    reporter: f.reporter
      ? { accountId: f.reporter.accountId, displayName: f.reporter.displayName }
      : undefined,
    labels: f.labels ?? [],
    components: f.components?.map((c) => c.name) ?? [],
    parentKey: f.parent?.key ?? f.customfield_10014 ?? undefined,
    createdAt: f.created,
    updatedAt: f.updated,
    url: issue.self.replace(/\/rest\/api\/3\/issue\/\d+$/, '') + '/browse/' + issue.key,
  }
}

// ── Raw issue → PlanningWorkItem ──────────────────────────────

function rawToWorkItem(
  issue: RawJiraIssue,
  planningEpicId: string,
  projectKey: 'EOL' | 'ATI'
): PlanningWorkItem {
  const f = issue.fields
  const jiraData = rawToJiraIssueData(issue, projectKey)

  const sourceRef: PlanningSourceRef = {
    sourceType: 'jira',
    workspaceId: projectKey === 'EOL' ? 'ws-eol' : 'ws-ati',
    projectKey,
    jiraIssueId: issue.id,
    label: `${issue.key}: ${f.summary}`,
  }

  // Infer skill from Jira issue type so sprint engine can route to appropriate members
  const issueType = f.issuetype?.name?.toLowerCase() ?? ''
  let inferredSkill: string | undefined
  if (issueType.includes('bug') || issueType.includes('sub-task') || issueType.includes('technical')) {
    inferredSkill = 'salesforce-dev'
  } else if (issueType.includes('story') || issueType.includes('task') || issueType.includes('epic') || issueType.includes('improvement')) {
    inferredSkill = 'salesforce-admin'
  }

  return {
    id: `pwi-${issue.key.toLowerCase()}`,
    title: f.summary,
    planningEpicId,
    status: toPlanningStatus(f.status?.name?.toLowerCase().replace(/\s+/g, '-') ?? ''),
    priority: toPlanningPriority(f.priority?.name?.toLowerCase() ?? ''),
    assigneeId: f.assignee?.accountId,
    sourceRefs: [sourceRef],
    estimatedHours: 8,       // default; analysis engine may refine
    confidence: 'low',
    primaryRole: ResourceType.DEVELOPER,
    primarySkill: inferredSkill,
    requiredSkillLevel: inferredSkill ? 1 : undefined,  // level 1 = any qualified member
    jira: jiraData,
  }
}

// ── Build PlanningEpic shell for a grouping rule epic ─────────

function buildEpicShell(
  epicId: string,
  epicTitle: string,
  projectId: string,
  portfolio: InitiativeGroupingRule['portfolio']
): PlanningEpic {
  return {
    id: epicId,
    title: epicTitle,
    planningProjectId: projectId,
    status: 'not-started',
    portfolio,
    workItems: [],
    sourceRefs: [],
  }
}

// ── Derive project-level status from epics ────────────────────

function deriveStatus(statuses: PlanningStatus[]): PlanningStatus {
  if (statuses.length === 0) return 'not-started'
  if (statuses.includes('blocked')) return 'blocked'
  if (statuses.includes('in-progress')) return 'in-progress'
  if (statuses.every((s) => s === 'done')) return 'done'
  return 'not-started'
}

// ── Main import function ──────────────────────────────────────

export interface ImportResult {
  projects: PlanningProject[]
  orphanCount: number
  promotedCount: number
  totalIssues: number
}

export function importPlanningFromJiraSnapshot(
  eolSnapshot: JiraSnapshot | null,
  atiSnapshot: JiraSnapshot | null
): ImportResult {
  // Merge all issues with their project key
  const allIssues: Array<{ issue: RawJiraIssue; projectKey: 'EOL' | 'ATI' }> = []

  if (eolSnapshot) {
    for (const issue of eolSnapshot.issues) {
      allIssues.push({ issue, projectKey: 'EOL' })
    }
  }
  if (atiSnapshot) {
    for (const issue of atiSnapshot.issues) {
      allIssues.push({ issue, projectKey: 'ATI' })
    }
  }

  if (allIssues.length === 0) {
    return { projects: [], orphanCount: 0, promotedCount: 0, totalIssues: 0 }
  }

  // Build initiative → epicId → workItems map
  type InitiativeId = string
  type EpicId = string
  const matched = new Map<InitiativeId, Map<EpicId, PlanningWorkItem[]>>()

  // Initialize all epic buckets for every rule upfront
  for (const rule of INITIATIVE_GROUPING_RULES) {
    const epicMap = new Map<EpicId, PlanningWorkItem[]>()
    for (const epic of rule.epics) {
      epicMap.set(epic.id, [])
    }
    matched.set(rule.id, epicMap)
  }

  const orphanItems: PlanningWorkItem[] = []

  for (const { issue, projectKey } of allIssues) {
    const f = issue.fields
    const summary = f.summary ?? ''
    const labels = f.labels ?? []
    const parentKey = f.parent?.key ?? f.customfield_10014 ?? undefined

    const rule = matchIssueToInitiative(issue.key, summary, labels, projectKey, parentKey)

    if (!rule) {
      // Orphan — place into a synthetic epic
      const orphanEpicId = `pe-orphan-${projectKey.toLowerCase()}`
      orphanItems.push(rawToWorkItem(issue, orphanEpicId, projectKey))
      continue
    }

    const epicId = matchIssueToEpic(summary, labels, rule)
    const epicMap = matched.get(rule.id)!
    const items = epicMap.get(epicId) ?? []
    items.push(rawToWorkItem(issue, epicId, projectKey))
    epicMap.set(epicId, items)
  }

  // Build PlanningProject for each rule that has at least 1 work item
  const projects: PlanningProject[] = []

  for (const rule of INITIATIVE_GROUPING_RULES) {
    const epicMap = matched.get(rule.id)!
    const totalItems = Array.from(epicMap.values()).reduce((s, arr) => s + arr.length, 0)
    if (totalItems === 0) continue

    const epics: PlanningEpic[] = []

    for (const epicRule of rule.epics) {
      const items = epicMap.get(epicRule.id) ?? []
      if (items.length === 0) continue
      const epicShell = buildEpicShell(epicRule.id, epicRule.title, rule.id, rule.portfolio)
      const epicStatus = deriveStatus(items.map((wi) => wi.status))
      epics.push({
        ...epicShell,
        status: epicStatus,
        workItems: items,
        sourceRefs: items.flatMap((wi) => wi.sourceRefs),
      })
    }

    if (epics.length === 0) continue

    const projectStatus = deriveStatus(epics.map((e) => e.status))
    const sourceRefs: PlanningSourceRef[] = epics.flatMap((e) => e.sourceRefs)

    projects.push({
      id: rule.id,
      name: rule.name,
      status: projectStatus,
      portfolio: rule.portfolio,
      priority: rule.priority,
      priorityRank: rule.priorityRank,
      stage: rule.stage,
      planningType: rule.planningType,
      epics,
      sourceRefs,
    })
  }

  // Handle orphan work items — group by project key into orphan epics
  const orphanEpics: PlanningEpic[] = []

  if (orphanItems.length > 0) {
    const byProjectKey = new Map<string, PlanningWorkItem[]>()
    for (const wi of orphanItems) {
      const pk = wi.jira?.projectKey ?? 'UNKNOWN'
      const arr = byProjectKey.get(pk) ?? []
      arr.push(wi)
      byProjectKey.set(pk, arr)
    }

    byProjectKey.forEach((items: PlanningWorkItem[], pk: string) => {
      const epicId = `pe-orphan-${pk.toLowerCase()}`
      orphanEpics.push({
        id: epicId,
        title: `${pk} — Unclassified`,
        planningProjectId: `auto-${epicId}`,
        status: deriveStatus(items.map((wi) => wi.status)),
        portfolio: pk === 'EOL' ? 'EOL' : 'ATI',
        workItems: items,
        sourceRefs: items.flatMap((wi) => wi.sourceRefs),
      })
    })
  }

  const { projects: merged, promoted } = promoteOrphanEpics(projects, orphanEpics)

  return {
    projects: merged,
    orphanCount: orphanItems.length,
    promotedCount: promoted.length,
    totalIssues: allIssues.length,
  }
}
