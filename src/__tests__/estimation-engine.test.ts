import {
  estimateWorkItem,
  selectPrimaryRole,
  selectEffortAndConfidence,
  type WorkItemHint,
} from '@/lib/planning/estimation-engine'
import { ResourceType } from '@/types/domain'
import type { PlanningWorkItem } from '@/types/planning'

// Minimal base item to pass to estimateWorkItem
const baseItem: Omit<PlanningWorkItem, 'estimatedHours' | 'confidence' | 'primaryRole' | 'skillRequired' | 'sprintNumber'> = {
  id: 'test-1',
  title: 'Test item',
  planningEpicId: 'e1',
  status: 'not-started',
  priority: 'medium',
  sourceRefs: [],
}

// ── selectPrimaryRole ─────────────────────────────────────────

describe('selectPrimaryRole', () => {
  it('assigns PM_DEV_HYBRID for request issue type', () => {
    const hint: WorkItemHint = { issueType: 'request' }
    expect(selectPrimaryRole(hint)).toBe(ResourceType.PM_DEV_HYBRID)
  })

  it('assigns DEVELOPER for bug issue type', () => {
    const hint: WorkItemHint = { issueType: 'bug' }
    expect(selectPrimaryRole(hint)).toBe(ResourceType.DEVELOPER)
  })

  it('assigns ADMIN for task with admin label', () => {
    const hint: WorkItemHint = { issueType: 'task', labels: ['admin'] }
    expect(selectPrimaryRole(hint)).toBe(ResourceType.ADMIN)
  })

  it('assigns DEVELOPER for task without admin label', () => {
    const hint: WorkItemHint = { issueType: 'task', labels: ['ui'] }
    expect(selectPrimaryRole(hint)).toBe(ResourceType.DEVELOPER)
  })

  it('assigns DEVELOPER for story issue type', () => {
    const hint: WorkItemHint = { issueType: 'story' }
    expect(selectPrimaryRole(hint)).toBe(ResourceType.DEVELOPER)
  })

  it('assigns DEVELOPER as default for unknown/missing issue type', () => {
    expect(selectPrimaryRole({})).toBe(ResourceType.DEVELOPER)
    expect(selectPrimaryRole({ issueType: 'sub-task' })).toBe(ResourceType.DEVELOPER)
  })
})

// ── selectEffortAndConfidence ─────────────────────────────────

describe('selectEffortAndConfidence', () => {
  it('returns 2h and low confidence for request type (human review needed)', () => {
    const result = selectEffortAndConfidence({ issueType: 'request' })
    expect(result.estimatedHours).toBe(2)
    expect(result.confidence).toBe('low')
  })

  it('returns points × 4h and medium confidence when story points are provided', () => {
    const result = selectEffortAndConfidence({ storyPoints: 5 })
    expect(result.estimatedHours).toBe(20)
    expect(result.confidence).toBe('medium')
  })

  it('returns 3 × 4 = 12h for 3 story points', () => {
    expect(selectEffortAndConfidence({ storyPoints: 3 }).estimatedHours).toBe(12)
  })

  it('returns 8h and low confidence when no story points', () => {
    const result = selectEffortAndConfidence({})
    expect(result.estimatedHours).toBe(8)
    expect(result.confidence).toBe('low')
  })

  it('returns 8h and low confidence for a story with no points', () => {
    const result = selectEffortAndConfidence({ issueType: 'story' })
    expect(result.estimatedHours).toBe(8)
    expect(result.confidence).toBe('low')
  })

  it('request type overrides story points — always 2h', () => {
    const result = selectEffortAndConfidence({ issueType: 'request', storyPoints: 13 })
    expect(result.estimatedHours).toBe(2)
    expect(result.confidence).toBe('low')
  })
})

// ── estimateWorkItem ──────────────────────────────────────────

describe('estimateWorkItem', () => {
  it('returns all four estimation fields', () => {
    const result = estimateWorkItem(baseItem, { issueType: 'story', storyPoints: 5 })
    expect(result).toHaveProperty('estimatedHours')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('primaryRole')
    expect(result).toHaveProperty('skillRequired')
  })

  it('assigns correct effort and role for a story with story points', () => {
    const result = estimateWorkItem(baseItem, { issueType: 'story', storyPoints: 8 })
    expect(result.estimatedHours).toBe(32) // 8 × 4
    expect(result.confidence).toBe('medium')
    expect(result.primaryRole).toBe(ResourceType.DEVELOPER)
    expect(result.skillRequired).toBe('Development')
  })

  it('assigns correct effort and role for a bug', () => {
    const result = estimateWorkItem(baseItem, { issueType: 'bug', storyPoints: 3 })
    expect(result.estimatedHours).toBe(12)
    expect(result.primaryRole).toBe(ResourceType.DEVELOPER)
  })

  it('assigns PM_DEV_HYBRID and 2h for a request', () => {
    const result = estimateWorkItem(baseItem, { issueType: 'request' })
    expect(result.estimatedHours).toBe(2)
    expect(result.confidence).toBe('low')
    expect(result.primaryRole).toBe(ResourceType.PM_DEV_HYBRID)
    expect(result.skillRequired).toBe('Project Management + Development')
  })

  it('assigns ADMIN and 8h for an admin task with no story points', () => {
    const result = estimateWorkItem(baseItem, { issueType: 'task', labels: ['admin'] })
    expect(result.estimatedHours).toBe(8)
    expect(result.primaryRole).toBe(ResourceType.ADMIN)
    expect(result.skillRequired).toBe('Administration')
  })

  it('uses DEVELOPER as default role when no hint is provided', () => {
    const result = estimateWorkItem(baseItem)
    expect(result.primaryRole).toBe(ResourceType.DEVELOPER)
    expect(result.estimatedHours).toBe(8)
    expect(result.confidence).toBe('low')
  })

  it('skillRequired matches the primary role label', () => {
    const pmResult = estimateWorkItem(baseItem, { issueType: 'request' })
    expect(pmResult.skillRequired).toBe('Project Management + Development')

    const devResult = estimateWorkItem(baseItem, { issueType: 'developer' as never })
    expect(devResult.skillRequired).toBe('Development')

    const adminResult = estimateWorkItem(baseItem, { issueType: 'task', labels: ['admin'] })
    expect(adminResult.skillRequired).toBe('Administration')
  })
})
