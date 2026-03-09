'use client'

import { useState, useMemo } from 'react'
import { TeamView } from '@/components/planning/TeamView'
import { ObjectTypeFilter } from '@/components/ObjectTypeFilter'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { ROLE_SKILL_DIRECTORY } from '@/lib/planning/role-skill-directory'
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

      {/* Role-Skill Directory */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Role-Skill Directory</h2>
        <p className="text-xs text-gray-500 mb-4">
          Which skills belong to each role. The sprint engine uses this to route tasks to the right team members.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => {
            const skillIds = ROLE_SKILL_DIRECTORY[role.id] ?? []
            const roleMembers = TEAM_MEMBERS.filter(
              (m) => m.primaryRoleId === role.id || m.coversRoles?.includes(role.id)
            )
            return (
              <div key={role.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{role.name}</h3>
                {/* Skills */}
                <div className="mb-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">Skills</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {skillIds.length > 0 ? skillIds.map((sid) => {
                      const skill = SKILLS.find((s) => s.id === sid)
                      return (
                        <span key={sid} className="text-xs bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5">
                          {skill?.name ?? sid}
                        </span>
                      )
                    }) : (
                      <span className="text-xs text-gray-400 italic">No skills mapped</span>
                    )}
                  </div>
                </div>
                {/* Team members */}
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">Team Members</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roleMembers.length > 0 ? roleMembers.map((m) => (
                      <span
                        key={m.id}
                        className={`text-xs rounded-full px-1.5 py-0.5 ${
                          m.isActive
                            ? m.primaryRoleId === role.id
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-400 line-through'
                        }`}
                      >
                        {m.name.split(' ')[0]}
                        {m.primaryRoleId !== role.id && ' (covers)'}
                      </span>
                    )) : (
                      <span className="text-xs text-red-400 italic">No members</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
