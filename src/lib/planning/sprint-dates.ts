// ============================================================
// Sprint Date Utilities
//
// Derives calendar dates for sprints and computes projected
// completion dates for initiatives based on roadmap placement.
// ============================================================

import type { SprintRoadmap } from './sprint-engine'

// ── Sprint date range ─────────────────────────────────────────

/**
 * Compute the ISO start/end dates for a given sprint number.
 * sprintNumber is 1-based.
 * sprintDays defaults to 14 (2-week sprint).
 */
export function getSprintDates(
  sprintNumber: number,
  startDate: string,
  sprintDays = 14
): { start: string; end: string } {
  const base = new Date(startDate + 'T00:00:00Z')
  const offset = (sprintNumber - 1) * sprintDays
  const start = new Date(base)
  start.setUTCDate(start.getUTCDate() + offset)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + sprintDays - 1)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

// ── Next Monday helper ────────────────────────────────────────

/**
 * Returns the ISO date of the next Monday on or after today.
 * Timezone-safe (uses UTC-day arithmetic).
 */
export function nextMonday(today: Date = new Date()): string {
  const d = new Date(today)
  d.setUTCHours(0, 0, 0, 0)
  const day = d.getUTCDay() // 0=Sun, 1=Mon, …, 6=Sat
  const daysUntilMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day
  d.setUTCDate(d.getUTCDate() + daysUntilMonday)
  return d.toISOString().slice(0, 10)
}

// ── Short date formatter ──────────────────────────────────────

/**
 * Format an ISO date as "Mon DD" (e.g., "Mar 24").
 */
export function shortDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * Format an ISO date as "MM/DD" (e.g., "03/24").
 */
export function slashDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

// ── Initiative completion ─────────────────────────────────────

/**
 * Returns the last sprint number that has work items for the given project.
 * Returns null if no placements exist.
 */
export function projectCompletionSprint(
  projectId: string,
  roadmap: SprintRoadmap,
  projectWorkItemIds: Set<string>
): number | null {
  const sprintNumbers = roadmap.workItemPlacements
    .filter((p) => projectWorkItemIds.has(p.workItemId))
    .map((p) => p.sprintNumber)

  if (sprintNumbers.length === 0) return null
  return Math.max(...sprintNumbers)
}

/**
 * Returns the projected completion date (end of last sprint) for an initiative.
 * Returns null if no placements exist.
 */
export function projectCompletionDate(
  projectId: string,
  roadmap: SprintRoadmap,
  projectWorkItemIds: Set<string>,
  startDate: string,
  sprintDays = 14
): string | null {
  const lastSprint = projectCompletionSprint(projectId, roadmap, projectWorkItemIds)
  if (lastSprint === null) return null
  const { end } = getSprintDates(lastSprint, startDate, sprintDays)
  return end
}
