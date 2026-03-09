// ============================================================
// Epic → Initiative Promotion Utility
//
// If a PlanningEpic's planningProjectId does not match any
// project in the provided list, auto-promote it into its own
// PlanningProject with:
//   priority  = 'medium'
//   stage     = 'backlog'
//   portfolio = epic.portfolio
//
// This prevents orphaned epics from being silently dropped by
// the planning engines.
// ============================================================

import type { PlanningProject, PlanningEpic } from '@/types/planning'

export interface PromoteEpicsResult {
  /** Full merged list (original projects + auto-promoted) */
  projects: PlanningProject[]
  /** Only the newly promoted projects (for diagnostics/display) */
  promoted: PlanningProject[]
}

/**
 * Promote orphaned epics into their own PlanningProject instances.
 *
 * @param projects - existing planning projects
 * @param orphanEpics - epics to check; any whose planningProjectId
 *   is not found in `projects` will be promoted
 */
export function promoteOrphanEpics(
  projects: PlanningProject[],
  orphanEpics: PlanningEpic[]
): PromoteEpicsResult {
  const knownIds = new Set(projects.map((p) => p.id))
  const promoted: PlanningProject[] = []

  for (const epic of orphanEpics) {
    if (knownIds.has(epic.planningProjectId)) continue
    const newProject: PlanningProject = {
      id: `auto-${epic.id}`,
      name: epic.title,
      status: 'not-started',
      portfolio: epic.portfolio,
      priority: 'medium',
      stage: 'backlog',
      epics: [epic],
      sourceRefs: epic.sourceRefs,
      notes: `Auto-promoted from orphan epic "${epic.id}" — link to a parent initiative when available.`,
    }
    promoted.push(newProject)
    knownIds.add(newProject.id)
  }

  return {
    projects: [...projects, ...promoted],
    promoted,
  }
}
