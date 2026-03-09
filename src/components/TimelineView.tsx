'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PlanningProject, TeamMember } from '@/types/planning'
import type { SprintRoadmap, WorkItemPlacement, SprintDetail } from '@/lib/planning/sprint-engine'
import type { PersonBottleneck } from '@/lib/planning/bottleneck-engine'

// ── Types ─────────────────────────────────────────────────────

type FilterLevel = 'initiatives' | 'epics' | 'tasks'
type Granularity = 'weekly' | 'monthly' | 'quarterly'

interface TimelineRow {
  id: string
  title: string
  type: 'initiative' | 'epic' | 'task'
  href: string
  indent: number
  startDate: string
  endDate: string
  hours?: number
  assigneeName?: string
  status?: string
  isOverflow?: boolean
  isProjected?: boolean
  blockerCount?: number  // number of blockers on this initiative (shown as badge)
}

interface TimeColumn {
  key: string
  label: string      // "Mar 9–15" | "March 2026" | "Q1 2026"
  subLabel: string   // sprint numbers: "S1 S2"
  startDate: string
  endDate: string
  isProjected: boolean
  isOverloaded: boolean
}

// ── Helpers ───────────────────────────────────────────────────

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function fmtShort(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function fmtMonth(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function fmtQuarter(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  const q = Math.ceil((d.getUTCMonth() + 1) / 3)
  return `Q${q} ${d.getUTCFullYear()}`
}

function startOfMonth(iso: string): string {
  return iso.slice(0, 7) + '-01'
}

function endOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)) // day 0 of next month = last day of this month
  return last.toISOString().split('T')[0]
}

function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().split('T')[0]
}

function quarterStart(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const q = Math.floor((m - 1) / 3)
  return `${y}-${String(q * 3 + 1).padStart(2, '0')}-01`
}

function fmtMonthShort(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', timeZone: 'UTC',
  })
}

function isoWeekNumber(iso: string): number {
  const d = new Date(iso + 'T00:00:00Z')
  // ISO 8601 week: week containing Thursday
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const startOfW1 = new Date(jan4)
  startOfW1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7))
  const diff = d.getTime() - startOfW1.getTime()
  return 1 + Math.floor(diff / (7 * 86400000))
}

function weeksInRange(start: string, end: string): number[] {
  const weeks: number[] = []
  let cursor = start
  while (cursor <= end) {
    const wk = isoWeekNumber(cursor)
    if (!weeks.includes(wk)) weeks.push(wk)
    cursor = addDays(cursor, 7)
  }
  return weeks
}

function overlaps(colStart: string, colEnd: string, rowStart: string, rowEnd: string): boolean {
  return colStart <= rowEnd && colEnd >= rowStart
}

// ── Column builder ─────────────────────────────────────────────

const PAGE_SIZE: Record<Granularity, number> = {
  weekly: 16,
  monthly: 8,
  quarterly: 6,
}

const COL_WIDTH: Record<Granularity, number> = {
  weekly: 80,
  monthly: 110,
  quarterly: 130,
}

function buildColumns(
  allSprints: SprintDetail[],
  projectedNums: Set<number>,
  overloadedNums: Set<number>,
  granularity: Granularity
): TimeColumn[] {
  if (allSprints.length === 0) return []

  const rangeStart = allSprints[0].startDate
  const rangeEnd = allSprints[allSprints.length - 1].endDate
  const cols: TimeColumn[] = []

  if (granularity === 'weekly') {
    let cursor = rangeStart
    while (cursor <= rangeEnd) {
      const colStart = cursor
      const colEnd = addDays(cursor, 6)
      const sprintsInCol = allSprints.filter(
        (s) => overlaps(colStart, colEnd, s.startDate, s.endDate)
      )
      // Sub-label: individual week start date (e.g. "Mar 9")
      const subLabel = fmtShort(colStart)
      cols.push({
        key: colStart,
        label: `${fmtShort(colStart)}–${fmtShort(colEnd)}`,
        subLabel,
        startDate: colStart,
        endDate: colEnd,
        isProjected: sprintsInCol.every((s) => projectedNums.has(s.number)),
        isOverloaded: sprintsInCol.some((s) => overloadedNums.has(s.number)),
      })
      cursor = addDays(cursor, 7)
    }
  } else if (granularity === 'monthly') {
    let cursor = startOfMonth(rangeStart)
    while (cursor <= rangeEnd) {
      const colStart = cursor
      const colEnd = endOfMonth(cursor)
      const sprintsInCol = allSprints.filter(
        (s) => overlaps(colStart, colEnd, s.startDate, s.endDate)
      )
      // Sub-label: ISO week numbers within this month (e.g. "Wk10 · 11 · 12 · 13")
      const wks = weeksInRange(colStart, colEnd)
      const subLabel = wks.length > 0 ? `Wk${wks[0]}` + wks.slice(1).map(w => ` · ${w}`).join('') : ''
      cols.push({
        key: colStart,
        label: fmtMonth(colStart),
        subLabel,
        startDate: colStart,
        endDate: colEnd,
        isProjected: sprintsInCol.length > 0 && sprintsInCol.every((s) => projectedNums.has(s.number)),
        isOverloaded: sprintsInCol.some((s) => overloadedNums.has(s.number)),
      })
      cursor = addMonths(cursor, 1)
    }
  } else {
    // quarterly
    let cursor = quarterStart(rangeStart)
    while (cursor <= rangeEnd) {
      const colStart = cursor
      const colEnd = endOfMonth(addMonths(cursor, 2))
      const sprintsInCol = allSprints.filter(
        (s) => overlaps(colStart, colEnd, s.startDate, s.endDate)
      )
      // Sub-label: 3 month abbreviations in this quarter (e.g. "Mar · Apr · May")
      const subLabel = [colStart, addMonths(colStart, 1), addMonths(colStart, 2)]
        .map(d => fmtMonthShort(d))
        .join(' · ')
      cols.push({
        key: colStart,
        label: fmtQuarter(colStart),
        subLabel,
        startDate: colStart,
        endDate: colEnd,
        isProjected: sprintsInCol.length > 0 && sprintsInCol.every((s) => projectedNums.has(s.number)),
        isOverloaded: sprintsInCol.some((s) => overloadedNums.has(s.number)),
      })
      cursor = addMonths(cursor, 3)
    }
  }

  return cols
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
        {(row.blockerCount ?? 0) > 0 && (
          <span title={`${row.blockerCount} blocker(s)`} className="text-[9px] bg-red-100 text-red-600 rounded px-1 shrink-0 font-medium">
            🚫{row.blockerCount}
          </span>
        )}
        {row.isProjected && <span className="text-[10px] text-orange-500 shrink-0" title="Unassigned — projected">~</span>}
        {row.isOverflow && !row.isProjected && <span className="text-[10px] text-red-500 shrink-0" title="Could not be placed">!</span>}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[10px] text-gray-400">{fmtShort(row.startDate)} → {fmtShort(row.endDate)}</span>
        {row.hours != null && <span className="text-[10px] text-gray-400">{row.hours}h</span>}
        {row.type === 'task' && row.assigneeName && (
          <span className="text-[10px] text-indigo-500 font-medium">{row.assigneeName}</span>
        )}
      </div>
    </td>
  )
}

// ── Gantt Cell ────────────────────────────────────────────────

function GanttCell({
  col,
  row,
  colWidth,
  isTargetCol,
}: {
  col: TimeColumn
  row: TimelineRow
  colWidth: number
  isTargetCol: boolean
}) {
  const router = useRouter()
  const inRange = overlaps(col.startDate, col.endDate, row.startDate, row.endDate)
  const isStart = inRange && col.startDate <= row.startDate && col.endDate >= row.startDate
  const isEnd   = inRange && col.startDate <= row.endDate   && col.endDate >= row.endDate
  const rowStyle = ROW_STYLE[row.type]
  const bar = BAR_STYLE[row.type]

  const bgClass = col.isOverloaded
    ? 'bg-red-50/40'
    : col.isProjected
    ? 'bg-gray-50/60'
    : ''

  if (!inRange) {
    return (
      <td
        className={`border-r border-b border-gray-100 h-8 ${rowStyle} ${bgClass} relative`}
        style={{ minWidth: colWidth, width: colWidth }}
      >
        {isTargetCol && (
          <div className="absolute inset-y-0 right-0 w-0.5 bg-[#f28c28] z-10" title="Target date" />
        )}
      </td>
    )
  }

  const barBg = row.isProjected
    ? 'bg-orange-100 border border-dashed border-orange-400'
    : bar.bg
  const barText = row.isProjected ? 'text-orange-700' : bar.text

  return (
    <td
      className={`border-b border-gray-100 h-8 p-0 relative ${bgClass}`}
      style={{ minWidth: colWidth, width: colWidth }}
      title={`${row.title}${row.isProjected ? ' (projected)' : ''} — click to open`}
    >
      <div
        role="link"
        onClick={() => router.push(row.href)}
        className={`absolute inset-y-1 left-0 right-0 ${barBg} ${
          isStart ? 'rounded-l-sm ml-1' : ''
        } ${isEnd ? 'rounded-r-sm mr-1' : ''} ${
          !isEnd && !row.isProjected ? 'border-r border-dashed border-white/30' : ''
        } flex items-center overflow-hidden cursor-pointer hover:brightness-110 active:brightness-90 transition-[filter]`}
      >
        {isStart && (
          <span className={`text-[10px] ${barText} px-1.5 truncate font-medium`}>
            {row.type === 'task' && row.assigneeName
              ? `${row.assigneeName.split(' ')[0]}${row.isProjected ? ' ~' : ''}`
              : row.title.slice(0, 18) + (row.isProjected ? ' ~' : '')}
          </span>
        )}
      </div>
      {isTargetCol && (
        <div className="absolute inset-y-0 right-0 w-0.5 bg-[#f28c28] z-10" title="Target date" />
      )}
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
  const [granularity, setGranularity] = useState<Granularity>('monthly')
  const [pageIndex, setPageIndex] = useState(0)

  const overflowSet = useMemo(() => new Set(roadmap.overflowItems), [roadmap])

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

  // Overloaded sprint numbers
  const overloadedSprints = useMemo(() => {
    const set = new Set<number>()
    for (const sp of roadmap.sprints) { if (sp.isOverloaded) set.add(sp.number) }
    return set
  }, [roadmap])

  // ── Overflow projections ──────────────────────────────────────
  const { overflowProjections, projectedSprints } = useMemo(() => {
    const projections = new Map<string, number>()
    if (roadmap.overflowItems.length === 0) {
      return { overflowProjections: projections, projectedSprints: [] as SprintDetail[] }
    }

    const wiHours = new Map<string, number>()
    for (const p of projects) {
      for (const e of p.epics) {
        for (const wi of e.workItems) wiHours.set(wi.id, wi.estimatedHours)
      }
    }

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

  const allSprints = useMemo(
    () => [...roadmap.sprints, ...projectedSprints],
    [roadmap.sprints, projectedSprints]
  )

  const projectedSprintNums = useMemo(
    () => new Set(projectedSprints.map((s) => s.number)),
    [projectedSprints]
  )

  // ── Build date columns ────────────────────────────────────────
  const allColumns = useMemo(
    () => buildColumns(allSprints, projectedSprintNums, overloadedSprints, granularity),
    [allSprints, projectedSprintNums, overloadedSprints, granularity]
  )

  const pageSize = PAGE_SIZE[granularity]
  const totalPages = Math.max(1, Math.ceil(allColumns.length / pageSize))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const visibleColumns = allColumns.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize)
  const colWidth = COL_WIDTH[granularity]

  // Target date → column key that contains it
  const targetColByProjectId = useMemo(() => {
    if (!targetDates) return new Map<string, string>()
    const map = new Map<string, string>()
    for (const [projectId, date] of Object.entries(targetDates)) {
      if (!date) continue
      const col = allColumns.find((c) => c.startDate <= date && c.endDate >= date)
      if (col) map.set(projectId, col.key)
    }
    return map
  }, [targetDates, allColumns])

  // ── Build timeline rows ───────────────────────────────────────
  const rows = useMemo<TimelineRow[]>(() => {
    const result: TimelineRow[] = []
    const query = searchText.toLowerCase()

    for (const project of projects) {
      const allProjectItems = project.epics.flatMap((e) => e.workItems)

      const placedForProject = allProjectItems
        .map((wi) => placementByItemId.get(wi.id))
        .filter((p): p is WorkItemPlacement => p !== undefined)

      const projectedForProject = allProjectItems
        .filter((wi) => overflowSet.has(wi.id))
        .map((wi) => {
          const spNum = overflowProjections.get(wi.id)
          return spNum ? allSprints.find((s) => s.number === spNum) : undefined
        })
        .filter((s): s is SprintDetail => s !== undefined)

      if (placedForProject.length === 0 && projectedForProject.length === 0) continue

      // Get date ranges for placed items
      const placedSprintDetails = placedForProject
        .map((p) => allSprints.find((s) => s.number === p.sprintNumber))
        .filter((s): s is SprintDetail => s !== undefined)

      const allSprintDetails = [...placedSprintDetails, ...projectedForProject]
      if (allSprintDetails.length === 0) continue

      const startDate = allSprintDetails.reduce((min, s) => s.startDate < min ? s.startDate : min, allSprintDetails[0].startDate)
      const endDate = allSprintDetails.reduce((max, s) => s.endDate > max ? s.endDate : max, allSprintDetails[0].endDate)

      const blockerCount = (project.blockers?.length ?? 0) + (project.vendorBlocks?.length ?? 0)

      const iniRow: TimelineRow = {
        id: project.id,
        title: project.name,
        type: 'initiative',
        href: `/planning/${project.id}`,
        indent: 0,
        startDate,
        endDate,
        hours: allProjectItems.reduce((s, wi) => s + wi.estimatedHours, 0),
        isOverflow: false,
        isProjected: placedForProject.length === 0,
        blockerCount,
      }

      const matchesIni = !query || project.name.toLowerCase().includes(query)
      if (filter === 'initiatives') {
        if (matchesIni) result.push(iniRow)
        continue
      }

      result.push(iniRow)

      for (const epic of project.epics) {
        const epicPlaced = epic.workItems
          .map((wi) => placementByItemId.get(wi.id))
          .filter((p): p is WorkItemPlacement => p !== undefined)
          .map((p) => allSprints.find((s) => s.number === p.sprintNumber))
          .filter((s): s is SprintDetail => s !== undefined)

        const epicProjected = epic.workItems
          .filter((wi) => overflowSet.has(wi.id))
          .map((wi) => {
            const spNum = overflowProjections.get(wi.id)
            return spNum ? allSprints.find((s) => s.number === spNum) : undefined
          })
          .filter((s): s is SprintDetail => s !== undefined)

        const epicSprints = [...epicPlaced, ...epicProjected]
        if (epicSprints.length === 0) continue

        const eStart = epicSprints.reduce((min, s) => s.startDate < min ? s.startDate : min, epicSprints[0].startDate)
        const eEnd = epicSprints.reduce((max, s) => s.endDate > max ? s.endDate : max, epicSprints[0].endDate)

        const epicRow: TimelineRow = {
          id: epic.id,
          title: epic.title,
          type: 'epic',
          href: `/epics/${epic.id}`,
          indent: 1,
          startDate: eStart,
          endDate: eEnd,
          hours: epic.workItems.reduce((s, wi) => s + wi.estimatedHours, 0),
          isOverflow: false,
          isProjected: epicPlaced.length === 0,
        }

        const matchesEpic = !query || epic.title.toLowerCase().includes(query)
        if (matchesEpic || matchesIni) result.push(epicRow)
        if (filter !== 'tasks') continue

        for (const wi of epic.workItems) {
          const placement = placementByItemId.get(wi.id)
          const isOverflow = overflowSet.has(wi.id)
          const projSpNum = overflowProjections.get(wi.id)
          const spNum = placement?.sprintNumber ?? projSpNum
          const sprintInfo = spNum ? allSprints.find((s) => s.number === spNum) : undefined
          if (!sprintInfo) continue

          const matchesTask = !query || wi.title.toLowerCase().includes(query)
          if (!matchesTask && !matchesEpic && !matchesIni) continue

          result.push({
            id: wi.id,
            title: wi.title,
            type: 'task',
            href: `/tasks/${wi.id}`,
            indent: 2,
            startDate: sprintInfo.startDate,
            endDate: sprintInfo.endDate,
            hours: wi.estimatedHours,
            assigneeName: placement?.assignedTeamMemberId
              ? memberById.get(placement.assignedTeamMemberId)
              : undefined,
            status: wi.status,
            isOverflow,
            isProjected: isOverflow && projSpNum !== undefined,
          })
        }
      }
    }
    return result
  }, [projects, filter, searchText, placementByItemId, memberById, overflowSet, overflowProjections, allSprints])

  const overloadCount = overloadedSprints.size
  const overflowCount = roadmap.overflowItems.length

  // Date range summary for current page
  const pageStart = visibleColumns[0]?.startDate
  const pageEnd = visibleColumns[visibleColumns.length - 1]?.endDate

  return (
    <div className="space-y-3">
      {/* Controls row 1: filter + search + alerts */}
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

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {overloadCount > 0 && (
            <span className="text-xs rounded-full bg-red-100 text-red-700 px-2.5 py-1 font-medium">
              {overloadCount} sprint{overloadCount !== 1 ? 's' : ''} overloaded
            </span>
          )}
          {overflowCount > 0 && (
            <span className="text-xs rounded-full bg-orange-100 text-orange-700 px-2.5 py-1 font-medium" title="Add resource / adjust target / remove scope">
              {overflowCount} over capacity
            </span>
          )}
          <span className="text-xs text-gray-400">{rows.length} rows</span>
        </div>
      </div>

      {/* Controls row 2: granularity + pagination */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Granularity */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden text-xs">
          {(['weekly', 'monthly', 'quarterly'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => { setGranularity(g); setPageIndex(0) }}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                granularity === g ? 'bg-indigo-100 text-[#1a2e6b]' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            disabled={safePageIndex === 0}
            className="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          {pageStart && pageEnd && (
            <span className="text-gray-500 min-w-[160px] text-center">
              {fmtShort(pageStart)} – {fmtShort(pageEnd)}
            </span>
          )}
          <button
            onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
            disabled={safePageIndex >= totalPages - 1}
            className="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
          <span className="text-gray-400">
            Page {safePageIndex + 1} / {totalPages}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#1a2e6b] inline-block" /> Initiative</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Epic</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-200 inline-block" /> Task</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-100 border border-dashed border-orange-400 inline-block" /> Unassigned ~</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" /> Overloaded</span>
        {projectedSprints.length > 0 && (
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-dashed border-gray-300 inline-block" /> Projected</span>
        )}
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f28c28] inline-block border-t-2 border-dashed border-[#f28c28]" /> Target date</span>
      </div>

      {/* Gantt table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '220px', minWidth: '220px' }} />
            {visibleColumns.map((col) => (
              <col key={col.key} style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }} />
            ))}
          </colgroup>

          {/* 2-row header */}
          <thead>
            {/* Row 1: period label */}
            <tr>
              <th className="sticky left-0 z-20 bg-[#1a2e6b] text-white px-3 py-2 text-left font-semibold border-b border-r border-[#0f1c45]" rowSpan={2}>
                Initiative / Epic / Task
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-1 py-1.5 text-center font-semibold border-b border-r text-xs ${
                    col.isOverloaded
                      ? 'bg-red-600 text-white border-red-700'
                      : col.isProjected
                      ? 'bg-gray-400 text-white border-gray-500'
                      : 'bg-[#1a2e6b] text-white border-[#0f1c45]'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
            {/* Row 2: sprint sub-labels */}
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-1 py-0.5 text-center border-b border-r text-[9px] font-normal ${
                    col.isOverloaded
                      ? 'bg-red-500 text-red-100 border-red-600'
                      : col.isProjected
                      ? 'bg-gray-300 text-gray-600 border-gray-400'
                      : 'bg-[#243b85] text-blue-200 border-[#0f1c45]'
                  }`}
                >
                  {col.subLabel || '—'}
                  {col.isOverloaded && ' ⚠'}
                  {col.isProjected && !col.isOverloaded && ' PROJ'}
                </th>
              ))}
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-8 text-center text-gray-400">
                  No items match your filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const targetColKey = row.type === 'initiative' ? targetColByProjectId.get(row.id) : undefined
                return (
                  <tr key={row.id} className="group hover:brightness-95 transition-all">
                    <RowLabel row={row} />
                    {visibleColumns.map((col) => (
                      <GanttCell
                        key={col.key}
                        col={col}
                        row={row}
                        colWidth={colWidth}
                        isTargetCol={targetColKey === col.key}
                      />
                    ))}
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
          <p className="text-xs font-semibold text-red-800 mb-2">Over-utilized Members</p>
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
            Add resources or reduce scope to fix overloaded sprints.
          </p>
        </div>
      )}
    </div>
  )
}
