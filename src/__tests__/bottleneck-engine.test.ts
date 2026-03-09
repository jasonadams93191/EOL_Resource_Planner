// ============================================================
// Tests for bottleneck-engine.ts
// ============================================================

import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import type { PlanningProject, PlanningEpic, PlanningWorkItem, TeamMember, Skill, Role } from '@/types/planning'
import type { SprintRoadmap, SprintDetail, WorkItemPlacement } from '@/lib/planning/sprint-engine'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function makeWorkItem(id: string, overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id,
    title: `Work Item ${id}`,
    planningEpicId: 'epic-test',
    status: 'not-started',
    sourceRefs: [],
    effortHours: 8,
    effortInSprints: 0.5,
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

function makeMember(id: string, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id,
    name: `Member ${id}`,
    primaryRoleId: 'role-sf-dev',
    sprintCapacity: 1.0,
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

function makeEmptyRoadmap(): SprintRoadmap {
  const sprint: SprintDetail = {
    number: 1,
    startDate: '2026-03-09',
    endDate: '2026-03-22',
    capacityHours: 40,
    allocations: [],
    totalAllocatedSprints: 0,
    remainingCapacity: 1.0,
    isOverloaded: false,
  }
  return {
    sprints: [sprint],
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

  test('returns no person bottlenecks when members are within capacity', () => {
    const member = makeMember('tm-1', { sprintCapacity: 1.0 })
    const sprint: SprintDetail = {
      number: 1,
      startDate: '2026-03-09',
      endDate: '2026-03-22',
      capacityHours: 40,
      allocations: [{
        teamMemberId: 'tm-1',
        sprintNumber: 1,
        allocatedSprints: 0.5, // under capacity of 1.0
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 0.5,
      remainingCapacity: 0.5,
      isOverloaded: false,
    }
    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      sprints: [sprint],
    }
    const result = analyzeBottlenecks([], [member], skills, roles, roadmap)
    expect(result.personBottlenecks).toHaveLength(0)
  })

  test('detects person bottleneck when member is overloaded in a sprint', () => {
    const member = makeMember('tm-1', { sprintCapacity: 0.5 })
    const sprint: SprintDetail = {
      number: 1,
      startDate: '2026-03-09',
      endDate: '2026-03-22',
      capacityHours: 40,
      allocations: [{
        teamMemberId: 'tm-1',
        sprintNumber: 1,
        allocatedSprints: 0.8, // exceeds capacity of 0.5
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 0.8,
      remainingCapacity: 0,
      isOverloaded: true,
    }
    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      sprints: [sprint],
    }
    const result = analyzeBottlenecks([], [member], skills, roles, roadmap)
    expect(result.personBottlenecks).toHaveLength(1)
    expect(result.personBottlenecks[0].teamMemberId).toBe('tm-1')
    expect(result.personBottlenecks[0].overloadedSprints).toContain(1)
  })

  test('excludes inactive members from person bottleneck analysis', () => {
    const inactiveMember = makeMember('tm-inactive', { isActive: false, sprintCapacity: 0.5 })
    const sprint: SprintDetail = {
      number: 1,
      startDate: '2026-03-09',
      endDate: '2026-03-22',
      capacityHours: 40,
      allocations: [{
        teamMemberId: 'tm-inactive',
        sprintNumber: 1,
        allocatedSprints: 1.0,
        workItemIds: ['wi-1'],
      }],
      totalAllocatedSprints: 1.0,
      remainingCapacity: 0,
      isOverloaded: true,
    }
    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      sprints: [sprint],
    }
    const result = analyzeBottlenecks([], [inactiveMember], skills, roles, roadmap)
    // Inactive members are excluded
    expect(result.personBottlenecks).toHaveLength(0)
  })

  test('detects skill bottleneck when demand exceeds supply', () => {
    // One member with skill-ai, capacity 0.5
    const member = makeMember('tm-1', {
      sprintCapacity: 0.5,
      userSkills: [{ skillId: 'skill-ai', level: 3 }],
    })

    // Three work items requiring skill-ai (demand = 1.5)
    const wi1 = makeWorkItem('wi-1', { primarySkill: 'skill-ai', effortInSprints: 0.5 })
    const wi2 = makeWorkItem('wi-2', { primarySkill: 'skill-ai', effortInSprints: 0.5 })
    const wi3 = makeWorkItem('wi-3', { primarySkill: 'skill-ai', effortInSprints: 0.5 })

    const project = makeProject([makeEpic([wi1, wi2, wi3])])

    const placements: WorkItemPlacement[] = [
      { workItemId: 'wi-1', sprintNumber: 1, assignedTeamMemberId: 'tm-1', effortInSprints: 0.5 },
      { workItemId: 'wi-2', sprintNumber: 1, assignedTeamMemberId: 'tm-1', effortInSprints: 0.5 },
      { workItemId: 'wi-3', sprintNumber: 2, assignedTeamMemberId: 'tm-1', effortInSprints: 0.5 },
    ]
    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      workItemPlacements: placements,
      totalSprints: 2,
    }

    const result = analyzeBottlenecks([project], [member], skills, roles, roadmap)
    // Supply = 0.5 capacity × 2 sprints = 1.0, demand = 1.5, gap = 0.5
    const aiBottleneck = result.skillBottlenecks.find((b) => b.skillId === 'skill-ai')
    expect(aiBottleneck).toBeDefined()
    expect(aiBottleneck?.gapInSprints).toBeGreaterThan(0)
  })

  test('no skill bottleneck when supply meets demand', () => {
    // Two members with skill-sf-config, combined capacity > demand
    const member1 = makeMember('tm-1', { sprintCapacity: 1.0, userSkills: [{ skillId: 'skill-sf-config', level: 3 }] })
    const member2 = makeMember('tm-2', { sprintCapacity: 1.0, userSkills: [{ skillId: 'skill-sf-config', level: 3 }] })

    // One work item requiring skill-sf-config (demand = 0.3)
    const wi = makeWorkItem('wi-1', { primarySkill: 'skill-sf-config', effortInSprints: 0.3 })
    const project = makeProject([makeEpic([wi])])

    const placements: WorkItemPlacement[] = [
      { workItemId: 'wi-1', sprintNumber: 1, assignedTeamMemberId: 'tm-1', effortInSprints: 0.3 },
    ]
    const roadmap: SprintRoadmap = {
      ...makeEmptyRoadmap(),
      workItemPlacements: placements,
      totalSprints: 1,
    }

    const result = analyzeBottlenecks([project], [member1, member2], skills, roles, roadmap)
    // Supply = (1.0 + 1.0) × 1 sprint = 2.0, demand = 0.3, no bottleneck
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
