// ============================================================
// Sprint Placement Engine
//
// Assigns work items to sprints based on shared team capacity.
// Sprint = 2 weeks. Team capacity = sum of (weeklyHours × utilization × 2) per resource.
// Work is placed sequentially — fill sprint capacity, then overflow to next sprint.
// Priority order: high → medium → low (highest priority items placed first).
//
// TODO Wave 2: replace with real constraint-based scheduling
// ============================================================

import type { PlanningProject, Sprint, TeamMember, CapacityAllocation } from '@/types/planning'
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
  effortHours: number
  priority: 'high' | 'medium' | 'low'
}

// ── Helpers ───────────────────────────────────────────────────

/** Add N days to an ISO date string. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

/** Priority sort weight — lower = higher priority. */
function priorityWeight(p: 'high' | 'medium' | 'low'): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2
}

// ── Sprint generation ─────────────────────────────────────────

/**
 * Generate `count` sequential 2-week sprints starting from `startDate`.
 * `capacityHours` is set to 0 here and filled in by `buildSprintPlan`.
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
      capacityHours: 0, // filled in by buildSprintPlan
    })
    current = addDays(current, 14)
  }
  return sprints
}

// ── Capacity calculation ──────────────────────────────────────

/**
 * Calculate sprint capacity (2-week total hours) from a CapacityProfile.
 * sprintCapacity = sum over resources of (weeklyCapacityHours × utilizationRate × 2)
 */
export function calculateSprintCapacity(capacity: CapacityProfile): number {
  return capacity.resources.reduce(
    (sum, r) => sum + r.weeklyCapacityHours * r.utilizationRate * 2,
    0
  )
}

// ── Sprint placement ──────────────────────────────────────────

/**
 * Build a sprint plan for all projects given a capacity profile.
 *
 * Algorithm:
 *   1. Flatten all work items across all projects into a single list.
 *   2. Sort by priority (high → medium → low).
 *   3. Assign each item to the current sprint. When the sprint fills up,
 *      move to the next sprint.
 *   4. Generate as many sprints as needed.
 *   5. Return SprintPlan with per-item and per-project assignments.
 */
export function buildSprintPlan(
  projects: PlanningProject[],
  capacity: CapacityProfile,
  startDate: string
): SprintPlan {
  const sprintCapacityHours = calculateSprintCapacity(capacity)

  // Flatten work items
  const slots: WorkItemSlot[] = []
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        slots.push({
          projectId: project.id,
          workItemId: item.id,
          effortHours: item.effortHours,
          priority: item.priority,
        })
      }
    }
  }

  // Sort: high → medium → low (stable within priority)
  slots.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

  // Assign items to sprints
  const workItemAssignments: Record<string, number> = {}
  const projectAssignments: Record<string, Set<number>> = {}

  let currentSprint = 1
  let currentLoad = 0

  for (const slot of slots) {
    // If this item would exceed the sprint capacity and it's not the first item
    // in this sprint, overflow to the next sprint.
    if (currentLoad + slot.effortHours > sprintCapacityHours && currentLoad > 0) {
      currentSprint++
      currentLoad = 0
    }

    workItemAssignments[slot.workItemId] = currentSprint
    currentLoad += slot.effortHours

    if (!projectAssignments[slot.projectId]) {
      projectAssignments[slot.projectId] = new Set()
    }
    projectAssignments[slot.projectId].add(currentSprint)
  }

  const totalSprints = currentSprint

  // Generate sprints with capacity filled in
  const sprints = generateSprints(totalSprints, startDate).map((s) => ({
    ...s,
    capacityHours: sprintCapacityHours,
  }))

  // Convert Set → sorted Array for serialisation
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
// Builds a sprint roadmap using TeamMember skill-based matching.
// Replaces the generic CapacityProfile with named team members.

export interface SprintDetail extends Sprint {
  allocations: CapacityAllocation[]
  totalAllocatedSprints: number
  remainingCapacity: number  // in sprint fractions
  isOverloaded: boolean
}

export interface WorkItemPlacement {
  workItemId: string
  sprintNumber: number
  assignedTeamMemberId?: string
  effortInSprints: number
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
 * Build an enhanced sprint roadmap using TeamMember capacity fractions.
 *
 * Algorithm:
 *   1. Flatten all work items across all projects (skip done items).
 *   2. Sort by priority (high → medium → low).
 *   3. For each work item, find the best-fit active team member with remaining capacity.
 *   4. Place the item in the current sprint under that member.
 *   5. When all members are fully loaded for the sprint, advance to the next sprint.
 *   6. Track overflow (items with no eligible member) and bottlenecks.
 */
export function buildSprintRoadmap(
  projects: PlanningProject[],
  members: TeamMember[],
  startDate: string
): SprintRoadmap {
  const activeMembers = members.filter((m) => m.isActive)

  // Total team sprint capacity (sum of all member sprintCapacity fractions)
  const totalTeamCapacity = activeMembers.reduce((sum, m) => sum + m.sprintCapacity, 0)

  // Flatten work items (exclude done)
  interface Slot {
    projectId: string
    workItemId: string
    effortInSprints: number
    priority: 'high' | 'medium' | 'low'
    primarySkill?: string
  }

  const slots: Slot[] = []
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        if (item.status === 'done') continue
        const effortInSprints = item.effortInSprints ?? Math.max(0.25, item.effortHours / 40)
        slots.push({
          projectId: project.id,
          workItemId: item.id,
          effortInSprints,
          priority: item.priority,
          primarySkill: item.primarySkill,
        })
      }
    }
  }

  // Sort: high → medium → low
  slots.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

  // Per-sprint, per-member remaining capacity tracker
  // memberCapacity[sprintNum][memberId] = remaining fraction
  const memberCapacity: Record<number, Record<string, number>> = {}
  const getAllocationsForSprint = (sprintNum: number): Record<string, number> => {
    if (!memberCapacity[sprintNum]) {
      memberCapacity[sprintNum] = Object.fromEntries(
        activeMembers.map((m) => [m.id, m.sprintCapacity])
      )
    }
    return memberCapacity[sprintNum]
  }

  const placements: WorkItemPlacement[] = []
  const overflowItems: string[] = []
  const allocationsBySprintMember: Record<string, CapacityAllocation> = {}

  // Place items
  for (const slot of slots) {
    let placed = false

    // Try to place in the earliest sprint where any member has capacity
    for (let sprintNum = 1; sprintNum <= 20; sprintNum++) {
      const sprintCap = getAllocationsForSprint(sprintNum)

      // Find best member: prefer skill match, then most remaining capacity
      let bestMemberId: string | undefined
      let bestRemaining = -1

      for (const member of activeMembers) {
        const remaining = sprintCap[member.id] ?? 0
        if (remaining < slot.effortInSprints && slot.effortInSprints <= member.sprintCapacity) {
          // Not enough room in this sprint for this member — skip
          continue
        }
        if (remaining <= 0) continue

        // Prefer skill match
        const hasSkill =
          !slot.primarySkill ||
          member.userSkills.some((us) => us.skillId === slot.primarySkill && us.level > 0)

        const score = (hasSkill ? 100 : 0) + remaining
        if (score > bestRemaining || bestMemberId === undefined) {
          bestMemberId = member.id
          bestRemaining = score
        }
      }

      if (bestMemberId) {
        // Deduct capacity
        const needed = Math.min(slot.effortInSprints, sprintCap[bestMemberId])
        sprintCap[bestMemberId] = Math.max(0, sprintCap[bestMemberId] - needed)

        placements.push({
          workItemId: slot.workItemId,
          sprintNumber: sprintNum,
          assignedTeamMemberId: bestMemberId,
          effortInSprints: slot.effortInSprints,
        })

        // Track allocation
        const allocKey = `${sprintNum}:${bestMemberId}`
        if (!allocationsBySprintMember[allocKey]) {
          allocationsBySprintMember[allocKey] = {
            teamMemberId: bestMemberId,
            sprintNumber: sprintNum,
            allocatedSprints: 0,
            workItemIds: [],
          }
        }
        allocationsBySprintMember[allocKey].allocatedSprints += needed
        allocationsBySprintMember[allocKey].workItemIds.push(slot.workItemId)

        placed = true
        break
      }

      // If no member has any capacity left in this sprint, try next sprint
      const anyCapacity = Object.values(sprintCap).some((c) => c > 0)
      if (!anyCapacity) continue
    }

    if (!placed) {
      overflowItems.push(slot.workItemId)
    }
  }

  // Determine how many sprints were used
  const maxSprint = placements.reduce((m, p) => Math.max(m, p.sprintNumber), 1)
  const totalSprints = Math.max(maxSprint, 1)

  // Build SprintDetail array
  const generatedSprints = generateSprints(totalSprints, startDate)
  const sprintDetails: SprintDetail[] = generatedSprints.map((s) => {
    const sprintAllocations = Object.values(allocationsBySprintMember).filter(
      (a) => a.sprintNumber === s.number
    )
    const totalAllocatedSprints = sprintAllocations.reduce(
      (sum, a) => sum + a.allocatedSprints,
      0
    )
    const remainingCapacity = Math.max(0, totalTeamCapacity - totalAllocatedSprints)
    return {
      ...s,
      capacityHours: totalTeamCapacity * 40, // convert fractions × 40h to hours for compat
      allocations: sprintAllocations,
      totalAllocatedSprints,
      remainingCapacity,
      isOverloaded: totalAllocatedSprints > totalTeamCapacity,
    }
  })

  // Detect bottlenecks
  const bottlenecks: BottleneckInfo[] = []
  for (const detail of sprintDetails) {
    if (detail.isOverloaded) {
      const affectedIds = detail.allocations.flatMap((a) => a.workItemIds)
      bottlenecks.push({
        sprintNumber: detail.number,
        reason: `Sprint ${detail.number} is overloaded (${detail.totalAllocatedSprints.toFixed(2)} / ${totalTeamCapacity.toFixed(2)} sprint fractions)`,
        affectedWorkItemIds: affectedIds,
      })
    }
  }

  const endDate = generatedSprints[generatedSprints.length - 1]?.endDate ?? startDate

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
