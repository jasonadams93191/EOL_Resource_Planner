// ============================================================
// Planning Layer Normalizer
//
// Converts raw Jira domain types (Issue, Epic, Project) into
// the planning-domain types (PlanningWorkItem, PlanningEpic,
// PlanningProject) that the app uses for supervision and scheduling.
//
// The mapping is explicit and manually curated — it is NOT
// a mechanical 1:1 reflection of Jira structure.
//
// Key rules:
//   - One PlanningProject can span issues from both workspaces
//   - One PlanningEpic may map to 1 Jira epic OR to several
//     Jira tasks/issues that represent epic-level work in planning terms
//     TODO: review Jira tasks/subtasks that should be promoted to PlanningEpic
//   - Jira status/priority are remapped to planning-layer values
//   - Manual work items (no Jira backing) pass through as-is
//   - We never write back to Jira
//
// TODO Wave 2: replace stub implementations with live Jira data lookups
// ============================================================

import type { Issue, Epic } from '@/types/domain'
import { ResourceType } from '@/types/domain'
import type {
  PlanningProject,
  PlanningEpic,
  PlanningWorkItem,
  PlanningSourceRef,
  PlanningStatus,
  PlanningPriority,
  Portfolio,
} from '@/types/planning'

// ── Status / Priority Maps ────────────────────────────────────

const ISSUE_STATUS_MAP: Record<string, PlanningStatus> = {
  todo: 'not-started',
  'in-progress': 'in-progress',
  'in-review': 'in-progress', // still active in planning terms
  done: 'done',
  blocked: 'blocked',
  'on-hold': 'on-hold',
}

const PRIORITY_MAP: Record<string, PlanningPriority> = {
  highest: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
  lowest: 'low',
}

export function toPlanningStatus(jiraStatus: string): PlanningStatus {
  return ISSUE_STATUS_MAP[jiraStatus] ?? 'not-started'
}

export function toPlanningPriority(jiraPriority: string): PlanningPriority {
  return PRIORITY_MAP[jiraPriority] ?? 'medium'
}

// ── Source Ref Builders ───────────────────────────────────────

export function jiraIssueRef(issue: Issue): PlanningSourceRef {
  return {
    sourceType: 'jira',
    workspaceId: issue.workspaceId,
    projectKey: issue.workspaceId === 'ws-eol' ? 'EOL' : 'ATI',
    jiraIssueId: issue.id,
    jiraEpicId: issue.epicId,
    label: `${issue.id}: ${issue.title}`,
  }
}

export function jiraEpicRef(epic: Epic): PlanningSourceRef {
  return {
    sourceType: 'jira',
    jiraEpicId: epic.id,
    label: `Epic: ${epic.title}`,
  }
}

export function manualRef(label: string): PlanningSourceRef {
  return { sourceType: 'manual', label }
}

// ── Work Item Normalizer ──────────────────────────────────────
// Converts a single Jira Issue → PlanningWorkItem.
// TODO Wave 2: populate estimatedHours from estimation engine
// TODO: if a Jira Task or Sub-task represents epic-level planning work,
//       create a PlanningEpic instead and reference this issue as a sourceRef

export function normalizePlanningWorkItem(
  issue: Issue,
  planningEpicId: string,
  overrides?: Partial<PlanningWorkItem>
): PlanningWorkItem {
  return {
    id: `pwi-${issue.id}`,
    title: issue.title,
    planningEpicId,
    status: toPlanningStatus(issue.status),
    priority: toPlanningPriority(issue.priority),
    assigneeId: issue.assigneeId,
    sourceRefs: [jiraIssueRef(issue)],
    notes: undefined,
    // Required Phase 1 fields — defaults that callers can override
    estimatedHours: issue.storyPoints ? issue.storyPoints * 4 : 8,
    confidence: 'low',
    primaryRole: ResourceType.DEVELOPER,
    ...overrides,
  }
}

// ── Epic Normalizer ───────────────────────────────────────────
// Builds a PlanningEpic from a Jira Epic + its child issues.
// TODO Wave 2: compute status from child work item roll-up
// TODO: some Jira tasks/subtasks may need to be promoted to PlanningEpic —
//       review parent/child relationships when integrating live Jira data

export function normalizePlanningEpic(
  epic: Epic,
  issues: Issue[],
  planningProjectId: string,
  portfolio: Portfolio,
  overrides?: Partial<Omit<PlanningEpic, 'workItems'>>
): PlanningEpic {
  const epicId = `pe-${epic.id}`
  const workItems = issues.map((i) => normalizePlanningWorkItem(i, epicId))

  // Derive status from children: if any blocked → blocked, any in-progress → in-progress, etc.
  const statuses = workItems.map((wi) => wi.status)
  const derivedStatus: PlanningStatus = statuses.includes('blocked')
    ? 'blocked'
    : statuses.includes('in-progress')
      ? 'in-progress'
      : statuses.every((s) => s === 'done')
        ? 'done'
        : 'not-started'

  return {
    id: epicId,
    title: epic.title,
    planningProjectId,
    status: derivedStatus,
    priority: toPlanningPriority(epic.priority),
    portfolio,
    workItems,
    sourceRefs: [jiraEpicRef(epic)],
    notes: undefined,
    ...overrides,
  }
}

// ── Project Normalizer ────────────────────────────────────────
// Assembles a PlanningProject from its epics.
// A PlanningProject may aggregate epics from different Jira workspaces.
// TODO Wave 2: compute status from epic roll-up

export function normalizePlanningProject(
  id: string,
  name: string,
  epics: PlanningEpic[],
  sourceRefs: PlanningSourceRef[],
  portfolio: Portfolio,
  priority: PlanningPriority,
  overrides?: Partial<Omit<PlanningProject, 'epics' | 'sourceRefs' | 'portfolio' | 'priority' | 'stage'>>
): PlanningProject {
  const statuses = epics.map((e) => e.status)
  const derivedStatus: PlanningStatus = statuses.includes('blocked')
    ? 'blocked'
    : statuses.includes('in-progress')
      ? 'in-progress'
      : statuses.every((s) => s === 'done')
        ? 'done'
        : 'not-started'

  return {
    id,
    name,
    status: derivedStatus,
    portfolio,
    priority,
    stage: 'backlog',  // default stage; callers override via overrides
    epics,
    sourceRefs,
    ...overrides,
  }
}
