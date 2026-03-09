'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS } from '@/lib/mock/team-data'
import { rankCandidates, type AssignmentContext } from '@/lib/planning/assignment-engine'
import { getSourceKind, SOURCE_BADGE_STYLES, SOURCE_BADGE_LABELS } from '@/lib/planning/source-badge'
import type { PlanningWorkItem, PlanningEpic, PlanningProject } from '@/types/planning'

type FindResult = { wi: PlanningWorkItem; epic: PlanningEpic; project: PlanningProject }

function findWorkItem(id: string, projects: PlanningProject[]): FindResult | null {
  for (const p of projects) {
    for (const e of p.epics) {
      const wi = e.workItems.find((w) => w.id === id)
      if (wi) return { wi, epic: e, project: p }
    }
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

const STATUS_OPTIONS = ['not-started', 'in-progress', 'done', 'blocked', 'on-hold']

async function saveOverride(itemId: string, itemType: string, overrides: Record<string, unknown>) {
  await fetch('/api/planning/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, itemType, overrides }),
  })
}

function StatusSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer appearance-none pr-5 ${STATUS_STYLES[value] ?? 'bg-gray-100 text-gray-600'}`}
      style={{ backgroundImage: 'none' }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

export default function TaskRecordPage() {
  const params = useParams()
  const [result, setResult] = useState<FindResult | null | 'loading'>('loading')
  const [allProjects, setAllProjects] = useState<PlanningProject[]>(mockAllPlanningProjects)
  const [localStatus, setLocalStatus] = useState<string | null>(null)

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
    fetch('/api/planning')
      .then(r => r.json())
      .then(data => {
        const projs = data.projects ?? []
        setAllProjects(projs.length > 0 ? projs : mockAllPlanningProjects)
        setResult(findWorkItem(id, projs.length > 0 ? projs : mockAllPlanningProjects))
      })
      .catch(() => setResult(findWorkItem(id, mockAllPlanningProjects)))
  }, [params.id])

  if (result === 'loading') return null

  if (!result) {
    return (
      <div className="space-y-4">
        <Link href="/projects" className="text-sm text-indigo-600 hover:underline">← Projects</Link>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Task not found.</p>
        </div>
      </div>
    )
  }

  const { wi, epic, project } = result
  const kind = getSourceKind(wi.id, !!wi.jira?.issueKey)
  const currentStatus = localStatus ?? wi.status

  const handleStatusChange = async (newStatus: string) => {
    setLocalStatus(newStatus)
    await saveOverride(wi.id, 'work-item', { status: newStatus })
  }

  const assignee = wi.assigneeId ? TEAM_MEMBERS.find((m) => m.id === wi.assigneeId) : null

  // Assignment recommendations
  const context: AssignmentContext = {
    currentSprintAllocations: {},
    existingProjectAssignments: new Set(
      project.epics.flatMap((e) => e.workItems.map((w) => w.assigneeId).filter(Boolean)) as string[]
    ),
  }
  const candidates = rankCandidates(TEAM_MEMBERS, wi, context).slice(0, 3)

  // Dependency work items
  const depItems = (wi.dependsOnWorkItemIds ?? []).map((depId) => {
    const found = findWorkItem(depId, allProjects)
    return found ? { id: depId, title: found.wi.title } : { id: depId, title: depId }
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/projects" className="text-indigo-600 hover:underline">← Projects</Link>
        <span>/</span>
        <Link href={`/epics/${epic.id}`} className="text-indigo-600 hover:underline">{epic.title}</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 flex-1">{wi.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE_STYLES[kind]}`}>
            {SOURCE_BADGE_LABELS[kind]}
          </span>
          <StatusSelect value={currentStatus} onChange={handleStatusChange} />
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Hours</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{wi.estimatedHours}h</dd>
          </div>
          <div>
            <dt className="text-gray-500">Confidence</dt>
            <dd className="mt-0.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                wi.confidence === 'high'   ? 'bg-green-100 text-green-700' :
                wi.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
              }`}>{wi.confidence}</span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Skill</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {wi.primarySkill ? (SKILLS.find((s) => s.id === wi.primarySkill)?.name ?? wi.primarySkill) : wi.skillRequired ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Sprint</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{wi.sprintNumber != null ? `S${wi.sprintNumber}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Assignee</dt>
            <dd className="font-medium text-gray-900 mt-0.5">
              {assignee ? (
                <Link href={`/team/${assignee.id}`} className="text-indigo-600 hover:underline">
                  {assignee.name}
                </Link>
              ) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Priority</dt>
            <dd className="font-medium text-gray-900 mt-0.5 capitalize">{wi.priority ?? project.priority}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Initiative</dt>
            <dd className="mt-0.5">
              <Link href={`/planning/${project.id}`} className="text-indigo-600 hover:underline text-xs">
                {project.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Epic</dt>
            <dd className="mt-0.5">
              <Link href={`/epics/${epic.id}`} className="text-indigo-600 hover:underline text-xs">
                {epic.title}
              </Link>
            </dd>
          </div>
        </dl>
        {wi.description && (
          <p className="text-sm text-gray-600 mt-4 border-t border-gray-100 pt-3">{wi.description}</p>
        )}
      </div>

      {/* Jira Envelope */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Jira Issue</h3>
        {wi.jira?.issueKey ? (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Key</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{wi.jira.issueKey}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{wi.jira.status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Priority</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{wi.jira.priority ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Assignee</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {typeof wi.jira.assignee === 'string' ? wi.jira.assignee :
                 wi.jira.assignee?.displayName ?? '—'}
              </dd>
            </div>
            {wi.jira.updatedAt && (
              <div>
                <dt className="text-gray-500">Updated</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {new Date(wi.jira.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            {wi.jira.labels && wi.jira.labels.length > 0 && (
              <div className="col-span-2">
                <dt className="text-gray-500">Labels</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {wi.jira.labels.map((l: string) => (
                    <span key={l} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{l}</span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-400">No Jira issue linked.</p>
        )}
      </div>

      {/* Provenance */}
      {(wi.enhancedBy || wi.lastEnhancedAt) && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Provenance</h3>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {wi.enhancedBy && (
              <div>
                <dt className="text-gray-500">Enhanced By</dt>
                <dd className="font-medium text-gray-900 mt-0.5 capitalize">{wi.enhancedBy}</dd>
              </div>
            )}
            {wi.enhancementVersion && (
              <div>
                <dt className="text-gray-500">Version</dt>
                <dd className="font-medium text-gray-900 mt-0.5">v{wi.enhancementVersion}</dd>
              </div>
            )}
            {wi.lastEnhancedAt && (
              <div>
                <dt className="text-gray-500">Last Enhanced</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {new Date(wi.lastEnhancedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
          {/* Assumed flags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {wi.assumedEstimatedHours && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs text-amber-700">assumed hours</span>
            )}
            {wi.assumedSkill && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs text-amber-700">assumed skill</span>
            )}
            {wi.assumedRequiredSkillLevel && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs text-amber-700">assumed level</span>
            )}
            {wi.assumedAssignee && (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-xs text-amber-700">assumed assignee</span>
            )}
            {wi.aiSuggested && (
              <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-xs text-indigo-700">AI suggested</span>
            )}
          </div>
          {/* Manual overrides */}
          {wi.manualOverrides && wi.manualOverrides.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Manual Overrides</p>
              <div className="space-y-1">
                {wi.manualOverrides.map((o, i) => (
                  <div key={i} className="text-xs text-gray-600">
                    <span className="font-medium">{o.field}</span>: {String(o.originalValue)} → {String(o.overriddenValue)}
                    {o.note && <span className="text-gray-400 ml-1">({o.note})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dependencies */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Dependencies ({depItems.length})</h3>
        {depItems.length === 0 ? (
          <p className="text-sm text-gray-400">No dependencies.</p>
        ) : (
          <ul className="space-y-1">
            {depItems.map((dep) => (
              <li key={dep.id}>
                <Link href={`/tasks/${dep.id}`} className="text-sm text-indigo-600 hover:underline">
                  {dep.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assignment Recommendations */}
      {candidates.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">Assignment Recommendations</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Score</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidates.map((c) => {
                const m = TEAM_MEMBERS.find((tm) => tm.id === c.teamMemberId)
                return (
                  <tr key={c.teamMemberId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/team/${c.teamMemberId}`} className="text-indigo-600 hover:underline">
                        {m?.name ?? c.teamMemberId}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{c.totalScore}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{c.explanation}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
