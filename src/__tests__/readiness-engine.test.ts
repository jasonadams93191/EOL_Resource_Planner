// ============================================================
// Tests for readiness-engine.ts
// ============================================================

import { workItemReadiness, epicReadiness, getInitiativeWarnings } from '@/lib/planning/readiness-engine'
import type { PlanningWorkItem, PlanningEpic, PlanningProject, TeamMember } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function makeWorkItem(overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id: 'wi-test',
    title: 'Test Work Item',
    planningEpicId: 'epic-test',
    status: 'not-started',
    sourceRefs: [],
    effortHours: 8,
    confidence: 'medium',
    primaryRole: ResourceType.DEVELOPER,
    effortInSprints: 0.5,
    primarySkill: 'skill-sf-config',
    requiredSkillLevel: 2,
    ...overrides,
  }
}

function makeEpic(workItems: PlanningWorkItem[]): PlanningEpic {
  return {
    id: 'epic-test',
    title: 'Test Epic',
    planningProjectId: 'proj-test',
    status: 'not-started',
    portfolio: 'ATI',
    sourceRefs: [],
    workItems,
  }
}

function makeProject(overrides: Partial<PlanningProject> = {}): PlanningProject {
  return {
    id: 'proj-test',
    name: 'Test Project',
    status: 'not-started',
    portfolio: 'ATI',
    priority: 'medium',
    stage: 'planned',
    sourceRefs: [],
    epics: [],
    ...overrides,
  }
}

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'tm-test',
    name: 'Test Member',
    primaryRoleId: 'role-sf-dev',
    sprintCapacity: 1.0,
    isActive: true,
    userSkills: [{ skillId: 'skill-sf-config', level: 3 }],
    ...overrides,
  }
}

// ── workItemReadiness tests ────────────────────────────────────

describe('workItemReadiness', () => {
  test('returns ready when all fields set and medium confidence', () => {
    const item = makeWorkItem({ confidence: 'medium' })
    expect(workItemReadiness(item)).toBe('ready')
  })

  test('returns ready when all fields set and high confidence', () => {
    const item = makeWorkItem({ confidence: 'high' })
    expect(workItemReadiness(item)).toBe('ready')
  })

  test('returns partial when confidence is low', () => {
    const item = makeWorkItem({ confidence: 'low' })
    expect(workItemReadiness(item)).toBe('partial')
  })

  test('returns partial when primarySkill is missing', () => {
    const item = makeWorkItem({ primarySkill: undefined })
    expect(workItemReadiness(item)).toBe('partial')
  })

  test('returns partial when requiredSkillLevel is missing', () => {
    const item = makeWorkItem({ requiredSkillLevel: undefined })
    expect(workItemReadiness(item)).toBe('partial')
  })

  test('returns partial when effortInSprints is missing', () => {
    const item = makeWorkItem({ effortInSprints: undefined })
    expect(workItemReadiness(item)).toBe('partial')
  })

  test('returns needs-breakdown when effortInSprints >= 3.0', () => {
    const item = makeWorkItem({ effortInSprints: 3.0, confidence: 'high' })
    expect(workItemReadiness(item)).toBe('needs-breakdown')
  })

  test('returns needs-breakdown when effortInSprints > 3.0', () => {
    const item = makeWorkItem({ effortInSprints: 4.5, confidence: 'high' })
    expect(workItemReadiness(item)).toBe('needs-breakdown')
  })

  test('returns needs-breakdown when splitRecommended is true', () => {
    const item = makeWorkItem({ splitRecommended: true, effortInSprints: 0.5, confidence: 'high' })
    expect(workItemReadiness(item)).toBe('needs-breakdown')
  })

  test('needs-breakdown takes precedence over ready conditions', () => {
    const item = makeWorkItem({
      effortInSprints: 3.5,
      confidence: 'high',
      requiredSkillLevel: 2,
      primarySkill: 'skill-sf-config',
    })
    expect(workItemReadiness(item)).toBe('needs-breakdown')
  })
})

// ── epicReadiness tests ────────────────────────────────────────

describe('epicReadiness', () => {
  test('returns partial for epic with no work items', () => {
    const epic = makeEpic([])
    expect(epicReadiness(epic)).toBe('partial')
  })

  test('returns ready when all work items are ready', () => {
    const items = [
      makeWorkItem({ id: 'wi-1', confidence: 'high' }),
      makeWorkItem({ id: 'wi-2', confidence: 'medium' }),
    ]
    const epic = makeEpic(items)
    expect(epicReadiness(epic)).toBe('ready')
  })

  test('returns needs-breakdown when any work item is needs-breakdown', () => {
    const items = [
      makeWorkItem({ id: 'wi-1', confidence: 'high' }),
      makeWorkItem({ id: 'wi-2', effortInSprints: 3.5, confidence: 'high' }),
    ]
    const epic = makeEpic(items)
    expect(epicReadiness(epic)).toBe('needs-breakdown')
  })

  test('returns partial when mix of ready and partial items', () => {
    const items = [
      makeWorkItem({ id: 'wi-1', confidence: 'high' }),
      makeWorkItem({ id: 'wi-2', confidence: 'low' }),
    ]
    const epic = makeEpic(items)
    expect(epicReadiness(epic)).toBe('partial')
  })

  test('needs-breakdown takes precedence over partial', () => {
    const items = [
      makeWorkItem({ id: 'wi-1', confidence: 'low' }),
      makeWorkItem({ id: 'wi-2', effortInSprints: 5.0, confidence: 'low' }),
    ]
    const epic = makeEpic(items)
    expect(epicReadiness(epic)).toBe('needs-breakdown')
  })
})

// ── getInitiativeWarnings tests ────────────────────────────────

describe('getInitiativeWarnings', () => {
  test('detects low-confidence warning', () => {
    const project = makeProject({
      confidence: 'low',
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' }), makeWorkItem({ id: 'wi-2' })])],
    })
    const warnings = getInitiativeWarnings(project, [makeMember()])
    const types = warnings.map((w) => w.type)
    expect(types).toContain('low-confidence')
  })

  test('does not produce low-confidence warning when confidence is medium', () => {
    const project = makeProject({
      confidence: 'medium',
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' }), makeWorkItem({ id: 'wi-2' })])],
    })
    const warnings = getInitiativeWarnings(project, [makeMember()])
    expect(warnings.map((w) => w.type)).not.toContain('low-confidence')
  })

  test('detects inactive-owner warning', () => {
    const project = makeProject({
      owner: 'tm-inactive',
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' }), makeWorkItem({ id: 'wi-2' })])],
    })
    const inactiveMember = makeMember({ id: 'tm-inactive', isActive: false })
    const warnings = getInitiativeWarnings(project, [inactiveMember])
    expect(warnings.map((w) => w.type)).toContain('inactive-owner')
  })

  test('does not warn on inactive-owner if owner is active', () => {
    const project = makeProject({
      owner: 'tm-active',
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' }), makeWorkItem({ id: 'wi-2' })])],
    })
    const activeMember = makeMember({ id: 'tm-active', isActive: true })
    const warnings = getInitiativeWarnings(project, [activeMember])
    expect(warnings.map((w) => w.type)).not.toContain('inactive-owner')
  })

  test('detects under-scoped warning (fewer than 2 work items)', () => {
    const project = makeProject({
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' })])],
    })
    const warnings = getInitiativeWarnings(project, [makeMember()])
    expect(warnings.map((w) => w.type)).toContain('under-scoped')
  })

  test('does not warn under-scoped when 2+ work items', () => {
    const project = makeProject({
      epics: [makeEpic([makeWorkItem({ id: 'wi-1' }), makeWorkItem({ id: 'wi-2' })])],
    })
    const warnings = getInitiativeWarnings(project, [makeMember()])
    expect(warnings.map((w) => w.type)).not.toContain('under-scoped')
  })

  test('detects no-skill-match warning when no active member has required skill', () => {
    const project = makeProject({
      epics: [makeEpic([
        makeWorkItem({ id: 'wi-1', primarySkill: 'skill-rare' }),
        makeWorkItem({ id: 'wi-2' }),
      ])],
    })
    // Member has different skills
    const member = makeMember({ userSkills: [{ skillId: 'skill-sf-config', level: 3 }] })
    const warnings = getInitiativeWarnings(project, [member])
    expect(warnings.map((w) => w.type)).toContain('no-skill-match')
  })

  test('detects needs-breakdown warning via epic', () => {
    const project = makeProject({
      epics: [makeEpic([
        makeWorkItem({ id: 'wi-1', effortInSprints: 4.0, confidence: 'high' }),
        makeWorkItem({ id: 'wi-2' }),
      ])],
    })
    const warnings = getInitiativeWarnings(project, [makeMember()])
    expect(warnings.map((w) => w.type)).toContain('needs-breakdown')
  })

  test('detects spillover warning when roadmap has overflow for this project', () => {
    const project = makeProject({
      epics: [makeEpic([
        makeWorkItem({ id: 'wi-overflow-1' }),
        makeWorkItem({ id: 'wi-overflow-2' }),
      ])],
    })
    const fakeRoadmap = {
      sprints: [],
      workItemPlacements: [],
      overflowItems: ['wi-overflow-1'],
      bottlenecks: [],
      totalSprints: 1,
      startDate: '2026-03-09',
      endDate: '2026-03-22',
    }
    const warnings = getInitiativeWarnings(project, [makeMember()], fakeRoadmap)
    expect(warnings.map((w) => w.type)).toContain('spillover')
  })

  test('no spillover warning when overflow items are not from this project', () => {
    const project = makeProject({
      epics: [makeEpic([
        makeWorkItem({ id: 'wi-1' }),
        makeWorkItem({ id: 'wi-2' }),
      ])],
    })
    const fakeRoadmap = {
      sprints: [],
      workItemPlacements: [],
      overflowItems: ['wi-from-other-project'],
      bottlenecks: [],
      totalSprints: 1,
      startDate: '2026-03-09',
      endDate: '2026-03-22',
    }
    const warnings = getInitiativeWarnings(project, [makeMember()], fakeRoadmap)
    expect(warnings.map((w) => w.type)).not.toContain('spillover')
  })
})
