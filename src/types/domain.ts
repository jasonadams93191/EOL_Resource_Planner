// ============================================================
// AA / EOL Capacity Planner — Shared Domain Types
//
// This app supports exactly two Jira workspaces:
//   - EOL Tech Team  (project key: EOL,  workspace id: ws-eol)
//   - AA/TKO Projects (project key: ATI, workspace id: ws-ati)
//
// These are fixed — do not generalize to arbitrary workspaces.
// ============================================================

// Fixed workspace and project identifiers — the full set, not open strings.
export type WorkspaceId = 'ws-eol' | 'ws-ati'
export type ProjectKey = 'EOL' | 'ATI'

// Authoritative workspace definitions (not a dynamic list).
export interface WorkspaceDefinition {
  id: WorkspaceId
  name: string
  projectKey: ProjectKey
  // jiraBaseUrl is server-side config only (see src/lib/config.ts)
}

export const WORKSPACES: Record<WorkspaceId, WorkspaceDefinition> = {
  'ws-eol': { id: 'ws-eol', name: 'EOL Tech Team', projectKey: 'EOL' },
  'ws-ati': { id: 'ws-ati', name: 'AA/TKO Projects', projectKey: 'ATI' },
}

export interface Project {
  id: string
  name: string
  key: string
  workspaceId: WorkspaceId
  status: 'active' | 'on-hold' | 'completed' | 'cancelled'
  description?: string
}

export interface Epic {
  id: string
  title: string
  projectId: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  storyPoints?: number
}

// Issue types supported across both projects.
// Note: EOL supports Task/Bug/Story/Epic/Sub-task.
//       ATI additionally supports Request (client intake requests).
// These are controlled values — do not add types without verifying in Jira.
export type IssueType = 'story' | 'bug' | 'task' | 'sub-task' | 'request'
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
export type IssueStatus = 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked'

export interface Issue {
  id: string
  title: string
  epicId?: string
  projectId: string
  workspaceId: WorkspaceId
  status: IssueStatus
  priority: Priority
  issueType: IssueType
  storyPoints?: number
  assigneeId?: string
  labels: string[]
}

// Simple mapping from Jira accountId → internal resource id.
// Maintained as explicit config — not discovered dynamically.
export interface JiraUserMapping {
  jiraAccountId: string
  resourceId: string
  workspaceId: WorkspaceId
}

export enum ResourceType {
  PM_DEV_HYBRID = 'PM_DEV_HYBRID',
  DEVELOPER = 'DEVELOPER',
  ADMIN = 'ADMIN',
}

export interface Resource {
  id: string
  name: string
  resourceType: ResourceType
  weeklyCapacityHours: number
  utilizationRate: number // 0-1
}

export interface CapacityProfile {
  resources: Resource[]
  effectiveDate: string // ISO date
  notes?: string
}

export interface IssueEstimate {
  issueId: string
  estimatedHours: number
  confidence: 'low' | 'medium' | 'high'
  rationale: string
  assumptions: string[]
  resourceType: ResourceType
}

export interface Milestone {
  name: string
  targetDate: string // ISO date
  description?: string
}

export interface ResourceAllocation {
  resourceId: string
  hoursPerWeek: number
  startDate: string
  endDate: string
}

export interface ProjectSchedule {
  projectId: string
  startDate: string // ISO date
  endDate: string // ISO date
  milestones: Milestone[]
  resourceAllocations: ResourceAllocation[]
  totalEstimatedHours: number
}

export interface ScenarioInput {
  name: string
  priorityOverrides?: Record<string, Priority>
  staffingChanges?: Partial<Resource>[]
  capacityMultiplier?: number
  notes?: string
}

export interface ScheduleDelta {
  projectId: string
  baselineEndDate: string
  adjustedEndDate: string
  daysDelta: number
  hoursImpact: number
}

export interface ScenarioResult {
  scenarioInput: ScenarioInput
  baseline: ProjectSchedule[]
  adjusted: ProjectSchedule[]
  delta: ScheduleDelta[]
  recommendations: string[]
}
