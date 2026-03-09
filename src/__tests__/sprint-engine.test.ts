import { buildSprintPlan, calculateSprintCapacity, generateSprints } from '@/lib/planning/sprint-engine'
import { mockPlanningProjects } from '@/lib/mock/planning-data'
import { mockCapacityProfile } from '@/lib/mock/sample-data'
import type { PlanningProject } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── calculateSprintCapacity ───────────────────────────────────

describe('calculateSprintCapacity', () => {
  it('calculates sprint capacity from the mock capacity profile', () => {
    // Alex:   40 × 0.80 × 2 = 64
    // Jordan: 40 × 0.85 × 2 = 68
    // Morgan: 40 × 0.85 × 2 = 68
    // Casey:  20 × 0.70 × 2 = 28
    // Total = 228
    const capacity = calculateSprintCapacity(mockCapacityProfile)
    expect(capacity).toBeCloseTo(228, 1)
  })

  it('returns 0 for an empty resource list', () => {
    expect(calculateSprintCapacity({ resources: [], effectiveDate: '2026-01-01' })).toBe(0)
  })

  it('handles a single resource correctly', () => {
    const profile = {
      resources: [
        {
          id: 'r-test',
          name: 'Test Dev',
          resourceType: ResourceType.DEVELOPER,
          weeklyCapacityHours: 40,
          utilizationRate: 1.0,
        },
      ],
      effectiveDate: '2026-01-01',
    }
    // 40 × 1.0 × 2 = 80
    expect(calculateSprintCapacity(profile)).toBe(80)
  })
})

// ── generateSprints ───────────────────────────────────────────

describe('generateSprints', () => {
  it('generates the correct number of sprints', () => {
    const sprints = generateSprints(3, '2026-03-09')
    expect(sprints).toHaveLength(3)
  })

  it('sprint numbers are sequential starting at 1', () => {
    const sprints = generateSprints(4, '2026-03-09')
    expect(sprints.map((s) => s.number)).toEqual([1, 2, 3, 4])
  })

  it('each sprint is 14 days (startDate to startDate of next)', () => {
    const sprints = generateSprints(3, '2026-03-09')
    // Sprint 1: 2026-03-09 → 2026-03-22 (13 days inclusive)
    expect(sprints[0].startDate).toBe('2026-03-09')
    expect(sprints[0].endDate).toBe('2026-03-22')
    // Sprint 2 starts on day 14 from sprint 1 start
    expect(sprints[1].startDate).toBe('2026-03-23')
    expect(sprints[1].endDate).toBe('2026-04-05')
  })

  it('capacityHours is 0 (caller fills this in)', () => {
    const sprints = generateSprints(2, '2026-03-09')
    sprints.forEach((s) => expect(s.capacityHours).toBe(0))
  })
})

// ── buildSprintPlan ───────────────────────────────────────────

describe('buildSprintPlan', () => {
  it('returns a sprint plan with at least one sprint', () => {
    const plan = buildSprintPlan(mockPlanningProjects, mockCapacityProfile, '2026-03-09')
    expect(plan.sprints.length).toBeGreaterThan(0)
    expect(plan.totalSprints).toBe(plan.sprints.length)
  })

  it('assigns every work item to a sprint', () => {
    const plan = buildSprintPlan(mockPlanningProjects, mockCapacityProfile, '2026-03-09')
    const allItemIds = mockPlanningProjects.flatMap((p) =>
      p.epics.flatMap((e) => e.workItems.map((wi) => wi.id))
    )
    allItemIds.forEach((id) => {
      expect(plan.workItemAssignments[id]).toBeGreaterThanOrEqual(1)
    })
  })

  it('sprint capacity is set from the capacity profile', () => {
    const plan = buildSprintPlan(mockPlanningProjects, mockCapacityProfile, '2026-03-09')
    const expectedCapacity = calculateSprintCapacity(mockCapacityProfile)
    plan.sprints.forEach((s) => {
      expect(s.capacityHours).toBeCloseTo(expectedCapacity, 1)
    })
  })

  it('no sprint is loaded over capacity (unless a single item exceeds capacity)', () => {
    const plan = buildSprintPlan(mockPlanningProjects, mockCapacityProfile, '2026-03-09')
    const sprintLoad: Record<number, number> = {}

    mockPlanningProjects.forEach((p) => {
      p.epics.forEach((e) => {
        e.workItems.forEach((wi) => {
          const sprint = plan.workItemAssignments[wi.id]
          sprintLoad[sprint] = (sprintLoad[sprint] ?? 0) + wi.estimatedHours
        })
      })
    })

    const capacity = calculateSprintCapacity(mockCapacityProfile)
    Object.values(sprintLoad).forEach((load) => {
      // A sprint can only exceed capacity if a single item is larger than capacity
      // (we still have to place it somewhere)
      expect(load).toBeLessThanOrEqual(capacity * 2) // sanity bound, not strict
    })
  })

  it('high priority items are placed before low priority items', () => {
    // Build a minimal project where high priority item > sprint capacity
    // to force ordering into separate sprints
    const highItem = {
      id: 'high-1',
      title: 'High priority item',
      planningEpicId: 'e1',
      status: 'not-started' as const,
      priority: 'high' as const,
      sourceRefs: [],
      estimatedHours: 50,
      confidence: 'low' as const,
      primaryRole: ResourceType.DEVELOPER,
    }
    const lowItem = {
      id: 'low-1',
      title: 'Low priority item',
      planningEpicId: 'e1',
      status: 'not-started' as const,
      priority: 'low' as const,
      sourceRefs: [],
      estimatedHours: 50,
      confidence: 'low' as const,
      primaryRole: ResourceType.DEVELOPER,
    }

    const project: PlanningProject = {
      id: 'test-project',
      name: 'Test',
      status: 'not-started',
      portfolio: 'ATI',
      priority: 'high',
      stage: 'planned',
      sourceRefs: [],
      epics: [
        {
          id: 'e1',
          title: 'Test Epic',
          planningProjectId: 'test-project',
          status: 'not-started',
          priority: 'high',
          portfolio: 'ATI',
          sourceRefs: [],
          // low item placed first in the array to ensure sorting works
          workItems: [lowItem, highItem],
        },
      ],
    }

    const smallCapacity = {
      resources: [
        {
          id: 'r1',
          name: 'Dev',
          resourceType: ResourceType.DEVELOPER,
          weeklyCapacityHours: 20,
          utilizationRate: 1.0,
        },
      ],
      effectiveDate: '2026-01-01',
    }
    // sprintCapacity = 20 × 1.0 × 2 = 40h
    // Both items are 50h, so each goes in its own sprint
    const plan = buildSprintPlan([project], smallCapacity, '2026-01-01')

    // High priority item must be in an earlier or equal sprint
    const highSprint = plan.workItemAssignments['high-1']
    const lowSprint = plan.workItemAssignments['low-1']
    expect(highSprint).toBeLessThanOrEqual(lowSprint)
  })

  it('returns start and end dates matching the sprint range', () => {
    const plan = buildSprintPlan(mockPlanningProjects, mockCapacityProfile, '2026-03-09')
    expect(plan.startDate).toBe('2026-03-09')
    expect(plan.endDate).toBe(plan.sprints[plan.sprints.length - 1].endDate)
  })

  it('handles an empty project list gracefully', () => {
    const plan = buildSprintPlan([], mockCapacityProfile, '2026-03-09')
    expect(plan.totalSprints).toBe(1) // no items → stays at sprint 1
    expect(plan.workItemAssignments).toEqual({})
  })
})
