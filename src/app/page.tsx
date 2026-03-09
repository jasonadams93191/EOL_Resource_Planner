'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { buildSprintRoadmap, priorityWeight } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { computeRealityScore } from '@/lib/planning/reality-score-engine'
import { ScenarioBar } from '@/components/ScenarioBar'
import { PortfolioView } from '@/components/planning/PortfolioView'
import { TimelineView } from '@/components/TimelineView'
import { RealityScoreWidget } from '@/components/RealityScoreWidget'
import type { PlanningProject, TeamMember } from '@/types/planning'
import type { SavedScenario } from '@/lib/planning/scenario-store'
import type { DataSourceMode } from '@/lib/planning/data-source-mode'

const START_DATE = '2026-03-09'

export default function DashboardPage() {
  const [projects, setProjects] = useState<PlanningProject[]>(mockAllPlanningProjects)
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [startDate] = useState(START_DATE)
  const [dataMode, setDataMode] = useState<DataSourceMode>('seed')
  const [viewMode, setViewMode] = useState<'plan' | 'timeline'>('plan')

  // Sort projects by priority for the sprint engine
  const projectsForRoadmap = useMemo(() => {
    return [...projects].sort((a, b) =>
      priorityWeight(a.priority, a.priorityRank) - priorityWeight(b.priority, b.priorityRank)
    )
  }, [projects])

  const roadmap = useMemo(
    () => buildSprintRoadmap(projectsForRoadmap, members, startDate),
    [projectsForRoadmap, members, startDate]
  )

  const bottlenecks = useMemo(
    () => analyzeBottlenecks(projects, members, SKILLS, ROLES, roadmap),
    [projects, members, roadmap]
  )

  function applyScenario(scenario: SavedScenario) {
    setProjects((prev) =>
      prev.map((p) => {
        const priority = scenario.projectPriorities[p.id]
        return priority ? { ...p, priority } : p
      })
    )
    setMembers((prev) =>
      prev.map((m) => {
        const override = scenario.memberOverrides[m.id]
        return override
          ? { ...m, utilizationTargetPercent: override.utilizationTargetPercent, isActive: override.isActive }
          : m
      })
    )
  }

  function handleJiraSync(jiraProjects: PlanningProject[]) {
    setProjects(jiraProjects)
    setDataMode('jiraSnapshot')
  }

  function reset() {
    setProjects(mockAllPlanningProjects)
    setMembers(TEAM_MEMBERS)
    setDataMode('seed')
  }

  const realityScore = useMemo(
    () => computeRealityScore(projects, members, SKILLS, roadmap, bottlenecks.personBottlenecks),
    [projects, members, roadmap, bottlenecks]
  )

  const activeMembers = members.filter((m) => m.isActive)

  return (
    <div className="space-y-6 w-full px-4 sm:px-6">
      {/* Scenario bar */}
      <ScenarioBar
        projects={projects}
        members={members}
        startDate={startDate}
        dataMode={dataMode}
        onLoad={applyScenario}
        onReset={reset}
        onJiraSync={handleJiraSync}
      />

      {/* Reality Score */}
      <RealityScoreWidget score={realityScore} />

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          {viewMode === 'plan' ? `Initiatives (${projects.length})` : 'Sprint Timeline'}
        </h2>
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden text-xs">
          <button
            onClick={() => setViewMode('plan')}
            className={`px-4 py-1.5 font-medium transition-colors ${
              viewMode === 'plan' ? 'bg-[#1a2e6b] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Plan View
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 font-medium transition-colors ${
              viewMode === 'timeline' ? 'bg-[#1a2e6b] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {viewMode === 'plan' ? (
        <PortfolioView
          projects={projects}
          members={members}
          roadmap={roadmap}
          startDate={startDate}
        />
      ) : (
        <TimelineView
          projects={projects}
          members={members}
          roadmap={roadmap}
          personBottlenecks={bottlenecks.personBottlenecks}
        />
      )}

      {/* Team capacity strip */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Team Capacity</h2>
          <Link href="/team" className="text-xs text-indigo-600 hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {activeMembers.map((m) => {
            const placements = roadmap.workItemPlacements.filter((p) => p.assignedTeamMemberId === m.id)
            const totalHours = placements.reduce((s, p) => s + (p.estimatedHours ?? 0), 0)
            const targetCapacity = m.availableHoursPerSprint * (m.utilizationTargetPercent / 100) * roadmap.totalSprints
            const maxCapacity = m.availableHoursPerSprint * roadmap.totalSprints
            const pct = targetCapacity > 0 ? Math.round((totalHours / targetCapacity) * 100) : 0
            const barPct = Math.min(100, Math.round((totalHours / maxCapacity) * 100))
            const barColor = totalHours > maxCapacity ? 'bg-red-400' : pct >= 100 ? 'bg-amber-400' : 'bg-green-500'
            return (
              <Link
                key={m.id}
                href={`/team/${m.id}`}
                className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <p className="text-xs font-medium text-gray-800 truncate">{m.name.split(' ')[0]}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-200">
                  <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{pct}% of target</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
