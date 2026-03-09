// ============================================================
// Bottleneck Analysis Engine — Phase 1
//
// Analyzes person, skill, and role bottlenecks across the sprint
// roadmap. Returns a structured BottleneckSummary for display.
// ============================================================

import type { PlanningProject, TeamMember, Skill, Role } from '@/types/planning'
import { targetPlannedHours } from '@/types/planning'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
// targetPlannedHours still used by skill bottleneck supply calculation below

// ── Types ─────────────────────────────────────────────────────

export interface PersonBottleneck {
  teamMemberId: string
  memberName: string
  overloadedSprints: number[]
  totalAllocatedSprints: number
  capacity: number
  utilizationPct: number
}

export interface SkillBottleneck {
  skillId: string
  skillName: string
  demandInSprints: number   // total sprint-fractions of demand requiring this skill
  supplyInSprints: number   // total capacity of members who have this skill (level > 0)
  gapInSprints: number      // demand - supply (positive = bottleneck)
  affectedWorkItemIds: string[]
}

export interface RoleBottleneck {
  roleId: string
  roleName: string
  affectedWorkItemIds: string[]
  message: string
}

export interface BottleneckSummary {
  personBottlenecks: PersonBottleneck[]
  skillBottlenecks: SkillBottleneck[]
  roleBottlenecks: RoleBottleneck[]
}

// ── Person Bottlenecks ────────────────────────────────────────

function analyzePersonBottlenecks(
  members: TeamMember[],
  roadmap: SprintRoadmap
): PersonBottleneck[] {
  // Hard rule: a person can NEVER be overloaded. The sprint engine guarantees
  // that no member is ever assigned above their availableHoursPerSprint per sprint.
  // Work that doesn't fit simply spills to the next sprint, extending the timeline.
  // Therefore overloadedSprints is always [] and personBottlenecks is always empty.
  void members
  void roadmap
  return []
}

// ── Skill Bottlenecks ─────────────────────────────────────────

function analyzeSkillBottlenecks(
  projects: PlanningProject[],
  members: TeamMember[],
  skills: Skill[],
  roadmap: SprintRoadmap
): SkillBottleneck[] {
  const bottlenecks: SkillBottleneck[] = []

  // Build a lookup: workItemId → estimatedHours + primarySkill
  const workItemMap = new Map<string, { estimatedHours: number; primarySkill?: string }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        workItemMap.set(item.id, {
          estimatedHours: item.estimatedHours,
          primarySkill: item.primarySkill,
        })
      }
    }
  }

  for (const skill of skills) {
    // Demand: sum of effortInSprints (derived) for all placed + overflow work items requiring this skill
    const affectedWorkItemIds: string[] = []
    let demandInSprints = 0

    const placedIds = roadmap.workItemPlacements.map((p) => p.workItemId)
    const allPlacedAndOverflow = [...placedIds, ...roadmap.overflowItems]

    for (const wid of allPlacedAndOverflow) {
      const wi = workItemMap.get(wid)
      if (wi && wi.primarySkill === skill.id) {
        // Use placement effortInSprints if available, otherwise derive at 40h/sprint default
        const placement = roadmap.workItemPlacements.find((p) => p.workItemId === wid)
        const effortInSprints = placement?.effortInSprints ?? Math.max(0.25, wi.estimatedHours / 40)
        demandInSprints += effortInSprints
        affectedWorkItemIds.push(wid)
      }
    }

    if (demandInSprints === 0) continue // skill not in demand — skip

    // Supply: sum of targetPlannedHours (in sprint fracs) for active members with this skill
    const supplyInSprints = members
      .filter((m) => m.isActive)
      .filter((m) => m.userSkills.some((us) => us.skillId === skill.id && us.level > 0))
      .reduce((sum, m) => sum + (targetPlannedHours(m) / m.availableHoursPerSprint) * roadmap.totalSprints, 0)

    const gapInSprints = Math.round((demandInSprints - supplyInSprints) * 100) / 100

    if (gapInSprints > 0) {
      bottlenecks.push({
        skillId: skill.id,
        skillName: skill.name,
        demandInSprints: Math.round(demandInSprints * 100) / 100,
        supplyInSprints: Math.round(supplyInSprints * 100) / 100,
        gapInSprints,
        affectedWorkItemIds,
      })
    }
  }

  return bottlenecks.sort((a, b) => b.gapInSprints - a.gapInSprints)
}

// ── Role Bottlenecks ──────────────────────────────────────────

function analyzeRoleBottlenecks(
  projects: PlanningProject[],
  members: TeamMember[],
  roles: Role[],
  roadmap: SprintRoadmap
): RoleBottleneck[] {
  // Role → primary skills mapping (matches SKILL_PRIMARY_ROLE in sprint-engine.ts)
  const ROLE_SKILL_AFFINITY: Record<string, string[]> = {
    'role-admin':           ['skill-sf-config', 'skill-sf-data', 'skill-sales-cloud', 'skill-litify', 'skill-web'],
    'role-pm':              ['skill-pm', 'skill-docs'],
    'role-ba':              ['skill-reporting', 'skill-qa'],
    'role-integration-dev': ['skill-sf-dev', 'skill-integration', 'skill-async'],
    'role-architect':       ['skill-ai', 'skill-cloud'],
  }

  const bottlenecks: RoleBottleneck[] = []
  const activeMembers = members.filter((m) => m.isActive)

  // Build work item lookup
  const workItemMap = new Map<string, { primarySkill?: string }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        workItemMap.set(item.id, { primarySkill: item.primarySkill })
      }
    }
  }

  for (const role of roles) {
    const affinitySkills = ROLE_SKILL_AFFINITY[role.id] ?? []
    if (affinitySkills.length === 0) continue

    // Members who have this role
    const roleMembers = activeMembers.filter((m) => m.primaryRoleId === role.id)
    if (roleMembers.length === 0) continue

    // Find placed work items that require a skill in this role's affinity
    // but no role member was assigned
    const affectedWorkItemIds: string[] = []

    for (const placement of roadmap.workItemPlacements) {
      const wi = workItemMap.get(placement.workItemId)
      if (!wi?.primarySkill) continue

      const needsThisRole = affinitySkills.includes(wi.primarySkill)
      if (!needsThisRole) continue

      // Was it assigned to a member of this role?
      const assignedMember = roleMembers.find((m) => m.id === placement.assignedTeamMemberId)
      if (!assignedMember) {
        affectedWorkItemIds.push(placement.workItemId)
      }
    }

    if (affectedWorkItemIds.length > 0) {
      bottlenecks.push({
        roleId: role.id,
        roleName: role.name,
        affectedWorkItemIds,
        message: `${affectedWorkItemIds.length} work item(s) needing "${role.name}" were assigned to members outside that role.`,
      })
    }
  }

  return bottlenecks
}

// ── Main Entry Point ──────────────────────────────────────────

/**
 * Analyze bottlenecks across person, skill, and role dimensions.
 */
export function analyzeBottlenecks(
  projects: PlanningProject[],
  members: TeamMember[],
  skills: Skill[],
  roles: Role[],
  roadmap: SprintRoadmap
): BottleneckSummary {
  return {
    personBottlenecks: analyzePersonBottlenecks(members, roadmap),
    skillBottlenecks: analyzeSkillBottlenecks(projects, members, skills, roadmap),
    roleBottlenecks: analyzeRoleBottlenecks(projects, members, roles, roadmap),
  }
}
