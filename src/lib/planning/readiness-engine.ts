// ============================================================
// Readiness Engine — Phase 1
//
// Computes estimate readiness signals at work item, epic, and
// initiative levels. Also derives initiative-level warnings
// that surface planning risks (low confidence, inactive owner,
// skill gaps, under-scoping, spillover).
// ============================================================

import type {
  PlanningWorkItem,
  PlanningEpic,
  PlanningProject,
  TeamMember,
  EstimateReadiness,
} from '@/types/planning'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'

// ── Work Item Readiness ────────────────────────────────────────

/**
 * Compute estimate readiness for a single work item.
 *
 * Rules:
 *   'ready':           has effortInSprints, primarySkill, requiredSkillLevel all set,
 *                      AND confidence is 'high' or 'medium'
 *   'needs-breakdown': effortInSprints >= 3.0 (XL work) OR splitRecommended=true
 *   'partial':         everything else
 */
export function workItemReadiness(item: PlanningWorkItem): EstimateReadiness {
  // Needs breakdown takes precedence
  if (item.splitRecommended || (item.effortInSprints != null && item.effortInSprints >= 3.0)) {
    return 'needs-breakdown'
  }

  // Ready: all fields set + medium/high confidence
  const hasEffort = item.effortInSprints != null
  const hasSkill = item.primarySkill != null && item.primarySkill !== ''
  const hasLevel = item.requiredSkillLevel != null
  const goodConfidence = item.confidence === 'high' || item.confidence === 'medium'

  if (hasEffort && hasSkill && hasLevel && goodConfidence) {
    return 'ready'
  }

  return 'partial'
}

// ── Epic Readiness ─────────────────────────────────────────────

/**
 * Compute estimate readiness for an epic (aggregated from its work items).
 *
 * Rules:
 *   'ready':           all work items are 'ready'
 *   'needs-breakdown': any work item is 'needs-breakdown'
 *   'partial':         otherwise
 */
export function epicReadiness(epic: PlanningEpic): EstimateReadiness {
  if (epic.workItems.length === 0) return 'partial'

  const readinesses = epic.workItems.map(workItemReadiness)

  if (readinesses.some((r) => r === 'needs-breakdown')) {
    return 'needs-breakdown'
  }
  if (readinesses.every((r) => r === 'ready')) {
    return 'ready'
  }
  return 'partial'
}

// ── Initiative Warnings ────────────────────────────────────────

export interface InitiativeWarning {
  type: 'low-confidence' | 'inactive-owner' | 'no-skill-match' | 'under-scoped' | 'spillover' | 'needs-breakdown'
  message: string
  severity: 'info' | 'warning' | 'critical'
}

/**
 * Derive initiative-level warnings for a project.
 *
 * Rules:
 *   'low-confidence':  project.confidence === 'low'
 *   'inactive-owner':  project.owner is set and that TeamMember is not active
 *   'no-skill-match':  any work item has primarySkill set but no active member has that skill (level > 0)
 *   'under-scoped':    project has fewer than 2 work items total across all epics
 *   'needs-breakdown': any epic's readiness is 'needs-breakdown'
 *   'spillover':       roadmap has overflowItems.length > 0 and any belong to this project
 */
export function getInitiativeWarnings(
  project: PlanningProject,
  members: TeamMember[],
  roadmap?: SprintRoadmap
): InitiativeWarning[] {
  const warnings: InitiativeWarning[] = []

  // All work items across epics
  const allWorkItems = project.epics.flatMap((e) => e.workItems)

  // 1. Low confidence
  if (project.confidence === 'low') {
    warnings.push({
      type: 'low-confidence',
      message: 'Initiative confidence is low — estimates may be unreliable.',
      severity: 'warning',
    })
  }

  // 2. Inactive owner
  if (project.owner) {
    const owner = members.find((m) => m.id === project.owner)
    if (owner && !owner.isActive) {
      warnings.push({
        type: 'inactive-owner',
        message: `Owner "${owner.name}" is inactive — reassignment may be needed.`,
        severity: 'critical',
      })
    }
  }

  // 3. No skill match
  const activeMembers = members.filter((m) => m.isActive)
  for (const item of allWorkItems) {
    if (item.primarySkill) {
      const hasMatch = activeMembers.some((m) =>
        m.userSkills.some((us) => us.skillId === item.primarySkill && us.level > 0)
      )
      if (!hasMatch) {
        warnings.push({
          type: 'no-skill-match',
          message: `No active team member has skill "${item.primarySkill}" (required by "${item.title}").`,
          severity: 'critical',
        })
        break // one warning per project is enough
      }
    }
  }

  // 4. Under-scoped
  if (allWorkItems.length < 2) {
    warnings.push({
      type: 'under-scoped',
      message: 'Initiative has fewer than 2 work items — consider adding more detail.',
      severity: 'info',
    })
  }

  // 5. Needs breakdown
  const anyNeedsBreakdown = project.epics.some((e) => epicReadiness(e) === 'needs-breakdown')
  if (anyNeedsBreakdown) {
    warnings.push({
      type: 'needs-breakdown',
      message: 'One or more epics contain XL work items that should be broken down.',
      severity: 'warning',
    })
  }

  // 6. Spillover
  if (roadmap && roadmap.overflowItems.length > 0) {
    const projectWorkItemIds = new Set(allWorkItems.map((wi) => wi.id))
    const hasSpillover = roadmap.overflowItems.some((id) => projectWorkItemIds.has(id))
    if (hasSpillover) {
      warnings.push({
        type: 'spillover',
        message: 'Some work items could not be placed in the roadmap — capacity may be insufficient.',
        severity: 'warning',
      })
    }
  }

  return warnings
}
