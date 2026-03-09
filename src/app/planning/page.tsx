'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { ScenarioControls } from '@/components/planning/ScenarioControls'
import { BottleneckPanel } from '@/components/planning/BottleneckPanel'
import { ResourceTimelineView } from '@/components/planning/ResourceTimelineView'
import { InitiativeTimelineView } from '@/components/planning/InitiativeTimelineView'
import { CapacityChart } from '@/components/planning/CapacityChart'
import { SprintRoadmapView } from '@/components/planning/SprintRoadmapView'
import { DataSourceBanner } from '@/components/planning/DataSourceBanner'
import { getScenario } from '@/lib/planning/scenario-store'
import type { TeamMember, PlanningProject, PlanningPriority } from '@/types/planning'
import type { BottleneckSummary } from '@/lib/planning/bottleneck-engine'
import type { DataSourceMode } from '@/lib/planning/data-source-mode'

// ── Types ─────────────────────────────────────────────────────

type Tab = 'roadmap' | 'scenarios' | 'bottlenecks'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'roadmap',     label: 'Roadmap' },
  { id: 'scenarios',   label: 'Scenario Builder' },
  { id: 'bottlenecks', label: 'Bottlenecks' },
]

const START_DATE = '2026-03-09'

// ── Jira snapshot data loader ─────────────────────────────────

async function loadJiraProjects(): Promise<PlanningProject[]> {
  const res = await fetch('/api/planning?source=jiraSnapshot')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.projects) ? data.projects : []
}

// ── Inner page (needs useSearchParams) ────────────────────────

function PlanningPageInner() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('roadmap')
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('seed')
  const [jiraProjects, setJiraProjects] = useState<PlanningProject[] | null>(null)
  const [jiraLoadError, setJiraLoadError] = useState<string | null>(null)
  const [scenarioMembers, setScenarioMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [scenarioProjects, setScenarioProjects] = useState<PlanningProject[]>(mockAllPlanningProjects)
  const [scenarioStartDate, setScenarioStartDate] = useState(START_DATE)
  const [lastRecomputedAt, setLastRecomputedAt] = useState<string | null>(null)
  const [roadmap, setRoadmap] = useState(() =>
    buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)
  )
  const [bottleneckSummary, setBottleneckSummary] = useState<BottleneckSummary>(() =>
    analyzeBottlenecks(mockAllPlanningProjects, TEAM_MEMBERS, SKILLS, ROLES,
      buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)
    )
  )

  // Recompute engines whenever projects/members change
  const recompute = useCallback((projects: PlanningProject[], members: TeamMember[], startDate: string) => {
    const newRoadmap = buildSprintRoadmap(projects, members, startDate)
    setRoadmap(newRoadmap)
    setBottleneckSummary(analyzeBottlenecks(projects, members, SKILLS, ROLES, newRoadmap))
    setLastRecomputedAt(new Date().toLocaleTimeString())
  }, [])

  // Load scenario from ?scenarioId= URL param on mount
  useEffect(() => {
    const scenarioId = searchParams.get('scenarioId')
    if (!scenarioId) return
    const scenario = getScenario(scenarioId)
    if (!scenario) return

    const updatedMembers = TEAM_MEMBERS.map((m) => {
      const override = scenario.memberOverrides[m.id]
      if (!override) return m
      return { ...m, utilizationTargetPercent: override.utilizationTargetPercent, isActive: override.isActive }
    })
    const baseProjects = dataSourceMode === 'jiraSnapshot' && jiraProjects ? jiraProjects : mockAllPlanningProjects
    const updatedProjects = baseProjects.map((p) => {
      const priorityOverride = scenario.projectPriorities[p.id] as PlanningPriority | undefined
      return priorityOverride ? { ...p, priority: priorityOverride } : p
    })

    setScenarioMembers(updatedMembers)
    setScenarioProjects(updatedProjects)
    setScenarioStartDate(scenario.sprintStartDate)
    recompute(updatedProjects, updatedMembers, scenario.sprintStartDate)
    setActiveTab('scenarios')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Called by DataSourceBanner when mode changes
  const handleModeChange = useCallback(async (mode: DataSourceMode) => {
    setDataSourceMode(mode)
    setJiraLoadError(null)

    if (mode === 'jiraSnapshot') {
      const projects = await loadJiraProjects()
      if (projects.length === 0) {
        setJiraProjects(null)
      } else {
        setJiraProjects(projects)
        setScenarioProjects(projects)
        recompute(projects, scenarioMembers, scenarioStartDate)
      }
    } else {
      setJiraProjects(null)
      setScenarioProjects(mockAllPlanningProjects)
      recompute(mockAllPlanningProjects, scenarioMembers, scenarioStartDate)
    }
  }, [scenarioMembers, scenarioStartDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Active project list depending on mode
  const activeProjects =
    dataSourceMode === 'jiraSnapshot' && jiraProjects != null
      ? jiraProjects
      : mockAllPlanningProjects

  function handleRecompute({
    members,
    projects,
    startDate,
  }: {
    members: TeamMember[]
    projects: PlanningProject[]
    startDate: string
  }) {
    setScenarioMembers(members)
    setScenarioProjects(projects)
    setScenarioStartDate(startDate)
    recompute(projects, members, startDate)
    setActiveTab('roadmap')
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Planning Console</h2>
        <p className="text-sm text-gray-500 mt-1">
          Roadmap, scenario modeling, and bottleneck analysis
        </p>
      </div>

      {/* Data source mode banner */}
      <DataSourceBanner onModeChange={handleModeChange} />

      {/* Jira mode notice */}
      {dataSourceMode === 'jiraSnapshot' && jiraProjects === null && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          No Jira snapshot loaded. Click <strong>Sync Jira</strong> in the banner above, then switch
          back to Jira Snapshot mode to see live data.
        </div>
      )}
      {jiraLoadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {jiraLoadError}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'roadmap' && (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Resource View</h3>
              {lastRecomputedAt && (
                <span className="text-xs text-gray-400">updated {lastRecomputedAt}</span>
              )}
            </div>
            <ResourceTimelineView roadmap={roadmap} projects={activeProjects} members={scenarioMembers} />
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Initiative Timeline</h3>
            <InitiativeTimelineView roadmap={roadmap} projects={activeProjects} members={scenarioMembers} />
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Capacity vs Load</h3>
            <CapacityChart
              roadmap={roadmap}
              totalTeamCapacity={scenarioMembers.filter(m => m.isActive).reduce((s, m) => s + m.availableHoursPerSprint, 0)}
            />
          </section>
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">Legacy Sprint View</summary>
            <div className="p-2">
              <SprintRoadmapView
                roadmap={roadmap}
                projects={activeProjects}
                members={scenarioMembers}
              />
            </div>
          </details>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <ScenarioControls
          initialMembers={scenarioMembers}
          initialProjects={scenarioProjects}
          startDate={scenarioStartDate}
          dataMode={dataSourceMode}
          onRecompute={handleRecompute}
        />
      )}

      {activeTab === 'bottlenecks' && (
        <BottleneckPanel
          summary={bottleneckSummary}
          members={scenarioMembers}
          skills={SKILLS}
          roles={ROLES}
        />
      )}
    </div>
  )
}

// ── Page (Suspense boundary for useSearchParams) ───────────────

export default function PlanningPage() {
  return (
    <Suspense>
      <PlanningPageInner />
    </Suspense>
  )
}
