// ============================================================
// Sprint Date Utilities — Unit Tests
// ============================================================

import {
  getSprintDates,
  nextMonday,
  shortDate,
  slashDate,
  projectCompletionSprint,
  projectCompletionDate,
} from '@/lib/planning/sprint-dates'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'

// ── getSprintDates ────────────────────────────────────────────

describe('getSprintDates', () => {
  const START = '2026-03-09'

  it('sprint 1 starts on the base date and ends 13 days later', () => {
    const { start, end } = getSprintDates(1, START)
    expect(start).toBe('2026-03-09')
    expect(end).toBe('2026-03-22')
  })

  it('sprint 2 starts the day after sprint 1 ends', () => {
    const { start, end } = getSprintDates(2, START)
    expect(start).toBe('2026-03-23')
    expect(end).toBe('2026-04-05')
  })

  it('sprint 5 is offset 4 × 14 = 56 days from base', () => {
    const { start } = getSprintDates(5, START)
    const expected = new Date('2026-03-09T00:00:00Z')
    expected.setUTCDate(expected.getUTCDate() + 56)
    expect(start).toBe(expected.toISOString().slice(0, 10))
  })

  it('sprint 10 produces a valid date range', () => {
    const { start, end } = getSprintDates(10, START)
    expect(new Date(end) > new Date(start)).toBe(true)
  })

  it('respects a custom sprintDays of 7', () => {
    const { start, end } = getSprintDates(1, START, 7)
    expect(start).toBe('2026-03-09')
    expect(end).toBe('2026-03-15')
  })

  it('sprint 3 with 7-day sprints starts on the right day', () => {
    const { start } = getSprintDates(3, START, 7)
    // offset = 2 × 7 = 14 days
    expect(start).toBe('2026-03-23')
  })
})

// ── nextMonday ────────────────────────────────────────────────

describe('nextMonday', () => {
  it('returns the same day when today is already Monday', () => {
    const monday = new Date('2026-03-09T12:00:00Z') // Mon
    expect(nextMonday(monday)).toBe('2026-03-09')
  })

  it('returns next Monday when today is Tuesday', () => {
    const tue = new Date('2026-03-10T12:00:00Z')
    expect(nextMonday(tue)).toBe('2026-03-16')
  })

  it('returns next Monday when today is Sunday', () => {
    const sun = new Date('2026-03-08T12:00:00Z')
    expect(nextMonday(sun)).toBe('2026-03-09')
  })

  it('returns next Monday when today is Saturday', () => {
    const sat = new Date('2026-03-07T12:00:00Z')
    expect(nextMonday(sat)).toBe('2026-03-09')
  })

  it('returns next Monday when today is Friday', () => {
    const fri = new Date('2026-03-06T12:00:00Z')
    expect(nextMonday(fri)).toBe('2026-03-09')
  })
})

// ── shortDate / slashDate ─────────────────────────────────────

describe('shortDate', () => {
  it('formats correctly as "Mon DD"', () => {
    expect(shortDate('2026-03-09')).toBe('Mar 9')
  })

  it('formats December correctly', () => {
    expect(shortDate('2026-12-01')).toBe('Dec 1')
  })
})

describe('slashDate', () => {
  it('formats as MM/DD with leading zeros', () => {
    expect(slashDate('2026-03-09')).toBe('03/09')
  })

  it('formats December 31 correctly', () => {
    expect(slashDate('2026-12-31')).toBe('12/31')
  })

  it('pads single-digit month and day', () => {
    expect(slashDate('2026-01-05')).toBe('01/05')
  })
})

// ── projectCompletionSprint ───────────────────────────────────

function makeRoadmap(placements: Array<{ workItemId: string; sprintNumber: number }>): SprintRoadmap {
  return {
    workItemPlacements: placements.map((p) => ({
      ...p,
      assignedTeamMemberId: undefined,
      estimatedHours: 8,
    })),
    overflowItems: [],
    totalSprints: 10,
    sprints: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      startDate: getSprintDates(i + 1, '2026-03-09').start,
      endDate: getSprintDates(i + 1, '2026-03-09').end,
      availableHours: 80,
    })),
  } as unknown as SprintRoadmap
}

describe('projectCompletionSprint', () => {
  it('returns the highest sprint number for the project', () => {
    const roadmap = makeRoadmap([
      { workItemId: 'wi-1', sprintNumber: 3 },
      { workItemId: 'wi-2', sprintNumber: 5 },
      { workItemId: 'wi-3', sprintNumber: 2 },
    ])
    const ids = new Set(['wi-1', 'wi-2', 'wi-3'])
    expect(projectCompletionSprint('proj', roadmap, ids)).toBe(5)
  })

  it('returns null when no placements exist for the project', () => {
    const roadmap = makeRoadmap([{ workItemId: 'wi-other', sprintNumber: 4 }])
    const ids = new Set(['wi-mine'])
    expect(projectCompletionSprint('proj', roadmap, ids)).toBeNull()
  })

  it('returns the only sprint when there is one placement', () => {
    const roadmap = makeRoadmap([{ workItemId: 'wi-1', sprintNumber: 7 }])
    const ids = new Set(['wi-1'])
    expect(projectCompletionSprint('proj', roadmap, ids)).toBe(7)
  })
})

// ── projectCompletionDate ─────────────────────────────────────

describe('projectCompletionDate', () => {
  it('returns the end date of the last placement sprint', () => {
    const roadmap = makeRoadmap([
      { workItemId: 'wi-1', sprintNumber: 3 },
      { workItemId: 'wi-2', sprintNumber: 5 },
    ])
    const ids = new Set(['wi-1', 'wi-2'])
    const result = projectCompletionDate('proj', roadmap, ids, '2026-03-09')
    const { end } = getSprintDates(5, '2026-03-09')
    expect(result).toBe(end)
  })

  it('returns null when no placements exist', () => {
    const roadmap = makeRoadmap([])
    const ids = new Set(['wi-1'])
    expect(projectCompletionDate('proj', roadmap, ids, '2026-03-09')).toBeNull()
  })

  it('uses custom sprintDays when provided', () => {
    const roadmap = makeRoadmap([{ workItemId: 'wi-1', sprintNumber: 2 }])
    const ids = new Set(['wi-1'])
    const result = projectCompletionDate('proj', roadmap, ids, '2026-03-09', 7)
    const { end } = getSprintDates(2, '2026-03-09', 7)
    expect(result).toBe(end)
  })
})
