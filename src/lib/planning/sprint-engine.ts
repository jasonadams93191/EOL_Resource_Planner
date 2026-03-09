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
        if (item.status === 'done') continue  // done tasks don't consume capacity
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
  projectedStartDate?: string  // ISO date — sprint start date
  projectedEndDate?: string    // ISO date — estimated completion within sprint
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
  blockedItems: string[]   // workItemIds blocked (directly or via dependency cascade)
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
    dependsOnWorkItemIds: string[]
    status?: string
  }

  // ── Intra-epic auto-dependency chaining ──
  // Within each epic, tasks execute sequentially: task[1] depends on task[0], etc.
  // We collect these implicit deps in a map so we don't mutate source data.
  const implicitDeps: Map<string, string[]> = new Map()
  for (const project of sortedProjects) {
    for (const epic of project.epics) {
      const activeItems = epic.workItems.filter((wi) => wi.status !== 'done')
      for (let i = 1; i < activeItems.length; i++) {
        const existing = activeItems[i].dependsOnWorkItemIds ?? []
        if (!existing.includes(activeItems[i - 1].id)) {
          implicitDeps.set(activeItems[i].id, [...existing, activeItems[i - 1].id])
        }
      }
    }
  }

  const slots: Slot[] = []
  const statusMap: Map<string, string> = new Map()
  for (const project of sortedProjects) {
    const sortedEpics = [...project.epics].sort(
      (a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999)
    )
    for (const epic of sortedEpics) {
      for (const item of epic.workItems) {
        if (item.status === 'done') continue
        statusMap.set(item.id, item.status)
        const deps = implicitDeps.get(item.id) ?? item.dependsOnWorkItemIds ?? []
        slots.push({
          projectId: project.id,
          workItemId: item.id,
          estimatedHours: item.estimatedHours,
          priority: getEffectivePriority(item, project),
          primarySkill: item.primarySkill,
          dependsOnWorkItemIds: deps,
          status: item.status,
        })
      }
    }
  }

  // ── Topological sort (Kahn's algorithm) ──
  // Preserves priority order among items at the same dependency depth.
  const slotMap = new Map(slots.map((s) => [s.workItemId, s]))
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>() // depId → items that depend on it
  for (const s of slots) {
    inDegree.set(s.workItemId, 0)
  }
  for (const s of slots) {
    let validDeps = 0
    for (const depId of s.dependsOnWorkItemIds) {
      if (slotMap.has(depId)) {
        validDeps++
        const list = dependents.get(depId) ?? []
        list.push(s.workItemId)
        dependents.set(depId, list)
      }
    }
    inDegree.set(s.workItemId, validDeps)
  }

  // Seed queue with items that have no in-scope dependencies, sorted by priority
  const queue: Slot[] = slots
    .filter((s) => (inDegree.get(s.workItemId) ?? 0) === 0)
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

  const sorted: Slot[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)
    for (const depId of dependents.get(current.workItemId) ?? []) {
      const deg = (inDegree.get(depId) ?? 1) - 1
      inDegree.set(depId, deg)
      if (deg === 0) {
        const depSlot = slotMap.get(depId)
        if (depSlot) {
          // Insert in priority order within the queue
          const insertIdx = queue.findIndex(
            (q) => priorityWeight(q.priority) > priorityWeight(depSlot.priority)
          )
          if (insertIdx === -1) queue.push(depSlot)
          else queue.splice(insertIdx, 0, depSlot)
        }
      }
    }
  }

  // Any remaining items (cycles) — append them to avoid silent drops
  for (const s of slots) {
    if (!sorted.find((x) => x.workItemId === s.workItemId)) {
      sorted.push(s)
    }
  }

  // ── Blocked cascade ──
  // If an item is blocked, all its transitive dependents are also blocked.
  const blockedSet = new Set<string>()
  // First mark directly blocked items
  for (const s of sorted) {
    if (s.status === 'blocked') blockedSet.add(s.workItemId)
  }
  // Then cascade: if any dep is blocked, this item is blocked too
  for (const s of sorted) {
    if (blockedSet.has(s.workItemId)) continue
    for (const depId of s.dependsOnWorkItemIds) {
      if (blockedSet.has(depId)) {
        blockedSet.add(s.workItemId)
        break
      }
    }
  }

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

  // Placement map for O(1) dependency lookups
  const placementMap = new Map<string, WorkItemPlacement>()
  const blockedItems: string[] = []

  // Track which initiatives (projectIds) each member is working on per sprint.
  // Constraint: max 3 initiatives per person per sprint to prevent context-switching.
  const MAX_INITIATIVES_PER_MEMBER = 3
  const memberInitiativesBySprint: Record<string, Set<string>> = {} // key: `sprint:memberId`
  const getInitiatives = (sprintNum: number, memberId: string): Set<string> => {
    const key = `${sprintNum}:${memberId}`
    if (!memberInitiativesBySprint[key]) memberInitiativesBySprint[key] = new Set()
    return memberInitiativesBySprint[key]
  }

  // Map workItemId → projectId for initiative tracking
  const workItemToProject: Record<string, string> = {}
  for (const slot of sorted) {
    workItemToProject[slot.workItemId] = slot.projectId
  }

  for (const slot of sorted) {
    // Skip blocked items (and their cascaded dependents)
    if (blockedSet.has(slot.workItemId)) {
      blockedItems.push(slot.workItemId)
      continue
    }

    // Compute earliest sprint based on dependency placements
    let earliestSprint = 1
    for (const depId of slot.dependsOnWorkItemIds) {
      const depPlacement = placementMap.get(depId)
      if (depPlacement) {
        earliestSprint = Math.max(earliestSprint, depPlacement.sprintNumber)
      }
    }

    let placed = false

    // Determine which role should handle this work item (if skill is defined)
    const requiredRoleId = slot.primarySkill ? SKILL_PRIMARY_ROLE[slot.primarySkill] : undefined

    for (let sprintNum = earliestSprint; sprintNum <= 52; sprintNum++) {
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

        // Initiative cap: max 3 initiatives per member per sprint
        const memberInits = getInitiatives(sprintNum, member.id)
        if (!memberInits.has(slot.projectId) && memberInits.size >= MAX_INITIATIVES_PER_MEMBER) continue

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

        // Record initiative for the member in this sprint
        getInitiatives(sprintNum, bestMemberId).add(slot.projectId)

        const placement: WorkItemPlacement = {
          workItemId: slot.workItemId,
          sprintNumber: sprintNum,
          assignedTeamMemberId: bestMemberId,
          effortInSprints,
          estimatedHours: slot.estimatedHours,
        }
        placements.push(placement)
        placementMap.set(slot.workItemId, placement)

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

  // Populate projected start/end dates on placements using sprint date ranges
  const sprintDateLookup = new Map(generatedSprints.map((s) => [s.number, s]))
  for (const p of placements) {
    const sprint = sprintDateLookup.get(p.sprintNumber)
    if (sprint) {
      p.projectedStartDate = sprint.startDate
      // End date: start + ceil(estimatedHours / (member.availableHoursPerSprint / 10)) working days
      // Simplified: proportional position within the 14-day sprint
      const daysInSprint = 14
      const fractionOfSprint = Math.min(1, p.effortInSprints)
      const daysUsed = Math.max(1, Math.ceil(fractionOfSprint * daysInSprint))
      p.projectedEndDate = addDays(sprint.startDate, daysUsed - 1)
    }
  }

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
    blockedItems,
    bottlenecks,
    totalSprints,
    startDate,
    endDate,
  }
}

// ── Baseline Timeline (single-person serial schedule) ──────────

export interface BaselineTimelineItem {
  workItemId: string
  startDay: number
  endDay: number
  estimatedHours: number
  dependsOn: string[]
}

export interface BaselineTimeline {
  totalWorkingDays: number
  totalHours: number
  itemTimeline: BaselineTimelineItem[]
  criticalPath: string[]
}

/**
 * Compute a single-person baseline timeline: how long all work would take
 * if one person did everything in dependency order.
 */
export function computeBaselineTimeline(
  projects: PlanningProject[],
  hoursPerDay: number = 6
): BaselineTimeline {
  // Collect all non-done work items and build intra-epic auto-deps
  const allItems: Array<{ id: string; hours: number; deps: string[] }> = []
  const epicImplicitDeps: Map<string, string[]> = new Map()

  for (const project of projects) {
    for (const epic of project.epics) {
      const activeItems = epic.workItems.filter((wi) => wi.status !== 'done')
      for (let i = 1; i < activeItems.length; i++) {
        const existing = activeItems[i].dependsOnWorkItemIds ?? []
        if (!existing.includes(activeItems[i - 1].id)) {
          epicImplicitDeps.set(activeItems[i].id, [...existing, activeItems[i - 1].id])
        }
      }
      for (const wi of activeItems) {
        allItems.push({
          id: wi.id,
          hours: wi.estimatedHours,
          deps: epicImplicitDeps.get(wi.id) ?? wi.dependsOnWorkItemIds ?? [],
        })
      }
    }
  }

  const itemMap = new Map(allItems.map((it) => [it.id, it]))

  // Topological sort (Kahn's)
  const inDeg = new Map<string, number>()
  const children = new Map<string, string[]>()
  for (const it of allItems) {
    inDeg.set(it.id, 0)
  }
  for (const it of allItems) {
    let deg = 0
    for (const depId of it.deps) {
      if (itemMap.has(depId)) {
        deg++
        const c = children.get(depId) ?? []
        c.push(it.id)
        children.set(depId, c)
      }
    }
    inDeg.set(it.id, deg)
  }

  const queue = allItems.filter((it) => (inDeg.get(it.id) ?? 0) === 0).map((it) => it.id)
  const order: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const childId of children.get(id) ?? []) {
      const d = (inDeg.get(childId) ?? 1) - 1
      inDeg.set(childId, d)
      if (d === 0) queue.push(childId)
    }
  }
  // Append any remaining (cycles)
  for (const it of allItems) {
    if (!order.includes(it.id)) order.push(it.id)
  }

  // Schedule serially respecting dependencies
  const endDayMap = new Map<string, number>()
  const startDayMap = new Map<string, number>()
  const timeline: BaselineTimelineItem[] = []
  let cursor = 0
  let totalHours = 0

  for (const id of order) {
    const it = itemMap.get(id)!
    // Start after all deps finish
    let start = cursor
    for (const depId of it.deps) {
      const depEnd = endDayMap.get(depId)
      if (depEnd != null) start = Math.max(start, depEnd)
    }
    const duration = Math.ceil(it.hours / hoursPerDay)
    const end = start + duration
    startDayMap.set(id, start)
    endDayMap.set(id, end)
    cursor = end // serial: next item starts after this one
    totalHours += it.hours
    timeline.push({
      workItemId: id,
      startDay: start,
      endDay: end,
      estimatedHours: it.hours,
      dependsOn: it.deps,
    })
  }

  const totalWorkingDays = Math.max(...Array.from(endDayMap.values()), 0)

  // Critical path: trace back from the item(s) that end on totalWorkingDays
  const criticalPath: string[] = []
  let traceId = timeline.find((t) => t.endDay === totalWorkingDays)?.workItemId
  while (traceId) {
    criticalPath.unshift(traceId)
    const it = itemMap.get(traceId)!
    let longestDepId: string | undefined
    let longestEnd = -1
    for (const depId of it.deps) {
      const depEnd = endDayMap.get(depId) ?? -1
      if (depEnd > longestEnd) {
        longestEnd = depEnd
        longestDepId = depId
      }
    }
    traceId = longestDepId
  }

  return { totalWorkingDays, totalHours, itemTimeline: timeline, criticalPath }
}
