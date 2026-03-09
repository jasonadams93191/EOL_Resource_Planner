// ============================================================
// Tests for bottleneck-engine.ts
// ============================================================

import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import type { PlanningProject, PlanningEpic, PlanningWorkItem, TeamMember, Skill, Role } from '@/types/planning'
import type { SprintRoadmap, SprintDetail } from '@/lib/planning/sprint-engine'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function makeWorkItem(id: string, overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id,
    title: `Work Item ${id}`,
    planningEpicId: 'epic-test',
    status: 'not-started',
    sourceRefs: [],
    estimatedHours: 8,
    confidence: 'medium',
    primaryRole: ResourceType.DEVELOPER,
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

function makeProject(epics: PlanningEpic[] = []): PlanningProject {
  return {
    id: 'proj-test',
    name: 'Test Project',
    status: 'not-started',
    portfolio: 'ATI',
    priority: 'medium',
    stage: 'planned',
    sourceRefs: [],
    epics,
  }
}

// Default member: 40h/sprint, 85% utilization → targetPlannedHours = 34h, targetFraction = 0.85
function makeMember(id: string, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id,
    name: `Member ${id}`,
    primaryRoleId: 'role-sf-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    isActive: true,
    userSkills: [{ skillId: 'skill-sf-config', level: 3 }],
    ...overrides,
  }
}

function makeSkill(id: string, name: string): Skill {
  return { id, name }
}

function makeRole(id: string, name: string): Role {
  return { id, name }
}

// Helper to create a minimal SprintDetail with required new fields
function makeSprintDetail(overrides: Partial<SprintDetail> = {}): SprintDetail {
  return {
    number: 1,
    startDate: '2026-03-09',
    endDate: '2026-03-22',
    capacityHours: 40,
    allocations: [],
    totalAllocatedSprints: 0,
    totalAllocatedHours: 0,
    totalTargetHours: 34,
    totalAvailableHours: 40,
    remainingCapacity: 34,
    isOverTarget: false,
    isOverloaded: false,
    ...overrides,
  }
}

function makeEmptyRoadmap(): SprintRoadmap {
  return {
    sprints: [makeSprintDetail()],
    workItemPlacements: [],
    overflowItems: [],
    bottlenecks: [],
    totalSprints: 1,
    startDate: '2026-03-09',
    endDate: '2026-03-22',
  }
}

// ── Tests ─────────────────────────────────────────────────────

describe('analyzeBottlenecks', () => {
  const skills: Skill[] = [
    makeSkill('skill-sf-config', 'Salesforce Config / Flow'),
    makeSkill('skill-ai', 'AI / Workflow Automation'),
  ]
  const roles: Role[] = [
    makeRole('role-sf-dev', 'Salesforce Dev / Integration'),
    makeRole('role-ai-automation', 'AI / Automation / Enablement'),
  ]

  test('returns empty bottlenecks for empty roadmap', () => {
    const roadmap = makeEmptyRoadmap()
    const result = analyzeBottlenecks([], [], skills, roles, roadmap)
    expect(result.personBottlenecks).toHaveLength(0)
    expect(result.skillBottlenecks).toHaveLength(0)
    expect(result.roleBottlenecks).toHaveLength(0)
  })

  test('returns no person bottlenecks when members are within utilization target', () => {
    // Member: 40h/sprint, 85% util → targetFraction = 0.85
    const member = makeMember('tm-1', { availableHoursPerSprint: 40, utilizationTargetPercent: 85 })
    // allocatedSprints = 0.5 < targetFraction 0.85 → no bottleneck
    const sprint = makeSprintDetail({
      allocations: [{
        teamMemberId: 'tm-1',
        sprintNumber: 1,
        allocatedSprints: 0.5,
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 0.5,
    })
    const roadmap: SprintRoadmap = { ...makeEmptyRoadmap(), sprints: [sprint] }
    const result = analyzeBottlenecks([], [member], skills, roles, roadmap)
    expect(result.personBottlenecks).toHaveLength(0)
  })

  test('detects person bottleneck when member exceeds utilization target', () => {
    // Member: 40h/sprint, 50% util → targetFraction = 0.5
    const member = makeMember('tm-1', { availableHoursPerSprint: 40, utilizationTargetPercent: 50 })
    // allocatedSprints = 0.8 > targetFraction 0.5 → bottleneck
    const sprint = makeSprintDetail({
      allocations: [{
        teamMemberId: 'tm-1',
        sprintNumber: 1,
        allocatedSprints: 0.8,
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 0.8,
      isOverloaded: false,
      isOverTarget: true,
    })
    const roadmap: SprintRoadmap = { ...makeEmptyRoadmap(), sprints: [sprint] }
    const result = analyzeBottlenecks([], [member], skills, roles, roadmap)
    expect(result.personBottlenecks).toHaveLength(1)
    expect(result.personBottlenecks[0].teamMemberId).toBe('tm-1')
    expect(result.personBottlenecks[0].overloadedSprints).toContain(1)
  })

  test('excludes inactive members from person bottleneck analysis', () => {
    const inactiveMember = makeMember('tm-inactive', { isActive: false, utilizationTargetPercent: 50 })
    const sprint = makeSprintDetail({
      allocations: [{
        teamMemberId: 'tm-inactive',
        sprintNumber: 1,
        allocatedSprints: 1.0,
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 1.0,
      isOverloaded: true,
    })
    const roadmap: SprintRoadmap = { ...makeEmptyRoadmap(), sprints: [sprint] }
    const result = analyzeBottlenecks([], [inactiveMember], skills, roles, roadmap)
    // Inactive members are excluded
    expect(result.personBottlenecks).toHaveLength(0)
  })

  test('detects skill bottleneck when demand exceeds supply', () => {
    // One member with skill-ai: 40h/sprint, 85% util → targetFraction per sprint = 0.85
    // Supply over 1 sprint = 0.85 sprint fracs
    const member = makeMember('tm-1', {
      availableHoursPerSprint: 40,
      utilizationTargetPercent: 85,
      userSkills: [{ skillId: 'skill-ai', level: 3 }],
    })

    // Four work items requiring skill-ai, 20h each → 0.5 sprint fracs each → demand = 2.0
    const wi1 = makeWorkItem('wi-1', { primarySkill: 'skill-ai', estimatedHours: 20 })
    const wi2 = makeWorkItem('wi-2', { primarySkill: 'skill-ai', estimatedHours: 20 })
    const wi3 = makeWorkItem('wi-3', { primarySkill: 'skill-ai', estimatedHours: 20 })
    const wi4 = makeWorkItem('wi-4', { primarySkill: 'skill-ai', estimatedHours: 20 })
    const project = makeProject([makeEpic([wi1, wi2, wi3, wi4])])

    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      workItemPlacements: [],
      overflowItems: ['wi-1', 'wi-2', 'wi-3', 'wi-4'],  // unplaced — counted as demand
      totalSprints: 1,
    }

    const result = analyzeBottlenecks([project], [member], skills, roles, roadmap)
    // Supply = 0.85 × 1 sprint = 0.85, demand = 4 × (20/40) = 2.0 → gap > 0
    const aiBottleneck = result.skillBottlenecks.find((b) => b.skillId === 'skill-ai')
    expect(aiBottleneck).toBeDefined()
    expect(aiBottleneck?.gapInSprints).toBeGreaterThan(0)
  })

  test('no skill bottleneck when supply meets demand', () => {
    // Two members with skill-sf-config, combined target supply = 2 × 0.85 = 1.7 fracs over 1 sprint
    const member1 = makeMember('tm-1', { availableHoursPerSprint: 40, utilizationTargetPercent: 85, userSkills: [{ skillId: 'skill-sf-config', level: 3 }] })
    const member2 = makeMember('tm-2', { availableHoursPerSprint: 40, utilizationTargetPercent: 85, userSkills: [{ skillId: 'skill-sf-config', level: 3 }] })

    // One work item requiring skill-sf-config, 8h → 0.2 sprint fracs demand
    const wi = makeWorkItem('wi-1', { primarySkill: 'skill-sf-config', estimatedHours: 8 })
    const project = makeProject([makeEpic([wi])])

    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      workItemPlacements: [],
      totalSprints: 1,
    }

    const result = analyzeBottlenecks([project], [member1, member2], skills, roles, roadmap)
    // Supply = 1.7, demand = 0.2 → no bottleneck
    const sfBottleneck = result.skillBottlenecks.find((b) => b.skillId === 'skill-sf-config')
    expect(sfBottleneck).toBeUndefined()
  })

  test('returns all three categories in the summary', () => {
    const roadmap = makeEmptyRoadmap()
    const result = analyzeBottlenecks([], [], skills, roles, roadmap)
    expect(result).toHaveProperty('personBottlenecks')
    expect(result).toHaveProperty('skillBottlenecks')
    expect(result).toHaveProperty('roleBottlenecks')
  })
})
