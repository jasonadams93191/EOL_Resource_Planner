'use client'

import { useState } from 'react'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { PortfolioView } from '@/components/planning/PortfolioView'
import { ProjectEpicView } from '@/components/planning/ProjectEpicView'
import { TeamView } from '@/components/planning/TeamView'
import { SprintRoadmapView } from '@/components/planning/SprintRoadmapView'
import { ScenarioControls } from '@/components/planning/ScenarioControls'
import { BottleneckPanel } from '@/components/planning/BottleneckPanel'
import { ResourceTimelineView } from '@/components/planning/ResourceTimelineView'
import { InitiativeTimelineView } from '@/components/planning/InitiativeTimelineView'
import { CapacityChart } from '@/components/planning/CapacityChart'
import type { TeamMember, PlanningProject } from '@/types/planning'
import type { BottleneckSummary } from '@/lib/planning/bottleneck-engine'

// ── Types ─────────────────────────────────────────────────────

type Tab = 'portfolio' | 'projects' | 'team' | 'roadmap' | 'bottlenecks' | 'scenarios'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'portfolio',    label: 'Portfolio' },
  { id: 'projects',     label: 'Projects' },
  { id: 'team',         label: 'Team' },
  { id: 'roadmap',      label: 'Roadmap' },
  { id: 'bottlenecks',  label: 'Bottlenecks' },
  { id: 'scenarios',    label: 'Scenarios' },
]

const START_DATE = '2026-03-09'

// ── Page ──────────────────────────────────────────────────────

export default function PlanningPage() {
  const [activeTab, setActiveTab] = useState<Tab>('portfolio')
  const [scenarioMembers, setScenarioMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [scenarioProjects, setScenarioProjects] = useState<PlanningProject[]>(mockAllPlanningProjects)
  const [scenarioStartDate, setScenarioStartDate] = useState(START_DATE)
  const [roadmap, setRoadmap] = useState(() =>
    buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)
  )
  const [bottleneckSummary, setBottleneckSummary] = useState<BottleneckSummary>(() =>
    analyzeBottlenecks(mockAllPlanningProjects, TEAM_MEMBERS, SKILLS, ROLES,
      buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)
    )
  )

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
    const newRoadmap = buildSprintRoadmap(projects, members, startDate)
    setRoadmap(newRoadmap)
    setBottleneckSummary(analyzeBottlenecks(projects, members, SKILLS, ROLES, newRoadmap))
    setActiveTab('roadmap')
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Planning</h2>
        <p className="text-sm text-gray-500 mt-1">
          Phase 1 MVP — portfolio view, team model, assignment scoring, sprint roadmap, bottleneck analysis
        </p>
      </div>

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
      {activeTab === 'portfolio' && (
        <PortfolioView
          projects={scenarioProjects}
          members={scenarioMembers}
          roadmap={roadmap}
        />
      )}

      {activeTab === 'projects' && (
        <ProjectEpicView
          projects={mockAllPlanningProjects}
          members={scenarioMembers}
          skills={SKILLS}
          roadmap={roadmap}
        />
      )}

      {activeTab === 'team' && (
        <TeamView
          members={TEAM_MEMBERS}
          roles={ROLES}
          skills={SKILLS}
        />
      )}

      {activeTab === 'roadmap' && (
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Resource View</h3>
            <ResourceTimelineView roadmap={roadmap} projects={scenarioProjects} members={scenarioMembers} />
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Initiative Timeline</h3>
            <InitiativeTimelineView roadmap={roadmap} projects={scenarioProjects} members={scenarioMembers} />
          </section>
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Capacity vs Load</h3>
            <CapacityChart
              roadmap={roadmap}
              totalTeamCapacity={scenarioMembers.filter(m => m.isActive).reduce((s, m) => s + m.sprintCapacity, 0)}
            />
          </section>
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50">Legacy Sprint View</summary>
            <div className="p-2">
              <SprintRoadmapView
                roadmap={roadmap}
                projects={scenarioProjects}
                members={scenarioMembers}
              />
            </div>
          </details>
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <BottleneckPanel
          summary={bottleneckSummary}
          members={scenarioMembers}
          skills={SKILLS}
          roles={ROLES}
        />
      )}

      {activeTab === 'scenarios' && (
        <ScenarioControls
          initialMembers={scenarioMembers}
          initialProjects={scenarioProjects}
          startDate={scenarioStartDate}
          onRecompute={handleRecompute}
        />
      )}
    </div>
  )
}
