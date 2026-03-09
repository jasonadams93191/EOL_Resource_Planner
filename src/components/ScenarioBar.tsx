'use client'

import { useState, useEffect } from 'react'
import { listScenarios, getScenario, saveScenario, type SavedScenario } from '@/lib/planning/scenario-store'
import type { PlanningProject, TeamMember } from '@/types/planning'
import type { DataSourceMode } from '@/lib/planning/data-source-mode'

interface ScenarioBarProps {
  projects: PlanningProject[]
  members: TeamMember[]
  startDate: string
  dataMode: DataSourceMode
  onLoad: (scenario: SavedScenario) => void
  onReset: () => void
}

export function ScenarioBar({ projects, members, startDate, dataMode, onLoad, onReset }: ScenarioBarProps) {
  const [name, setName] = useState('')
  const [flash, setFlash] = useState(false)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    setScenarios(listScenarios())
  }, [])

  function handleSave() {
    if (!name.trim()) return
    const now = new Date().toISOString()
    const scenario: SavedScenario = {
      id: `scenario-${Date.now()}`,
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      sprintStartDate: startDate,
      dataMode: dataMode === 'jiraSnapshot' ? 'jiraSnapshot' : 'seed',
      projectPriorities: Object.fromEntries(projects.map((p) => [p.id, p.priority])),
      memberOverrides: Object.fromEntries(
        members.map((m) => [m.id, { utilizationTargetPercent: m.utilizationTargetPercent, isActive: m.isActive }])
      ),
      tempResources: [],
    }
    saveScenario(scenario)
    setScenarios(listScenarios())
    setName('')
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

  function handleApply() {
    if (!selectedId) return
    const scenario = getScenario(selectedId)
    if (scenario) onLoad(scenario)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">Scenario</span>

      {/* Save */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Name…"
          className="border border-gray-300 rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {flash ? 'Saved!' : 'Save As'}
        </button>
      </div>

      <span className="text-gray-200">|</span>

      {/* Load */}
      <div className="flex items-center gap-1.5">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[180px]"
        >
          <option value="">Load scenario…</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={handleApply}
          disabled={!selectedId}
          className="rounded px-2.5 py-1 text-xs font-medium bg-gray-700 text-white hover:bg-gray-900 disabled:opacity-40 transition-colors"
        >
          Apply
        </button>
      </div>

      <span className="text-gray-200">|</span>

      {/* Reset */}
      <button
        onClick={onReset}
        className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        Reset
      </button>
    </div>
  )
}
