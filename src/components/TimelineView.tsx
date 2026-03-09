'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PlanningProject, TeamMember } from '@/types/planning'
import type { SprintRoadmap, WorkItemPlacement } from '@/lib/planning/sprint-engine'
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
}

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return iso.slice(5).replace('-', '/')
}

function fmtDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Bar colours ───────────────────────────────────────────────

const BAR_STYLE: Record<TimelineRow['type'], { bg: string; text: string; border: string }> = {
  initiative: { bg: 'bg-[#1a2e6b]',       text: 'text-white',     border: 'border-[#0f1c45]' },
  epic:       { bg: 'bg-blue-500',          text: 'text-white',     border: 'border-blue-700'  },
  task:       { bg: 'bg-indigo-200',        text: 'text-indigo-900', border: 'border-indigo-300' },
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
        {/* Type icon */}
        {row.type === 'initiative' && <span className="text-[10px] bg-[#1a2e6b] text-white rounded px-1 shrink-0">INI</span>}
        {row.type === 'epic' && <span className="text-[10px] bg-blue-500 text-white rounded px-1 shrink-0">EPK</span>}
        {row.type === 'task' && <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1 shrink-0">TSK</span>}
        <Link href={row.href} className="truncate hover:underline text-gray-800 hover:text-[#1a2e6b] min-w-0">
          {row.title}
        </Link>
        {row.isOverflow && <span className="text-[10px] text-red-500 shrink-0" title="Could not be placed in roadmap">!</span>}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-gray-400">{fmtDateFull(row.startDate)} → {fmtDateFull(row.endDate)}</span>
        {row.hours && <span className="text-[10px] text-gray-400">{row.hours}h</span>}
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
}: {
  row: TimelineRow
  sprintNum: number
  isStart: boolean
  isEnd: boolean
  isInRange: boolean
  isOverloaded: boolean
}) {
  const style = ROW_STYLE[row.type]
  const bar = BAR_STYLE[row.type]

  if (!isInRange) {
    return (
      <td
        className={`border-r border-b border-gray-100 min-w-[80px] h-8 ${style} ${isOverloaded ? 'bg-red-50' : ''}`}
      />
    )
  }

  return (
    <td
      className={`border-b border-gray-100 min-w-[80px] h-8 p-0 relative ${isOverloaded ? 'bg-red-50/30' : ''}`}
      title={`S${sprintNum}: ${row.title}`}
    >
      <div
        className={`absolute inset-y-1 left-0 right-0 ${bar.bg} ${
          isStart ? 'rounded-l-sm ml-1' : ''
        } ${isEnd ? 'rounded-r-sm mr-1' : ''} ${
          !isEnd ? 'border-r border-dashed border-white/30' : ''
        } flex items-center overflow-hidden`}
      >
        {isStart && (
          <span className={`text-[10px] ${bar.text} px-1.5 truncate font-medium`}>
            {row.type === 'task' && row.assigneeName ? row.assigneeName.split(' ')[0] : row.title.slice(0, 18)}
          </span>
        )}
      </div>
      {/* Right border on last in-range cell */}
      {isEnd && <div className="absolute inset-y-1 right-0 w-px" />}
    </td>
  )
}

// ── Main Component ────────────────────────────────────────────

interface TimelineViewProps {
  projects: PlanningProject[]
  members: TeamMember[]
  roadmap: SprintRoadmap
  personBottlenecks: PersonBottleneck[]
}

export function TimelineView({ projects, members, roadmap, personBottlenecks }: TimelineViewProps) {
  const [filter, setFilter] = useState<FilterLevel>('epics')
  const [searchText, setSearchText] = useState('')

  const overflowSet = new Set(roadmap.overflowItems)

  // Index placements by workItemId for quick lookup
  const placementByItemId = useMemo(() => {
    const map = new Map<string, WorkItemPlacement>()
    for (const p of roadmap.workItemPlacements) {
      map.set(p.workItemId, p)
    }
    return map
  }, [roadmap])

  // Member id → name
  const memberById = useMemo(() => {
    const m = new Map<string, string>()
    for (const mbr of members) m.set(mbr.id, mbr.name)
    return m
  }, [members])

  // Set of overloaded sprint numbers
  const overloadedSprints = useMemo(() => {
    const set = new Set<number>()
    for (const sp of roadmap.sprints) {
      if (sp.isOverloaded) set.add(sp.number)
    }
    return set
  }, [roadmap])

  // Build all timeline rows
  const rows = useMemo<TimelineRow[]>(() => {
    const result: TimelineRow[] = []
    const query = searchText.toLowerCase()

    for (const project of projects) {
      // Compute initiative span
      const projectPlacements = project.epics
        .flatMap((e) => e.workItems)
        .map((wi) => placementByItemId.get(wi.id))
        .filter((p): p is WorkItemPlacement => !!p)

      const projectSprints = projectPlacements.map((p) => p.sprintNumber)
      const iniStart = projectSprints.length > 0 ? Math.min(...projectSprints) : 1
      const iniEnd = projectSprints.length > 0 ? Math.max(...projectSprints) : 1

      const iniStartSprint = roadmap.sprints.find((s) => s.number === iniStart)
      const iniEndSprint = roadmap.sprints.find((s) => s.number === iniEnd)
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
        hours: project.epics.flatMap((e) => e.workItems).reduce((s, wi) => s + wi.estimatedHours, 0),
        isOverflow: false,
      }

      const matchesIni = !query || project.name.toLowerCase().includes(query)

      if (filter === 'initiatives') {
        if (matchesIni) result.push(iniRow)
        continue
      }

      // Always add initiative header for epics/tasks views
      result.push(iniRow)

      for (const epic of project.epics) {
        const epicPlacements = epic.workItems
          .map((wi) => placementByItemId.get(wi.id))
          .filter((p): p is WorkItemPlacement => !!p)

        const epicSprints = epicPlacements.map((p) => p.sprintNumber)
        const epicStart = epicSprints.length > 0 ? Math.min(...epicSprints) : iniStart
        const epicEnd = epicSprints.length > 0 ? Math.max(...epicSprints) : iniStart

        const epicStartSprint = roadmap.sprints.find((s) => s.number === epicStart)
        const epicEndSprint = roadmap.sprints.find((s) => s.number === epicEnd)
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
        }

        const matchesEpic = !query || epic.title.toLowerCase().includes(query)
        if (matchesEpic || matchesIni) result.push(epicRow)

        if (filter !== 'tasks') continue

        for (const wi of epic.workItems) {
          const placement = placementByItemId.get(wi.id)
          const spNum = placement?.sprintNumber ?? iniStart
          const sprintInfo = roadmap.sprints.find((s) => s.number === spNum)
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
            isOverflow: overflowSet.has(wi.id),
          })
        }
      }
    }
    return result
  }, [projects, filter, searchText, placementByItemId, memberById, overflowSet, roadmap])

  const sprints = roadmap.sprints

  // Stats
  const overloadCount = overloadedSprints.size
  const overflowCount = roadmap.overflowItems.length

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Level filter */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden text-xs">
          {(['initiatives', 'epics', 'tasks'] as FilterLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filter === lvl
                  ? 'bg-[#1a2e6b] text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Filter by name…"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
        />

        {/* Alerts */}
        <div className="ml-auto flex items-center gap-2">
          {overloadCount > 0 && (
            <span className="text-xs rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-medium">
              {overloadCount} sprint{overloadCount !== 1 ? 's' : ''} overloaded
            </span>
          )}
          {overflowCount > 0 && (
            <span className="text-xs rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 font-medium">
              {overflowCount} task{overflowCount !== 1 ? 's' : ''} unplaced
            </span>
          )}
          <span className="text-xs text-gray-400">{rows.length} rows</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#1a2e6b] inline-block" /> Initiative</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Epic</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" /> Task</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block border border-red-200" /> Overloaded sprint</span>
      </div>

      {/* Gantt table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '220px', minWidth: '220px' }} />
            {sprints.map((s) => (
              <col key={s.number} style={{ width: '80px', minWidth: '80px' }} />
            ))}
          </colgroup>

          {/* Sprint header */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-[#1a2e6b] text-white px-3 py-2 text-left font-semibold border-b border-r border-[#0f1c45]">
                Initiative / Epic / Task
              </th>
              {sprints.map((s) => {
                const isOver = overloadedSprints.has(s.number)
                return (
                  <th
                    key={s.number}
                    className={`px-1 py-2 text-center font-semibold border-b border-r ${
                      isOver
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-[#1a2e6b] text-white border-[#0f1c45]'
                    }`}
                  >
                    <div className="font-bold">S{s.number}</div>
                    <div className={`text-[9px] font-normal ${isOver ? 'text-red-200' : 'text-blue-200'}`}>
                      {fmtDate(s.startDate)}
                    </div>
                    {isOver && (
                      <div className="text-[9px] font-bold text-red-100">⚠ OVR</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={sprints.length + 1}
                  className="px-5 py-8 text-center text-gray-400"
                >
                  No items match your filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="group hover:brightness-95 transition-all">
                  <RowLabel row={row} />
                  {sprints.map((s) => {
                    const isInRange = s.number >= row.startSprint && s.number <= row.endSprint
                    return (
                      <SprintCell
                        key={s.number}
                        row={row}
                        sprintNum={s.number}
                        isStart={s.number === row.startSprint}
                        isEnd={s.number === row.endSprint}
                        isInRange={isInRange}
                        isOverloaded={overloadedSprints.has(s.number)}
                      />
                    )
                  })}
                </tr>
              ))
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
