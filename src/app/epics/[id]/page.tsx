'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { SKILLS } from '@/lib/mock/team-data'
import { getSourceKind, SOURCE_BADGE_STYLES, SOURCE_BADGE_LABELS } from '@/lib/planning/source-badge'
import type { PlanningEpic, PlanningProject, PlanningWorkItem } from '@/types/planning'
import { ResourceType } from '@/types/domain'

function findEpic(id: string, projects: PlanningProject[]): { epic: PlanningEpic; project: PlanningProject } | null {
  for (const p of projects) {
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
  const [localTasks, setLocalTasks] = useState<PlanningWorkItem[]>([])
  const [addingTask, setAddingTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', estimatedHours: 8, skill: '', confidence: 'medium' as 'high' | 'medium' | 'low' })

  function handleAddTask() {
    const title = newTask.title.trim()
    if (!title) return
    const task: PlanningWorkItem = {
      id: `local-task-${Date.now()}`,
      planningEpicId: typeof params.id === 'string' ? params.id : '',
      title,
      estimatedHours: newTask.estimatedHours,
      primarySkill: newTask.skill || undefined,
      primaryRole: ResourceType.DEVELOPER,
      confidence: newTask.confidence,
      status: 'not-started',
      manualOverrides: [],
      sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — added in session' }],
    }
    setLocalTasks((prev) => [...prev, task])
    setNewTask({ title: '', estimatedHours: 8, skill: '', confidence: 'medium' })
    setAddingTask(false)
  }

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
    fetch('/api/planning')
      .then(r => r.json())
      .then(data => setResult(findEpic(id, data.projects ?? [])))
      .catch(() => setResult(findEpic(id, mockAllPlanningProjects)))
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
          <h3 className="text-sm font-semibold text-gray-700">Tasks ({filteredItems.length + localTasks.length})</h3>
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
            <button
              onClick={() => setAddingTask(true)}
              className="text-xs bg-[#1a2e6b] text-white rounded px-3 py-1.5 hover:bg-[#162660] font-medium"
            >
              + Add Task
            </button>
          </div>
        </div>

        {/* Add task inline form */}
        {addingTask && (
          <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Title *</label>
              <input
                autoFocus
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAddingTask(false) }}
                placeholder="Task title…"
                className="text-sm border border-gray-200 rounded px-2 py-1 w-56 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Hours</label>
              <input
                type="number"
                min={1}
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask((p) => ({ ...p, estimatedHours: parseInt(e.target.value) || 8 }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 w-20 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Skill</label>
              <select
                value={newTask.skill}
                onChange={(e) => setNewTask((p) => ({ ...p, skill: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              >
                <option value="">— None —</option>
                {SKILLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Confidence</label>
              <select
                value={newTask.confidence}
                onChange={(e) => setNewTask((p) => ({ ...p, confidence: e.target.value as 'high' | 'medium' | 'low' }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              >
                {['high', 'medium', 'low'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={handleAddTask} className="text-sm bg-[#f28c28] text-white rounded px-4 py-1.5 hover:bg-[#d97a20] font-medium">Save</button>
            <button onClick={() => setAddingTask(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}
        {filteredItems.length === 0 && localTasks.length === 0 ? (
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
                      <Link href={`/tasks/${w.id}`} className="text-[#1a2e6b] hover:underline line-clamp-1">
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
              {localTasks.map((w) => (
                <tr key={w.id} className="hover:bg-orange-50 bg-orange-50/40">
                  <td className="px-4 py-2 text-[#1a2e6b] font-medium line-clamp-1">{w.title}</td>
                  <td className="px-4 py-2 text-gray-500">{w.primarySkill ?? '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{w.estimatedHours}h</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      w.confidence === 'high'   ? 'bg-green-100 text-green-700' :
                      w.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-red-100 text-red-700'
                    }`}>{w.confidence}</span>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Manual</span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
