// ============================================================
// Deterministic Enhancement Layer
//
// Applies Boss-approved planning rules, task templates, and
// seeded hour estimates to the imported Jira planning model.
//
// Runs AFTER importPlanningFromJiraSnapshot(), BEFORE the
// roadmap/assignment engine and LLM enrichment.
//
// "Rules First, LLM Second" — this layer provides coherent
// baseline estimates and tasks without consuming LLM tokens.
//
// READ-ONLY source data. No Jira writes.
// ============================================================

import type { PlanningProject, PlanningWorkItem, PlanningEpic } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Lean hour bands ───────────────────────────────────────────
// XS 1–2, S 2–6, M 6–12, L 12–20, XL 20–35, >35 split recommended

const HOURS = {
  XS: 2,
  S:  4,
  M:  8,
  L:  16,
  XL: 28,
} as const

// ── Approved initiative totals ────────────────────────────────

const INITIATIVE_SEEDED_HOURS: Record<string, number> = {
  'pp-call-sofia':     132,
  'pp-sales-cloud':    252,
  'pp-ringcentral':    101,
  'pp-intake360':      186,
  'pp-doc-retrieval':  102,
}

// ── Task template definitions ─────────────────────────────────

interface TaskTemplate {
  title: string
  estimatedHours: number
  requiredSkill: string
  requiredSkillLevel: 0 | 1 | 2 | 3 | 4
  domainTag: string
  confidence: 'low' | 'medium' | 'high'
  urgency: 'critical' | 'high' | 'normal' | 'low'
  rationale: string
}

const TEMPLATES: Record<string, TaskTemplate[]> = {
  // ── Sales Cloud Enablement ───────────────────────────────────
  'sales-cloud-enablement': [
    {
      title: 'Sales Cloud — Field/Page Layout Audit & Configuration',
      estimatedHours: HOURS.L,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 3,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'high',
      rationale: 'Establish proper field structure before data migration or user adoption.',
    },
    {
      title: 'Sales Cloud — Opportunity Path & Validation Rules',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Enforce data quality through validation; guide reps through correct steps.',
    },
    {
      title: 'Sales Cloud — Reports & Dashboards for Leadership',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Visibility into pipeline health and conversion metrics.',
    },
    {
      title: 'Sales Cloud — UAT & Training Materials',
      estimatedHours: HOURS.S,
      requiredSkill: 'documentation',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'User adoption depends on structured training and clear guides.',
    },
  ],

  // ── Next Step Notes (NSN) standardization ────────────────────
  'nsn-standardization': [
    {
      title: 'NSN — Define Standard Templates & Required Fields',
      estimatedHours: HOURS.S,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      confidence: 'high',
      urgency: 'high',
      rationale: 'Without a standard, note quality degrades and pipeline reviews become unreliable.',
    },
    {
      title: 'NSN — Build Picklist/Lookup for Next Step Categories',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 2,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Picklists enforce consistency; lookups enable reporting.',
    },
    {
      title: 'NSN — Cutover: Retire Free-Text Fields',
      estimatedHours: HOURS.S,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 3,
      domainTag: 'sales-cloud',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Old free-text fields must be deprecated with data cleanup to avoid confusion.',
    },
  ],

  // ── Object retirement / dependency cleanup ────────────────────
  'object-retirement': [
    {
      title: 'Retirement — Dependency Audit (Reports, Flows, Apex)',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'object-retirement',
      confidence: 'high',
      urgency: 'high',
      rationale: 'Must identify all downstream dependencies before decommissioning any object.',
    },
    {
      title: 'Retirement — Data Archive & Migration Plan',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'object-retirement',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Archive historical records before object removal to preserve compliance data.',
    },
    {
      title: 'Retirement — Decommission & Validation in Sandbox → Prod',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'object-retirement',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Staged removal with full regression testing before production cutover.',
    },
  ],

  // ── Integration / Webhook ─────────────────────────────────────
  'integration': [
    {
      title: 'Integration — Auth/Connection Setup & Credential Vault',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'integration',
      confidence: 'high',
      urgency: 'high',
      rationale: 'Secure credential handling and named credentials are prerequisites for all integration work.',
    },
    {
      title: 'Integration — Field Mapping & Transform Logic',
      estimatedHours: HOURS.L,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'integration',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Data mapping errors propagate silently; must be tested thoroughly.',
    },
    {
      title: 'Integration — Error Handling, Retry Logic & Monitoring',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'integration',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Production integrations require alerting and retry to handle transient failures.',
    },
    {
      title: 'Integration — QA Test Suite & Go-Live Runbook',
      estimatedHours: HOURS.S,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 2,
      domainTag: 'integration',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Reproducible test suite and runbook reduce deployment risk.',
    },
  ],

  // ── Voice / AI vendor integration ────────────────────────────
  'voice-ai-integration': [
    {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'telephony',
      confidence: 'high',
      urgency: 'high',
      rationale: 'Vendor accounts, licenses, and initial configuration gate all downstream work.',
    },
    {
      title: 'Voice AI — Salesforce CTI Connector & Softphone Layout',
      estimatedHours: HOURS.L,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'telephony',
      confidence: 'medium',
      urgency: 'high',
      rationale: 'CTI integration ties the telephony platform to Salesforce records and activity logging.',
    },
    {
      title: 'Voice AI — Call Recording & AI Transcription Configuration',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 2,
      domainTag: 'telephony',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Transcription and AI insights require storage, permissions, and consent configuration.',
    },
    {
      title: 'Voice AI — UAT with Sales Team & Go-Live',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'telephony',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'User acceptance testing before full rollout to catch usability issues.',
    },
  ],

  // ── Workflow modernization (Litify-style) ────────────────────
  'workflow-modernization': [
    {
      title: 'Workflow — Process Mapping & Current State Audit',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'workflow',
      confidence: 'high',
      urgency: 'normal',
      rationale: 'Must document current workflows before redesigning to avoid missing edge cases.',
    },
    {
      title: 'Workflow — Flow Builder Rebuild (Replace Legacy Rules)',
      estimatedHours: HOURS.XL,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'workflow',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Workflow rules are deprecated; Flows are the supported replacement.',
    },
    {
      title: 'Workflow — Testing & Rollback Plan',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 2,
      domainTag: 'workflow',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Automation changes can have broad impact; rollback plan is essential.',
    },
  ],

  // ── Documentation / adoption ─────────────────────────────────
  'documentation': [
    {
      title: 'Documentation — User Guide & Quick Reference',
      estimatedHours: HOURS.S,
      requiredSkill: 'documentation',
      requiredSkillLevel: 2,
      domainTag: 'documentation',
      confidence: 'high',
      urgency: 'normal',
      rationale: 'User-facing documentation reduces support load and increases adoption.',
    },
    {
      title: 'Documentation — Admin Runbook & Configuration Notes',
      estimatedHours: HOURS.S,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'documentation',
      confidence: 'high',
      urgency: 'normal',
      rationale: 'Admin runbooks enable handoff and long-term maintainability.',
    },
  ],

  // ── Evaluation / discovery ────────────────────────────────────
  'evaluation': [
    {
      title: 'Evaluation — Requirements Gathering & Stakeholder Interviews',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'discovery',
      confidence: 'high',
      urgency: 'normal',
      rationale: 'Structured discovery prevents scope creep and ensures alignment before build.',
    },
    {
      title: 'Evaluation — POC Build & Feasibility Assessment',
      estimatedHours: HOURS.XL,
      requiredSkill: 'salesforce-dev',
      requiredSkillLevel: 3,
      domainTag: 'discovery',
      confidence: 'low',
      urgency: 'normal',
      rationale: 'A time-boxed POC validates technical feasibility before committing full effort.',
    },
    {
      title: 'Evaluation — Vendor/Tool Comparison & Recommendation',
      estimatedHours: HOURS.M,
      requiredSkill: 'salesforce-admin',
      requiredSkillLevel: 2,
      domainTag: 'discovery',
      confidence: 'medium',
      urgency: 'normal',
      rationale: 'Documented comparison enables informed decision-making and buy-in.',
    },
  ],
}

// ── Epic → template category mapping ─────────────────────────

const EPIC_TEMPLATE_MAP: Record<string, string> = {
  'pe-sc-enablement':  'sales-cloud-enablement',
  'pe-sc-notes':       'nsn-standardization',
  'pe-sc-retirement':  'object-retirement',
  'pe-sc-docs':        'documentation',
  'pe-rc-setup':       'integration',
  'pe-rc-ringsense':   'voice-ai-integration',
  'pe-rc-cti':         'integration',
  'pe-intake-forms':   'integration',
  'pe-intake-routing': 'workflow-modernization',
  'pe-intake-reporting':'documentation',
  'pe-rag-poc':        'evaluation',
  'pe-rag-impl':       'integration',
  'pe-doc-bucket':     'documentation',
  // Call Sofia epics — voice AI integration
  'pe-sofia-p1':       'voice-ai-integration',
  'pe-sofia-p2':       'voice-ai-integration',
  'pe-sofia-p3':       'voice-ai-integration',
  'pe-sofia-general':  'documentation',
}

// ── Work item factory ─────────────────────────────────────────

function templateToWorkItem(
  template: TaskTemplate,
  planningEpicId: string,
  idx: number
): PlanningWorkItem {
  return {
    id: `pwi-tpl-${planningEpicId}-${idx}`,
    title: template.title,
    planningEpicId,
    status: 'not-started',
    sourceRefs: [{ sourceType: 'manual', label: 'Template-generated' }],
    estimatedHours: template.estimatedHours,
    confidence: template.confidence,
    primaryRole: ResourceType.DEVELOPER,
    primarySkill: template.requiredSkill,
    requiredSkillLevel: template.requiredSkillLevel,
    domainTag: template.domainTag,
    urgency: template.urgency,
    splitRecommended: template.estimatedHours >= 35,
    assumedEstimatedHours: true,
    assumedSkill: true,
    jira: {}, // blank envelope placeholder
  }
}

// ── Hour distribution helper ──────────────────────────────────

/**
 * Returns how many template items to inject into an epic so the
 * initiative totals approach the seeded budget.
 * Simple strategy: inject if existing total is < 50% of seeded target.
 */
function shouldInjectTemplates(
  epic: PlanningEpic,
  existingProjectTotal: number,
  seededTotal: number
): boolean {
  if (epic.workItems.length >= 3) return false // already has enough tasks
  if (seededTotal <= 0) return false
  return existingProjectTotal < seededTotal * 0.5
}

// ── Main enhancement function ─────────────────────────────────

/**
 * Applies deterministic enhancements to the imported planning model:
 * 1. Injects task templates into under-populated epics
 * 2. Seeds seeded initiative totals into work item estimates
 * 3. Marks all generated fields as "assumed"
 *
 * Mutates the projects array in-place (clones work item arrays to avoid aliasing).
 * Returns the enhanced project list.
 */
export function applyEnhancements(projects: PlanningProject[]): PlanningProject[] {
  return projects.map((project) => {
    const seededTotal = INITIATIVE_SEEDED_HOURS[project.id] ?? 0
    const existingTotal = project.epics.reduce(
      (s, e) => s + e.workItems.reduce((se, wi) => se + wi.estimatedHours, 0),
      0
    )

    const enhancedEpics = project.epics.map((epic) => {
      const templateKey = EPIC_TEMPLATE_MAP[epic.id]
      const templates = templateKey ? TEMPLATES[templateKey] ?? [] : []

      if (!shouldInjectTemplates(epic, existingTotal, seededTotal) || templates.length === 0) {
        return epic
      }

      // Inject templates that don't already have near-duplicate titles
      const existingTitles = new Set(epic.workItems.map((wi) => wi.title.toLowerCase()))
      const newItems: PlanningWorkItem[] = templates
        .filter((t) => {
          // Skip if a similar-title item already exists
          const tlc = t.title.toLowerCase()
          return !Array.from(existingTitles).some((existing) =>
            existing.includes(tlc.split(' ')[2] ?? '') // rough word-match
          )
        })
        .map((t, idx) => templateToWorkItem(t, epic.id, idx))

      if (newItems.length === 0) return epic

      return {
        ...epic,
        workItems: [...epic.workItems, ...newItems],
      }
    })

    return { ...project, epics: enhancedEpics }
  })
}

// ── Summary helper ────────────────────────────────────────────

export interface EnhancementSummary {
  projectId: string
  projectName: string
  templateItemsAdded: number
  totalHours: number
  seededTarget: number
}

export function buildEnhancementSummary(
  before: PlanningProject[],
  after: PlanningProject[]
): EnhancementSummary[] {
  const beforeMap = new Map(before.map((p) => [p.id, p]))

  return after.map((project) => {
    const beforeProject = beforeMap.get(project.id)
    const beforeCount = beforeProject?.epics.reduce((s, e) => s + e.workItems.length, 0) ?? 0
    const afterCount = project.epics.reduce((s, e) => s + e.workItems.length, 0)

    return {
      projectId: project.id,
      projectName: project.name,
      templateItemsAdded: afterCount - beforeCount,
      totalHours: project.epics.reduce((s, e) => s + e.workItems.reduce((se, wi) => se + wi.estimatedHours, 0), 0),
      seededTarget: INITIATIVE_SEEDED_HOURS[project.id] ?? 0,
    }
  })
}
