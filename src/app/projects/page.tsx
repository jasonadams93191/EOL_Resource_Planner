'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { ObjectTypeFilter, type ObjectType, type PortfolioFilter, type SourceFilter } from '@/components/ObjectTypeFilter'
import { getSourceKind, SOURCE_BADGE_STYLES, SOURCE_BADGE_LABELS } from '@/lib/planning/source-badge'
import type { PlanningProject, PlanningEpic, PlanningWorkItem } from '@/types/planning'

const PRIORITY_STYLES: Record<string, string> = {
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-gray-100 text-gray-600',
  critical: 'bg-red-100 text-red-700',
}

const STATUS_STYLES: Record<string, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done':        'bg-green-100 text-green-700',
  'blocked':     'bg-red-100 text-red-700',
  'on-hold':     'bg-yellow-100 text-yellow-700',
}

// ── Flatten helpers ────────────────────────────────────────────

type FlatEpic = PlanningEpic & { project: PlanningProject }
type FlatTask = PlanningWorkItem & { epic: PlanningEpic; project: PlanningProject }

function flatEpics(projects: PlanningProject[]): FlatEpic[] {
  return projects.flatMap((p) =>
    p.epics.map((e) => ({ ...e, project: p }))
  )
}

function flatTasks(projects: PlanningProject[]): FlatTask[] {
  return projects.flatMap((p) =>
    p.epics.flatMap((e) =>
      e.workItems.map((w) => ({ ...w, epic: e, project: p }))
    )
  )
}

export default function ProjectsPage() {
  const [objectType, setObjectType] = useState<ObjectType>('initiatives')
  const [portfolio, setPortfolio] = useState<PortfolioFilter>('all')
  const [source, setSource] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [allProjects, setAllProjects] = useState<PlanningProject[]>(mockAllPlanningProjects)

  useEffect(() => {
    fetch('/api/planning')
      .then(r => r.json())
      .then(data => { if (data.projects) setAllProjects(data.projects) })
      .catch(() => {/* keep mock fallback */})
  }, [])

  // ── Initiatives ──────────────────────────────────────────────

  const initiatives = allProjects.filter((p) => {
    if (portfolio !== 'all' && p.portfolio !== portfolio) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Epics ────────────────────────────────────────────────────

  const epics = flatEpics(allProjects).filter((e) => {
    if (portfolio !== 'all' && e.portfolio !== portfolio) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Tasks ────────────────────────────────────────────────────

  const tasks = flatTasks(allProjects).filter((w) => {
    if (portfolio !== 'all' && w.epic.portfolio !== portfolio) return false
    if (source !== 'all') {
      const kind = getSourceKind(w.id, !!w.jira?.issueKey)
      if (kind !== source) return false
    }
    if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        <p className="text-sm text-gray-500 mt-1">Initiatives, epics, and tasks across all portfolios</p>
      </div>

      <ObjectTypeFilter
        objectType={objectType}
        onObjectTypeChange={setObjectType}
        available={['initiatives', 'epics', 'tasks']}
        storageKey="eol-projects-view"
        portfolio={portfolio}
        onPortfolioChange={setPortfolio}
        showPortfolio
        source={source}
        onSourceChange={setSource}
        showSource={objectType === 'tasks'}
        search={search}
        onSearchChange={setSearch}
      />

      {/* ── Initiatives ─────────────────────────────────────────── */}
      {objectType === 'initiatives' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {initiatives.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No initiatives match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Portfolio</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stage</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Epics</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initiatives.map((p) => {
                  const totalHours = p.epics.flatMap((e) => e.workItems).reduce((s, w) => s + w.estimatedHours, 0)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/planning/${p.id}`} className="font-medium text-indigo-600 hover:underline">
                          {p.name}
                        </Link>
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.portfolio}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[p.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{p.stage?.replace(/-/g, ' ')}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.epics.length}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{totalHours}h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Epics ───────────────────────────────────────────────── */}
      {objectType === 'epics' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {epics.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No epics match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Initiative</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Portfolio</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Tasks</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {epics.map((e) => {
                  const totalHours = e.workItems.reduce((s, w) => s + w.estimatedHours, 0)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/epics/${e.id}`} className="font-medium text-indigo-600 hover:underline">
                          {e.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/planning/${e.project.id}`} className="text-gray-500 hover:text-indigo-600 hover:underline">
                          {e.project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.portfolio}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{e.workItems.length}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{totalHours}h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tasks ───────────────────────────────────────────────── */}
      {objectType === 'tasks' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {tasks.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">No tasks match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Epic</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Skill</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Hours</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Confidence</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((w) => {
                  const kind = getSourceKind(w.id, !!w.jira?.issueKey)
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/tasks/${w.id}`} className="font-medium text-indigo-600 hover:underline line-clamp-2">
                          {w.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/epics/${w.epic.id}`} className="text-gray-500 hover:text-indigo-600 hover:underline">
                          {w.epic.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{w.primarySkill ?? w.skillRequired ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{w.estimatedHours}h</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          w.confidence === 'high'   ? 'bg-green-100 text-green-700' :
                          w.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-red-100 text-red-700'
                        }`}>
                          {w.confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE_STYLES[kind]}`}>
                          {SOURCE_BADGE_LABELS[kind]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
