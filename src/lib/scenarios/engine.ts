// ============================================================
// Scenario Engine — Stub
// TODO Wave 2: implement real scenario modeling with constraint solver
// ============================================================
import type { ScenarioInput, ProjectSchedule, ScenarioResult, Resource } from '@/types/domain'
import { ResourceType } from '@/types/domain'

function adjustEndDate(endDate: string, daysDelta: number): string {
  const d = new Date(endDate)
  d.setDate(d.getDate() + daysDelta)
  return d.toISOString().split('T')[0]
}

export function runScenario(input: ScenarioInput, baseline: ProjectSchedule[]): ScenarioResult {
  // TODO Wave 2: implement real scenario modeling
  const capacityMultiplier = input.capacityMultiplier ?? 1
  const hasExtraStaff = (input.staffingChanges?.length ?? 0) > 0
  const daysDelta = hasExtraStaff ? -14 : Math.round((1 - capacityMultiplier) * 60)

  const adjusted: ProjectSchedule[] = baseline.map((sched) => ({
    ...sched,
    endDate: adjustEndDate(sched.endDate, daysDelta),
    totalEstimatedHours: Math.round(sched.totalEstimatedHours * capacityMultiplier),
  }))

  const delta = baseline.map((sched, i) => ({
    projectId: sched.projectId,
    baselineEndDate: sched.endDate,
    adjustedEndDate: adjusted[i].endDate,
    daysDelta,
    hoursImpact: adjusted[i].totalEstimatedHours - sched.totalEstimatedHours,
  }))

  return {
    scenarioInput: input,
    baseline,
    adjusted,
    delta,
    recommendations: [
      // TODO Wave 2: generate data-driven recommendations
      hasExtraStaff
        ? 'Adding a developer accelerates all projects by approximately 2 weeks.'
        : 'Reduced capacity will delay delivery across all projects.',
      'Consider prioritizing EOL-INFRA first due to compliance deadline.',
      'AA-INTAKE has the most parallelizable work — good candidate for new resource ramp-up.',
    ],
  }
}

// Helper to create a "+1 Developer" scenario input
export function createAddDeveloperScenario(): ScenarioInput {
  const newDev: Partial<Resource> = {
    id: 'r-new-dev',
    name: 'New Developer (TBD)',
    resourceType: ResourceType.DEVELOPER,
    weeklyCapacityHours: 40,
    utilizationRate: 0.85,
  }
  return {
    name: 'Add 1 Developer',
    staffingChanges: [newDev],
    notes: 'Model impact of hiring one additional developer on shared resource pool',
  }
}
