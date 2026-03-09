'use client'

import Link from 'next/link'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
import { priorityWeight } from '@/lib/planning/sprint-engine'
import { slashDate } from '@/lib/planning/sprint-dates'
import type { PlanningProject, TeamMember } from '@/types/planning'

interface InitiativeTimelineViewProps {
  roadmap: SprintRoadmap
  projects: PlanningProject[]
  members: TeamMember[]
}

// ── Project color palette ─────────────────────────────────────

const PROJECT_BAR_COLORS = [
  'bg-indigo-500',
  'bg-teal-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-orange-500',
]

const PROJECT_TEXT_COLORS = [
  'text-indigo-700',
  'text-teal-700',
  'text-violet-700',
  'text-amber-700',
  'text-rose-700',
  'text-cyan-700',
  'text-lime-700',
  'text-orange-700',
]

// ── Gantt bar ─────────────────────────────────────────────────

function GanttBar({
  minSprint,
  maxSprint,
  totalSprints,
  colorClass,
  opacity,
  hasOverflow,
}: {
  minSprint: number
  maxSprint: number
  totalSprints: number
  colorClass: string
  opacity: number
  hasOverflow: boolean
}) {
  const startPct = ((minSprint - 1) / totalSprints) * 100
  const widthPct = ((maxSprint - minSprint + 1) / totalSprints) * 100
  const overflowPct = hasOverflow ? (1 / totalSprints) * 100 : 0

  return (
    <div className="relative w-full h-5">
      {/* Main bar */}
      <div
        className={`absolute h-full rounded ${colorClass}`}
        style={{
          left: `${startPct}%`,
          width: `${widthPct}%`,
          opacity,
        }}
      />
      {/* Overflow striped extension */}
      {hasOverflow && (
        <div
          className="absolute h-full rounded-r"
          style={{
            left: `${startPct + widthPct}%`,
            width: `${overflowPct}%`,
            opacity: 0.4,
            background: 'repeating-linear-gradient(45deg, #9ca3af 0px, #9ca3af 3px, transparent 3px, transparent 8px)',
          }}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function InitiativeTimelineView({ roadmap, projects }: InitiativeTimelineViewProps) {
  const { workItemPlacements, overflowItems, totalSprints, sprints } = roadmap
  const overflowSet = new Set(overflowItems)

  // Sort projects by priority
  const sortedProjects = [...projects].sort(
    (a, b) => priorityWeight(a.priority) - priorityWeight(b.priority)
  )

  // Build item → sprint map
  const itemSprintMap = new Map<string, number>()
  for (const p of workItemPlacements) {
    itemSprintMap.set(p.workItemId, p.sprintNumber)
  }

  // Compute sprint range for a set of work item IDs
  function sprintRange(ids: string[]): { min: number; max: number } | null {
    const sprints = ids
      .map((id) => itemSprintMap.get(id))
      .filter((s): s is number => s !== undefined)
    if (sprints.length === 0) return null
    return { min: Math.min(...sprints), max: Math.max(...sprints) }
  }

  // Sprint column labels
  const sprintCols = Array.from({ length: totalSprints }, (_, i) => i + 1)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <div className="min-w-[600px]">
        {/* Sprint header */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          {/* Label column */}
          <div className="w-48 flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200">
            Initiative / Epic
          </div>
          {/* Sprint columns */}
          <div className="flex-1 flex">
            {sprintCols.map((n) => {
              const sprint = sprints.find((s) => s.number === n)
              return (
                <div
                  key={n}
                  className="flex-1 text-center text-xs font-semibold text-gray-500 py-2 border-r border-gray-100"
                >
                  <div>S{n}</div>
                  {sprint && (
                    <div className="font-normal text-gray-400 text-[10px]">
                      {slashDate(sprint.startDate)}–{slashDate(sprint.endDate)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Completion column header */}
          <div className="w-36 flex-shrink-0 px-3 py-2 text-right text-xs font-semibold text-gray-500">
            Est. complete
          </div>
        </div>

        {/* Project rows */}
        {sortedProjects.map((project, projectIndex) => {
          const allProjectItemIds = project.epics.flatMap((e) => e.workItems.map((wi) => wi.id))
          const projectRange = sprintRange(allProjectItemIds)
          const projectHasOverflow = allProjectItemIds.some((id) => overflowSet.has(id))
          const barColor = PROJECT_BAR_COLORS[projectIndex % PROJECT_BAR_COLORS.length]
          const textColor = PROJECT_TEXT_COLORS[projectIndex % PROJECT_TEXT_COLORS.length]

          // Compute projected completion date from last sprint's endDate
          const completionSprint = projectRange ? sprints.find((s) => s.number === projectRange.max) : null
          const completionLabel = completionSprint
            ? `S${completionSprint.number} (${slashDate(completionSprint.endDate)})`
            : null

          return (
            <div key={project.id} className="border-b border-gray-200">
              {/* Project row */}
              <div className="flex items-center hover:bg-gray-50">
                <div className={`w-48 flex-shrink-0 px-3 py-2 border-r border-gray-200 font-semibold text-xs ${textColor} truncate`}>
                  <Link href={`/planning/${project.id}`} className="hover:underline">{project.name}</Link>
                </div>
                <div className="flex-1 px-2 py-2">
                  {projectRange ? (
                    <GanttBar
                      minSprint={projectRange.min}
                      maxSprint={projectRange.max}
                      totalSprints={totalSprints}
                      colorClass={barColor}
                      opacity={1.0}
                      hasOverflow={projectHasOverflow}
                    />
                  ) : (
                    <div className="h-5 text-xs text-gray-300 text-center leading-5">Not placed</div>
                  )}
                </div>
                {/* Projected completion */}
                <div className="w-36 flex-shrink-0 px-3 py-2 text-right text-xs text-gray-400 whitespace-nowrap">
                  {completionLabel ? (
                    <span title="Projected completion sprint">{completionLabel}</span>
                  ) : (
                    <span className="text-gray-200">—</span>
                  )}
                </div>
              </div>

              {/* Epic sub-rows */}
              {project.epics.map((epic) => {
                const epicItemIds = epic.workItems.map((wi) => wi.id)
                const epicRange = sprintRange(epicItemIds)
                const epicHasOverflow = epicItemIds.some((id) => overflowSet.has(id))

                return (
                  <div key={epic.id} className="flex items-center bg-gray-50 hover:bg-gray-100 border-t border-gray-100">
                    <div className="w-48 flex-shrink-0 px-3 py-1.5 pl-7 border-r border-gray-200 text-xs text-gray-500 truncate">
                      <Link href={`/epics/${epic.id}`} className="hover:text-indigo-600 hover:underline">{epic.title}</Link>
                    </div>
                    <div className="flex-1 px-2 py-1.5">
                      {epicRange ? (
                        <GanttBar
                          minSprint={epicRange.min}
                          maxSprint={epicRange.max}
                          totalSprints={totalSprints}
                          colorClass={barColor}
                          opacity={0.6}
                          hasOverflow={epicHasOverflow}
                        />
                      ) : (
                        <div className="h-4 text-xs text-gray-300 text-center leading-4">—</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
