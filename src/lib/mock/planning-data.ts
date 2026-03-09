// ============================================================
// Mock Planning Data — Phase 1
//
// Shows the planning-domain structure as we want to supervise it,
// NOT a mirror of raw Jira hierarchy.
//
// Raw Jira source:  domain.ts types, sample-data.ts
// Planning output:  planning.ts types (this file)
//
// Real-world projects included here:
//   - Call Sofia            (ATI portfolio)
//   - AA/TKO Sales Cloud    (ATI portfolio)
//   - RingCentral Setup     (cross-workspace portfolio — spans EOL + ATI)
//
// TODO Wave 2: derive from live Jira data via normalize-planning.ts
// ============================================================

import type { PlanningProject, PlanningEpic, PlanningWorkItem } from '@/types/planning'
import { ResourceType } from '@/types/domain'
import { manualRef } from '@/lib/planning/normalize-planning'

// ── Skill / effort enrichment helper ─────────────────────────
// Applies Phase 1 skill fields as a partial override to workItem opts.
// Using function avoids repetition in each work item definition.

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
    // Phase 1 required fields — defaults
    effortHours: 8,
    confidence: 'low',
    primaryRole: ResourceType.DEVELOPER,
    ...opts,
  }
}

// ── Call Sofia ────────────────────────────────────────────────
// One PlanningProject with 3 phase-based PlanningEpics.
// Source: ATI workspace (ws-ati). Portfolio: ATI.
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
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 1' }],
  notes: 'Initial rollout and configuration. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p1-001', 'Define Call Sofia scope and requirements', 'pe-sofia-p1', {
      status: 'done',
      priority: 'high',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'medium',
      primarySkill: 'skill-pm',
      domainTag: 'litify',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sofia scope definition' }],
    }),
    workItem('pwi-sofia-p1-002', 'Configure Call Sofia integration', 'pe-sofia-p1', {
      status: 'in-progress',
      priority: 'high',
      assigneeId: 'r-jordan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'medium',
      primarySkill: 'skill-sf-config',
      secondarySkill: 'skill-integration',
      requiredSkillLevel: 2,
      domainTag: 'litify',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia config' }],
    }),
    workItem('pwi-sofia-p1-003', 'UAT — Phase 1 call flows', 'pe-sofia-p1', {
      status: 'not-started',
      priority: 'medium',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-qa',
      domainTag: 'litify',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sofia Phase 1 UAT' }],
    }),
  ],
}

const callSofiaEpicPhase2: PlanningEpic = {
  id: 'pe-sofia-p2',
  title: 'Phase 2',
  planningProjectId: 'pp-call-sofia',
  status: 'not-started',
  priority: 'high',
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 2' }],
  notes: 'Expanded call flow coverage. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p2-001', 'Phase 2 call flow design', 'pe-sofia-p2', {
      priority: 'high',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-pm',
      domainTag: 'litify',
      urgency: 'normal',
    }),
    workItem('pwi-sofia-p2-002', 'Build Phase 2 routing rules', 'pe-sofia-p2', {
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'low',
      primarySkill: 'skill-sf-config',
      requiredSkillLevel: 2,
      domainTag: 'litify',
      urgency: 'normal',
    }),
    workItem('pwi-sofia-p2-003', 'Phase 2 testing and sign-off', 'pe-sofia-p2', {
      primaryRole: ResourceType.DEVELOPER,
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-qa',
      domainTag: 'litify',
      urgency: 'normal',
    }),
  ],
}

const callSofiaEpicPhase3: PlanningEpic = {
  id: 'pe-sofia-p3',
  title: 'Phase 3',
  planningProjectId: 'pp-call-sofia',
  status: 'not-started',
  priority: 'medium',
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Call Sofia — Phase 3' }],
  notes: 'Full production handover. TODO Wave 2: link to ATI epic ID.',
  workItems: [
    workItem('pwi-sofia-p3-001', 'Full production rollout', 'pe-sofia-p3', {
      priority: 'high',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'low',
      primarySkill: 'skill-sf-config',
      domainTag: 'litify',
      urgency: 'high',
    }),
    workItem('pwi-sofia-p3-002', 'Staff training and documentation', 'pe-sofia-p3', {
      assigneeId: 'r-casey',
      primaryRole: ResourceType.ADMIN,
      skillRequired: 'Administration',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-docs',
      domainTag: 'litify',
      urgency: 'normal',
    }),
    workItem('pwi-sofia-p3-003', 'Post-launch monitoring and tuning', 'pe-sofia-p3', {
      primaryRole: ResourceType.DEVELOPER,
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-reporting',
      domainTag: 'litify',
      urgency: 'normal',
    }),
  ],
}

export const mockCallSofiaProject: PlanningProject = {
  id: 'pp-call-sofia',
  name: 'Call Sofia',
  description: 'Phased rollout of Call Sofia integration across the AA/TKO practice.',
  status: 'in-progress',
  portfolio: 'ATI',
  priority: 'high',
  stage: 'in-delivery',
  planningType: 'phased-program',
  confidence: 'medium',
  effortBand: 'M',
  owner: 'tm-jusiah',
  epics: [callSofiaEpicPhase1, callSofiaEpicPhase2, callSofiaEpicPhase3],
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: Call Sofia' }],
  notes: 'Three-phase delivery. Phase 1 underway. Phases 2 and 3 pending Phase 1 sign-off.',
}

// ── AA/TKO Sales Cloud Revamp ─────────────────────────────────
// One PlanningProject with 4 thematic PlanningEpics.
// Source: ATI workspace (ws-ati). Portfolio: ATI.
// NOTE: Some of these epics may be modeled as Jira Tasks in ATI —
//       they are promoted to PlanningEpic here to make planning tracks explicit.
// TODO Wave 2: link sourceRefs to actual ATI Jira epic/issue IDs

const salesCloudEnablement: PlanningEpic = {
  id: 'pe-sc-enablement',
  title: 'Sales Cloud Enablement',
  planningProjectId: 'pp-sales-cloud',
  status: 'in-progress',
  priority: 'high',
  portfolio: 'ATI',
  estimatedSprints: 2,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Sales Cloud enablement' }],
  notes: 'Core Salesforce Sales Cloud configuration and enablement for AA/TKO team.',
  workItems: [
    workItem('pwi-sc-001', 'Sales Cloud object model review', 'pe-sc-enablement', {
      status: 'done',
      priority: 'high',
      assigneeId: 'r-alex',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 20,
      effortInSprints: 0.5,
      confidence: 'medium',
      primarySkill: 'skill-sales-cloud',
      secondarySkill: 'skill-sf-data',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: SC object model review' }],
    }),
    workItem('pwi-sc-002', 'Configure opportunity and account layouts', 'pe-sc-enablement', {
      status: 'in-progress',
      priority: 'high',
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'medium',
      primarySkill: 'skill-sf-config',
      secondarySkill: 'skill-sales-cloud',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: SC layout config' }],
    }),
    workItem('pwi-sc-003', 'Sales Cloud permission sets and profiles', 'pe-sc-enablement', {
      status: 'not-started',
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'low',
      primarySkill: 'skill-sf-config',
      domainTag: 'sales-cloud',
      urgency: 'normal',
    }),
    workItem('pwi-sc-004', 'Validate data integrity post-migration', 'pe-sc-enablement', {
      status: 'not-started',
      priority: 'high',
      primaryRole: ResourceType.DEVELOPER,
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-reporting',
      secondarySkill: 'skill-sf-data',
      domainTag: 'sales-cloud',
      urgency: 'high',
    }),
  ],
}

const nextStepNotes: PlanningEpic = {
  id: 'pe-sc-next-step',
  title: 'Next Step Notes Cleanup / Standardization',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'medium',
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Next Step Notes' }],
  notes: 'Standardize Next Step Note field usage across the sales team. Manual cleanup required.',
  workItems: [
    workItem('pwi-ns-001', 'Audit existing Next Step Note content', 'pe-sc-next-step', {
      primaryRole: ResourceType.ADMIN,
      skillRequired: 'Administration',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-reporting',
      domainTag: 'sales-cloud',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'manual', label: 'Manual audit — no Jira backing yet' }],
    }),
    workItem('pwi-ns-002', 'Define standard Next Step Note templates', 'pe-sc-next-step', {
      priority: 'high',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-pm',
      domainTag: 'sales-cloud',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'manual', label: 'Manual — template definition' }],
    }),
    workItem('pwi-ns-003', 'Bulk update historical records', 'pe-sc-next-step', {
      assigneeId: 'r-casey',
      primaryRole: ResourceType.ADMIN,
      skillRequired: 'Administration',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'low',
      primarySkill: 'skill-sf-data',
      domainTag: 'sales-cloud',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Notes bulk update' }],
    }),
  ],
}

const salesTeamRetirement: PlanningEpic = {
  id: 'pe-sc-retirement',
  title: 'AA Sales Team Member Retirement',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'high',
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Team member retirement' }],
  notes: 'Offboarding workflow for retiring sales team members. Includes data reassignment in Sales Cloud.',
  workItems: [
    workItem('pwi-ret-001', 'Document retirement offboarding checklist', 'pe-sc-retirement', {
      priority: 'high',
      assigneeId: 'r-alex',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-pm',
      secondarySkill: 'skill-docs',
      domainTag: 'sales-cloud',
      urgency: 'high',
    }),
    workItem('pwi-ret-002', 'Automate opportunity/account reassignment on retirement', 'pe-sc-retirement', {
      priority: 'high',
      assigneeId: 'r-jordan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'low',
      primarySkill: 'skill-sf-config',
      secondarySkill: 'skill-async',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Reassignment automation' }],
    }),
    workItem('pwi-ret-003', 'Test retirement flow in sandbox', 'pe-sc-retirement', {
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-qa',
      domainTag: 'sales-cloud',
      urgency: 'normal',
    }),
  ],
}

const scDocumentation: PlanningEpic = {
  id: 'pe-sc-docs',
  title: 'Documentation / Adoption Support',
  planningProjectId: 'pp-sales-cloud',
  status: 'not-started',
  priority: 'low',
  portfolio: 'ATI',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'manual', label: 'Manual — no Jira backing yet' }],
  notes: 'End-user documentation and adoption support. Partially manual — no Jira issues created yet.',
  workItems: [
    workItem('pwi-doc-001', 'Write Sales Cloud user guide for AA team', 'pe-sc-docs', {
      priority: 'medium',
      assigneeId: 'r-casey',
      primaryRole: ResourceType.ADMIN,
      skillRequired: 'Administration',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'low',
      primarySkill: 'skill-docs',
      domainTag: 'sales-cloud',
      urgency: 'low',
      sourceRefs: [{ sourceType: 'manual', label: 'Manual — doc writing' }],
    }),
    workItem('pwi-doc-002', 'Record walkthrough videos for common workflows', 'pe-sc-docs', {
      primaryRole: ResourceType.ADMIN,
      skillRequired: 'Administration',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-docs',
      domainTag: 'sales-cloud',
      urgency: 'low',
      sourceRefs: [{ sourceType: 'manual', label: 'Manual — video production' }],
    }),
    workItem('pwi-doc-003', 'Adoption metrics tracking setup', 'pe-sc-docs', {
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-reporting',
      domainTag: 'sales-cloud',
      urgency: 'low',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: Adoption metrics' }],
    }),
  ],
}

export const mockSalesCloudProject: PlanningProject = {
  id: 'pp-sales-cloud',
  name: 'AA/TKO Sales Cloud Revamp',
  description: 'Full Salesforce Sales Cloud enablement, data cleanup, and adoption for the AA/TKO sales team.',
  status: 'in-progress',
  portfolio: 'ATI',
  priority: 'high',
  stage: 'in-delivery',
  planningType: 'delivery-project',
  confidence: 'medium',
  effortBand: 'L',
  owner: 'tm-jusiah',
  epics: [salesCloudEnablement, nextStepNotes, salesTeamRetirement, scDocumentation],
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: Sales Cloud' }],
  notes: 'Mix of Jira-backed and manual work items. Documentation epic has no Jira issues yet.',
}

// ── RingCentral Setup ─────────────────────────────────────────
// One PlanningProject with 3 PlanningEpics across workspaces.
// RingCentral and RingSense epics source: ATI (ws-ati)
// EOL CTI integration epic source: EOL (ws-eol)
// This project intentionally spans both workspaces. Portfolio: cross-workspace.
// TODO Wave 2: link sourceRefs to actual Jira epic/issue IDs in both workspaces

const ringCentralSetup: PlanningEpic = {
  id: 'pe-rc-setup',
  title: 'RingCentral Setup',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'high',
  portfolio: 'cross-workspace',
  estimatedSprints: 2,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingCentral setup' }],
  notes: 'Initial RingCentral account and user provisioning for the AA team. Tracked in ATI.',
  workItems: [
    workItem('pwi-rc-001', 'RingCentral account provisioning', 'pe-rc-setup', {
      priority: 'high',
      assigneeId: 'r-alex',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'medium',
      primarySkill: 'skill-pm',
      secondarySkill: 'skill-integration',
      domainTag: 'integration',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC account setup' }],
    }),
    workItem('pwi-rc-002', 'User directory sync and number assignment', 'pe-rc-setup', {
      priority: 'high',
      assigneeId: 'r-jordan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'medium',
      primarySkill: 'skill-integration',
      requiredSkillLevel: 2,
      domainTag: 'integration',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC user sync' }],
    }),
    workItem('pwi-rc-003', 'Call routing and IVR configuration', 'pe-rc-setup', {
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'low',
      primarySkill: 'skill-sf-config',
      domainTag: 'integration',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RC IVR config' }],
    }),
    workItem('pwi-rc-004', 'RingCentral UAT and go-live', 'pe-rc-setup', {
      priority: 'high',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-qa',
      domainTag: 'integration',
      urgency: 'high',
    }),
  ],
}

const ringSenseSetup: PlanningEpic = {
  id: 'pe-rc-ringsense',
  title: 'RingSense Setup',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'medium',
  portfolio: 'cross-workspace',
  estimatedSprints: 1,
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense setup' }],
  notes: 'RingSense AI call intelligence layer on top of RingCentral. Depends on RC setup completion.',
  workItems: [
    workItem('pwi-rs-001', 'Enable RingSense on RingCentral account', 'pe-rc-ringsense', {
      priority: 'high',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 4,
      effortInSprints: 0.1,
      confidence: 'medium',
      primarySkill: 'skill-ai',
      secondarySkill: 'skill-integration',
      domainTag: 'ai',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense enable' }],
    }),
    workItem('pwi-rs-002', 'Configure RingSense call scoring rules', 'pe-rc-ringsense', {
      assigneeId: 'r-alex',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-ai',
      domainTag: 'ai',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI: RingSense scoring' }],
    }),
    workItem('pwi-rs-003', 'Review and tune initial AI summaries', 'pe-rc-ringsense', {
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'low',
      primarySkill: 'skill-ai',
      secondarySkill: 'skill-docs',
      domainTag: 'ai',
      urgency: 'low',
      sourceRefs: [{ sourceType: 'manual', label: 'Manual review — no Jira backing yet' }],
    }),
  ],
}

const eolCtiIntegration: PlanningEpic = {
  id: 'pe-rc-cti',
  title: 'EOL CTI Integration',
  planningProjectId: 'pp-ringcentral',
  status: 'not-started',
  priority: 'high',
  portfolio: 'cross-workspace',
  estimatedSprints: 2,
  // This epic lives in the EOL workspace — cross-workspace aggregation in action
  sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI integration' }],
  notes: 'Integrate RingCentral CTI with EOL infrastructure systems. Tracked in EOL workspace (ws-eol). This epic crosses workspaces within one PlanningProject.',
  workItems: [
    workItem('pwi-cti-001', 'CTI connector evaluation and selection', 'pe-rc-cti', {
      priority: 'high',
      assigneeId: 'r-alex',
      primaryRole: ResourceType.PM_DEV_HYBRID,
      skillRequired: 'Project Management + Development',
      effortHours: 8,
      effortInSprints: 0.2,
      confidence: 'medium',
      primarySkill: 'skill-pm',
      secondarySkill: 'skill-integration',
      domainTag: 'integration',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI evaluation' }],
    }),
    workItem('pwi-cti-002', 'Install and configure CTI connector', 'pe-rc-cti', {
      priority: 'high',
      assigneeId: 'r-jordan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'medium',
      primarySkill: 'skill-integration',
      requiredSkillLevel: 3,
      domainTag: 'integration',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI install' }],
    }),
    workItem('pwi-cti-003', 'CTI screen pop and call log integration', 'pe-rc-cti', {
      assigneeId: 'r-morgan',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 16,
      effortInSprints: 0.4,
      confidence: 'low',
      primarySkill: 'skill-integration',
      secondarySkill: 'skill-sf-config',
      requiredSkillLevel: 2,
      domainTag: 'integration',
      urgency: 'normal',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI screen pop' }],
    }),
    workItem('pwi-cti-004', 'CTI end-to-end testing', 'pe-rc-cti', {
      priority: 'high',
      primaryRole: ResourceType.DEVELOPER,
      skillRequired: 'Development',
      effortHours: 12,
      effortInSprints: 0.3,
      confidence: 'low',
      primarySkill: 'skill-qa',
      secondarySkill: 'skill-integration',
      domainTag: 'integration',
      urgency: 'high',
      sourceRefs: [{ sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL: CTI testing' }],
    }),
  ],
}

export const mockRingCentralProject: PlanningProject = {
  id: 'pp-ringcentral',
  name: 'RingCentral Setup',
  description: 'Deploy RingCentral telephony, RingSense AI call intelligence, and CTI integration across the team.',
  status: 'not-started',
  portfolio: 'cross-workspace',
  priority: 'medium',
  stage: 'planned',
  planningType: 'delivery-project',
  confidence: 'high',
  effortBand: 'M',
  owner: 'tm-daniel',
  epics: [ringCentralSetup, ringSenseSetup, eolCtiIntegration],
  sourceRefs: [
    { sourceType: 'jira', workspaceId: 'ws-ati', projectKey: 'ATI', label: 'ATI project: RingCentral' },
    { sourceType: 'jira', workspaceId: 'ws-eol', projectKey: 'EOL', label: 'EOL project: CTI' },
  ],
  notes: 'Cross-workspace project: RingCentral/RingSense in ATI, CTI integration in EOL. Example of a PlanningProject that spans both workspaces.',
}

// ── Stub Projects (future work) ───────────────────────────────

export const mockIntake360Project: PlanningProject = {
  id: 'pp-intake360',
  name: 'Intake360 Platform Modernization',
  description: 'Modernize the Intake360 intake and workflow platform to support new legal intake processes.',
  status: 'not-started',
  portfolio: 'ATI',
  priority: 'medium',
  stage: 'discovery',
  planningType: 'evaluation-discovery',
  confidence: 'low',
  effortBand: 'L',
  owner: 'tm-lemuel',
  epics: [
    {
      id: 'pe-intake360-discovery',
      title: 'Discovery & Requirements',
      planningProjectId: 'pp-intake360',
      status: 'not-started',
      priority: 'high',
      portfolio: 'ATI',
      estimatedSprints: 1,
      sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — intake360 discovery' }],
      notes: 'TODO Wave 2: link to Jira epic when created.',
      workItems: [
        workItem('pwi-intake360-001', 'Discovery workshop and requirements gathering', 'pe-intake360-discovery', {
          priority: 'high',
          primaryRole: ResourceType.PM_DEV_HYBRID,
          effortHours: 16,
          effortInSprints: 0.4,
          confidence: 'low',
          primarySkill: 'skill-pm',
          secondarySkill: 'skill-litify',
          domainTag: 'litify',
          urgency: 'normal',
          manualOverrides: [{ field: 'effortInSprints', originalValue: 0.5, overriddenValue: 0.4, note: 'Adjusted based on PM availability for this sprint' }],
        }),
        workItem('pwi-intake360-002', 'Map existing Intake360 workflows', 'pe-intake360-discovery', {
          primaryRole: ResourceType.DEVELOPER,
          effortHours: 8,
          effortInSprints: 0.2,
          confidence: 'low',
          primarySkill: 'skill-litify',
          domainTag: 'litify',
          urgency: 'normal',
        }),
      ],
    },
  ],
  sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — no Jira project yet' }],
  notes: 'Stub project — not yet started. Will be expanded in Wave 2.',
}

export const mockDocRetrievalProject: PlanningProject = {
  id: 'pp-doc-retrieval',
  name: 'Document Retrieval Workflow Modernization',
  description: 'Modernize the document retrieval workflow to reduce manual steps and improve turnaround time.',
  status: 'not-started',
  portfolio: 'EOL',
  priority: 'low',
  stage: 'backlog',
  planningType: 'evaluation-discovery',
  confidence: 'low',
  effortBand: 'M',
  owner: 'tm-leslie',
  epics: [
    {
      id: 'pe-docret-discovery',
      title: 'Process Analysis & Design',
      planningProjectId: 'pp-doc-retrieval',
      status: 'not-started',
      priority: 'medium',
      portfolio: 'EOL',
      estimatedSprints: 1,
      sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — doc retrieval discovery' }],
      notes: 'TODO Wave 2: link to EOL Jira epic when created.',
      workItems: [
        workItem('pwi-docret-001', 'Document current retrieval process', 'pe-docret-discovery', {
          primaryRole: ResourceType.PM_DEV_HYBRID,
          effortHours: 8,
          effortInSprints: 0.2,
          confidence: 'low',
          primarySkill: 'skill-docs',
          secondarySkill: 'skill-pm',
          domainTag: 'integration',
          urgency: 'low',
          manualOverrides: [{ field: 'effortInSprints', originalValue: 0.5, overriddenValue: 1.0, note: 'Extended based on user feedback complexity' }],
        }),
        workItem('pwi-docret-002', 'Design modernized retrieval workflow', 'pe-docret-discovery', {
          primaryRole: ResourceType.DEVELOPER,
          effortHours: 12,
          effortInSprints: 0.3,
          confidence: 'low',
          primarySkill: 'skill-integration',
          secondarySkill: 'skill-async',
          domainTag: 'integration',
          urgency: 'low',
        }),
      ],
    },
  ],
  sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — no Jira project yet' }],
  notes: 'Stub project — not yet started. Will be expanded in Wave 2.',
}

// ── Notes / Tasking / Activity Model Cleanup (Backlog Container) ──

export const mockNotesTaskingProject: PlanningProject = {
  id: 'pp-notes-tasking',
  name: 'Notes / Tasking / Activity Model Cleanup',
  description: 'Backlog of cleanup and standardization tasks for notes, tasking, and activity tracking across EOL and ATI.',
  status: 'not-started',
  portfolio: 'EOL',
  priority: 'low',
  stage: 'backlog',
  planningType: 'backlog-container',
  confidence: 'low',
  effortBand: 'XL',
  owner: 'tm-lemuel',
  epics: [
    {
      id: 'pe-notes-cleanup',
      title: 'Notes & Activity Cleanup',
      planningProjectId: 'pp-notes-tasking',
      status: 'not-started',
      portfolio: 'EOL',
      estimatedSprints: 2,
      sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — notes/tasking cleanup backlog' }],
      notes: 'Backlog container — items require individual scoping before sprint assignment.',
      workItems: [
        workItem('pwi-notes-001', 'Audit note field usage across EOL and ATI', 'pe-notes-cleanup', {
          primaryRole: ResourceType.PM_DEV_HYBRID,
          effortHours: 8,
          effortInSprints: 0.2,
          confidence: 'low',
          primarySkill: 'skill-reporting',
          secondarySkill: 'skill-sf-data',
          domainTag: 'sales-cloud',
          urgency: 'low',
        }),
        workItem('pwi-notes-002', 'Standardize activity timeline fields', 'pe-notes-cleanup', {
          primaryRole: ResourceType.DEVELOPER,
          effortHours: 16,
          effortInSprints: 0.4,
          confidence: 'low',
          primarySkill: 'skill-sf-config',
          domainTag: 'sales-cloud',
          urgency: 'low',
        }),
      ],
    },
  ],
  sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — notes/tasking cleanup backlog' }],
  notes: 'This is a backlog container. Individual items require scoping before sprint assignment.',
}

// ── All Planning Projects ─────────────────────────────────────
// mockPlanningProjects: the 3 active projects (kept for backward compat with existing tests)
export const mockPlanningProjects: PlanningProject[] = [
  mockCallSofiaProject,
  mockSalesCloudProject,
  mockRingCentralProject,
]

// mockAllPlanningProjects: all 6 projects including future stubs and backlog container
export const mockAllPlanningProjects: PlanningProject[] = [
  mockCallSofiaProject,
  mockSalesCloudProject,
  mockRingCentralProject,
  mockIntake360Project,
  mockDocRetrievalProject,
  mockNotesTaskingProject,
]
