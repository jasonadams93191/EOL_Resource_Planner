'use client'

import { useState } from 'react'
import type { TeamMember, PlanningProject } from '@/types/planning'

interface ScenarioState {
  members: TeamMember[]
  projects: PlanningProject[]
  startDate: string
}

interface ScenarioControlsProps {
  initialMembers: TeamMember[]
  initialProjects: PlanningProject[]
  startDate: string
  onRecompute: (state: ScenarioState) => void
  isComputing?: boolean
}

export function ScenarioControls({
  initialMembers,
  initialProjects,
  startDate,
  onRecompute,
  isComputing = false,
}: ScenarioControlsProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [scenarioStartDate, setScenarioStartDate] = useState(startDate)

  function updateCapacity(memberId: string, capacity: number) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, sprintCapacity: capacity } : m))
    )
  }

  function toggleActive(memberId: string) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, isActive: !m.isActive, inactiveDate: !m.isActive ? undefined : new Date().toISOString().split('T')[0] }
          : m
      )
    )
  }

  function reset() {
    setMembers(initialMembers)
    setScenarioStartDate(startDate)
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Adjust capacity or activate/deactivate team members, then click <strong>Recompute</strong> to see the updated roadmap.
      </div>

      {/* Start date */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 w-28 shrink-0">Start Date</label>
        <input
          type="date"
          value={scenarioStartDate}
          onChange={(e) => setScenarioStartDate(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Member capacity sliders */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Team Capacity Overrides</h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className={`rounded-lg border p-3 ${member.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
                    {!member.isActive && (
                      <span className="text-xs rounded bg-gray-200 text-gray-500 px-1.5 py-0.5">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={member.sprintCapacity}
                      disabled={!member.isActive}
                      onChange={(e) => updateCapacity(member.id, parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600 disabled:opacity-40"
                    />
                    <span className="text-sm text-gray-600 w-10 text-right">
                      {Math.round(member.sprintCapacity * 100)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(member.id)}
                  className={`shrink-0 text-xs rounded px-2 py-1 transition-colors ${
                    member.isActive
                      ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {member.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onRecompute({ members, projects: initialProjects, startDate: scenarioStartDate })}
          disabled={isComputing}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isComputing ? 'Computing…' : 'Recompute Roadmap'}
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
