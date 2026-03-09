'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Portfolio, PlanningProject, ProjectStage, PlanningPriority, TeamMember } from '@/types/planning'
import {
  PROJECT_STAGE_LABELS,
  EFFORT_BAND_LABELS,
  PLANNING_TYPE_LABELS,
  PLANNING_TYPE_STYLES,
  ESTIMATE_READINESS_LABELS,
  ESTIMATE_READINESS_STYLES,
} from '@/types/planning'
import { priorityWeight } from '@/lib/planning/sprint-engine'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
import { epicReadiness } from '@/lib/planning/readiness-engine'
import { getInitiativeWarnings } from '@/lib/planning/readiness-engine'
import type { EstimateReadiness } from '@/types/planning'

interface PortfolioViewProps {
  projects: PlanningProject[]
  members: TeamMember[]
  roadmap?: SprintRoadmap
}

const PORTFOLIO_COLORS: Record<Portfolio, { bg: string; border: string; badge: string; text: string }> = {
  EOL: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-900' },
  ATI: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-900' },
  'cross-workspace': { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', text: 'text-cyan-900' },
}

const PRIORITY_STYLES: Record<PlanningPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300',
}

const STAGE_STYLES: Record<ProjectStage, string> = {
  'backlog': 'bg-gray-100 text-gray-500',
  'discovery': 'bg-blue-100 text-blue-600',
  'defined': 'bg-indigo-100 text-indigo-600',
  'ready-for-planning': 'bg-purple-100 text-purple-600',
  'planned': 'bg-violet-100 text-violet-700',
  'in-delivery': 'bg-green-100 text-green-700',
  'complete': 'bg-emerald-100 text-emerald-700',
  'archived': 'bg-gray-100 text-gray-400',
}

const WARNING_SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  critical: 'bg-red-50 text-red-700 border-red-100',
}

const ALL_STAGES: Array<{ value: ProjectStage | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'defined', label: 'Defined' },
  { value: 'ready-for-planning', label: 'Ready' },
  { value: 'planned', label: 'Planned' },
  { value: 'in-delivery', label: 'In Delivery' },
  { value: 'complete', label: 'Complete' },
  { value: 'archived', label: 'Archived' },
]

function projectReadiness(project: PlanningProject): EstimateReadiness {
  if (project.epics.length === 0) return 'partial'
  const epicResults = project.epics.map(epicReadiness)
  if (epicResults.some((r) => r === 'needs-breakdown')) return 'needs-breakdown'
  if (epicResults.every((r) => r === 'ready')) return 'ready'
  return 'partial'
}

function ProjectSummaryCard({
  project,
  members,
  roadmap,
}: {
  project: PlanningProject
  members: TeamMember[]
  roadmap?: SprintRoadmap
}) {
  const colors = PORTFOLIO_COLORS[project.portfolio]
  const totalItems = project.epics.reduce((s, e) => s + e.workItems.length, 0)
  const totalHours = project.epics.reduce(
    (s, e) => s + e.workItems.reduce((si, wi) => si + wi.effortHours, 0),
    0
  )
  const doneItems = project.epics.reduce(
    (s, e) => s + e.workItems.filter((wi) => wi.status === 'done').length,
    0
  )
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  // Owner lookup
  const owner = project.owner ? members.find((m) => m.id === project.owner) : undefined

  // Estimate readiness
  const readiness = projectReadiness(project)

  // Initiative warnings
  const warnings = getInitiativeWarnings(project, members, roadmap)

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 group-hover:shadow-md group-hover:border-indigo-300 transition-shadow cursor-pointer`}>
      {/* Header row: portfolio + priority + stage */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${colors.badge}`}>
          {project.portfolio === 'cross-workspace' ? 'Cross' : project.portfolio}
        </span>
        <span className={`text-xs font-medium rounded px-1.5 py-0.5 capitalize ${PRIORITY_STYLES[project.priority]}`}>
          {project.priority}
        </span>
        <span className={`text-xs rounded px-1.5 py-0.5 ${STAGE_STYLES[project.stage]}`}>
          {PROJECT_STAGE_LABELS[project.stage]}
        </span>
        {project.planningType && (
          <span className={`text-xs rounded px-1.5 py-0.5 ${PLANNING_TYPE_STYLES[project.planningType]}`}>
            {PLANNING_TYPE_LABELS[project.planningType]}
          </span>
        )}
      </div>

      {/* Name + description */}
      <h3 className={`font-semibold text-sm mb-0.5 ${colors.text}`}>{project.name}</h3>
      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{project.description}</p>
      )}

      {/* Owner + readiness row */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {owner && (
          <span className="text-xs text-gray-500">
            Owner: <span className="font-medium text-gray-700">{owner.name}</span>
            {!owner.isActive && (
              <span className="ml-1 text-red-500">(inactive)</span>
            )}
          </span>
        )}
        <span className={`text-xs rounded px-1.5 py-0.5 ${ESTIMATE_READINESS_STYLES[readiness]}`}>
          {ESTIMATE_READINESS_LABELS[readiness]}
        </span>
      </div>

      {/* Confidence + effort band */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        {project.confidence && (
          <span className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${CONFIDENCE_DOT[project.confidence]}`} />
            <span className="capitalize">{project.confidence} confidence</span>
          </span>
        )}
        {project.effortBand && (
          <span className="rounded bg-white/60 border border-gray-200 px-1.5 py-0.5 text-xs font-medium">
            {project.effortBand} · {EFFORT_BAND_LABELS[project.effortBand]}
          </span>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 mb-3">
          {warnings.slice(0, 2).map((w, i) => (
            <div
              key={i}
              className={`text-xs rounded px-2 py-1 border ${WARNING_SEVERITY_STYLES[w.severity]}`}
            >
              {w.message}
            </div>
          ))}
          {warnings.length > 2 && (
            <div className="text-xs text-gray-400">+{warnings.length - 2} more warning(s)</div>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{doneItems} / {totalItems} items done</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
        <span>{project.epics.length} epics</span>
        <span>·</span>
        <span>{totalHours}h estimated</span>
      </div>

      <div className="text-xs text-indigo-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        View initiative →
      </div>
    </div>
  )
}

export function PortfolioView({ projects, members, roadmap }: PortfolioViewProps) {
  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all')

  const filteredProjects = stageFilter === 'all'
    ? projects
    : projects.filter((p) => p.stage === stageFilter)

  const portfolios: Portfolio[] = ['ATI', 'EOL', 'cross-workspace']

  return (
    <div className="space-y-5">
      {/* Stage filter */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStageFilter(s.value)}
            className={`text-xs rounded-full px-2.5 py-1 transition-colors ${
              stageFilter === s.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Portfolio sections */}
      {portfolios.map((portfolio) => {
        const portfolioProjects = filteredProjects
          .filter((p) => p.portfolio === portfolio)
          .slice()
          .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))

        if (portfolioProjects.length === 0) return null
        const colors = PORTFOLIO_COLORS[portfolio]

        return (
          <div key={portfolio}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-semibold rounded px-2 py-0.5 ${colors.badge}`}>
                {portfolio === 'cross-workspace' ? 'Cross-workspace' : portfolio}
              </span>
              <span className="text-xs text-gray-400">
                {portfolioProjects.length} project{portfolioProjects.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioProjects.map((project) => (
                <Link key={project.id} href={`/planning/${project.id}`} className="block group">
                  <ProjectSummaryCard
                    project={project}
                    members={members}
                    roadmap={roadmap}
                  />
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {filteredProjects.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No projects match the selected stage.</p>
      )}
    </div>
  )
}
