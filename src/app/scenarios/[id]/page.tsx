'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getScenario, deleteScenario, type SavedScenario } from '@/lib/planning/scenario-store'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS } from '@/lib/mock/team-data'
import { TEMP_RESOURCE_TEMPLATES } from '@/lib/planning/acceleration-engine'

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ScenarioRecordPage() {
  const params = useParams()
  const router = useRouter()
  const [scenario, setScenario] = useState<SavedScenario | null | 'loading'>('loading')

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
    setScenario(getScenario(id))
  }, [params.id])

  if (scenario === 'loading') return null

  if (!scenario) {
    return (
      <div className="space-y-4">
        <Link href="/scenarios" className="text-sm text-indigo-600 hover:underline">← Scenarios</Link>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Scenario not found.</p>
        </div>
      </div>
    )
  }

  const s = scenario as SavedScenario

  const projectPriorityEntries = Object.entries(s.projectPriorities)
  const memberOverrideEntries = Object.entries(s.memberOverrides)

  const projectMap = Object.fromEntries(
    mockAllPlanningProjects.map((p) => [p.id, p.name])
  )
  const memberMap = Object.fromEntries(
    TEAM_MEMBERS.map((m) => [m.id, m.name])
  )
  const templateMap = Object.fromEntries(
    TEMP_RESOURCE_TEMPLATES.map((t) => [t.id, t.label])
  )

  function handleDelete() {
    deleteScenario(s.id)
    router.push('/scenarios')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/scenarios" className="text-sm text-indigo-600 hover:underline">← Scenarios</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{s.name}</h2>
            {s.notes && (
              <p className="text-sm text-gray-500 mt-1">{s.notes}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/planning?scenarioId=${s.id}`)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Apply to Planning
          </button>
        </div>
      </div>

      {/* Settings card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Settings</h3>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Sprint Start</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{s.sprintStartDate}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Data Mode</dt>
            <dd className="mt-0.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                s.dataMode === 'jiraSnapshot'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {s.dataMode === 'jiraSnapshot' ? 'Jira Snapshot' : 'Seed Data'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{shortDate(s.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Updated</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{shortDate(s.updatedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Initiative Priority Overrides */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Initiative Priority Overrides ({projectPriorityEntries.length})
          </h3>
        </div>
        {projectPriorityEntries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No priority overrides.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Initiative</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projectPriorityEntries.map(([pid, priority]) => (
                <tr key={pid} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    <Link href={`/planning/${pid}`} className="text-indigo-600 hover:underline">
                      {projectMap[pid] ?? pid}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      priority === 'high'   ? 'bg-orange-100 text-orange-700' :
                      priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                             'bg-gray-100 text-gray-600'
                    }`}>
                      {priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resource Overrides */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Resource Overrides ({memberOverrideEntries.length})
          </h3>
        </div>
        {memberOverrideEntries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No resource overrides.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Member</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Capacity %</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {memberOverrideEntries.map(([mid, override]) => (
                <tr key={mid} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    <Link href={`/team/${mid}`} className="text-indigo-600 hover:underline">
                      {memberMap[mid] ?? mid}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{override.utilizationTargetPercent}%</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      override.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {override.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Temp Resources */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Temp Resources ({s.tempResources.length})
          </h3>
        </div>
        {s.tempResources.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No temp resources added.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Template</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Sprint Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {s.tempResources.map((tr, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{templateMap[tr.templateId] ?? tr.templateId}</td>
                  <td className="px-4 py-2 text-gray-700">{tr.sprintWindow} sprints</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete */}
      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          className="rounded-md px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          Delete Scenario
        </button>
      </div>
    </div>
  )
}
