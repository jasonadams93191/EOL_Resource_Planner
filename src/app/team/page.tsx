'use client'

import { useState, useMemo } from 'react'
import { TeamView } from '@/components/planning/TeamView'
import { ObjectTypeFilter } from '@/components/ObjectTypeFilter'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { targetPlannedHours } from '@/types/planning'

const START_DATE = '2026-03-09'

export default function TeamPage() {
  const [search, setSearch] = useState('')

  const filteredMembers = TEAM_MEMBERS.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  )

  // Build roadmap to compute actual load per member
  const roadmap = useMemo(
    () => buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE),
    []
  )

  // memberLoadPct: actual assigned hours / (targetHoursPerSprint × totalSprints) × 100
  const memberLoadPct = useMemo(() => {
    const result: Record<string, number> = {}
    for (const member of TEAM_MEMBERS) {
      const assignedHours = roadmap.workItemPlacements
        .filter((p) => p.assignedTeamMemberId === member.id)
        .reduce((s, p) => s + p.estimatedHours, 0)
      const targetTotal = targetPlannedHours(member) * roadmap.totalSprints
      result[member.id] = targetTotal > 0 ? Math.round((assignedHours / targetTotal) * 100) : 0
    }
    return result
  }, [roadmap])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Team</h2>
        <p className="text-sm text-gray-500 mt-1">Resource roster, capacity, and skills</p>
      </div>

      <ObjectTypeFilter
        objectType="resources"
        onObjectTypeChange={() => {}}
        available={['resources']}
        search={search}
        onSearchChange={setSearch}
      />

      <TeamView
        members={filteredMembers}
        roles={ROLES}
        skills={SKILLS}
        linkHref={(m) => `/team/${m.id}`}
        memberLoadPct={memberLoadPct}
      />
    </div>
  )
}
