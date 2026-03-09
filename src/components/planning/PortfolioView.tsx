'use client'

import type { PlanningProject } from '@/types/planning'
import type { Portfolio } from '@/types/planning'

interface PortfolioViewProps {
  projects: PlanningProject[]
}

const PORTFOLIO_COLORS: Record<Portfolio, { bg: string; border: string; badge: string; text: string }> = {
  EOL: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', text: 'text-orange-900' },
  ATI: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-900' },
  'cross-workspace': { bg: 'bg-cyan-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', text: 'text-cyan-900' },
}

const STATUS_STYLES: Record<string, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  'on-hold': 'bg-orange-100 text-orange-700',
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    done: 'Done',
    blocked: 'Blocked',
    'on-hold': 'On Hold',
  }
  return map[s] ?? s
}

function ProjectSummaryCard({ project }: { project: PlanningProject }) {
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

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${colors.badge}`}>
              {project.portfolio}
            </span>
            <span className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabel(project.status)}
            </span>
          </div>
          <h3 className={`font-semibold text-sm ${colors.text}`}>{project.name}</h3>
          {project.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
      </div>

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
    </div>
  )
}

export function PortfolioView({ projects }: PortfolioViewProps) {
  const portfolios: Portfolio[] = ['ATI', 'EOL', 'cross-workspace']

  return (
    <div className="space-y-6">
      {portfolios.map((portfolio) => {
        const portfolioProjects = projects.filter((p) => p.portfolio === portfolio)
        if (portfolioProjects.length === 0) return null
        const colors = PORTFOLIO_COLORS[portfolio]

        return (
          <div key={portfolio}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-semibold rounded px-2 py-0.5 ${colors.badge}`}>
                {portfolio === 'cross-workspace' ? 'Cross-workspace' : portfolio}
              </span>
              <span className="text-xs text-gray-400">{portfolioProjects.length} project{portfolioProjects.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioProjects.map((project) => (
                <ProjectSummaryCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
