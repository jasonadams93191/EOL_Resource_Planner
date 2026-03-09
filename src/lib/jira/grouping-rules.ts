// ============================================================
// Initiative Grouping Rules
//
// Hard-coded rules that map Jira issues (by summary pattern,
// label, or epic key) to known planning initiatives.
//
// Scope: EOL and ATI projects only. READ-ONLY source data.
// ============================================================

import type { Portfolio, PlanningPriority, PlanningType, ProjectStage } from '@/types/planning'

export interface EpicGroupingRule {
  id: string
  title: string
  matchSummaryPatterns?: RegExp[]
  matchLabels?: string[]
}

export interface InitiativeGroupingRule {
  id: string
  name: string
  portfolio: Portfolio
  priority: PlanningPriority
  priorityRank: number
  planningType: PlanningType
  stage: ProjectStage
  // Match criteria — an issue matching ANY of these belongs to this initiative
  matchProjectKeys: Array<'EOL' | 'ATI'>
  matchLabels?: string[]           // issue has ≥1 of these labels
  matchSummaryPatterns?: RegExp[]  // issue summary matches ≥1 of these
  matchEpicKeys?: string[]         // issue's parent key matches ≥1 of these
  epics: EpicGroupingRule[]
}

// ── Rules — ordered by evaluation priority (most specific first) ──

export const INITIATIVE_GROUPING_RULES: InitiativeGroupingRule[] = [
  {
    id: 'pp-call-sofia',
    name: 'Call Sofia',
    portfolio: 'ATI',
    priority: 'high',
    priorityRank: 1,
    planningType: 'phased-program',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/call.?sofia/i, /\bsofia\b/i],
    matchLabels: ['call-sofia', 'callsofia'],
    epics: [
      { id: 'pe-sofia-p1', title: 'Phase 1', matchSummaryPatterns: [/phase.?1/i] },
      { id: 'pe-sofia-p2', title: 'Phase 2', matchSummaryPatterns: [/phase.?2/i] },
      { id: 'pe-sofia-p3', title: 'Phase 3', matchSummaryPatterns: [/phase.?3/i] },
      { id: 'pe-sofia-general', title: 'General / Setup', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-sales-cloud',
    name: 'AA/TKO Sales Cloud Revamp',
    portfolio: 'ATI',
    priority: 'high',
    priorityRank: 2,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/sales.?cloud/i, /next.?step.?note/i, /aa.*sales.*retir/i, /revops/i],
    matchLabels: ['sales-cloud', 'revenue-ops', 'sales_cloud'],
    epics: [
      { id: 'pe-sc-enablement', title: 'Sales Cloud Enablement', matchSummaryPatterns: [/sales.?cloud/i] },
      { id: 'pe-sc-notes', title: 'Next Step Notes', matchSummaryPatterns: [/next.?step/i] },
      { id: 'pe-sc-retirement', title: 'AA Sales Member Retirement', matchSummaryPatterns: [/retir/i] },
      { id: 'pe-sc-docs', title: 'Documentation / Adoption', matchSummaryPatterns: [/doc|adoption/i] },
    ],
  },
  {
    id: 'pp-ringcentral',
    name: 'RingCentral Setup',
    portfolio: 'cross-workspace',
    priority: 'medium',
    priorityRank: 1,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL', 'ATI'],
    matchSummaryPatterns: [/ringcentral/i, /ringsense/i, /\bcti\b/i],
    matchLabels: ['ringcentral', 'telephony', 'cti'],
    epics: [
      { id: 'pe-rc-setup', title: 'RingCentral Setup', matchSummaryPatterns: [/ringcentral.?setup/i] },
      { id: 'pe-rc-ringsense', title: 'RingSense AI', matchSummaryPatterns: [/ringsense/i] },
      { id: 'pe-rc-cti', title: 'EOL CTI Integration', matchSummaryPatterns: [/\bcti\b/i] },
    ],
  },
  {
    id: 'pp-intake360',
    name: 'Intake360 / Intake Automation',
    portfolio: 'ATI',
    priority: 'medium',
    priorityRank: 2,
    planningType: 'delivery-project',
    stage: 'defined',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/intake.?360/i, /intake.?auto/i, /intake.?form/i, /\bintake\b/i],
    matchLabels: ['intake', 'intake360'],
    epics: [
      { id: 'pe-intake-forms', title: 'Intake Forms', matchSummaryPatterns: [/form/i] },
      { id: 'pe-intake-routing', title: 'Routing & Automation', matchSummaryPatterns: [/routing|auto/i] },
      { id: 'pe-intake-reporting', title: 'Reporting', matchSummaryPatterns: [/report/i] },
    ],
  },
  {
    id: 'pp-doc-retrieval',
    name: 'AI Document Retrieval / RAG',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 1,
    planningType: 'evaluation-discovery',
    stage: 'discovery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/document.?retrieval/i, /\brag\b/i, /vector.?search/i, /ai.?doc/i],
    matchLabels: ['rag', 'ai', 'document-retrieval'],
    epics: [
      { id: 'pe-rag-poc', title: 'POC / Evaluation', matchSummaryPatterns: [/poc|eval/i] },
      { id: 'pe-rag-impl', title: 'Implementation', matchSummaryPatterns: [/impl|build/i] },
    ],
  },
  // Catch-all buckets — evaluated last
  {
    id: 'pp-doc-support',
    name: 'Documentation / Support Bucket',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 2,
    planningType: 'documentation-support',
    stage: 'backlog',
    matchProjectKeys: ['EOL', 'ATI'],
    matchLabels: ['documentation', 'support', 'wishlist', 'backlog', 'docs'],
    matchSummaryPatterns: [],
    epics: [
      { id: 'pe-doc-bucket', title: 'Documentation & Support', matchSummaryPatterns: [] },
    ],
  },
]

// ── Matcher function ──────────────────────────────────────────

/**
 * Match a Jira issue to an initiative rule.
 * Returns the first matching rule or null (issue becomes orphan).
 *
 * Matching order (any match wins):
 *   1. Epic key match (most explicit)
 *   2. Summary pattern match
 *   3. Label match
 */
export function matchIssueToInitiative(
  _issueKey: string,
  summary: string,
  labels: string[],
  projectKey: 'EOL' | 'ATI',
  parentKey?: string
): InitiativeGroupingRule | null {
  const lcLabels = labels.map((l) => l.toLowerCase())

  for (const rule of INITIATIVE_GROUPING_RULES) {
    // Must match project scope
    if (!rule.matchProjectKeys.includes(projectKey)) continue

    // 1. Epic key match
    if (parentKey && rule.matchEpicKeys?.some((k) => k === parentKey)) {
      return rule
    }

    // 2. Summary pattern match
    if (rule.matchSummaryPatterns?.some((re) => re.test(summary))) {
      return rule
    }

    // 3. Label match
    if (rule.matchLabels?.some((rl) => lcLabels.includes(rl.toLowerCase()))) {
      return rule
    }
  }

  return null
}

/**
 * Within a matched initiative, find the best-fitting epic for an issue.
 * Returns the epic id or the first epic's id if nothing matches.
 */
export function matchIssueToEpic(
  summary: string,
  labels: string[],
  rule: InitiativeGroupingRule
): string {
  const lcLabels = labels.map((l) => l.toLowerCase())

  for (const epic of rule.epics) {
    if (epic.matchSummaryPatterns?.some((re) => re.test(summary))) return epic.id
    if (epic.matchLabels?.some((el) => lcLabels.includes(el.toLowerCase()))) return epic.id
  }

  // Fallback: last epic (usually a "General" catch-all)
  return rule.epics[rule.epics.length - 1].id
}
