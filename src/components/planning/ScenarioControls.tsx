'use client'

import { useState, useRef } from 'react'
import type { TeamMember, PlanningProject, PlanningPriority } from '@/types/planning'
import { TEMP_RESOURCE_TEMPLATES } from '@/lib/planning/acceleration-engine'
import { nextMonday } from '@/lib/planning/sprint-dates'
import { listScenarios, getScenario, saveScenario, type SavedScenario } from '@/lib/planning/scenario-store'
import type { DataSourceMode } from '@/lib/planning/data-source-mode'
import { TEAM_MEMBERS } from '@/lib/mock/team-data'

const SPRINT_DATE_KEY = 'eol-sprint-start-date'

interface ScenarioState {
  members: TeamMember[]
  projects: PlanningProject[]
  startDate: string
}

interface ScenarioControlsProps {
  initialMembers: TeamMember[]
  initialProjects: PlanningProject[]
  startDate: string
  dataMode?: DataSourceMode
  onRecompute: (state: ScenarioState) => void
  isComputing?: boolean
}

export function ScenarioControls({
  initialMembers,
  initialProjects,
  dataMode = 'seed',
  onRecompute,
  isComputing = false,
}: ScenarioControlsProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [projects, setProjects] = useState<PlanningProject[]>(initialProjects)
  const [scenarioStartDate, setScenarioStartDate] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(SPRINT_DATE_KEY) : null) ?? nextMonday()
  )
  const recomputeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Save / Load ───────────────────────────────────────────────
  const [scenarioName, setScenarioName] = useState('')
  const [saveFlash, setSaveFlash] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => listScenarios())

  function handleSave() {
    if (!scenarioName.trim()) return
    const now = new Date().toISOString()
    const scenario: SavedScenario = {
      id: `sc-${Date.now()}`,
      name: scenarioName.trim(),
      createdAt: now,
      updatedAt: now,
      sprintStartDate: scenarioStartDate,
      dataMode,
      projectPriorities: Object.fromEntries(projects.map((p) => [p.id, p.priority])),
      memberOverrides: Object.fromEntries(
        members
          .filter((m) => m.resourceKind !== 'temp' && m.resourceKind !== 'external')
          .map((m) => [m.id, { utilizationTargetPercent: m.utilizationTargetPercent, isActive: m.isActive }])
      ),
      tempResources: members
        .filter((m) => m.resourceKind === 'temp' || m.resourceKind === 'external')
        .map((m) => ({ templateId: m.id.split('-')[1] ?? m.id, sprintWindow: m.endSprintId ?? 4 })),
    }
    saveScenario(scenario)
    setSavedScenarios(listScenarios())
    setScenarioName('')
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 2000)
  }

  function handleLoad(id: string) {
    if (!id) return
    const scenario = getScenario(id)
    if (!scenario) return

    const updatedMembers = TEAM_MEMBERS.map((m) => {
      const override = scenario.memberOverrides[m.id]
      if (!override) return m
      return { ...m, utilizationTargetPercent: override.utilizationTargetPercent, isActive: override.isActive }
    })
    const updatedProjects = projects.map((p) => {
      const priority = scenario.projectPriorities[p.id]
      return priority ? { ...p, priority } : p
    })

    setMembers(updatedMembers)
    setProjects(updatedProjects)
    setScenarioStartDate(scenario.sprintStartDate)
    if (typeof window !== 'undefined') localStorage.setItem(SPRINT_DATE_KEY, scenario.sprintStartDate)
    onRecompute({ members: updatedMembers, projects: updatedProjects, startDate: scenario.sprintStartDate })
  }

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
    const resetDate = nextMonday()
    setScenarioStartDate(resetDate)
    if (typeof window !== 'undefined') localStorage.setItem(SPRINT_DATE_KEY, resetDate)
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
          onChange={(e) => {
            const newDate = e.target.value
            setScenarioStartDate(newDate)
            if (typeof window !== 'undefined') localStorage.setItem(SPRINT_DATE_KEY, newDate)
            if (recomputeTimer.current) clearTimeout(recomputeTimer.current)
            recomputeTimer.current = setTimeout(() => {
              onRecompute({ members, projects, startDate: newDate })
            }, 300)
          }}
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

      {/* Saved Scenarios */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Saved Scenarios</h3>
        {/* Save */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="Scenario name…"
            className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!scenarioName.trim()}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {saveFlash ? 'Saved!' : 'Save'}
          </button>
        </div>
        {/* Load */}
        {savedScenarios.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">Load:</label>
            <select
              defaultValue=""
              onChange={(e) => { handleLoad(e.target.value); e.target.value = '' }}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>Select a scenario…</option>
              {savedScenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
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
