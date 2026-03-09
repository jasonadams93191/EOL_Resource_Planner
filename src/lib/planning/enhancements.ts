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
// Guarantees:
//   1. STABLE IDs: template work-item IDs are derived from
//      (epicId, normalizedTitle) — identical across re-runs.
//   2. OVERRIDE-SAFE: fields whose assumedX=false flag was
//      cleared by a UI edit are never overwritten.
//   3. DEDUPE: templates are not injected if a work item
//      with a matching normalizedTitleKey already exists
//      in the epic (Jira-imported or previously injected).
//   4. IN-PLACE: existing template items are updated rather
//      than recreated, preserving identity across syncs.
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

// ── Title normalisation (stable ID key) ──────────────────────
//
// Produces a URL-slug–style key from a title that is:
//   - stable across whitespace / punctuation changes
//   - scoped to (epicId, normalizedKey) for uniqueness

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

// ── Stable work-item ID ───────────────────────────────────────

export function templateWorkItemId(epicId: string, title: string): string {
  return `pwi-tpl-${epicId}-${normalizeTitle(title)}`
}

// ── Override-safe field merge ─────────────────────────────────
//
// Rules:
//   assumedX === false  → user has overridden this field → skip, increment overridesPreserved
//   assumedX === true | undefined → enhancement may write → update if value differs

interface MergeResult {
  item: PlanningWorkItem
  fieldsUpdated: number
  overridesPreserved: number
}

function mergeTemplate(
  existing: PlanningWorkItem,
  template: TaskTemplate,
  now: string
): MergeResult {
  const next: PlanningWorkItem = { ...existing }
  let fieldsUpdated = 0
  let overridesPreserved = 0

  // estimatedHours
  if (existing.assumedEstimatedHours !== false) {
    if (next.estimatedHours !== template.estimatedHours) {
      next.estimatedHours = template.estimatedHours
      fieldsUpdated++
    }
    next.assumedEstimatedHours = true
  } else {
    overridesPreserved++
  }

  // primarySkill
  if (existing.assumedSkill !== false) {
    if (next.primarySkill !== template.requiredSkill) {
      next.primarySkill = template.requiredSkill
      fieldsUpdated++
    }
    next.assumedSkill = true
  } else {
    overridesPreserved++
  }

  // requiredSkillLevel
  if (existing.assumedRequiredSkillLevel !== false) {
    if (next.requiredSkillLevel !== template.requiredSkillLevel) {
      next.requiredSkillLevel = template.requiredSkillLevel
      fieldsUpdated++
    }
    next.assumedRequiredSkillLevel = true
  } else {
    overridesPreserved++
  }

  next.lastEnhancedAt = now
  next.enhancedBy = 'rules'
  next.enhancementVersion = (existing.enhancementVersion ?? 0) + 1

  return { item: next, fieldsUpdated, overridesPreserved }
}

// ── New work item from template ───────────────────────────────

function templateToWorkItem(
  template: TaskTemplate,
  epicId: string,
  now: string
): PlanningWorkItem {
  return {
    id: templateWorkItemId(epicId, template.title),
    title: template.title,
    planningEpicId: epicId,
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
    assumedRequiredSkillLevel: true,
    lastEnhancedAt: now,
    enhancedBy: 'rules',
    enhancementVersion: 1,
    jira: {}, // blank envelope placeholder
  }
}

// ── Injection gate ────────────────────────────────────────────

function shouldInjectTemplates(
  epic: PlanningEpic,
  existingProjectTotal: number,
  seededTotal: number
): boolean {
  if (epic.workItems.length >= 3) return false
  if (seededTotal <= 0) return false
  return existingProjectTotal < seededTotal * 0.5
}

// ── Public stats types ────────────────────────────────────────

export interface EnhancementRunStats {
  projectId: string
  projectName: string
  tasksAdded: number
  fieldsUpdated: number
  overridesPreserved: number
  lastEnhancedAt: string
  enhancedBy: 'rules'
}

export interface EnhancementRunResult {
  projects: PlanningProject[]
  stats: EnhancementRunStats[]
}

// ── Core enhancement implementation ──────────────────────────

function enhanceEpic(
  epic: PlanningEpic,
  shouldInject: boolean,
  now: string
): { epic: PlanningEpic; tasksAdded: number; fieldsUpdated: number; overridesPreserved: number } {
  const templateKey = EPIC_TEMPLATE_MAP[epic.id]
  const templates = templateKey ? (TEMPLATES[templateKey] ?? []) : []

  if (templates.length === 0) {
    return { epic, tasksAdded: 0, fieldsUpdated: 0, overridesPreserved: 0 }
  }

  // Build lookup: stable ID → existing work item
  const existingById = new Map<string, PlanningWorkItem>()
  epic.workItems.forEach((wi) => existingById.set(wi.id, wi))

  // Build normalized-title set for ALL existing items (Jira + manual + template)
  // to deduplicate against non-template imports from Jira
  const existingNormalized = new Set(
    epic.workItems.map((wi) => normalizeTitle(wi.title))
  )

  const updatedItems: PlanningWorkItem[] = [...epic.workItems]
  let tasksAdded = 0
  let itemsReenhanced = 0    // existing template items that were touched this pass
  let totalFieldsUpdated = 0
  let totalOverridesPreserved = 0

  for (const template of templates) {
    const stableId = templateWorkItemId(epic.id, template.title)
    const existing = existingById.get(stableId)

    if (existing) {
      // In-place merge — update assumed fields + always bump lastEnhancedAt/version
      const { item, fieldsUpdated, overridesPreserved } = mergeTemplate(existing, template, now)
      const idx = updatedItems.findIndex((wi) => wi.id === stableId)
      if (idx >= 0) updatedItems[idx] = item
      totalFieldsUpdated += fieldsUpdated
      totalOverridesPreserved += overridesPreserved
      itemsReenhanced++
    } else if (shouldInject) {
      // Dedupe: skip if a non-template item already covers this title
      const normTitle = normalizeTitle(template.title)
      if (existingNormalized.has(normTitle)) continue

      updatedItems.push(templateToWorkItem(template, epic.id, now))
      existingNormalized.add(normTitle)
      tasksAdded++
    }
  }

  // Epic is dirty whenever we added items OR re-enhanced existing ones
  // (mergeTemplate always writes lastEnhancedAt + enhancementVersion)
  const epicChanged = tasksAdded > 0 || itemsReenhanced > 0
  return {
    epic: epicChanged ? { ...epic, workItems: updatedItems } : epic,
    tasksAdded,
    fieldsUpdated: totalFieldsUpdated,
    overridesPreserved: totalOverridesPreserved,
  }
}

// ── Main enhancement functions ────────────────────────────────

/**
 * Applies deterministic enhancements and returns both the enhanced
 * project list and per-initiative stats.
 */
export function applyEnhancementsWithStats(
  projects: PlanningProject[]
): EnhancementRunResult {
  const now = new Date().toISOString()
  const stats: EnhancementRunStats[] = []

  const enhanced = projects.map((project) => {
    const seededTotal = INITIATIVE_SEEDED_HOURS[project.id] ?? 0
    const existingTotal = project.epics.reduce(
      (s, e) => s + e.workItems.reduce((se, wi) => se + wi.estimatedHours, 0),
      0
    )

    let projectTasksAdded = 0
    let projectFieldsUpdated = 0
    let projectOverridesPreserved = 0

    const enhancedEpics = project.epics.map((epic) => {
      const inject = shouldInjectTemplates(epic, existingTotal, seededTotal)
      const { epic: nextEpic, tasksAdded, fieldsUpdated, overridesPreserved } =
        enhanceEpic(epic, inject, now)
      projectTasksAdded += tasksAdded
      projectFieldsUpdated += fieldsUpdated
      projectOverridesPreserved += overridesPreserved
      return nextEpic
    })

    stats.push({
      projectId: project.id,
      projectName: project.name,
      tasksAdded: projectTasksAdded,
      fieldsUpdated: projectFieldsUpdated,
      overridesPreserved: projectOverridesPreserved,
      lastEnhancedAt: now,
      enhancedBy: 'rules',
    })

    const changed = enhancedEpics.some((e, i) => e !== project.epics[i])
    return changed ? { ...project, epics: enhancedEpics } : project
  })

  return { projects: enhanced, stats }
}

/**
 * Convenience wrapper — returns only the enhanced project list.
 * Use `applyEnhancementsWithStats` when you need per-initiative stats.
 */
export function applyEnhancements(projects: PlanningProject[]): PlanningProject[] {
  return applyEnhancementsWithStats(projects).projects
}

// ── Summary helper (legacy) ───────────────────────────────────

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
      totalHours: project.epics.reduce(
        (s, e) => s + e.workItems.reduce((se, wi) => se + wi.estimatedHours, 0),
        0
      ),
      seededTarget: INITIATIVE_SEEDED_HOURS[project.id] ?? 0,
    }
  })
}
