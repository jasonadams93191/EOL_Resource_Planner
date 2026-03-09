// ============================================================
// Mock Data — Wave 1 placeholder for both Jira workspaces
// TODO Wave 2: replace with live Jira API data via normalized client
// ============================================================
import type {
  Workspace,
  Project,
  Epic,
  Issue,
  Resource,
  CapacityProfile,
  IssueEstimate,
  ProjectSchedule,
  ScenarioResult,
} from '@/types/domain'
import { ResourceType } from '@/types/domain'

// ── Workspaces ──────────────────────────────────────────────
export const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-eol',
    name: 'EOL Tech Team',
    jiraBaseUrl: 'https://placeholder-eol.atlassian.net',
    projectKey: 'EOL',
  },
  {
    id: 'ws-aa',
    name: 'AA/TKO Projects',
    jiraBaseUrl: 'https://placeholder-aa.atlassian.net',
    projectKey: 'AA',
  },
]

// ── Shared Resource Pool ─────────────────────────────────────
export const mockResources: Resource[] = [
  {
    id: 'r-alex',
    name: 'Alex Rivera',
    resourceType: ResourceType.PM_DEV_HYBRID,
    weeklyCapacityHours: 40,
    utilizationRate: 0.8,
  },
  {
    id: 'r-jordan',
    name: 'Jordan Kim',
    resourceType: ResourceType.DEVELOPER,
    weeklyCapacityHours: 40,
    utilizationRate: 0.85,
  },
  {
    id: 'r-morgan',
    name: 'Morgan Chen',
    resourceType: ResourceType.DEVELOPER,
    weeklyCapacityHours: 40,
    utilizationRate: 0.85,
  },
  {
    id: 'r-casey',
    name: 'Casey Brown',
    resourceType: ResourceType.ADMIN,
    weeklyCapacityHours: 20,
    utilizationRate: 0.7,
  },
]

export const mockCapacityProfile: CapacityProfile = {
  resources: mockResources,
  effectiveDate: '2026-03-01',
  notes: 'Wave 1 baseline capacity. 1 PM/Dev hybrid, 2 developers, 1 part-time admin.',
}

// ── Projects ─────────────────────────────────────────────────
export const mockProjects: Project[] = [
  {
    id: 'proj-eol-infra',
    name: 'Infrastructure EOL Remediation',
    key: 'EOL-INFRA',
    workspaceId: 'ws-eol',
    status: 'active',
    description: 'Replace end-of-life infrastructure components before vendor support ends.',
  },
  {
    id: 'proj-eol-sec',
    name: 'Security Compliance Updates',
    key: 'EOL-SEC',
    workspaceId: 'ws-eol',
    status: 'active',
    description: 'Address security audit findings and update compliance controls.',
  },
  {
    id: 'proj-aa-intake',
    name: 'Attorney Intake Automation',
    key: 'AA-INTAKE',
    workspaceId: 'ws-aa',
    status: 'active',
    description: 'Automate the attorney intake and conflict-check workflow.',
  },
  {
    id: 'proj-tko-mgmt',
    name: 'TKO Matter Management',
    key: 'TKO-MGMT',
    workspaceId: 'ws-aa',
    status: 'on-hold',
    description: 'Build matter management module for TKO practice group.',
  },
]

// ── Epics ────────────────────────────────────────────────────
export const mockEpics: Epic[] = [
  // EOL-INFRA epics
  {
    id: 'ep-001',
    title: 'Database Server Upgrade',
    projectId: 'proj-eol-infra',
    status: 'in-progress',
    priority: 'high',
    storyPoints: 34,
  },
  {
    id: 'ep-002',
    title: 'Network Equipment Replacement',
    projectId: 'proj-eol-infra',
    status: 'todo',
    priority: 'high',
    storyPoints: 21,
  },
  {
    id: 'ep-003',
    title: 'Legacy App Migration',
    projectId: 'proj-eol-infra',
    status: 'todo',
    priority: 'medium',
    storyPoints: 55,
  },
  // EOL-SEC epics
  {
    id: 'ep-004',
    title: 'MFA Enforcement',
    projectId: 'proj-eol-sec',
    status: 'in-progress',
    priority: 'high',
    storyPoints: 13,
  },
  {
    id: 'ep-005',
    title: 'Vulnerability Remediation',
    projectId: 'proj-eol-sec',
    status: 'todo',
    priority: 'high',
    storyPoints: 28,
  },
  {
    id: 'ep-006',
    title: 'Audit Log Implementation',
    projectId: 'proj-eol-sec',
    status: 'todo',
    priority: 'medium',
    storyPoints: 20,
  },
  // AA-INTAKE epics
  {
    id: 'ep-007',
    title: 'Intake Form Builder',
    projectId: 'proj-aa-intake',
    status: 'in-progress',
    priority: 'high',
    storyPoints: 40,
  },
  {
    id: 'ep-008',
    title: 'Conflict Check Integration',
    projectId: 'proj-aa-intake',
    status: 'todo',
    priority: 'high',
    storyPoints: 32,
  },
  {
    id: 'ep-009',
    title: 'Notification & Routing',
    projectId: 'proj-aa-intake',
    status: 'todo',
    priority: 'medium',
    storyPoints: 18,
  },
  // TKO-MGMT epics
  {
    id: 'ep-010',
    title: 'Matter Creation Workflow',
    projectId: 'proj-tko-mgmt',
    status: 'todo',
    priority: 'medium',
    storyPoints: 25,
  },
  {
    id: 'ep-011',
    title: 'Document Management',
    projectId: 'proj-tko-mgmt',
    status: 'todo',
    priority: 'low',
    storyPoints: 30,
  },
]

// ── Issues ───────────────────────────────────────────────────
export const mockIssues: Issue[] = [
  // ep-001: Database Server Upgrade
  {
    id: 'ISS-001',
    title: 'Audit existing DB server inventory',
    epicId: 'ep-001',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'done',
    priority: 'high',
    issueType: 'task',
    storyPoints: 3,
    assigneeId: 'r-alex',
    labels: [],
  },
  {
    id: 'ISS-002',
    title: 'Procure replacement DB hardware',
    epicId: 'ep-001',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'done',
    priority: 'high',
    issueType: 'task',
    storyPoints: 5,
    assigneeId: 'r-casey',
    labels: ['procurement'],
  },
  {
    id: 'ISS-003',
    title: 'Migrate dev DB environment',
    epicId: 'ep-001',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'in-progress',
    priority: 'high',
    issueType: 'story',
    storyPoints: 8,
    assigneeId: 'r-jordan',
    labels: [],
  },
  {
    id: 'ISS-004',
    title: 'Migrate prod DB with rollback plan',
    epicId: 'ep-001',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'highest',
    issueType: 'story',
    storyPoints: 13,
    assigneeId: 'r-jordan',
    labels: ['critical'],
  },
  {
    id: 'ISS-005',
    title: 'Post-migration performance validation',
    epicId: 'ep-001',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'high',
    issueType: 'task',
    storyPoints: 5,
    assigneeId: 'r-morgan',
    labels: [],
  },
  // ep-002: Network Equipment
  {
    id: 'ISS-006',
    title: 'Network topology assessment',
    epicId: 'ep-002',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'high',
    issueType: 'task',
    storyPoints: 5,
    assigneeId: 'r-alex',
    labels: [],
  },
  {
    id: 'ISS-007',
    title: 'Switch replacement — floor 2',
    epicId: 'ep-002',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'high',
    issueType: 'story',
    storyPoints: 8,
    labels: [],
  },
  {
    id: 'ISS-008',
    title: 'Firewall firmware update',
    epicId: 'ep-002',
    projectId: 'proj-eol-infra',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'medium',
    issueType: 'task',
    storyPoints: 3,
    labels: [],
  },
  // ep-004: MFA Enforcement
  {
    id: 'ISS-009',
    title: 'MFA policy definition',
    epicId: 'ep-004',
    projectId: 'proj-eol-sec',
    workspaceId: 'ws-eol',
    status: 'done',
    priority: 'high',
    issueType: 'task',
    storyPoints: 2,
    assigneeId: 'r-alex',
    labels: ['policy'],
  },
  {
    id: 'ISS-010',
    title: 'Enable MFA for admin accounts',
    epicId: 'ep-004',
    projectId: 'proj-eol-sec',
    workspaceId: 'ws-eol',
    status: 'in-progress',
    priority: 'highest',
    issueType: 'story',
    storyPoints: 3,
    assigneeId: 'r-morgan',
    labels: ['security'],
  },
  {
    id: 'ISS-011',
    title: 'MFA rollout to all staff',
    epicId: 'ep-004',
    projectId: 'proj-eol-sec',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'high',
    issueType: 'story',
    storyPoints: 5,
    labels: ['security'],
  },
  {
    id: 'ISS-012',
    title: 'MFA bypass audit — fix edge cases',
    epicId: 'ep-004',
    projectId: 'proj-eol-sec',
    workspaceId: 'ws-eol',
    status: 'todo',
    priority: 'medium',
    issueType: 'bug',
    storyPoints: 3,
    labels: ['security'],
  },
  // ep-007: Intake Form Builder
  {
    id: 'ISS-013',
    title: 'Design intake form data model',
    epicId: 'ep-007',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'done',
    priority: 'high',
    issueType: 'task',
    storyPoints: 5,
    assigneeId: 'r-alex',
    labels: [],
  },
  {
    id: 'ISS-014',
    title: 'Build form builder UI',
    epicId: 'ep-007',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'in-progress',
    priority: 'high',
    issueType: 'story',
    storyPoints: 13,
    assigneeId: 'r-morgan',
    labels: ['ui'],
  },
  {
    id: 'ISS-015',
    title: 'Form submission API endpoint',
    epicId: 'ep-007',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'in-progress',
    priority: 'high',
    issueType: 'story',
    storyPoints: 8,
    assigneeId: 'r-jordan',
    labels: ['api'],
  },
  {
    id: 'ISS-016',
    title: 'Form validation rules engine',
    epicId: 'ep-007',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'medium',
    issueType: 'story',
    storyPoints: 8,
    labels: [],
  },
  {
    id: 'ISS-017',
    title: 'Fix: form loses data on back navigation',
    epicId: 'ep-007',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'high',
    issueType: 'bug',
    storyPoints: 3,
    labels: ['bug'],
  },
  // ep-008: Conflict Check
  {
    id: 'ISS-018',
    title: 'Research conflict check data sources',
    epicId: 'ep-008',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'high',
    issueType: 'task',
    storyPoints: 5,
    assigneeId: 'r-alex',
    labels: [],
  },
  {
    id: 'ISS-019',
    title: 'Conflict check API integration',
    epicId: 'ep-008',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'high',
    issueType: 'story',
    storyPoints: 13,
    labels: ['api', 'integration'],
  },
  {
    id: 'ISS-020',
    title: 'Conflict check UI review screen',
    epicId: 'ep-008',
    projectId: 'proj-aa-intake',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'medium',
    issueType: 'story',
    storyPoints: 8,
    labels: ['ui'],
  },
  // ep-010: TKO Matter Creation
  {
    id: 'ISS-021',
    title: 'Matter creation form design',
    epicId: 'ep-010',
    projectId: 'proj-tko-mgmt',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'medium',
    issueType: 'task',
    storyPoints: 5,
    labels: [],
  },
  {
    id: 'ISS-022',
    title: 'Matter numbering system',
    epicId: 'ep-010',
    projectId: 'proj-tko-mgmt',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'medium',
    issueType: 'story',
    storyPoints: 8,
    labels: [],
  },
  {
    id: 'ISS-023',
    title: 'Matter status workflow',
    epicId: 'ep-010',
    projectId: 'proj-tko-mgmt',
    workspaceId: 'ws-aa',
    status: 'todo',
    priority: 'low',
    issueType: 'story',
    storyPoints: 8,
    labels: [],
  },
]

// ── Mock Estimates ────────────────────────────────────────────
export const mockEstimates: IssueEstimate[] = mockIssues.map((issue) => ({
  issueId: issue.id,
  estimatedHours: (issue.storyPoints ?? 3) * 4,
  confidence: issue.storyPoints ? 'medium' : 'low',
  rationale: `TODO Wave 2: AI estimation. Placeholder: ${issue.storyPoints ?? 3} pts × 4h/pt = ${(issue.storyPoints ?? 3) * 4}h`,
  assumptions: [
    '4 hours per story point (placeholder rate)',
    'No historical velocity calibration yet',
  ],
  resourceType:
    issue.issueType === 'bug' || issue.labels.includes('api')
      ? ResourceType.DEVELOPER
      : issue.labels.includes('admin')
        ? ResourceType.ADMIN
        : ResourceType.DEVELOPER,
}))

// ── Mock Schedules ────────────────────────────────────────────
function isoDate(offsetDays: number): string {
  const d = new Date('2026-03-08')
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

export const mockSchedules: ProjectSchedule[] = [
  {
    projectId: 'proj-eol-infra',
    startDate: isoDate(0),
    endDate: isoDate(90),
    totalEstimatedHours: 280,
    milestones: [
      {
        name: 'DB Migration Complete',
        targetDate: isoDate(30),
        description: 'Dev and prod DB migrated',
      },
      {
        name: 'Network Cutover',
        targetDate: isoDate(60),
        description: 'All network equipment replaced',
      },
      { name: 'Project Closed', targetDate: isoDate(90) },
    ],
    resourceAllocations: [
      { resourceId: 'r-alex', hoursPerWeek: 8, startDate: isoDate(0), endDate: isoDate(90) },
      { resourceId: 'r-jordan', hoursPerWeek: 24, startDate: isoDate(0), endDate: isoDate(60) },
      { resourceId: 'r-morgan', hoursPerWeek: 16, startDate: isoDate(14), endDate: isoDate(90) },
    ],
  },
  {
    projectId: 'proj-eol-sec',
    startDate: isoDate(14),
    endDate: isoDate(105),
    totalEstimatedHours: 200,
    milestones: [
      {
        name: 'MFA Fully Enforced',
        targetDate: isoDate(42),
        description: 'All accounts on MFA',
      },
      { name: 'Audit Complete', targetDate: isoDate(105) },
    ],
    resourceAllocations: [
      { resourceId: 'r-alex', hoursPerWeek: 6, startDate: isoDate(14), endDate: isoDate(105) },
      { resourceId: 'r-morgan', hoursPerWeek: 20, startDate: isoDate(14), endDate: isoDate(105) },
    ],
  },
  {
    projectId: 'proj-aa-intake',
    startDate: isoDate(0),
    endDate: isoDate(120),
    totalEstimatedHours: 320,
    milestones: [
      {
        name: 'Form Builder Beta',
        targetDate: isoDate(30),
        description: 'Intake form builder ready for UAT',
      },
      {
        name: 'Conflict Check Live',
        targetDate: isoDate(75),
        description: 'Conflict check integration complete',
      },
      { name: 'Go Live', targetDate: isoDate(120) },
    ],
    resourceAllocations: [
      { resourceId: 'r-alex', hoursPerWeek: 10, startDate: isoDate(0), endDate: isoDate(120) },
      { resourceId: 'r-jordan', hoursPerWeek: 16, startDate: isoDate(0), endDate: isoDate(120) },
      { resourceId: 'r-morgan', hoursPerWeek: 20, startDate: isoDate(0), endDate: isoDate(75) },
    ],
  },
  {
    projectId: 'proj-tko-mgmt',
    startDate: isoDate(90),
    endDate: isoDate(180),
    totalEstimatedHours: 240,
    milestones: [
      { name: 'Matter Creation MVP', targetDate: isoDate(120) },
      { name: 'Beta Release', targetDate: isoDate(165) },
    ],
    resourceAllocations: [
      { resourceId: 'r-jordan', hoursPerWeek: 24, startDate: isoDate(90), endDate: isoDate(180) },
      { resourceId: 'r-morgan', hoursPerWeek: 24, startDate: isoDate(90), endDate: isoDate(180) },
    ],
  },
]

// ── Mock Scenario Result ──────────────────────────────────────
export const mockScenarioResult: ScenarioResult = {
  scenarioInput: {
    name: 'Add 1 Developer',
    staffingChanges: [
      {
        id: 'r-new-dev',
        name: 'New Developer (TBD hire)',
        resourceType: ResourceType.DEVELOPER,
        weeklyCapacityHours: 40,
        utilizationRate: 0.85,
      },
    ],
    notes: 'Model impact of adding one senior developer to the shared resource pool starting April 2026',
  },
  baseline: mockSchedules,
  adjusted: mockSchedules.map((s) => ({
    ...s,
    endDate: isoDate(
      Math.round(
        (new Date(s.endDate).getTime() - new Date('2026-03-08').getTime()) / 86400000
      ) - 18
    ),
    totalEstimatedHours: Math.round(s.totalEstimatedHours * 0.92),
  })),
  delta: mockSchedules.map((s) => ({
    projectId: s.projectId,
    baselineEndDate: s.endDate,
    adjustedEndDate: isoDate(
      Math.round(
        (new Date(s.endDate).getTime() - new Date('2026-03-08').getTime()) / 86400000
      ) - 18
    ),
    daysDelta: -18,
    hoursImpact: -Math.round(s.totalEstimatedHours * 0.08),
  })),
  recommendations: [
    'Adding 1 developer accelerates all active projects by approximately 18 days.',
    'EOL-INFRA benefits most — DB migration parallelization becomes possible.',
    'AA-INTAKE conflict check work is currently bottlenecked on a single developer.',
    'TKO-MGMT can be pulled forward by ~3 weeks if new developer onboards by April.',
    'Consider allocating new developer 70% to AA-INTAKE, 30% to EOL-INFRA for maximum impact.',
  ],
}
