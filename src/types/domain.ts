// ============================================================
// AA / EOL Capacity Planner — Shared Domain Types
// ============================================================

export interface Workspace {
  id: string
  name: string
  jiraBaseUrl: string
  projectKey: string
}

export interface Project {
  id: string
  name: string
  key: string
  workspaceId: string
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

export type IssueType = 'story' | 'bug' | 'task' | 'sub-task'
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
export type IssueStatus = 'todo' | 'in-progress' | 'in-review' | 'done' | 'blocked'

export interface Issue {
  id: string
  title: string
  epicId?: string
  projectId: string
  workspaceId: string
  status: IssueStatus
  priority: Priority
  issueType: IssueType
  storyPoints?: number
  assigneeId?: string
  labels: string[]
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
