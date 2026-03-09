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

import type { WorkspaceId, ProjectKey, ResourceType } from './domain'

// ── Effort Size ────────────────────────────────────────────────
// T-shirt sizing mapped to sprint fractions.
export type EffortSize = 'XS' | 'S' | 'M' | 'L' | 'XL'
export const EFFORT_SIZE_SPRINTS: Record<EffortSize, number> = {
  XS: 0.25,
  S: 0.5,
  M: 1.0,
  L: 2.0,
  XL: 3.0,
}

// ── Skill Level ────────────────────────────────────────────────
// 0 = None, 1 = Awareness, 2 = Working, 3 = Strong, 4 = Expert
export type SkillLevel = 0 | 1 | 2 | 3 | 4
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  0: 'None',
  1: 'Awareness',
  2: 'Working',
  3: 'Strong',
  4: 'Expert',
}

// ── Skill ──────────────────────────────────────────────────────
export interface Skill {
  id: string
  name: string
  category?: string
}

// ── User Skill ─────────────────────────────────────────────────
// A team member's proficiency in a specific skill.
export interface UserSkill {
  skillId: string
  level: SkillLevel
}

// ── Role ───────────────────────────────────────────────────────
export interface Role {
  id: string
  name: string
  description?: string
}

// ── Team Member ────────────────────────────────────────────────
// Replaces the old Resource type for planning purposes.
// sprintCapacity is a fraction of a sprint (1.0 = full, 0.5 = half).
export interface TeamMember {
  id: string
  name: string
  primaryRoleId: string
  userSkills: UserSkill[]
  sprintCapacity: number
  isActive: boolean
  inactiveReason?: string
  inactiveDate?: string
}

// ── Capacity Allocation ────────────────────────────────────────
// Tracks how much of a sprint a team member is allocated.
export interface CapacityAllocation {
  teamMemberId: string
  sprintNumber: number
  allocatedSprints: number
  workItemIds: string[]
}

// ── Assignment Score Breakdown ─────────────────────────────────
// Per-candidate scoring across 7 weighted dimensions (total: 100 pts).
export interface AssignmentScoreBreakdown {
  teamMemberId: string
  totalScore: number         // 0–100
  skillMatch: number         // 0–35
  skillLevelMatch: number    // 0–20
  domainFamiliarity: number  // 0–15
  roleFit: number            // 0–10
  capacityAvailability: number // 0–10
  continuity: number         // 0–5
  priorityUrgencyFit: number // 0–5
  explanation: string
}

// ── Work Item Estimate ─────────────────────────────────────────
// Sprint-level estimate for a work item with candidate assignments.
export interface WorkItemEstimate {
  workItemId: string
  effortSize: EffortSize
  effortInSprints: number
  confidence: 'low' | 'medium' | 'high'
  splitRecommended: boolean
  candidateAssignees: AssignmentScoreBreakdown[]
  suggestedAssigneeId?: string
}

// ── Portfolio ──────────────────────────────────────────────────
// Which portfolio a project/epic belongs to.
// EOL = EOL Tech Team work, ATI = AA/TKO Projects work,
// cross-workspace = spans both workspaces.
export type Portfolio = 'EOL' | 'ATI' | 'cross-workspace'

// ── Sprint ─────────────────────────────────────────────────────
// A 2-week planning sprint with capacity for the full team.
export interface Sprint {
  number: number
  startDate: string // ISO date
  endDate: string // ISO date
  capacityHours: number // total team capacity for this sprint
}

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
  // Phase 1 planning engine fields
  effortHours: number // estimated effort in hours
  confidence: 'low' | 'medium' | 'high' // estimation confidence
  primaryRole: ResourceType // which resource type should do this work
  skillRequired?: string // optional human-readable skill label
  sprintNumber?: number // which sprint this work item is assigned to
  // Phase 1 skill/assignment fields (optional — added progressively)
  description?: string
  primarySkill?: string       // skill id from SKILLS
  secondarySkill?: string     // secondary skill id
  requiredSkillLevel?: SkillLevel
  domainTag?: string          // domain grouping label (e.g. 'litify', 'sales-cloud')
  urgency?: 'critical' | 'high' | 'normal' | 'low'
  effortInSprints?: number    // effort expressed as sprint fractions
  candidateAssigneeIds?: string[]
  dependsOnWorkItemIds?: string[]
  splitRecommended?: boolean
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
  // Phase 1 fields
  portfolio: Portfolio // which portfolio this epic belongs to
  estimatedSprints?: number // how many sprints this epic spans
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
  // Phase 1 fields
  portfolio: Portfolio // derived from source workspaces
}
