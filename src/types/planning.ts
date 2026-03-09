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

// ── Planning Type ──────────────────────────────────────────────
// Classifies the nature of a planning initiative.
export type PlanningType =
  | 'delivery-project'
  | 'phased-program'
  | 'evaluation-discovery'
  | 'documentation-support'
  | 'maintenance-bugbucket'
  | 'backlog-container'

export const PLANNING_TYPE_LABELS: Record<PlanningType, string> = {
  'delivery-project': 'Delivery Project',
  'phased-program': 'Phased Program',
  'evaluation-discovery': 'Evaluation / Discovery',
  'documentation-support': 'Documentation / Support',
  'maintenance-bugbucket': 'Maintenance / Bug Bucket',
  'backlog-container': 'Backlog Container',
}

export const PLANNING_TYPE_STYLES: Record<PlanningType, string> = {
  'delivery-project': 'bg-indigo-100 text-indigo-700',
  'phased-program': 'bg-blue-100 text-blue-700',
  'evaluation-discovery': 'bg-amber-100 text-amber-700',
  'documentation-support': 'bg-teal-100 text-teal-700',
  'maintenance-bugbucket': 'bg-orange-100 text-orange-700',
  'backlog-container': 'bg-gray-100 text-gray-500',
}

// ── Estimate Readiness ─────────────────────────────────────────
// Signals how ready a work item or epic is for sprint assignment.
export type EstimateReadiness = 'ready' | 'partial' | 'needs-breakdown'

export const ESTIMATE_READINESS_LABELS: Record<EstimateReadiness, string> = {
  'ready': 'Ready',
  'partial': 'Partial',
  'needs-breakdown': 'Needs Breakdown',
}

export const ESTIMATE_READINESS_STYLES: Record<EstimateReadiness, string> = {
  'ready': 'bg-green-100 text-green-700',
  'partial': 'bg-amber-100 text-amber-700',
  'needs-breakdown': 'bg-red-100 text-red-700',
}

// ── Project Stage ──────────────────────────────────────────────
// Lifecycle stage for initiative-level planning.
export type ProjectStage =
  | 'backlog'
  | 'discovery'
  | 'defined'
  | 'ready-for-planning'
  | 'planned'
  | 'in-delivery'
  | 'complete'
  | 'archived'

export const PROJECT_STAGE_LABELS: Record<ProjectStage, string> = {
  'backlog': 'Backlog',
  'discovery': 'Discovery',
  'defined': 'Defined',
  'ready-for-planning': 'Ready for Planning',
  'planned': 'Planned',
  'in-delivery': 'In Delivery',
  'complete': 'Complete',
  'archived': 'Archived',
}

// ── Effort Band ────────────────────────────────────────────────
// Rough initiative-level sizing in sprint terms.
export type EffortBand = 'XS' | 'S' | 'M' | 'L' | 'XL'

export const EFFORT_BAND_LABELS: Record<EffortBand, string> = {
  XS: '< 1 sprint',
  S: '1–2 sprints',
  M: '3–5 sprints',
  L: '6–10 sprints',
  XL: '10+ sprints',
}

// ── Effort Size ────────────────────────────────────────────────
// T-shirt sizing mapped to sprint fractions (kept for legacy display).
export type EffortSize = 'XS' | 'S' | 'M' | 'L' | 'XL'
export const EFFORT_SIZE_SPRINTS: Record<EffortSize, number> = {
  XS: 0.25,
  S: 0.5,
  M: 1.0,
  L: 2.0,
  XL: 3.0,
}

// Hours ranges per T-shirt size. Tasks > SPLIT_THRESHOLD_HOURS should be split.
export const EFFORT_SIZE_HOUR_RANGES: Record<EffortSize, { min: number; max: number }> = {
  XS: { min: 2,  max: 6   },
  S:  { min: 6,  max: 16  },
  M:  { min: 16, max: 32  },
  L:  { min: 32, max: 60  },
  XL: { min: 60, max: 120 },
}
export const SPLIT_THRESHOLD_HOURS = 60

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

// ── Resource Kind ──────────────────────────────────────────────
// Classifies whether a team member is permanent, temporary, or external.
export type ResourceKind = 'core' | 'temp' | 'external'

// ── Team Member ────────────────────────────────────────────────
// Replaces the old Resource type for planning purposes.
// availableHoursPerSprint = gross capacity (hard ceiling, default 40h).
// utilizationTargetPercent = soft utilization ceiling (0–100).
// targetPlannedHours (derived helper) = availableHoursPerSprint × utilizationTargetPercent / 100.
export interface TeamMember {
  id: string
  name: string
  primaryRoleId: string
  userSkills: UserSkill[]
  availableHoursPerSprint: number    // gross capacity per 2-week sprint (default 40)
  utilizationTargetPercent: number   // soft utilization ceiling 0–100
  isActive: boolean
  resourceKind?: ResourceKind        // 'core' = permanent (default), 'temp', 'external'
  startSprintId?: number             // first sprint available (temp/external only)
  endSprintId?: number               // last sprint available (temp/external only)
  inactiveReason?: string
  inactiveDate?: string
}

// ── Temp Resource Template ─────────────────────────────────────
// Defines a candidate profile for adding a temporary or external resource.
export interface TempResourceTemplate {
  id: string
  label: string
  primaryRoleId: string
  skills: UserSkill[]
  availableHoursPerSprint: number
  utilizationTargetPercent: number
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

// ── Jira Issue Data Envelope ───────────────────────────────────
// Full Jira-native metadata for items that originated in Jira.
// For manual (non-Jira) items these fields act as editable placeholders.
// Scope: EOL and ATI projects only. READ-ONLY — no Jira writes permitted.
export interface JiraIssueData {
  projectKey?: 'EOL' | 'ATI'
  issueKey?: string         // e.g. "ATI-142"
  issueId?: string
  issueType?: string        // "Epic", "Story", "Task", "Request" (ATI only)
  status?: string
  statusCategory?: string   // "To Do", "In Progress", "Done"
  priority?: string
  summary?: string
  description?: string
  assignee?: { accountId?: string; displayName?: string }
  reporter?: { accountId?: string; displayName?: string }
  labels?: string[]
  components?: string[]
  parentKey?: string        // parent epic key or parent issue key
  createdAt?: string
  updatedAt?: string
  url?: string
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

// ── Manual Override ────────────────────────────────────────────
// Tracks when a field has been manually overridden from its engine-computed value.
export interface ManualOverride {
  field: 'estimatedHours' | 'assigneeId' | 'primarySkill' | 'requiredSkillLevel' | 'sprintNumber'
  originalValue: string | number
  overriddenValue: string | number
  note?: string
}

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
  priority?: PlanningPriority         // optional — inherits from project if absent
  assigneeId?: string
  // All Jira issues (or manual entries) that this item is derived from
  sourceRefs: PlanningSourceRef[]
  notes?: string
  // Phase 1 planning engine fields
  estimatedHours: number              // primary effort field (hours)
  minEstimatedHours?: number          // optional lower bound for estimate range
  maxEstimatedHours?: number          // optional upper bound for estimate range
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
  candidateAssigneeIds?: string[]
  dependsOnWorkItemIds?: string[]
  splitRecommended?: boolean
  manualOverrides?: ManualOverride[]
  jira?: JiraIssueData
  // Enhancement layer flags — set when values were assumed/generated rather than provided.
  // A flag value of `false` means the user has overridden the field and the enhancement
  // layer must NOT overwrite it. `true` (or absent) means the field may be updated.
  assumedEstimatedHours?: boolean
  assumedSkill?: boolean
  assumedRequiredSkillLevel?: boolean
  assumedAssignee?: boolean
  assumedDescription?: boolean
  assumedPriority?: boolean
  // AI enrichment flag — true when this work item was suggested by the LLM
  aiSuggested?: boolean
  // Enhancement provenance
  lastEnhancedAt?: string            // ISO timestamp of last enhancement pass
  enhancedBy?: 'rules' | 'anthropic' // which engine last touched this item
  enhancementVersion?: number        // increments on each pass (for cache-busting)
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
  priority?: PlanningPriority         // optional — inherits from project if absent
  workItems: PlanningWorkItem[]
  // Source refs at the epic level (the Jira epics or issues this aggregates)
  sourceRefs: PlanningSourceRef[]
  notes?: string
  // Phase 1 fields
  portfolio: Portfolio // which portfolio this epic belongs to
  estimatedSprints?: number // how many sprints this epic spans
  sequenceOrder?: number              // suggested order within project
  jira?: JiraIssueData
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
  // Initiative-level fields
  priority: PlanningPriority          // required — lives HERE only
  priorityRank?: number               // unique rank within priority band (1 = highest)
  stage: ProjectStage                 // lifecycle stage
  confidence?: 'low' | 'medium' | 'high'  // estimation confidence at project level
  effortBand?: EffortBand             // rough size of the whole initiative
  owner?: string                      // team member id
  planningType?: PlanningType         // initiative classification
  jira?: JiraIssueData
}

// ── Effective Priority Helper ──────────────────────────────────
// Derives effective priority by walking up to project level.
// Used by engines that need a concrete priority value.
export function getEffectivePriority(
  item: { priority?: PlanningPriority },
  project: { priority: PlanningPriority }
): PlanningPriority {
  return item.priority ?? project.priority
}

// ── Target Planned Hours Helper ────────────────────────────────
// Derived soft capacity ceiling: availableHoursPerSprint × utilizationTargetPercent / 100.
// The roadmap engine prefers staying under this value; exceeding availableHoursPerSprint = overload.
export function targetPlannedHours(member: TeamMember): number {
  return Math.round(member.availableHoursPerSprint * member.utilizationTargetPercent / 100)
}
