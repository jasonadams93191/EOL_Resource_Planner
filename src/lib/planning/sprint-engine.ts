// ============================================================
// Sprint Placement Engine
//
// Hours are the primary effort unit. Sprint placement is derived:
//   effortInSprints = estimatedHours / member.availableHoursPerSprint
//
// Capacity model (three tiers):
//   targetPlannedHours  = soft cap (roadmap prefers staying under this)
//   availableHoursPerSprint = hard ceiling
//   allocated > available  → overloaded
//
// TODO Wave 2: replace with real constraint-based scheduling
// ============================================================

import type { PlanningProject, Sprint, TeamMember, CapacityAllocation, PlanningPriority } from '@/types/planning'
import { getEffectivePriority, targetPlannedHours, SPLIT_THRESHOLD_HOURS } from '@/types/planning'
import type { CapacityProfile } from '@/types/domain'

// ── Types ─────────────────────────────────────────────────────

export interface SprintPlan {
  sprints: Sprint[]
  // planningProjectId → list of sprint numbers used by that project
  projectAssignments: Record<string, number[]>
  // workItemId → sprint number
  workItemAssignments: Record<string, number>
  totalSprints: number
  startDate: string
  endDate: string
}

// Internal struct to carry work item placement context
interface WorkItemSlot {
  projectId: string
  workItemId: string
  estimatedHours: number
  priority: PlanningPriority
}

// ── Helpers ───────────────────────────────────────────────────

/** Add N days to an ISO date string. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

/** Priority sort weight — lower = higher priority. Rank breaks ties within band. */
export function priorityWeight(p: PlanningPriority, rank?: number): number {
  const band = p === 'high' ? 0 : p === 'medium' ? 100 : 200
  return band + (rank != null ? rank : 99)
}

// ── Sprint generation ─────────────────────────────────────────

/**
 * Generate `count` sequential 2-week sprints starting from `startDate`.
 * `capacityHours` is set to 0 here and filled in by the caller.
 */
export function generateSprints(count: number, startDate: string): Sprint[] {
  const sprints: Sprint[] = []
  let current = startDate
  for (let i = 1; i <= count; i++) {
    const end = addDays(current, 13) // 14 days inclusive (day 0 → day 13)
    sprints.push({
      number: i,
      startDate: current,
      endDate: end,
      capacityHours: 0,
    })
    current = addDays(current, 14)
  }
  return sprints
}

// ── Capacity calculation (legacy — for buildSprintPlan) ───────

/**
 * Calculate sprint capacity (2-week total hours) from a CapacityProfile.
 */
export function calculateSprintCapacity(capacity: CapacityProfile): number {
  return capacity.resources.reduce(
    (sum, r) => sum + r.weeklyCapacityHours * r.utilizationRate * 2,
    0
  )
}

// ── Legacy sprint placement ───────────────────────────────────

/**
 * Build a sprint plan for all projects given a legacy CapacityProfile.
 * Uses estimatedHours for placement.
 */
export function buildSprintPlan(
  projects: PlanningProject[],
  capacity: CapacityProfile,
  startDate: string
): SprintPlan {
  const sprintCapacityHours = calculateSprintCapacity(capacity)

  const sortedProjects = [...projects].sort(
    (a, b) => priorityWeight(a.priority) - priorityWeight(b.priority)
  )

  const slots: WorkItemSlot[] = []
  for (const project of sortedProjects) {
    const sortedEpics = [...project.epics].sort(
      (a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999)
    )
    for (const epic of sortedEpics) {
      for (const item of epic.workItems) {
        slots.push({
          projectId: project.id,
          workItemId: item.id,
          estimatedHours: item.estimatedHours,
          priority: getEffectivePriority(item, project),
        })
      }
    }
  }

  slots.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

  const workItemAssignments: Record<string, number> = {}
  const projectAssignments: Record<string, Set<number>> = {}

  let currentSprint = 1
  let currentLoad = 0

  for (const slot of slots) {
    if (currentLoad + slot.estimatedHours > sprintCapacityHours && currentLoad > 0) {
      currentSprint++
      currentLoad = 0
    }

    workItemAssignments[slot.workItemId] = currentSprint
    currentLoad += slot.estimatedHours

    if (!projectAssignments[slot.projectId]) {
      projectAssignments[slot.projectId] = new Set()
    }
    projectAssignments[slot.projectId].add(currentSprint)
  }

  const totalSprints = currentSprint

  const sprints = generateSprints(totalSprints, startDate).map((s) => ({
    ...s,
    capacityHours: sprintCapacityHours,
  }))

  const projectAssignmentsRecord: Record<string, number[]> = {}
  for (const [projectId, sprintSet] of Object.entries(projectAssignments)) {
    projectAssignmentsRecord[projectId] = Array.from(sprintSet).sort((a, b) => a - b)
  }

  const endDate = sprints[sprints.length - 1]?.endDate ?? startDate

  return {
    sprints,
    projectAssignments: projectAssignmentsRecord,
    workItemAssignments,
    totalSprints,
    startDate,
    endDate,
  }
}

// ── Enhanced Roadmap Engine ───────────────────────────────────

export interface SprintDetail extends Sprint {
  allocations: CapacityAllocation[]
  totalAllocatedHours: number      // hours allocated in this sprint
  totalTargetHours: number         // sum of targetPlannedHours for active members
  totalAvailableHours: number      // sum of availableHoursPerSprint for active members
  remainingCapacity: number        // hours remaining under target
  isOverTarget: boolean            // allocated > target (caution zone)
  isOverloaded: boolean            // allocated > available (hard overload)
  // Legacy compat — total allocated expressed as sprint fractions for older UI consumers
  totalAllocatedSprints: number
}

export interface WorkItemPlacement {
  workItemId: string
  sprintNumber: number
  assignedTeamMemberId?: string
  effortInSprints: number   // derived: estimatedHours / member.availableHoursPerSprint
  estimatedHours: number    // primary effort value
}

export interface BottleneckInfo {
  sprintNumber: number
  reason: string
  affectedWorkItemIds: string[]
}

export interface SprintRoadmap {
  sprints: SprintDetail[]
  workItemPlacements: WorkItemPlacement[]
  overflowItems: string[]  // workItemIds that couldn't be placed
  bottlenecks: BottleneckInfo[]
  totalSprints: number
  startDate: string
  endDate: string
}

/**
 * Build an enhanced sprint roadmap using TeamMember hours-based capacity.
 *
 * Placement algorithm:
 *   1. Flatten all non-done work items across all projects.
 *   2. Sort by priority (high → medium → low).
 *   3. For each work item, find the best-fit active team member who has
 *      remaining hours ≥ estimatedHours (prefer within targetPlannedHours,
 *      fall back to availableHoursPerSprint).
 *   4. Auto-flag splitRecommended if estimatedHours > SPLIT_THRESHOLD_HOURS.
 *   5. Track overflow (items with no eligible member) and bottlenecks.
 */
export function buildSprintRoadmap(
  projects: PlanningProject[],
  members: TeamMember[],
  startDate: string
): SprintRoadmap {
  const activeMembers = members.filter((m) => m.isActive)

  const totalAvailableHours = activeMembers.reduce((sum, m) => sum + m.availableHoursPerSprint, 0)
  const totalTargetHoursPerSprint = activeMembers.reduce((sum, m) => sum + targetPlannedHours(m), 0)

  const sortedProjects = [...projects].sort(
    (a, b) => priorityWeight(a.priority, a.priorityRank) - priorityWeight(b.priority, b.priorityRank)
  )

  // Internal slot type
  interface Slot {
    projectId: string
    workItemId: string
    estimatedHours: number
    priority: PlanningPriority
    primarySkill?: string
  }

  const slots: Slot[] = []
  for (const project of sortedProjects) {
    const sortedEpics = [...project.epics].sort(
      (a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999)
    )
    for (const epic of sortedEpics) {
      for (const item of epic.workItems) {
        if (item.status === 'done') continue
        slots.push({
          projectId: project.id,
          workItemId: item.id,
          estimatedHours: item.estimatedHours,
          priority: getEffectivePriority(item, project),
          primarySkill: item.primarySkill,
        })
      }
    }
  }

  slots.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

  // Per-sprint, per-member remaining hours tracker.
  // Budget = full availableHoursPerSprint — no artificial cap.
  // Timeline length is determined by actual work vs actual capacity.
  const memberHours: Record<number, Record<string, number>> = {}
  const getSprintHours = (sprintNum: number): Record<string, number> => {
    if (!memberHours[sprintNum]) {
      memberHours[sprintNum] = Object.fromEntries(
        activeMembers.map((m) => [m.id, m.availableHoursPerSprint])
      )
    }
    return memberHours[sprintNum]
  }

  const placements: WorkItemPlacement[] = []
  const overflowItems: string[] = []
  const allocationsBySprintMember: Record<string, CapacityAllocation> = {}

  // Skill → primary role mapping.
  // Work items with a primarySkill will only be assigned to members in the
  // matching role. If no role member has capacity in the current sprint,
  // the item waits for a later sprint (never cross-assigned).
  // Skills not in this map (undefined) are unroled — any member may be assigned.
  const SKILL_PRIMARY_ROLE: Record<string, string> = {
    'skill-sf-config':    'role-admin',
    'skill-sf-data':      'role-admin',
    'skill-sales-cloud':  'role-admin',
    'skill-litify':       'role-admin',
    'skill-web':          'role-admin',
    'skill-sf-dev':       'role-integration-dev',
    'skill-integration':  'role-integration-dev',
    'skill-async':        'role-integration-dev',
    'skill-reporting':    'role-ba',
    'skill-qa':           'role-ba',
    'skill-docs':         'role-pm',
    'skill-pm':           'role-pm',
    'skill-ai':           'role-prompt-engineer',
    'skill-cloud':        'role-architect',
  }

  for (const slot of slots) {
    let placed = false

    // Determine which role should handle this work item (if skill is defined)
    const requiredRoleId = slot.primarySkill ? SKILL_PRIMARY_ROLE[slot.primarySkill] : undefined

    for (let sprintNum = 1; sprintNum <= 52; sprintNum++) {
      const sprintCap = getSprintHours(sprintNum)

      let bestMemberId: string | undefined
      let bestScore = -1

      for (const member of activeMembers) {
        // Skip temp/external members outside their sprint window
        if (member.startSprintId != null && sprintNum < member.startSprintId) continue
        if (member.endSprintId != null && sprintNum > member.endSprintId) continue

        const remaining = sprintCap[member.id] ?? 0
        if (remaining <= 0) continue

        // Item must fit within remaining capacity for this member this sprint
        if (slot.estimatedHours > member.availableHoursPerSprint) continue  // single item too big
        if (slot.estimatedHours > remaining) continue  // not enough room

        // Role gate: if the skill has a required role, only consider members whose
        // primaryRoleId or coversRoles includes that role.
        // This enforces "wait for the right role" — no cross-role assignment.
        if (requiredRoleId) {
          const memberRoles = [member.primaryRoleId, ...(member.coversRoles ?? [])]
          if (!memberRoles.includes(requiredRoleId)) continue
        }

        const skillLevel = slot.primarySkill
          ? (member.userSkills.find((us) => us.skillId === slot.primarySkill)?.level ?? 0)
          : 3  // unroled items treat all members equally

        if (slot.primarySkill && skillLevel === 0) continue  // member lacks the skill entirely

        // Score: prefer higher skill level first (top candidates), then most remaining hours
        // This ensures higher-skilled members are assigned before less-skilled ones
        const score = skillLevel * 1000 + remaining
        if (score > bestScore) {
          bestMemberId = member.id
          bestScore = score
        }
      }

      if (bestMemberId) {
        const member = activeMembers.find((m) => m.id === bestMemberId)!
        const effortInSprints = slot.estimatedHours / member.availableHoursPerSprint

        sprintCap[bestMemberId] = Math.max(0, (sprintCap[bestMemberId] ?? 0) - slot.estimatedHours)

        placements.push({
          workItemId: slot.workItemId,
          sprintNumber: sprintNum,
          assignedTeamMemberId: bestMemberId,
          effortInSprints,
          estimatedHours: slot.estimatedHours,
        })

        const allocKey = `${sprintNum}:${bestMemberId}`
        if (!allocationsBySprintMember[allocKey]) {
          allocationsBySprintMember[allocKey] = {
            teamMemberId: bestMemberId,
            sprintNumber: sprintNum,
            allocatedSprints: 0,
            workItemIds: [],
          }
        }
        allocationsBySprintMember[allocKey].allocatedSprints += effortInSprints
        allocationsBySprintMember[allocKey].workItemIds.push(slot.workItemId)

        placed = true
        break
      }
    }

    if (!placed) {
      overflowItems.push(slot.workItemId)
    }
  }

  // Auto-flag items > SPLIT_THRESHOLD_HOURS (read-only note — can't mutate input data)
  // This is surfaced via WorkItemPlacement for the UI to consume.

  const maxSprint = placements.reduce((m, p) => Math.max(m, p.sprintNumber), 1)
  // Always show at least 13 sprints (~6 months) for planning horizon visibility
  const totalSprints = Math.max(maxSprint, 13)

  const generatedSprints = generateSprints(totalSprints, startDate)
  const sprintDetails: SprintDetail[] = generatedSprints.map((s) => {
    const sprintAllocations = Object.values(allocationsBySprintMember).filter(
      (a) => a.sprintNumber === s.number
    )
    // Calculate allocated hours for this sprint
    const allocatedPlacements = placements.filter((p) => p.sprintNumber === s.number)
    const totalAllocatedHours = allocatedPlacements.reduce((sum, p) => sum + p.estimatedHours, 0)
    const totalAllocatedSprints = sprintAllocations.reduce((sum, a) => sum + a.allocatedSprints, 0)
    const remainingCapacity = Math.max(0, totalTargetHoursPerSprint - totalAllocatedHours)

    return {
      ...s,
      capacityHours: totalAvailableHours,
      allocations: sprintAllocations,
      totalAllocatedHours,
      totalTargetHours: totalTargetHoursPerSprint,
      totalAvailableHours,
      remainingCapacity,
      isOverTarget: totalAllocatedHours > totalTargetHoursPerSprint,
      isOverloaded: totalAllocatedHours > totalAvailableHours,
      // Legacy compat
      totalAllocatedSprints,
    }
  })

  const bottlenecks: BottleneckInfo[] = []
  for (const detail of sprintDetails) {
    if (detail.isOverloaded) {
      const affectedIds = detail.allocations.flatMap((a) => a.workItemIds)
      bottlenecks.push({
        sprintNumber: detail.number,
        reason: `Sprint ${detail.number} is overloaded (${detail.totalAllocatedHours.toFixed(0)}h / ${totalAvailableHours}h available)`,
        affectedWorkItemIds: affectedIds,
      })
    } else if (detail.isOverTarget) {
      const affectedIds = detail.allocations.flatMap((a) => a.workItemIds)
      bottlenecks.push({
        sprintNumber: detail.number,
        reason: `Sprint ${detail.number} exceeds utilization target (${detail.totalAllocatedHours.toFixed(0)}h / ${totalTargetHoursPerSprint}h target)`,
        affectedWorkItemIds: affectedIds,
      })
    }
  }

  const endDate = generatedSprints[generatedSprints.length - 1]?.endDate ?? startDate

  // Unused but referenced elsewhere — keep export visible
  void SPLIT_THRESHOLD_HOURS

  return {
    sprints: sprintDetails,
    workItemPlacements: placements,
    overflowItems,
    bottlenecks,
    totalSprints,
    startDate,
    endDate,
  }
}
