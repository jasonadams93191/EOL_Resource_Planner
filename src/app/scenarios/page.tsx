'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { listScenarios, deleteScenario, type SavedScenario } from '@/lib/planning/scenario-store'
import { ObjectTypeFilter } from '@/components/ObjectTypeFilter'

function overrideCount(s: SavedScenario): number {
  return (
    Object.keys(s.projectPriorities).length +
    Object.keys(s.memberOverrides).length +
    s.tempResources.length
  )
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ScenariosPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    setScenarios(listScenarios())
  }, [])

  function handleDelete(id: string) {
    deleteScenario(id)
    setScenarios(listScenarios())
  }

  const filtered = scenarios.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Scenarios</h2>
        <p className="text-sm text-gray-500 mt-1">Saved scenario library — apply to Planning or view details</p>
      </div>

      <ObjectTypeFilter
        objectType="scenarios"
        onObjectTypeChange={() => {}}
        available={['scenarios']}
        search={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {scenarios.length === 0
              ? 'No saved scenarios yet. Go to Planning → Scenario Builder to save one.'
              : 'No scenarios match your search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data Mode</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sprint Start</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Overrides</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{shortDate(s.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.dataMode === 'jiraSnapshot'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.dataMode === 'jiraSnapshot' ? 'Jira' : 'Seed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.sprintStartDate}</td>
                  <td className="px-4 py-3 text-gray-500">{overrideCount(s)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/scenarios/${s.id}`)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/planning?scenarioId=${s.id}`)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
