'use client'

import type { SprintRoadmap, SprintDetail, WorkItemPlacement } from '@/lib/planning/sprint-engine'
import type { PlanningProject, TeamMember } from '@/types/planning'

interface SprintRoadmapViewProps {
  roadmap: SprintRoadmap
  projects: PlanningProject[]
  members: TeamMember[]
}

// Build a lookup: workItemId → { title, projectName }
function buildItemLookup(projects: PlanningProject[]): Record<string, { title: string; projectName: string; priority: string }> {
  const map: Record<string, { title: string; projectName: string; priority: string }> = {}
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        map[item.id] = { title: item.title, projectName: project.name, priority: item.priority ?? project.priority }
      }
    }
  }
  return map
}

function CapacityIndicator({ sprint }: { sprint: SprintDetail }) {
  const pct = sprint.totalAllocatedSprints > 0
    ? Math.min(100, Math.round((sprint.totalAllocatedSprints / (sprint.totalAllocatedSprints + sprint.remainingCapacity)) * 100))
    : 0
  const color = sprint.isOverloaded ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{sprint.totalAllocatedSprints.toFixed(1)} allocated</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {sprint.isOverloaded && (
        <p className="text-xs text-red-600 mt-0.5">Overloaded</p>
      )}
    </div>
  )
}

function PlacementCard({
  placement,
  itemLookup,
  members,
}: {
  placement: WorkItemPlacement
  itemLookup: Record<string, { title: string; projectName: string; priority: string }>
  members: TeamMember[]
}) {
  const info = itemLookup[placement.workItemId]
  const assignee = members.find((m) => m.id === placement.assignedTeamMemberId)
  const priorityColor: Record<string, string> = {
    high: 'border-l-red-400',
    medium: 'border-l-yellow-400',
    low: 'border-l-gray-300',
  }

  return (
    <div className={`rounded border-l-2 border border-gray-100 bg-white px-2 py-1.5 ${priorityColor[info?.priority ?? 'low'] ?? 'border-l-gray-300'}`}>
      <p className="text-xs font-medium text-gray-800 truncate">{info?.title ?? placement.workItemId}</p>
      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
        <span className="truncate">{info?.projectName ?? '—'}</span>
        {assignee && (
          <>
            <span>·</span>
            <span className="text-indigo-600 truncate">{assignee.name.split(' ')[0]}</span>
          </>
        )}
        <span className="ml-auto shrink-0">{placement.effortInSprints.toFixed(2)}sp</span>
      </div>
    </div>
  )
}

export function SprintRoadmapView({ roadmap, projects, members }: SprintRoadmapViewProps) {
  const itemLookup = buildItemLookup(projects)

  // Group placements by sprint
  const placementsBySprint: Record<number, WorkItemPlacement[]> = {}
  for (const p of roadmap.workItemPlacements) {
    if (!placementsBySprint[p.sprintNumber]) placementsBySprint[p.sprintNumber] = []
    placementsBySprint[p.sprintNumber].push(p)
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium text-blue-900">{roadmap.totalSprints} sprints</span>
        <span className="text-blue-700">{roadmap.startDate} → {roadmap.endDate}</span>
        <span className="text-blue-700">{roadmap.workItemPlacements.length} items placed</span>
        {roadmap.overflowItems.length > 0 && (
          <span className="rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs">
            {roadmap.overflowItems.length} overflow
          </span>
        )}
        {roadmap.bottlenecks.length > 0 && (
          <span className="rounded bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs">
            {roadmap.bottlenecks.length} bottleneck{roadmap.bottlenecks.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Sprint columns — horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {roadmap.sprints.map((sprint) => {
          const placements = placementsBySprint[sprint.number] ?? []
          return (
            <div
              key={sprint.number}
              className="flex-shrink-0 w-56 rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              {/* Sprint header */}
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Sprint {sprint.number}</span>
                  {sprint.isOverloaded && (
                    <span className="text-xs rounded bg-red-100 text-red-600 px-1.5 py-0.5">!</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{sprint.startDate} – {sprint.endDate}</p>
              </div>

              <CapacityIndicator sprint={sprint} />

              {/* Work item cards */}
              <div className="space-y-1.5 mt-2">
                {placements.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">Empty</p>
                ) : (
                  placements.map((p) => (
                    <PlacementCard
                      key={p.workItemId}
                      placement={p}
                      itemLookup={itemLookup}
                      members={members}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overflow section */}
      {roadmap.overflowItems.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">Overflow — Could Not Place</h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {roadmap.overflowItems.map((id) => {
              const info = itemLookup[id]
              return (
                <div key={id} className="rounded bg-white border border-red-100 px-2 py-1 text-xs text-gray-700">
                  {info?.title ?? id}
                  {info?.projectName && <span className="text-gray-400 ml-1">({info.projectName})</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {roadmap.bottlenecks.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">Bottlenecks</h4>
          <ul className="space-y-1">
            {roadmap.bottlenecks.map((b) => (
              <li key={b.sprintNumber} className="text-xs text-yellow-800">
                Sprint {b.sprintNumber}: {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
