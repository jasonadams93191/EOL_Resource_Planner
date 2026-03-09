// ============================================================
// Scheduling Engine — Stub
// TODO Wave 2: implement critical-path scheduling with real capacity model
// TODO Wave 3: add dependency tracking between issues/epics
// ============================================================
import type { Project, Issue, CapacityProfile, ProjectSchedule } from '@/types/domain'

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export function buildSchedule(
  projects: Project[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _issues: Issue[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _capacity: CapacityProfile
): ProjectSchedule[] {
  // TODO Wave 2: implement real scheduling using capacity profile and issue estimates
  const today = new Date()

  return projects.map((project, i) => ({
    projectId: project.id,
    startDate: addWeeks(today, i * 2)
      .toISOString()
      .split('T')[0],
    endDate: addWeeks(today, i * 2 + 12)
      .toISOString()
      .split('T')[0],
    totalEstimatedHours: 240 + i * 40,
    milestones: [
      {
        name: 'Discovery Complete',
        targetDate: addWeeks(today, i * 2 + 2)
          .toISOString()
          .split('T')[0],
        description: 'Requirements and scope finalized',
      },
      {
        name: 'MVP Ready',
        targetDate: addWeeks(today, i * 2 + 8)
          .toISOString()
          .split('T')[0],
        description: 'Core functionality complete',
      },
    ],
    resourceAllocations: [
      {
        resourceId: 'r-alex',
        hoursPerWeek: 8,
        startDate: addWeeks(today, i * 2)
          .toISOString()
          .split('T')[0],
        endDate: addWeeks(today, i * 2 + 12)
          .toISOString()
          .split('T')[0],
      },
      {
        resourceId: 'r-jordan',
        hoursPerWeek: 20,
        startDate: addWeeks(today, i * 2)
          .toISOString()
          .split('T')[0],
        endDate: addWeeks(today, i * 2 + 12)
          .toISOString()
          .split('T')[0],
      },
    ],
  }))
}
