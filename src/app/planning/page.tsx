'use client'

import { useState } from 'react'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { PortfolioView } from '@/components/planning/PortfolioView'
import { ProjectEpicView } from '@/components/planning/ProjectEpicView'
import { TeamView } from '@/components/planning/TeamView'
import { SprintRoadmapView } from '@/components/planning/SprintRoadmapView'
import { ScenarioControls } from '@/components/planning/ScenarioControls'
import type { TeamMember, PlanningProject } from '@/types/planning'

// ── Types ─────────────────────────────────────────────────────

type Tab = 'portfolio' | 'projects' | 'team' | 'roadmap' | 'scenarios'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'projects',  label: 'Projects' },
  { id: 'team',      label: 'Team' },
  { id: 'roadmap',   label: 'Roadmap' },
  { id: 'scenarios', label: 'Scenarios' },
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
    setRoadmap(buildSprintRoadmap(projects, members, startDate))
    setActiveTab('roadmap')
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Planning</h2>
        <p className="text-sm text-gray-500 mt-1">
          Phase 1 MVP — portfolio view, team model, assignment scoring, sprint roadmap
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
        <PortfolioView projects={mockAllPlanningProjects} />
      )}

      {activeTab === 'projects' && (
        <ProjectEpicView projects={mockAllPlanningProjects} />
      )}

      {activeTab === 'team' && (
        <TeamView
          members={TEAM_MEMBERS}
          roles={ROLES}
          skills={SKILLS}
        />
      )}

      {activeTab === 'roadmap' && (
        <SprintRoadmapView
          roadmap={roadmap}
          projects={scenarioProjects}
          members={scenarioMembers}
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
