'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { getSourceKind, SOURCE_BADGE_STYLES, SOURCE_BADGE_LABELS } from '@/lib/planning/source-badge'
import type { PlanningEpic, PlanningProject } from '@/types/planning'

function findEpic(id: string): { epic: PlanningEpic; project: PlanningProject } | null {
  for (const p of mockAllPlanningProjects) {
    const e = p.epics.find((ep) => ep.id === id)
    if (e) return { epic: e, project: p }
  }
  return null
}

const STATUS_STYLES: Record<string, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done':        'bg-green-100 text-green-700',
  'blocked':     'bg-red-100 text-red-700',
  'on-hold':     'bg-yellow-100 text-yellow-700',
}

export default function EpicRecordPage() {
  const params = useParams()
  const [result, setResult] = useState<{ epic: PlanningEpic; project: PlanningProject } | null | 'loading'>('loading')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
    setResult(findEpic(id))
  }, [params.id])

  if (result === 'loading') return null

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/projects" className="text-sm text-indigo-600 hover:underline">← Projects</Link>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Epic not found.</p>
        </div>
      </div>
    )
  }

  const { epic, project } = result
  const totalHours = epic.workItems.reduce((s, w) => s + w.estimatedHours, 0)

  const filteredItems = epic.workItems.filter((w) => {
    if (sourceFilter !== 'all') {
      const kind = getSourceKind(w.id, !!w.jira?.issueKey)
      if (kind !== sourceFilter) return false
    }
    if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/projects" className="text-indigo-600 hover:underline">← Projects</Link>
        <span>/</span>
        <Link href={`/planning/${project.id}`} className="text-indigo-600 hover:underline">{project.name}</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{epic.title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[epic.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {epic.status}
        </span>
      </div>

      {/* Overview */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Overview</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Portfolio</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{epic.portfolio}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="mt-0.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[epic.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {epic.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Tasks</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{epic.workItems.length}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Total Hours</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{totalHours}h</dd>
          </div>
        </dl>
        {epic.notes && (
          <p className="text-sm text-gray-500 mt-3">{epic.notes}</p>
        )}
      </div>

      {/* Tasks related list */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-700">Tasks ({filteredItems.length})</h3>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="jira">Jira</option>
              <option value="template">Template</option>
              <option value="ai">AI</option>
              <option value="manual">Manual</option>
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
            />
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No tasks match your filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Title</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Skill</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Hours</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Confidence</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Source</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Sprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((w) => {
                const kind = getSourceKind(w.id, !!w.jira?.issueKey)
                return (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/tasks/${w.id}`} className="text-indigo-600 hover:underline line-clamp-1">
                        {w.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{w.primarySkill ?? w.skillRequired ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{w.estimatedHours}h</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        w.confidence === 'high'   ? 'bg-green-100 text-green-700' :
                        w.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                      }`}>
                        {w.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE_STYLES[kind]}`}>
                        {SOURCE_BADGE_LABELS[kind]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">
                      {w.sprintNumber != null ? `S${w.sprintNumber}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
