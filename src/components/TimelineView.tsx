'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PlanningProject, TeamMember } from '@/types/planning'
import type { SprintRoadmap, WorkItemPlacement, SprintDetail } from '@/lib/planning/sprint-engine'
import type { PersonBottleneck } from '@/lib/planning/bottleneck-engine'

// ── Types ─────────────────────────────────────────────────────

type FilterLevel = 'initiatives' | 'epics' | 'tasks'

interface TimelineRow {
  id: string
  title: string
  type: 'initiative' | 'epic' | 'task'
  href: string
  indent: number
  startSprint: number
  endSprint: number
  startDate: string
  endDate: string
  hours?: number
  assigneeName?: string
  status?: string
  isOverflow?: boolean
  isProjected?: boolean   // unassigned item shown in projected sprint
}

// ── Helpers ───────────────────────────────────────────────────

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtDate(iso: string): string {
  return iso.slice(5).replace('-', '/')
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Bar colours ───────────────────────────────────────────────

const BAR_STYLE: Record<TimelineRow['type'], { bg: string; text: string }> = {
  initiative: { bg: 'bg-[#1a2e6b]',  text: 'text-white'      },
  epic:       { bg: 'bg-blue-500',    text: 'text-white'      },
  task:       { bg: 'bg-indigo-200',  text: 'text-indigo-900' },
}

const ROW_STYLE: Record<TimelineRow['type'], string> = {
  initiative: 'bg-slate-50 font-semibold',
  epic:       'bg-white',
  task:       'bg-white text-sm',
}

// ── Row Label ─────────────────────────────────────────────────

function RowLabel({ row }: { row: TimelineRow }) {
  const style = ROW_STYLE[row.type]
  return (
    <td
      className={`sticky left-0 z-10 px-3 py-1.5 border-r border-b border-gray-200 min-w-[220px] max-w-[220px] ${style}`}
      style={{ paddingLeft: `${8 + row.indent * 16}px` }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {row.type === 'initiative' && <span className="text-[10px] bg-[#1a2e6b] text-white rounded px-1 shrink-0">INI</span>}
        {row.type === 'epic'       && <span className="text-[10px] bg-blue-500 text-white rounded px-1 shrink-0">EPK</span>}
        {row.type === 'task'       && <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1 shrink-0">TSK</span>}
        <Link href={row.href} className="truncate hover:underline text-gray-800 hover:text-[#1a2e6b] min-w-0">
          {row.title}
        </Link>
        {row.isProjected && <span className="text-[10px] text-orange-500 shrink-0" title="Unassigned — projected placement">~</span>}
        {row.isOverflow && !row.isProjected && <span className="text-[10px] text-red-500 shrink-0" title="Could not be placed">!</span>}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-gray-400">{fmtDateFull(row.startDate)} → {fmtDateFull(row.endDate)}</span>
        {row.hours != null && <span className="text-[10px] text-gray-400">{row.hours}h</span>}
      </div>
    </td>
  )
}

// ── Sprint Cell ───────────────────────────────────────────────

function SprintCell({
  row,
  sprintNum,
  isStart,
  isEnd,
  isInRange,
  isOverloaded,
  isProjectedSprint,
}: {
  row: TimelineRow
  sprintNum: number
  isStart: boolean
  isEnd: boolean
  isInRange: boolean
  isOverloaded: boolean
  isProjectedSprint: boolean
}) {
  const rowStyle = ROW_STYLE[row.type]
  const bar = BAR_STYLE[row.type]

  if (!isInRange) {
    return (
      <td
        className={`border-r border-b border-gray-100 min-w-[80px] h-8 ${rowStyle} ${
          isProjectedSprint ? 'bg-gray-50/50' : isOverloaded ? 'bg-red-50' : ''
        }`}
      />
    )
  }

  // Projected items get an orange dashed bar
  const barBg = row.isProjected ? 'bg-orange-100 border border-dashed border-orange-400' : bar.bg
  const barText = row.isProjected ? 'text-orange-700' : bar.text

  return (
    <td
      className={`border-b border-gray-100 min-w-[80px] h-8 p-0 relative ${
        isProjectedSprint ? 'bg-gray-50/50' : isOverloaded ? 'bg-red-50/30' : ''
      }`}
      title={`S${sprintNum}: ${row.title}${row.isProjected ? ' (projected — unassigned)' : ''}`}
    >
      <div
        className={`absolute inset-y-1 left-0 right-0 ${barBg} ${
          isStart ? 'rounded-l-sm ml-1' : ''
        } ${isEnd ? 'rounded-r-sm mr-1' : ''} ${
          !isEnd && !row.isProjected ? 'border-r border-dashed border-white/30' : ''
        } flex items-center overflow-hidden`}
      >
        {isStart && (
          <span className={`text-[10px] ${barText} px-1.5 truncate font-medium`}>
            {row.type === 'task' && row.assigneeName
              ? `${row.assigneeName.split(' ')[0]}${row.isProjected ? ' ~' : ''}`
              : row.title.slice(0, 16) + (row.isProjected ? ' ~' : '')}
          </span>
        )}
      </div>
    </td>
  )
}

// ── Main Component ────────────────────────────────────────────

interface TimelineViewProps {
  projects: PlanningProject[]
  members: TeamMember[]
  roadmap: SprintRoadmap
  personBottlenecks: PersonBottleneck[]
  targetDates?: Record<string, string>
}

export function TimelineView({ projects, members, roadmap, personBottlenecks, targetDates }: TimelineViewProps) {
  const [filter, setFilter] = useState<FilterLevel>('epics')
  const [searchText, setSearchText] = useState('')

  const overflowSet = new Set(roadmap.overflowItems)

  // Index placements by workItemId
  const placementByItemId = useMemo(() => {
    const map = new Map<string, WorkItemPlacement>()
    for (const p of roadmap.workItemPlacements) map.set(p.workItemId, p)
    return map
  }, [roadmap])

  // Member id → name
  const memberById = useMemo(() => {
    const m = new Map<string, string>()
    for (const mbr of members) m.set(mbr.id, mbr.name)
    return m
  }, [members])

  // Overloaded sprint numbers (from placed sprints)
  const overloadedSprints = useMemo(() => {
    const set = new Set<number>()
    for (const sp of roadmap.sprints) {
      if (sp.isOverloaded) set.add(sp.number)
    }
    return set
  }, [roadmap])

  // ── Overflow projections ──────────────────────────────────────
  // For items that couldn't be placed (overflow), project them into
  // additional "virtual" sprints so the timeline still shows them.
  const { overflowProjections, projectedSprints } = useMemo(() => {
    const projections = new Map<string, number>()

    if (roadmap.overflowItems.length === 0) {
      return { overflowProjections: projections, projectedSprints: [] as SprintDetail[] }
    }

    // Build workItemId → estimatedHours map
    const wiHours = new Map<string, number>()
    for (const p of projects) {
      for (const e of p.epics) {
        for (const wi of e.workItems) wiHours.set(wi.id, wi.estimatedHours)
      }
    }

    // Use roadmap capacity as the per-sprint limit for projections
    const lastExistingSprint = roadmap.sprints[roadmap.sprints.length - 1]
    const capacityPerSprint = lastExistingSprint?.totalAvailableHours ?? 40

    let projSprint = roadmap.totalSprints + 1
    let sprintLoad = 0

    for (const wiId of roadmap.overflowItems) {
      const hours = wiHours.get(wiId) ?? 8
      if (sprintLoad > 0 && sprintLoad + hours > capacityPerSprint) {
        projSprint++
        sprintLoad = 0
      }
      projections.set(wiId, projSprint)
      sprintLoad += hours
    }

    const maxProjSprint = projSprint

    // Generate stub SprintDetail objects for projected sprints
    const extras: SprintDetail[] = []
    const lastEnd = lastExistingSprint?.endDate ?? roadmap.startDate

    for (let i = roadmap.totalSprints + 1; i <= maxProjSprint; i++) {
      const offset = i - roadmap.totalSprints
      const startD = addDays(lastEnd, (offset - 1) * 14 + 1)
      const endD = addDays(startD, 13)
      extras.push({
        number: i,
        startDate: startD,
        endDate: endD,
        capacityHours: capacityPerSprint,
        allocations: [],
        totalAllocatedHours: 0,
        totalTargetHours: capacityPerSprint,
        totalAvailableHours: capacityPerSprint,
        remainingCapacity: capacityPerSprint,
        isOverTarget: false,
        isOverloaded: false,
        totalAllocatedSprints: 0,
      })
    }

    return { overflowProjections: projections, projectedSprints: extras }
  }, [roadmap, projects])

  // All sprint columns: placed + projected
  const allSprints = useMemo(
    () => [...roadmap.sprints, ...projectedSprints],
    [roadmap.sprints, projectedSprints]
  )

  // Set of projected sprint numbers (for styling the column headers)
  const projectedSprintNums = useMemo(
    () => new Set(projectedSprints.map((s) => s.number)),
    [projectedSprints]
  )

  // Target date → sprint number map
  const targetSprintByProjectId = useMemo(() => {
    if (!targetDates) return new Map<string, number>()
    const map = new Map<string, number>()
    const msPerSprint = 14 * 24 * 60 * 60 * 1000
    const startMs = new Date(roadmap.startDate).getTime()
    for (const [projectId, date] of Object.entries(targetDates)) {
      if (!date) continue
      const diffMs = new Date(date).getTime() - startMs
      const sprintNum = Math.max(1, Math.ceil(diffMs / msPerSprint))
      map.set(projectId, sprintNum)
    }
    return map
  }, [targetDates, roadmap.startDate])

  // Build all timeline rows
  const rows = useMemo<TimelineRow[]>(() => {
    const result: TimelineRow[] = []
    const query = searchText.toLowerCase()

    for (const project of projects) {
      const allProjectItems = project.epics.flatMap((e) => e.workItems)

      // Placed sprint numbers for this project's items
      const placedSprints = allProjectItems
        .map((wi) => placementByItemId.get(wi.id)?.sprintNumber)
        .filter((n): n is number => n !== undefined)

      // Projected sprint numbers for this project's overflow items
      const projectedForProject = allProjectItems
        .filter((wi) => overflowSet.has(wi.id))
        .map((wi) => overflowProjections.get(wi.id))
        .filter((n): n is number => n !== undefined)

      const allSprintNums = [...placedSprints, ...projectedForProject]

      // Skip projects with no placements at all and no overflow projections
      if (allSprintNums.length === 0) continue

      const iniStart = Math.min(...allSprintNums)
      const iniEnd = Math.max(...allSprintNums)

      const iniStartSprint = allSprints.find((s) => s.number === iniStart)
      const iniEndSprint = allSprints.find((s) => s.number === iniEnd)
      if (!iniStartSprint || !iniEndSprint) continue

      const iniRow: TimelineRow = {
        id: project.id,
        title: project.name,
        type: 'initiative',
        href: `/planning/${project.id}`,
        indent: 0,
        startSprint: iniStart,
        endSprint: iniEnd,
        startDate: iniStartSprint.startDate,
        endDate: iniEndSprint.endDate,
        hours: allProjectItems.reduce((s, wi) => s + wi.estimatedHours, 0),
        isOverflow: false,
        isProjected: placedSprints.length === 0, // all overflow
      }

      const matchesIni = !query || project.name.toLowerCase().includes(query)

      if (filter === 'initiatives') {
        if (matchesIni) result.push(iniRow)
        continue
      }

      result.push(iniRow)

      for (const epic of project.epics) {
        const epicPlacedSprints = epic.workItems
          .map((wi) => placementByItemId.get(wi.id)?.sprintNumber)
          .filter((n): n is number => n !== undefined)

        const epicProjSprints = epic.workItems
          .filter((wi) => overflowSet.has(wi.id))
          .map((wi) => overflowProjections.get(wi.id))
          .filter((n): n is number => n !== undefined)

        const allEpicSprints = [...epicPlacedSprints, ...epicProjSprints]
        if (allEpicSprints.length === 0) continue

        const epicStart = Math.min(...allEpicSprints)
        const epicEnd = Math.max(...allEpicSprints)

        const epicStartSprint = allSprints.find((s) => s.number === epicStart)
        const epicEndSprint = allSprints.find((s) => s.number === epicEnd)
        if (!epicStartSprint || !epicEndSprint) continue

        const epicRow: TimelineRow = {
          id: epic.id,
          title: epic.title,
          type: 'epic',
          href: `/epics/${epic.id}`,
          indent: 1,
          startSprint: epicStart,
          endSprint: epicEnd,
          startDate: epicStartSprint.startDate,
          endDate: epicEndSprint.endDate,
          hours: epic.workItems.reduce((s, wi) => s + wi.estimatedHours, 0),
          isOverflow: false,
          isProjected: epicPlacedSprints.length === 0,
        }

        const matchesEpic = !query || epic.title.toLowerCase().includes(query)
        if (matchesEpic || matchesIni) result.push(epicRow)

        if (filter !== 'tasks') continue

        for (const wi of epic.workItems) {
          const placement = placementByItemId.get(wi.id)
          const isOverflow = overflowSet.has(wi.id)
          const projSprint = overflowProjections.get(wi.id)
          const spNum = placement?.sprintNumber ?? projSprint ?? iniStart
          const sprintInfo = allSprints.find((s) => s.number === spNum)
          if (!sprintInfo) continue

          const matchesTask = !query || wi.title.toLowerCase().includes(query)
          if (!matchesTask && !matchesEpic && !matchesIni) continue

          result.push({
            id: wi.id,
            title: wi.title,
            type: 'task',
            href: `/tasks/${wi.id}`,
            indent: 2,
            startSprint: spNum,
            endSprint: spNum,
            startDate: sprintInfo.startDate,
            endDate: sprintInfo.endDate,
            hours: wi.estimatedHours,
            assigneeName: placement?.assignedTeamMemberId
              ? memberById.get(placement.assignedTeamMemberId)
              : undefined,
            status: wi.status,
            isOverflow,
            isProjected: isOverflow && projSprint !== undefined,
          })
        }
      }
    }
    return result
  }, [projects, filter, searchText, placementByItemId, memberById, overflowSet, overflowProjections, allSprints])

  // Stats
  const overloadCount = overloadedSprints.size
  const overflowCount = roadmap.overflowItems.length

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden text-xs">
          {(['initiatives', 'epics', 'tasks'] as FilterLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filter === lvl ? 'bg-[#1a2e6b] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Filter by name…"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
        />

        <div className="ml-auto flex items-center gap-2">
          {overloadCount > 0 && (
            <span className="text-xs rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-medium">
              {overloadCount} sprint{overloadCount !== 1 ? 's' : ''} overloaded
            </span>
          )}
          {overflowCount > 0 && (
            <span className="text-xs rounded-full bg-orange-100 text-orange-700 px-2.5 py-1 font-medium" title="Team is at capacity. To schedule these: add a resource, change a target date, or remove scope.">
              {overflowCount} over capacity — add resource / adjust target / remove scope
            </span>
          )}
          <span className="text-xs text-gray-400">{rows.length} rows · {allSprints.length} sprints</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#1a2e6b] inline-block" /> Initiative</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Epic</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" /> Task</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-100 border border-dashed border-orange-400 inline-block" /> Unassigned (projected ~)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" /> Overloaded sprint</span>
        {projectedSprints.length > 0 && (
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-dashed border-gray-300 inline-block" /> Projected sprint</span>
        )}
      </div>

      {/* Gantt table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '220px', minWidth: '220px' }} />
            {allSprints.map((s) => (
              <col key={s.number} style={{ width: '80px', minWidth: '80px' }} />
            ))}
          </colgroup>

          {/* Sprint header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-[#1a2e6b] text-white px-3 py-2 text-left font-semibold border-b border-r border-[#0f1c45]">
                Initiative / Epic / Task
              </th>
              {allSprints.map((s) => {
                const isOver = overloadedSprints.has(s.number)
                const isProj = projectedSprintNums.has(s.number)
                return (
                  <th
                    key={s.number}
                    className={`px-1 py-2 text-center font-semibold border-b border-r ${
                      isOver
                        ? 'bg-red-600 text-white border-red-700'
                        : isProj
                        ? 'bg-gray-400 text-white border-gray-500'
                        : 'bg-[#1a2e6b] text-white border-[#0f1c45]'
                    }`}
                  >
                    <div className="font-bold">S{s.number}</div>
                    <div className={`text-[9px] font-normal ${
                      isOver ? 'text-red-200' : isProj ? 'text-gray-200' : 'text-blue-200'
                    }`}>
                      {fmtDate(s.startDate)}
                    </div>
                    {isOver && <div className="text-[9px] font-bold text-red-100">⚠ OVR</div>}
                    {isProj && <div className="text-[9px] text-gray-200">PROJ</div>}
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={allSprints.length + 1} className="px-5 py-8 text-center text-gray-400">
                  No items match your filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const targetSprint = row.type === 'initiative' ? targetSprintByProjectId.get(row.id) : undefined
                return (
                  <tr key={row.id} className="group hover:brightness-95 transition-all">
                    <RowLabel row={row} />
                    {allSprints.map((s) => {
                      const isInRange = s.number >= row.startSprint && s.number <= row.endSprint
                      const isTargetCol = targetSprint === s.number
                      return (
                        <td
                          key={s.number}
                          className="p-0 relative"
                          style={isTargetCol && !isInRange ? { borderLeft: '2px dashed #f28c28' } : undefined}
                        >
                          <SprintCell
                            row={row}
                            sprintNum={s.number}
                            isStart={s.number === row.startSprint}
                            isEnd={s.number === row.endSprint}
                            isInRange={isInRange}
                            isOverloaded={overloadedSprints.has(s.number)}
                            isProjectedSprint={projectedSprintNums.has(s.number)}
                          />
                          {isTargetCol && (
                            <div
                              className="absolute inset-y-0 left-0 w-0.5 bg-[#f28c28] z-10"
                              title={`Target date for ${row.title}`}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Per-member overload detail */}
      {personBottlenecks.filter((b) => b.overloadedSprints.length > 0).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-800 mb-2">Over-utilized Members — Dates Adjusted</p>
          <div className="flex flex-wrap gap-3">
            {personBottlenecks
              .filter((b) => b.overloadedSprints.length > 0)
              .map((b) => (
                <Link
                  key={b.teamMemberId}
                  href={`/team/${b.teamMemberId}`}
                  className="text-xs rounded bg-white border border-red-200 px-2.5 py-1 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <span className="font-medium">{b.memberName}</span>
                  {' '}— overloaded in S{b.overloadedSprints.join(', S')}
                  {' '}({Math.round(b.utilizationPct)}% utilized)
                </Link>
              ))}
          </div>
          <p className="text-[10px] text-red-600 mt-2">
            Sprint assignments are automatically adjusted when members are over capacity. Add resources or reduce scope to fix.
          </p>
        </div>
      )}
    </div>
  )
}
