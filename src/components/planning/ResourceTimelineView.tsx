'use client'

import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
import type { PlanningProject, TeamMember } from '@/types/planning'

interface ResourceTimelineViewProps {
  roadmap: SprintRoadmap
  projects: PlanningProject[]
  members: TeamMember[]
}

// ── Project color palette ─────────────────────────────────────

const PROJECT_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-800', bar: 'bg-indigo-400' },
  { bg: 'bg-teal-100',   text: 'text-teal-800',   bar: 'bg-teal-400' },
  { bg: 'bg-violet-100', text: 'text-violet-800',  bar: 'bg-violet-400' },
  { bg: 'bg-amber-100',  text: 'text-amber-800',   bar: 'bg-amber-400' },
  { bg: 'bg-rose-100',   text: 'text-rose-800',    bar: 'bg-rose-400' },
  { bg: 'bg-cyan-100',   text: 'text-cyan-800',    bar: 'bg-cyan-400' },
  { bg: 'bg-lime-100',   text: 'text-lime-800',    bar: 'bg-lime-400' },
  { bg: 'bg-orange-100', text: 'text-orange-800',  bar: 'bg-orange-400' },
]

function getProjectColor(projectIndex: number) {
  return PROJECT_COLORS[projectIndex % PROJECT_COLORS.length]
}

// ── Short date formatter ──────────────────────────────────────

function shortDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ── Capacity bar ──────────────────────────────────────────────

function CapacityBar({ allocated, capacity }: { allocated: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(1, allocated / capacity) * 100 : 0
  const isOver = allocated > capacity
  const isHigh = allocated > capacity * 0.8
  const barColor = isOver ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-green-400'

  return (
    <div className="mt-1">
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden w-full">
        <div
          className={`h-1 rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-0.5 text-right">
        {allocated.toFixed(1)}/{capacity.toFixed(1)}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function ResourceTimelineView({ roadmap, projects, members }: ResourceTimelineViewProps) {
  const { workItemPlacements, sprints, totalSprints } = roadmap

  // Build item lookup: workItemId → { title, projectId }
  const itemLookup = new Map<string, { title: string; projectId: string; epicId: string }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        itemLookup.set(item.id, { title: item.title, projectId: project.id, epicId: epic.id })
      }
    }
  }

  // Build project index map for color assignment
  const projectIndexMap = new Map<string, number>()
  projects.forEach((p, i) => projectIndexMap.set(p.id, i))

  // Build memberSprintMap: memberId → sprintNum → placements[]
  type PlacementInfo = { workItemId: string; title: string; effortInSprints: number; projectId: string; projectIndex: number }
  const memberSprintMap = new Map<string, Map<number, PlacementInfo[]>>()

  for (const placement of workItemPlacements) {
    const memberId = placement.assignedTeamMemberId
    if (!memberId) continue
    if (!memberSprintMap.has(memberId)) {
      memberSprintMap.set(memberId, new Map())
    }
    const sprintMap = memberSprintMap.get(memberId)!
    if (!sprintMap.has(placement.sprintNumber)) {
      sprintMap.set(placement.sprintNumber, [])
    }
    const info = itemLookup.get(placement.workItemId)
    const projectIndex = info ? (projectIndexMap.get(info.projectId) ?? 0) : 0
    sprintMap.get(placement.sprintNumber)!.push({
      workItemId: placement.workItemId,
      title: info?.title ?? placement.workItemId,
      effortInSprints: placement.effortInSprints,
      projectId: info?.projectId ?? '',
      projectIndex,
    })
  }

  // Build per-sprint allocated fractions per member
  const memberSprintAllocated = new Map<string, Map<number, number>>()
  for (const placement of workItemPlacements) {
    const memberId = placement.assignedTeamMemberId
    if (!memberId) continue
    if (!memberSprintAllocated.has(memberId)) memberSprintAllocated.set(memberId, new Map())
    const m = memberSprintAllocated.get(memberId)!
    m.set(placement.sprintNumber, (m.get(placement.sprintNumber) ?? 0) + placement.effortInSprints)
  }

  const activeMembers = members.filter((m) => m.isActive)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            {/* Member column header */}
            <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[150px]">
              Member
            </th>
            {/* Sprint column headers */}
            {Array.from({ length: totalSprints }, (_, i) => i + 1).map((sprintNum) => {
              const sprint = sprints.find((s) => s.number === sprintNum)
              return (
                <th
                  key={sprintNum}
                  className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-600 min-w-[120px]"
                >
                  <div>S{sprintNum}</div>
                  {sprint && (
                    <div className="font-normal text-gray-400">
                      {shortDate(sprint.startDate)}–{shortDate(sprint.endDate)}
                    </div>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {activeMembers.map((member) => {
            const sprintMap = memberSprintMap.get(member.id)
            return (
              <tr key={member.id} className="border-b border-gray-100">
                {/* Member name (sticky) */}
                <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2">
                  <div className="font-medium text-gray-800 whitespace-nowrap">{member.name}</div>
                  <div className="text-gray-400">{(member.sprintCapacity * 100).toFixed(0)}% capacity</div>
                </td>
                {/* Sprint cells */}
                {Array.from({ length: totalSprints }, (_, i) => i + 1).map((sprintNum) => {
                  const placements = sprintMap?.get(sprintNum) ?? []
                  const allocated = memberSprintAllocated.get(member.id)?.get(sprintNum) ?? 0
                  const isOverloaded = allocated > member.sprintCapacity

                  return (
                    <td
                      key={sprintNum}
                      className={`border-r border-gray-100 px-2 py-2 align-top ${isOverloaded ? 'bg-red-50' : ''}`}
                    >
                      {placements.length > 0 ? (
                        <div className="space-y-1">
                          {placements.map((p) => {
                            const color = getProjectColor(p.projectIndex)
                            return (
                              <div
                                key={p.workItemId}
                                className={`rounded px-1.5 py-0.5 ${color.bg} ${color.text} truncate max-w-[110px]`}
                                title={`${p.title} (${p.effortInSprints.toFixed(2)} sp)`}
                              >
                                {p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title}
                              </div>
                            )
                          })}
                          <CapacityBar allocated={allocated} capacity={member.sprintCapacity} />
                        </div>
                      ) : (
                        <div className="text-gray-200 text-center">—</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
