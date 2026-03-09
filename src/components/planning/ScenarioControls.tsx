'use client'

import { useState } from 'react'
import type { TeamMember, PlanningProject, PlanningPriority } from '@/types/planning'
import { TEMP_RESOURCE_TEMPLATES } from '@/lib/planning/acceleration-engine'

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
  const [projects, setProjects] = useState<PlanningProject[]>(initialProjects)
  const [scenarioStartDate, setScenarioStartDate] = useState(startDate)

  function updateCapacity(memberId: string, utilizationTargetPercent: number) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, utilizationTargetPercent } : m))
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

  function updateProjectPriority(projectId: string, priority: PlanningPriority) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, priority } : p))
    )
  }

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(TEMP_RESOURCE_TEMPLATES[0].id)
  const [tempSprintWindow, setTempSprintWindow] = useState<number>(4)

  function addTempResource() {
    const template = TEMP_RESOURCE_TEMPLATES.find((t) => t.id === selectedTemplateId)
    if (!template) return
    const tempMember: TeamMember = {
      id: `tmp-${template.id}-${Date.now()}`,
      name: `${template.label} (Temp)`,
      primaryRoleId: template.primaryRoleId,
      userSkills: template.skills,
      availableHoursPerSprint: template.availableHoursPerSprint,
      utilizationTargetPercent: template.utilizationTargetPercent,
      isActive: true,
      resourceKind: 'temp',
      startSprintId: 1,
      endSprintId: tempSprintWindow,
    }
    setMembers((prev) => [...prev, tempMember])
  }

  function removeTempResource(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function reset() {
    setMembers(initialMembers)
    setProjects(initialProjects)
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

      {/* Project priority overrides */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Initiative Priorities</h3>
        <div className="space-y-2">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{project.name}</span>
              <select
                value={project.priority}
                onChange={(e) => updateProjectPriority(project.id, e.target.value as PlanningPriority)}
                className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          ))}
        </div>
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
                      max={100}
                      step={5}
                      value={member.utilizationTargetPercent}
                      disabled={!member.isActive}
                      onChange={(e) => updateCapacity(member.id, parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600 disabled:opacity-40"
                    />
                    <span className="text-sm text-gray-600 w-10 text-right">
                      {Math.round(member.utilizationTargetPercent)}%
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

      {/* Add Temp Resource */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Temp Resource</h3>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {TEMP_RESOURCE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <label className="text-xs text-gray-500 whitespace-nowrap">Window:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={tempSprintWindow}
                onChange={(e) => setTempSprintWindow(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 rounded border border-gray-300 px-1.5 py-1 text-sm text-center"
              />
              <span className="text-xs text-gray-400">sp</span>
            </div>
            <button
              onClick={addTempResource}
              className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              + Add
            </button>
          </div>
          {/* Active temp resources */}
          {members.filter((m) => m.resourceKind === 'temp' || m.resourceKind === 'external').length > 0 && (
            <div className="space-y-1">
              {members
                .filter((m) => m.resourceKind === 'temp' || m.resourceKind === 'external')
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded bg-indigo-50 border border-indigo-100 px-2 py-1">
                    <span className="text-xs text-indigo-800 font-medium">{m.name}</span>
                    {m.endSprintId != null && (
                      <span className="text-xs text-indigo-400 mx-2">Sprints 1–{m.endSprintId}</span>
                    )}
                    <button
                      onClick={() => removeTempResource(m.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onRecompute({ members, projects, startDate: scenarioStartDate })}
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
