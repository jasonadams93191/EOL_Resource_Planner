'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
import type { PlanningProject, TeamMember } from '@/types/planning'
import { targetPlannedHours } from '@/types/planning'

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

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
}

function getProjectColor(projectIndex: number) {
  return PROJECT_COLORS[projectIndex % PROJECT_COLORS.length]
}

// ── Short date formatter ──────────────────────────────────────

function shortDate(isoDate: string): string {
  const d = new Date(isoDate)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ── Capacity bar (hours-based, two markers) ───────────────────

function CapacityBar({
  allocatedHours,
  targetHours,
  availableHours,
}: {
  allocatedHours: number
  targetHours: number
  availableHours: number
}) {
  const pct = availableHours > 0 ? Math.min(1, allocatedHours / availableHours) * 100 : 0
  const targetPct = availableHours > 0 ? Math.min(100, (targetHours / availableHours) * 100) : 0
  const isOver = allocatedHours > availableHours
  const isOverTarget = allocatedHours > targetHours
  const barColor = isOver ? 'bg-red-500' : isOverTarget ? 'bg-amber-400' : 'bg-green-400'

  return (
    <div className="mt-1">
      <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden w-full">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        {/* Soft-cap marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-indigo-400 opacity-70"
          style={{ left: `${targetPct}%` }}
          title={`Target: ${targetHours}h`}
        />
      </div>
      <div className="text-xs text-gray-400 mt-0.5 text-right">
        {allocatedHours.toFixed(0)}h / {availableHours}h
      </div>
    </div>
  )
}

// ── Resource-by-Sprint view ───────────────────────────────────

function ResourceView({ roadmap, projects, members }: ResourceTimelineViewProps) {
  const { workItemPlacements, sprints, totalSprints } = roadmap

  // Build item lookup: workItemId → { title, projectId, estimatedHours }
  const itemLookup = new Map<string, { title: string; projectId: string; estimatedHours: number }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        itemLookup.set(item.id, {
          title: item.title,
          projectId: project.id,
          estimatedHours: item.estimatedHours,
        })
      }
    }
  }

  // Build project index map for color assignment
  const projectIndexMap = new Map<string, number>()
  projects.forEach((p, i) => projectIndexMap.set(p.id, i))

  // Build memberSprintMap: memberId → sprintNum → placements[]
  type PlacementInfo = {
    workItemId: string
    title: string
    estimatedHours: number
    projectId: string
    projectIndex: number
  }
  const memberSprintMap = new Map<string, Map<number, PlacementInfo[]>>()

  for (const placement of workItemPlacements) {
    const memberId = placement.assignedTeamMemberId
    if (!memberId) continue
    if (!memberSprintMap.has(memberId)) memberSprintMap.set(memberId, new Map())
    const sprintMap = memberSprintMap.get(memberId)!
    if (!sprintMap.has(placement.sprintNumber)) sprintMap.set(placement.sprintNumber, [])
    const info = itemLookup.get(placement.workItemId)
    const projectIndex = info ? (projectIndexMap.get(info.projectId) ?? 0) : 0
    sprintMap.get(placement.sprintNumber)!.push({
      workItemId: placement.workItemId,
      title: info?.title ?? placement.workItemId,
      estimatedHours: placement.estimatedHours,
      projectId: info?.projectId ?? '',
      projectIndex,
    })
  }

  // Build per-sprint allocated hours per member
  const memberSprintHours = new Map<string, Map<number, number>>()
  for (const placement of workItemPlacements) {
    const memberId = placement.assignedTeamMemberId
    if (!memberId) continue
    if (!memberSprintHours.has(memberId)) memberSprintHours.set(memberId, new Map())
    const m = memberSprintHours.get(memberId)!
    m.set(placement.sprintNumber, (m.get(placement.sprintNumber) ?? 0) + placement.estimatedHours)
  }

  const activeMembers = members.filter((m) => m.isActive)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[160px]">
              Member
            </th>
            {Array.from({ length: totalSprints }, (_, i) => i + 1).map((sprintNum) => {
              const sprint = sprints.find((s) => s.number === sprintNum)
              return (
                <th
                  key={sprintNum}
                  className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-600 min-w-[130px]"
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
            const target = targetPlannedHours(member)
            return (
              <tr key={member.id} className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2">
                  <div className="font-medium text-gray-800 whitespace-nowrap">{member.name}</div>
                  <div className="text-gray-400">{member.availableHoursPerSprint}h · {member.utilizationTargetPercent}% ({target}h target)</div>
                </td>
                {Array.from({ length: totalSprints }, (_, i) => i + 1).map((sprintNum) => {
                  const placements = sprintMap?.get(sprintNum) ?? []
                  const allocatedHours = memberSprintHours.get(member.id)?.get(sprintNum) ?? 0
                  const isOverloaded = allocatedHours > member.availableHoursPerSprint
                  const isOverTarget = allocatedHours > target

                  return (
                    <td
                      key={sprintNum}
                      className={`border-r border-gray-100 px-2 py-2 align-top ${isOverloaded ? 'bg-red-50' : isOverTarget ? 'bg-amber-50' : ''}`}
                    >
                      {placements.length > 0 ? (
                        <div className="space-y-1">
                          {placements.map((p) => {
                            const color = getProjectColor(p.projectIndex)
                            const label = p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title
                            return (
                              <div
                                key={p.workItemId}
                                className={`rounded px-1.5 py-0.5 ${color.bg} ${color.text} truncate max-w-[120px]`}
                                title={`${p.title} (${p.estimatedHours}h)`}
                              >
                                {label} · {p.estimatedHours}h
                              </div>
                            )
                          })}
                          <CapacityBar
                            allocatedHours={allocatedHours}
                            targetHours={target}
                            availableHours={member.availableHoursPerSprint}
                          />
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

// ── Initiative-by-Sprint view ─────────────────────────────────

function InitiativeView({ roadmap, projects }: ResourceTimelineViewProps) {
  const { workItemPlacements, sprints, totalSprints } = roadmap

  // Build set of sprint numbers that have any placement
  const usedSprints = Array.from(
    new Set(workItemPlacements.map((p) => p.sprintNumber))
  ).sort((a, b) => a - b)
  const displaySprints = usedSprints.length > 0 ? usedSprints : Array.from({ length: totalSprints }, (_, i) => i + 1)

  // Build workItemId → projectId map
  const workItemProject = new Map<string, string>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        workItemProject.set(item.id, project.id)
      }
    }
  }

  // Build projectId → sprintNum → { count, hours }
  const projectSprintData = new Map<string, Map<number, { count: number; hours: number }>>()
  for (const placement of workItemPlacements) {
    const projectId = workItemProject.get(placement.workItemId)
    if (!projectId) continue
    if (!projectSprintData.has(projectId)) projectSprintData.set(projectId, new Map())
    const sprintMap = projectSprintData.get(projectId)!
    const existing = sprintMap.get(placement.sprintNumber) ?? { count: 0, hours: 0 }
    sprintMap.set(placement.sprintNumber, {
      count: existing.count + 1,
      hours: existing.hours + placement.estimatedHours,
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[200px]">
              Initiative
            </th>
            {displaySprints.map((sprintNum) => {
              const sprint = sprints.find((s) => s.number === sprintNum)
              return (
                <th
                  key={sprintNum}
                  className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-600 min-w-[110px]"
                >
                  <div>S{sprintNum}</div>
                  {sprint && (
                    <div className="font-normal text-gray-400">
                      {shortDate(sprint.startDate)}
                    </div>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {projects.map((project, pi) => {
            const color = getProjectColor(pi)
            const sprintMap = projectSprintData.get(project.id)
            const hasAny = sprintMap && sprintMap.size > 0
            if (!hasAny) return null
            return (
              <tr key={project.id} className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2">
                  <Link
                    href={`/planning/${project.id}`}
                    className="font-medium text-gray-800 hover:text-indigo-600 truncate max-w-[185px] block"
                    title={project.name}
                  >
                    {project.name}
                  </Link>
                  <span className={`text-xs rounded px-1 py-0.5 ${PRIORITY_BADGE[project.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                    {project.priority}
                    {project.priorityRank != null ? ` #${project.priorityRank}` : ''}
                  </span>
                </td>
                {displaySprints.map((sprintNum) => {
                  const cell = sprintMap?.get(sprintNum)
                  return (
                    <td key={sprintNum} className="border-r border-gray-100 px-2 py-2 text-center">
                      {cell ? (
                        <div className={`rounded px-1.5 py-1 ${color.bg} ${color.text}`}>
                          <div className="font-medium">{cell.count} item{cell.count !== 1 ? 's' : ''}</div>
                          <div className="opacity-75">{cell.hours}h</div>
                        </div>
                      ) : (
                        <span className="text-gray-200">—</span>
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

// ── Main component ────────────────────────────────────────────

export function ResourceTimelineView(props: ResourceTimelineViewProps) {
  const [viewMode, setViewMode] = useState<'resource' | 'initiative'>('resource')

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">View:</span>
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setViewMode('resource')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'resource' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Resource
          </button>
          <button
            onClick={() => setViewMode('initiative')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'initiative' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Initiative
          </button>
        </div>
      </div>

      {viewMode === 'resource' ? (
        <ResourceView {...props} />
      ) : (
        <InitiativeView {...props} />
      )}
    </div>
  )
}
