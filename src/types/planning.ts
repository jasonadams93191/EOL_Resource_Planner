// ============================================================
// Planning Domain Types
//
// The planning layer is SEPARATE from the raw Jira/domain input types.
//
// Raw Jira structure  → input  (src/types/domain.ts, src/lib/jira/)
// Planning structure  → output (this file, src/lib/planning/)
//
// Jira models work the way Jira stores it.
// This layer models work the way we want to supervise it.
//
// Key differences:
//   - A PlanningProject may aggregate issues from multiple Jira workspaces
//   - A PlanningEpic may map to a Jira epic, or to several Jira tasks/issues
//     that represent epic-level work in planning terms even if Jira labels
//     them as Tasks or Sub-tasks
//   - Manual work items (non-Jira) are first-class here via sourceType:'manual'
//   - We never write back to Jira — this is a read/plan layer only
// ============================================================

import type { WorkspaceId, ProjectKey } from './domain'

// ── Source Reference ─────────────────────────────────────────
// Traces a planning item back to its Jira origin, or marks it as manual.
// Use sourceType:'manual' for work that has no Jira backing.
// A single planning item may have multiple sourceRefs if it aggregates
// several Jira issues.
export interface PlanningSourceRef {
  sourceType: 'jira' | 'manual'
  // Jira-backed refs (undefined when sourceType === 'manual')
  workspaceId?: WorkspaceId
  projectKey?: ProjectKey
  jiraIssueId?: string
  jiraEpicId?: string
  // Human-readable label for the source (e.g. "ATI-142: Intake form builder")
  label?: string
}

// ── Status / Priority ─────────────────────────────────────────
// Controlled values independent of Jira's own status/priority names.
// Maps are maintained in normalize-planning.ts.
export type PlanningStatus = 'not-started' | 'in-progress' | 'done' | 'blocked' | 'on-hold'
export type PlanningPriority = 'high' | 'medium' | 'low'

// ── Planning Work Item ────────────────────────────────────────
// The smallest unit of trackable work in the planning layer.
// Typically corresponds to a Jira issue, but may also be:
//   - A Jira Task or Sub-task promoted to visible planning work
//     (TODO: some Jira tasks represent epic-level work; review and reclassify as needed)
//   - A manual entry with no Jira backing
export interface PlanningWorkItem {
  id: string
  title: string
  planningEpicId: string
  status: PlanningStatus
  priority: PlanningPriority
  estimatedHours?: number
  assigneeId?: string
  // All Jira issues (or manual entries) that this item is derived from
  sourceRefs: PlanningSourceRef[]
  notes?: string
}

// ── Planning Epic ─────────────────────────────────────────────
// A named phase, theme, or track of work within a PlanningProject.
// May map 1:1 to a Jira epic, or may aggregate multiple Jira epics/tasks
// that belong together in planning terms.
// TODO: Some Jira tasks/subtasks may represent epic-level planning work —
//       review source issues when populating and promote them here as needed.
export interface PlanningEpic {
  id: string
  title: string
  planningProjectId: string
  status: PlanningStatus
  priority: PlanningPriority
  workItems: PlanningWorkItem[]
  // Source refs at the epic level (the Jira epics or issues this aggregates)
  sourceRefs: PlanningSourceRef[]
  notes?: string
}

// ── Planning Project ──────────────────────────────────────────
// Top-level planning unit. May span one or both Jira workspaces.
// A single PlanningProject can pull work from EOL (ws-eol) and/or
// ATI (ws-ati) depending on where the Jira issues live.
export interface PlanningProject {
  id: string
  name: string
  description?: string
  status: PlanningStatus
  epics: PlanningEpic[]
  // Source refs at the project level (the Jira projects this aggregates)
  sourceRefs: PlanningSourceRef[]
  notes?: string
}
