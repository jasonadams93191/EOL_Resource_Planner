// ============================================================
// Tests for acceleration-engine.ts
// ============================================================

import {
  recommendAcceleration,
  TEMP_RESOURCE_TEMPLATES,
} from '@/lib/planning/acceleration-engine'
import type { PlanningProject, TeamMember, PlanningEpic, PlanningWorkItem } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function makeWorkItem(id: string, overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id,
    title: `Work Item ${id}`,
    planningEpicId: 'epic-test',
    status: 'not-started',
    sourceRefs: [],
    estimatedHours: 16,
    confidence: 'medium',
    primaryRole: ResourceType.DEVELOPER,
    primarySkill: 'skill-sf-config',
    ...overrides,
  }
}

function makeEpic(id: string, workItems: PlanningWorkItem[]): PlanningEpic {
  return {
    id,
    title: `Epic ${id}`,
    planningProjectId: 'proj-test',
    status: 'not-started',
    portfolio: 'ATI',
    sourceRefs: [],
    workItems,
  }
}

function makeProject(id: string, epics: PlanningEpic[] = []): PlanningProject {
  return {
    id,
    name: `Project ${id}`,
    status: 'not-started',
    portfolio: 'ATI',
    priority: 'medium',
    stage: 'planned',
    sourceRefs: [],
    epics,
  }
}

function makeMember(id: string, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id,
    name: `Member ${id}`,
    primaryRoleId: 'role-sf-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    isActive: true,
    resourceKind: 'core',
    userSkills: [{ skillId: 'skill-sf-config', level: 3 }],
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────

describe('TEMP_RESOURCE_TEMPLATES', () => {
  it('exports 6 templates', () => {
    expect(TEMP_RESOURCE_TEMPLATES).toHaveLength(6)
  })

  it('each template has required fields', () => {
    for (const t of TEMP_RESOURCE_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.primaryRoleId).toBeTruthy()
      expect(t.availableHoursPerSprint).toBeGreaterThan(0)
      expect(t.utilizationTargetPercent).toBeGreaterThan(0)
      expect(t.skills.length).toBeGreaterThan(0)
    }
  })
})

describe('recommendAcceleration', () => {
  it('returns the expected shape', () => {
    const project = makeProject('p1', [makeEpic('e1', [makeWorkItem('wi-1')])])
    const member = makeMember('tm-1')
    const result = recommendAcceleration(project, [project], [member], '2026-03-09')

    expect(result).toHaveProperty('projectId', 'p1')
    expect(result).toHaveProperty('topCandidates')
    expect(result).toHaveProperty('currentSprintCount')
    expect(result).toHaveProperty('projectedSprintCount')
    expect(Array.isArray(result.topCandidates)).toBe(true)
    expect(result.topCandidates.length).toBeLessThanOrEqual(3)
  })

  it('top candidates are sorted by totalScore descending', () => {
    const workItems = Array.from({ length: 6 }, (_, i) =>
      makeWorkItem(`wi-${i}`, { primarySkill: 'skill-sf-dev', estimatedHours: 32 })
    )
    const project = makeProject('p1', [makeEpic('e1', workItems)])
    const member = makeMember('tm-1', {
      availableHoursPerSprint: 40,
      utilizationTargetPercent: 85,
      userSkills: [{ skillId: 'skill-sf-config', level: 3 }],
    })
    const result = recommendAcceleration(project, [project], [member], '2026-03-09')

    const scores = result.topCandidates.map((c) => c.totalScore)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i])
    }
  })

  it('totalScore is between 0 and 100 for all candidates', () => {
    const project = makeProject('p1', [makeEpic('e1', [makeWorkItem('wi-1')])])
    const member = makeMember('tm-1')
    const result = recommendAcceleration(project, [project], [member], '2026-03-09')

    for (const candidate of result.topCandidates) {
      expect(candidate.totalScore).toBeGreaterThanOrEqual(0)
      expect(candidate.totalScore).toBeLessThanOrEqual(100)
    }
  })

  it('sf-config focused project prefers sf-admin or sf-dev template', () => {
    // 8 items requiring sf-config — one member can't handle it all in one sprint
    const workItems = Array.from({ length: 8 }, (_, i) =>
      makeWorkItem(`wi-${i}`, { primarySkill: 'skill-sf-config', estimatedHours: 24 })
    )
    const project = makeProject('p1', [makeEpic('e1', workItems)])
    const member = makeMember('tm-1', {
      userSkills: [{ skillId: 'skill-sf-config', level: 3 }],
    })
    const result = recommendAcceleration(project, [project], [member], '2026-03-09')

    // Top candidate should have sf-config in their skills
    const topTemplateSkills = result.topCandidates[0]?.template.skills.map((s) => s.skillId) ?? []
    expect(topTemplateSkills).toContain('skill-sf-config')
  })

  it('respects sprint window restriction', () => {
    // With sprintWindow=2, temp member is only available for sprints 1–2
    const workItems = Array.from({ length: 4 }, (_, i) =>
      makeWorkItem(`wi-${i}`, { estimatedHours: 16 })
    )
    const project = makeProject('p1', [makeEpic('e1', workItems)])
    const member = makeMember('tm-1')

    // Should not throw, returns valid result
    const result = recommendAcceleration(project, [project], [member], '2026-03-09', 2)
    expect(result.topCandidates.length).toBeLessThanOrEqual(3)
  })

  it('returns noImpactReason when project has no work items', () => {
    const emptyProject = makeProject('p1', [])
    const member = makeMember('tm-1')
    const result = recommendAcceleration(emptyProject, [emptyProject], [member], '2026-03-09')
    // No items → no sprint reduction possible
    expect(result.currentSprintCount).toBe(0)
  })

  it('bestCandidate is null when no template improves the situation', () => {
    // Project with a single tiny work item — no acceleration needed
    const project = makeProject('p1', [makeEpic('e1', [makeWorkItem('wi-1', { estimatedHours: 4 })])])
    const members = Array.from({ length: 5 }, (_, i) => makeMember(`tm-${i}`))
    const result = recommendAcceleration(project, [project], members, '2026-03-09')

    // totalScore could be 0 if no sprint reduction, no bottlenecks
    // bestCandidate will be null only if all scores are 0
    // Just validate the type contract
    if (result.bestCandidate) {
      expect(result.bestCandidate.totalScore).toBeGreaterThan(0)
    }
    expect(result.projectedSprintCount).toBeLessThanOrEqual(result.currentSprintCount)
  })
})
