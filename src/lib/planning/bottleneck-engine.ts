// ============================================================
// Bottleneck Analysis Engine — Phase 1
//
// Analyzes person, skill, and role bottlenecks across the sprint
// roadmap. Returns a structured BottleneckSummary for display.
// ============================================================

import type { PlanningProject, TeamMember, Skill, Role } from '@/types/planning'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'

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
  const bottlenecks: PersonBottleneck[] = []
  const totalSprints = roadmap.totalSprints

  for (const member of members) {
    if (!member.isActive) continue

    // Sum allocations across all sprints for this member
    let totalAllocated = 0
    const overloadedSprints: number[] = []

    for (const sprint of roadmap.sprints) {
      const memberAllocations = sprint.allocations.filter(
        (a) => a.teamMemberId === member.id
      )
      const sprintAllocated = memberAllocations.reduce(
        (sum, a) => sum + a.allocatedSprints,
        0
      )
      totalAllocated += sprintAllocated

      // Overloaded if this sprint's allocation exceeds member's capacity
      if (sprintAllocated > member.sprintCapacity) {
        overloadedSprints.push(sprint.number)
      }
    }

    const expectedTotal = member.sprintCapacity * totalSprints
    const utilizationPct = expectedTotal > 0
      ? Math.round((totalAllocated / expectedTotal) * 100)
      : 0

    // Flag as bottleneck if overloaded in any sprint
    if (overloadedSprints.length > 0) {
      bottlenecks.push({
        teamMemberId: member.id,
        memberName: member.name,
        overloadedSprints,
        totalAllocatedSprints: Math.round(totalAllocated * 100) / 100,
        capacity: member.sprintCapacity,
        utilizationPct,
      })
    }
  }

  return bottlenecks
}

// ── Skill Bottlenecks ─────────────────────────────────────────

function analyzeSkillBottlenecks(
  projects: PlanningProject[],
  members: TeamMember[],
  skills: Skill[],
  roadmap: SprintRoadmap
): SkillBottleneck[] {
  const bottlenecks: SkillBottleneck[] = []

  // Build a lookup: workItemId → effortInSprints + primarySkill
  const workItemMap = new Map<string, { effortInSprints: number; primarySkill?: string }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        workItemMap.set(item.id, {
          effortInSprints: item.effortInSprints ?? Math.max(0.25, item.effortHours / 40),
          primarySkill: item.primarySkill,
        })
      }
    }
  }

  for (const skill of skills) {
    // Demand: sum of effortInSprints for all placed + overflow work items requiring this skill
    const affectedWorkItemIds: string[] = []
    let demandInSprints = 0

    const placedIds = roadmap.workItemPlacements.map((p) => p.workItemId)
    const allPlacedAndOverflow = [...placedIds, ...roadmap.overflowItems]

    for (const wid of allPlacedAndOverflow) {
      const wi = workItemMap.get(wid)
      if (wi && wi.primarySkill === skill.id) {
        demandInSprints += wi.effortInSprints
        affectedWorkItemIds.push(wid)
      }
    }

    if (demandInSprints === 0) continue // skill not in demand — skip

    // Supply: sum of sprintCapacity for active members with this skill (level > 0)
    const supplyInSprints = members
      .filter((m) => m.isActive)
      .filter((m) => m.userSkills.some((us) => us.skillId === skill.id && us.level > 0))
      .reduce((sum, m) => sum + m.sprintCapacity * roadmap.totalSprints, 0)

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
  // Role → required skills mapping (from assignment engine affinity)
  const ROLE_SKILL_AFFINITY: Record<string, string[]> = {
    'role-solution-lead':   ['skill-pm', 'skill-litify', 'skill-sf-config'],
    'role-sf-dev':          ['skill-sf-dev', 'skill-integration', 'skill-async'],
    'role-sf-builder':      ['skill-sf-config', 'skill-litify', 'skill-reporting'],
    'role-ai-automation':   ['skill-ai', 'skill-docs', 'skill-qa'],
    'role-automation-dev':  ['skill-sf-config', 'skill-cloud', 'skill-qa'],
    'role-qa-docs':         ['skill-qa', 'skill-docs'],
    'role-sf-process':      ['skill-sf-config', 'skill-sf-data', 'skill-sales-cloud'],
    'role-revops':          ['skill-sales-cloud', 'skill-reporting'],
    'role-web-marketing':   ['skill-web'],
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
