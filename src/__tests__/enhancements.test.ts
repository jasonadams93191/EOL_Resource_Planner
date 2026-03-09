// ============================================================
// Enhancement Layer — Unit Tests
//
// Validates: stable IDs, dedupe, override-safe updates,
// in-place mutation across repeated sync/enhance runs.
// ============================================================

import {
  normalizeTitle,
  templateWorkItemId,
  applyEnhancements,
  applyEnhancementsWithStats,
} from '@/lib/planning/enhancements'
import type { PlanningProject, PlanningWorkItem, PlanningEpic } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function makeEpic(id: string, projectId: string, workItems: PlanningWorkItem[] = []): PlanningEpic {
  return {
    id,
    title: `Epic ${id}`,
    planningProjectId: projectId,
    status: 'not-started',
    sourceRefs: [],
    workItems,
    portfolio: 'EOL' as import('@/types/planning').Portfolio,
  }
}

function makeProject(id: string, epics: PlanningEpic[]): PlanningProject {
  return {
    id,
    name: `Project ${id}`,
    portfolio: 'EOL' as import('@/types/planning').Portfolio,
    priority: 'high',
    stage: 'defined',
    status: 'not-started',
    sourceRefs: [],
    epics,
    confidence: 'medium',
  }
}

function makeWorkItem(id: string, epicId: string, overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id,
    title: id,
    planningEpicId: epicId,
    status: 'not-started',
    sourceRefs: [{ sourceType: 'manual', label: 'Test' }],
    estimatedHours: 8,
    confidence: 'medium',
    primaryRole: ResourceType.DEVELOPER,
    ...overrides,
  }
}

// A project that triggers template injection (seeded total exists + epic has < 3 items)
function makeSofiaProject(epics?: PlanningEpic[]): PlanningProject {
  return makeProject('pp-call-sofia', epics ?? [makeEpic('pe-sofia-p1', 'pp-call-sofia')])
}

// ── normalizeTitle ────────────────────────────────────────────

describe('normalizeTitle', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(normalizeTitle('Voice AI — Vendor Setup')).toBe('voice-ai-vendor-setup')
  })

  it('strips leading/trailing hyphens', () => {
    expect(normalizeTitle('  — title — ')).toBe('title')
  })

  it('truncates to 50 characters', () => {
    const long = 'a'.repeat(80)
    expect(normalizeTitle(long)).toHaveLength(50)
  })

  it('is idempotent', () => {
    const t = 'Sales Cloud — Field Audit'
    expect(normalizeTitle(normalizeTitle(t))).toBe(normalizeTitle(t))
  })
})

// ── templateWorkItemId ────────────────────────────────────────

describe('templateWorkItemId', () => {
  it('produces a stable ID from epic + title', () => {
    const id1 = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const id2 = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    expect(id1).toBe(id2)
  })

  it('differs for different epics with the same title', () => {
    const id1 = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const id2 = templateWorkItemId('pe-sofia-p2', 'Voice AI — Vendor Provisioning & Tenant Setup')
    expect(id1).not.toBe(id2)
  })

  it('differs for different titles in the same epic', () => {
    const id1 = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const id2 = templateWorkItemId('pe-sofia-p1', 'Voice AI — Salesforce CTI Connector & Softphone Layout')
    expect(id1).not.toBe(id2)
  })

  it('starts with the pwi-tpl- prefix', () => {
    expect(templateWorkItemId('pe-sofia-p1', 'Any Title')).toMatch(/^pwi-tpl-pe-sofia-p1-/)
  })
})

// ── Stable IDs across repeated runs ──────────────────────────

describe('stable IDs across repeated enhancement runs', () => {
  it('produces the same work item IDs on run 1 and run 2', () => {
    const project = makeSofiaProject()

    const run1 = applyEnhancements([project])
    const ids1 = run1[0].epics.flatMap((e) => e.workItems.map((wi) => wi.id)).sort()

    const run2 = applyEnhancements(run1)
    const ids2 = run2[0].epics.flatMap((e) => e.workItems.map((wi) => wi.id)).sort()

    expect(ids1).toEqual(ids2)
  })

  it('does not increase the work item count on re-enhancement', () => {
    const project = makeSofiaProject()

    const run1 = applyEnhancements([project])
    const count1 = run1[0].epics.reduce((s, e) => s + e.workItems.length, 0)

    const run2 = applyEnhancements(run1)
    const count2 = run2[0].epics.reduce((s, e) => s + e.workItems.length, 0)

    expect(count2).toBe(count1)
  })

  it('preserves non-template items across re-enhancement', () => {
    const existingItem = makeWorkItem('existing-jira-item', 'pe-sofia-p1', {
      jira: { issueKey: 'ATI-123' },
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [existingItem]),
    ])

    const result = applyEnhancements([project])
    const allItems = result[0].epics[0].workItems
    expect(allItems.some((wi) => wi.id === 'existing-jira-item')).toBe(true)
  })
})

// ── Deduplicate ───────────────────────────────────────────────

describe('deduplicate template injection', () => {
  it('does not inject a template if a work item with the same normalized title already exists', () => {
    // Pre-populate with an item whose title normalizes to the same key as a template
    const existing = makeWorkItem('pre-existing', 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup', // matches first voice-ai template
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [existing]),
    ])

    const result = applyEnhancements([project])
    const items = result[0].epics[0].workItems
    // The existing item should be present, but no duplicate with the template title
    const matchingItems = items.filter(
      (wi) => normalizeTitle(wi.title) === normalizeTitle('Voice AI — Vendor Provisioning & Tenant Setup')
    )
    expect(matchingItems).toHaveLength(1)
  })

  it('injects templates that are not already covered', () => {
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia'), // empty epic
    ])

    const result = applyEnhancements([project])
    const items = result[0].epics[0].workItems
    // Should inject voice-ai-integration templates (4 templates)
    expect(items.length).toBeGreaterThan(0)
  })
})

// ── Override-safe updates ─────────────────────────────────────

describe('override-safe field updates', () => {
  it('does not overwrite estimatedHours when assumedEstimatedHours=false', () => {
    // Pre-populate with a template item that has assumedEstimatedHours=false (user override)
    const stableId = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const overriddenItem = makeWorkItem(stableId, 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      estimatedHours: 99, // user set this manually
      assumedEstimatedHours: false, // override flag cleared
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [overriddenItem]),
    ])

    const result = applyEnhancements([project])
    const found = result[0].epics[0].workItems.find((wi) => wi.id === stableId)
    expect(found).toBeDefined()
    expect(found!.estimatedHours).toBe(99) // user value preserved
    expect(found!.assumedEstimatedHours).toBe(false) // flag stays false
  })

  it('does not overwrite primarySkill when assumedSkill=false', () => {
    const stableId = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const overriddenItem = makeWorkItem(stableId, 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      primarySkill: 'custom-skill',
      assumedSkill: false,
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [overriddenItem]),
    ])

    const result = applyEnhancements([project])
    const found = result[0].epics[0].workItems.find((wi) => wi.id === stableId)
    expect(found!.primarySkill).toBe('custom-skill')
    expect(found!.assumedSkill).toBe(false)
  })

  it('does not overwrite requiredSkillLevel when assumedRequiredSkillLevel=false', () => {
    const stableId = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const overriddenItem = makeWorkItem(stableId, 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      requiredSkillLevel: 4,
      assumedRequiredSkillLevel: false,
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [overriddenItem]),
    ])

    const result = applyEnhancements([project])
    const found = result[0].epics[0].workItems.find((wi) => wi.id === stableId)
    expect(found!.requiredSkillLevel).toBe(4)
    expect(found!.assumedRequiredSkillLevel).toBe(false)
  })

  it('updates fields that are still assumed (flag=true)', () => {
    const stableId = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    // Template says 8h (HOURS.M), item has outdated value
    const outdatedItem = makeWorkItem(stableId, 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      estimatedHours: 1, // stale value
      assumedEstimatedHours: true, // still assumed → may update
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [outdatedItem]),
    ])

    const result = applyEnhancements([project])
    const found = result[0].epics[0].workItems.find((wi) => wi.id === stableId)
    // Template value for Voice AI — Vendor Provisioning is HOURS.M = 8
    expect(found!.estimatedHours).toBe(8)
  })
})

// ── Stats output ──────────────────────────────────────────────

describe('applyEnhancementsWithStats', () => {
  it('returns tasksAdded > 0 when templates are injected', () => {
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia'), // empty
    ])

    const { stats } = applyEnhancementsWithStats([project])
    const stat = stats.find((s) => s.projectId === 'pp-call-sofia')
    expect(stat).toBeDefined()
    expect(stat!.tasksAdded).toBeGreaterThan(0)
  })

  it('returns overridesPreserved when assumedX=false flags exist', () => {
    const stableId = templateWorkItemId('pe-sofia-p1', 'Voice AI — Vendor Provisioning & Tenant Setup')
    const overriddenItem = makeWorkItem(stableId, 'pe-sofia-p1', {
      title: 'Voice AI — Vendor Provisioning & Tenant Setup',
      estimatedHours: 99,
      assumedEstimatedHours: false,
      assumedSkill: false,
      assumedRequiredSkillLevel: false,
    })
    const project = makeSofiaProject([
      makeEpic('pe-sofia-p1', 'pp-call-sofia', [overriddenItem]),
    ])

    const { stats } = applyEnhancementsWithStats([project])
    const stat = stats.find((s) => s.projectId === 'pp-call-sofia')
    expect(stat!.overridesPreserved).toBeGreaterThanOrEqual(3) // all 3 fields preserved
  })

  it('returns lastEnhancedAt as a recent ISO timestamp', () => {
    const project = makeSofiaProject()
    const before = Date.now()
    const { stats } = applyEnhancementsWithStats([project])
    const after = Date.now()

    const stat = stats[0]
    const ts = new Date(stat.lastEnhancedAt).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('increments enhancementVersion on each pass', () => {
    const project = makeSofiaProject([makeEpic('pe-sofia-p1', 'pp-call-sofia')])

    const run1 = applyEnhancements([project])
    const run2 = applyEnhancements(run1)

    const itemRun1 = run1[0].epics[0].workItems.find((wi) => wi.enhancedBy === 'rules')
    const itemRun2 = run2[0].epics[0].workItems.find(
      (wi) => wi.id === itemRun1?.id
    )

    expect(itemRun1?.enhancementVersion).toBe(1)
    expect(itemRun2?.enhancementVersion).toBe(2)
  })
})
