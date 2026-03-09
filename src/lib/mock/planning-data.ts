// ============================================================
// Mock Planning Data — Wave 1
//
// Shows the planning-domain structure as we want to supervise it,
// NOT a mirror of raw Jira hierarchy.
//
// Raw Jira source:  domain.ts types, sample-data.ts
// Planning output:  planning.ts types (this file)
//
// Real-world projects included here:
//   - Call Sofia            (ATI workspace)
//   - AA/TKO Sales Cloud    (ATI workspace)
//   - RingCentral Setup     (EOL workspace)
//
// TODO Wave 2: derive from live Jira data via normalize-planning.ts
// ============================================================

import type { PlanningProject, PlanningEpic, PlanningWorkItem } from '@/types/planning'
import { manualRef } from '@/lib/planning/normalize-planning'

// ── Helper to build stub work items ──────────────────────────
function workItem(
  id: string,
  title: string,
  planningEpicId: string,
  opts: Partial<PlanningWorkItem> = {}
): PlanningWorkItem {
  return {
    id,
    title,
    planningEpicId,
    status: 'not-started',
    priority: 'medium',
    sourceRefs: [manualRef(title)],
    ...opts,
  }
}

// ── Call Sofia ────────────────────────────────────────────────
// One PlanningProject with 3 phase-based PlanningEpics.
// Source: ATI workspace (ws-ati).
// NOTE: Jira may have these modeled as Tasks within a single epic —
//       they are promoted to PlanningEpic here because each phase
//       represents a distinct planning track.
// TODO Wave 2: link sourceRefs to actual ATI Jira epic/issue IDs

const callSofiaEpicPhase1: PlanningEpic = {
  id: 'pe-sofia-p1',
  title: 'Phase 1',
  planningProjectId: 'pp-call-sofia',
  status: 'in-progress',
  priority: 'high',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 1' }],
  notes: 'Initial rollout and configuration. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p1-001', 'Define Call Sofia scope and requirements', 'pe-sofia-p1', { status: 'done', priority: 'high', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sofia scope definition' }] }),
    workItem('pwi-sofia-p1-002', 'Configure Call Sofia integration', 'pe-sofia-p1', { status: 'in-progress', priority: 'high', assigneeId: 'r-jordan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia config' }] }),
    workItem('pwi-sofia-p1-003', 'UAT — Phase 1 call flows', 'pe-sofia-p1', { status: 'not-started', priority: 'medium', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sofia Phase 1 UAT' }] }),
  ],
}

const callSofiaEpicPhase2: PlanningEpic = {
  id: 'pe-sofia-p2',
  title: 'Phase 2',
  planningProjectId: 'pp-call-sofia',
  status: 'not-started',
  priority: 'high',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 2' }],
  notes: 'Expanded call flow coverage. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p2-001', 'Phase 2 call flow design', 'pe-sofia-p2', { priority: 'high' }),
    workItem('pwi-sofia-p2-002', 'Build Phase 2 routing rules', 'pe-sofia-p2', { assigneeId: 'r-morgan' }),
    workItem('pwi-sofia-p2-003', 'Phase 2 testing and sign-off', 'pe-sofia-p2'),
  ],
}

const callSofiaEpicPhase3: PlanningEpic = {
  id: 'pe-sofia-p3',
  title: 'Phase 3',
  planningProjectId: 'pp-call-sofia',
  status: 'not-started',
  priority: 'medium',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 3' }],
  notes: 'Full production handover. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p3-001', 'Full production rollout', 'pe-sofia-p3', { priority: 'high' }),
    workItem('pwi-sofia-p3-002', 'Staff training and documentation', 'pe-sofia-p3', { assigneeId: 'r-casey' }),
    workItem('pwi-sofia-p3-003', 'Post-launch monitoring and tuning', 'pe-sofia-p3'),
  ],
}

export const mockCallSofiaProject: PlanningProject = {
  id: 'pp-call-sofia',
  name: 'Call Sofia',
  description: 'Phased rollout of Call Sofia integration across the AA/TKO practice.',
  status: 'in-progress',
  epics: [callSofiaEpicPhase1, callSofiaEpicPhase2, callSofiaEpicPhase3],
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: Call Sofia' }],
  notes: 'Three-phase delivery. Phase 1 underway. Phases 2 and 3 pending Phase 1 sign-off.',
}

// ── AA/TKO Sales Cloud Revamp ─────────────────────────────────
// One PlanningProject with 4 thematic PlanningEpics.
// Source: ATI workspace (ws-ati).
// NOTE: Some of these epics may be modeled as Jira Tasks in ATI —
//       they are promoted to PlanningEpic here to make planning tracks explicit.
// TODO Wave 2: link sourceRefs to actual ATI Jira epic/issue IDs

const salesCloudEnablement: PlanningEpic = {
  id: 'pe-sc-enablement',
  title: 'Sales Cloud Enablement',
  planningProjectId: 'pp-sales-cloud',
  status: 'in-progress',
  priority: 'high',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sales Cloud enablement' }],
  notes: 'Core Salesforce Sales Cloud configuration and enablement for AA/TKO team.',
  workItems: [
    workItem('pwi-sc-001', 'Sales Cloud object model review', 'pe-sc-enablement', { status: 'done', priority: 'high', assigneeId: 'r-alex', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: SC object model review' }] }),
    workItem('pwi-sc-002', 'Configure opportunity and account layouts', 'pe-sc-enablement', { status: 'in-progress', priority: 'high', assigneeId: 'r-morgan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: SC layout config' }] }),
    workItem('pwi-sc-003', 'Sales Cloud permission sets and profiles', 'pe-sc-enablement', { status: 'not-started', assigneeId: 'r-morgan' }),
    workItem('pwi-sc-004', 'Validate data integrity post-migration', 'pe-sc-enablement', { status: 'not-started', priority: 'high' }),
  ],
}

const nextStepNotes: PlanningEpic = {
  id: 'pe-sc-next-step',
  title: 'Next Step Notes Cleanup / Standardization',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'medium',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Next Step Notes' }],
  notes: 'Standardize Next Step Note field usage across the sales team. Manual cleanup required.',
  workItems: [
    workItem('pwi-ns-001', 'Audit existing Next Step Note content', 'pe-sc-next-step', { sourceRefs: [{ sourceType: 'manual', label: 'Manual audit — no Jira backing yet' }] }),
    workItem('pwi-ns-002', 'Define standard Next Step Note templates', 'pe-sc-next-step', { priority: 'high', sourceRefs: [{ sourceType: 'manual', label: 'Manual — template definition' }] }),
    workItem('pwi-ns-003', 'Bulk update historical records', 'pe-sc-next-step', { assigneeId: 'r-casey', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Notes bulk update' }] }),
  ],
}

const salesTeamRetirement: PlanningEpic = {
  id: 'pe-sc-retirement',
  title: 'AA Sales Team Member Retirement',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'high',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Team member retirement' }],
  notes: 'Offboarding workflow for retiring sales team members. Includes data reassignment in Sales Cloud.',
  workItems: [
    workItem('pwi-ret-001', 'Document retirement offboarding checklist', 'pe-sc-retirement', { priority: 'high', assigneeId: 'r-alex' }),
    workItem('pwi-ret-002', 'Automate opportunity/account reassignment on retirement', 'pe-sc-retirement', { priority: 'high', assigneeId: 'r-jordan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Reassignment automation' }] }),
    workItem('pwi-ret-003', 'Test retirement flow in sandbox', 'pe-sc-retirement', { assigneeId: 'r-morgan' }),
  ],
}

const scDocumentation: PlanningEpic = {
  id: 'pe-sc-docs',
  title: 'Documentation / Adoption Support',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'low',
  sourceRefs: [{ sourceType: 'manual', label: 'Manual — no Jira backing yet' }],
  notes: 'End-user documentation and adoption support. Partially manual — no Jira issues created yet.',
  workItems: [
    workItem('pwi-doc-001', 'Write Sales Cloud user guide for AA team', 'pe-sc-docs', { priority: 'medium', assigneeId: 'r-casey', sourceRefs: [{ sourceType: 'manual', label: 'Manual — doc writing' }] }),
    workItem('pwi-doc-002', 'Record walkthrough videos for common workflows', 'pe-sc-docs', { sourceRefs: [{ sourceType: 'manual', label: 'Manual — video production' }] }),
    workItem('pwi-doc-003', 'Adoption metrics tracking setup', 'pe-sc-docs', { sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Adoption metrics' }] }),
  ],
}

export const mockSalesCloudProject: PlanningProject = {
  id: 'pp-sales-cloud',
  name: 'AA/TKO Sales Cloud Revamp',
  description: 'Full Salesforce Sales Cloud enablement, data cleanup, and adoption for the AA/TKO sales team.',
  status: 'in-progress',
  epics: [salesCloudEnablement, nextStepNotes, salesTeamRetirement, scDocumentation],
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: Sales Cloud' }],
  notes: 'Mix of Jira-backed and manual work items. Documentation epic has no Jira issues yet.',
}

// ── RingCentral Setup ─────────────────────────────────────────
// One PlanningProject with 3 PlanningEpics across workspaces.
// RingCentral and RingSense epics source: ATI (ws-ati)
// EOL CTI integration epic source: EOL (ws-eol)
// This project intentionally spans both workspaces.
// TODO Wave 2: link sourceRefs to actual Jira epic/issue IDs in both workspaces

const ringCentralSetup: PlanningEpic = {
  id: 'pe-rc-setup',
  title: 'RingCentral Setup',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'high',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingCentral setup' }],
  notes: 'Initial RingCentral account and user provisioning for the AA team. Tracked in ATI.',
  workItems: [
    workItem('pwi-rc-001', 'RingCentral account provisioning', 'pe-rc-setup', { priority: 'high', assigneeId: 'r-alex', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC account setup' }] }),
    workItem('pwi-rc-002', 'User directory sync and number assignment', 'pe-rc-setup', { priority: 'high', assigneeId: 'r-jordan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC user sync' }] }),
    workItem('pwi-rc-003', 'Call routing and IVR configuration', 'pe-rc-setup', { assigneeId: 'r-morgan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC IVR config' }] }),
    workItem('pwi-rc-004', 'RingCentral UAT and go-live', 'pe-rc-setup', { priority: 'high' }),
  ],
}

const ringSenseSetup: PlanningEpic = {
  id: 'pe-rc-ringsense',
  title: 'RingSense Setup',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'medium',
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense setup' }],
  notes: 'RingSense AI call intelligence layer on top of RingCentral. Depends on RC setup completion.',
  workItems: [
    workItem('pwi-rs-001', 'Enable RingSense on RingCentral account', 'pe-rc-ringsense', { priority: 'high', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense enable' }] }),
    workItem('pwi-rs-002', 'Configure RingSense call scoring rules', 'pe-rc-ringsense', { assigneeId: 'r-alex', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense scoring' }] }),
    workItem('pwi-rs-003', 'Review and tune initial AI summaries', 'pe-rc-ringsense', { sourceRefs: [{ sourceType: 'manual', label: 'Manual review — no Jira backing yet' }] }),
  ],
}

const eolCtiIntegration: PlanningEpic = {
  id: 'pe-rc-cti',
  title: 'EOL CTI Integration',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'high',
  // This epic lives in the EOL workspace — cross-workspace aggregation in action
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI integration' }],
  notes: 'Integrate RingCentral CTI with EOL infrastructure systems. Tracked in EOL workspace (ws-eol). This epic crosses workspaces within one PlanningProject.',
  workItems: [
    workItem('pwi-cti-001', 'CTI connector evaluation and selection', 'pe-rc-cti', { priority: 'high', assigneeId: 'r-alex', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI evaluation' }] }),
    workItem('pwi-cti-002', 'Install and configure CTI connector', 'pe-rc-cti', { priority: 'high', assigneeId: 'r-jordan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI install' }] }),
    workItem('pwi-cti-003', 'CTI screen pop and call log integration', 'pe-rc-cti', { assigneeId: 'r-morgan', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI screen pop' }] }),
    workItem('pwi-cti-004', 'CTI end-to-end testing', 'pe-rc-cti', { priority: 'high', sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI testing' }] }),
  ],
}

export const mockRingCentralProject: PlanningProject = {
  id: 'pp-ringcentral',
  name: 'RingCentral Setup',
  description: 'Deploy RingCentral telephony, RingSense AI call intelligence, and CTI integration across the team.',
  status: 'not-started',
  epics: [ringCentralSetup, ringSenseSetup, eolCtiIntegration],
  sourceRefs: [
    { sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: RingCentral' },
    { sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL project: CTI' },
  ],
  notes: 'Cross-workspace project: RingCentral/RingSense in ATI, CTI integration in EOL. Example of a PlanningProject that spans both workspaces.',
}

// ── All Planning Projects ─────────────────────────────────────
export const mockPlanningProjects: PlanningProject[] = [
  mockCallSofiaProject,
  mockSalesCloudProject,
  mockRingCentralProject,
]
