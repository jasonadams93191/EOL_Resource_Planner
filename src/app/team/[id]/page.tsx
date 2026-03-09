'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { SKILL_LEVEL_LABELS, targetPlannedHours } from '@/types/planning'
import type { TeamMember, PlanningProject } from '@/types/planning'
import type { WorkItemPlacement } from '@/lib/planning/sprint-engine'

function SkillChip({ skillId, level }: { skillId: string; level: number }) {
  const skill = SKILLS.find((s) => s.id === skillId)
  const label = skill?.name ?? skillId.replace('skill-', '').replace(/-/g, ' ')
  const levelLabel = SKILL_LEVEL_LABELS[level as keyof typeof SKILL_LEVEL_LABELS] ?? String(level)
  const dotColors = ['bg-gray-300', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500', 'bg-violet-600']
  const dotColor = dotColors[level] ?? 'bg-gray-300'
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700" title={levelLabel}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
      <span className="text-gray-400 ml-0.5">({levelLabel})</span>
    </span>
  )
}

export default function TeamMemberPage() {
  const params = useParams()
  const [member, setMember] = useState<TeamMember | null | 'loading'>('loading')
  const [projects, setProjects] = useState<PlanningProject[]>([])
  const [placements, setPlacements] = useState<WorkItemPlacement[]>([])

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
    setMember(TEAM_MEMBERS.find((m) => m.id === id) ?? null)

    fetch('/api/planning')
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects ?? [])
        setPlacements(data.roadmap?.workItemPlacements ?? [])
      })
      .catch(() => {})
  }, [params.id])

  if (member === 'loading') return null

  if (!member) {
    return (
      <div className="space-y-4">
        <Link href="/team" className="text-sm text-indigo-600 hover:underline">← Team</Link>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Team member not found.</p>
        </div>
      </div>
    )
  }

  const role = ROLES.find((r) => r.id === member.primaryRoleId)
  const targetHours = Math.round(member.availableHoursPerSprint * member.utilizationTargetPercent / 100)

  // Build work item lookup from all projects
  const workItemMap = new Map<string, { title: string; epicTitle: string; epicId: string; projectName: string; projectId: string; hours: number; workspace?: string }>()
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const wi of epic.workItems) {
        const workspace = wi.sourceRefs?.[0]?.workspaceId ?? wi.jira?.projectKey ?? ''
        workItemMap.set(wi.id, {
          title: wi.title,
          epicTitle: epic.title,
          epicId: epic.id,
          projectName: project.name,
          projectId: project.id,
          hours: wi.estimatedHours,
          workspace,
        })
      }
    }
  }

  // Assigned items from roadmap placements (sprint engine assigns by team member id)
  const memberPlacements = placements.filter((p) => p.assignedTeamMemberId === member.id)
  type AssignedItem = { id: string; title: string; epicTitle: string; epicId: string; projectName: string; projectId: string; hours: number; sprint: number; workspace?: string }
  const assignedItems: AssignedItem[] = memberPlacements
    .map((p) => {
      const wi = workItemMap.get(p.workItemId)
      if (!wi) return null
      return { id: p.workItemId, ...wi, sprint: p.sprintNumber }
    })
    .filter((x): x is AssignedItem => x !== null)
    .sort((a, b) => a.sprint - b.sprint)

  // Sprint load from placements
  const sprintHoursMap: Record<number, number> = {}
  for (const pl of memberPlacements) {
    sprintHoursMap[pl.sprintNumber] = (sprintHoursMap[pl.sprintNumber] ?? 0) + pl.estimatedHours
  }
  const sprintEntries = Object.entries(sprintHoursMap)
    .map(([k, v]) => ({ sprint: Number(k), hours: v }))
    .sort((a, b) => a.sprint - b.sprint)

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/team" className="text-sm text-indigo-600 hover:underline">← Team</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{member.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{role?.name ?? member.primaryRoleId}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {member.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Capacity card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Capacity</h3>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Available</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{member.availableHoursPerSprint}h / sprint</dd>
          </div>
          <div>
            <dt className="text-gray-500">Target Utilization</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{member.utilizationTargetPercent}%</dd>
          </div>
          <div>
            <dt className="text-gray-500">Planned Capacity</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{targetHours}h / sprint</dd>
          </div>
        </dl>
        {member.inactiveReason && (
          <p className="text-xs text-gray-400 mt-3">{member.inactiveReason}</p>
        )}
      </div>

      {/* Sprint Load */}
      {sprintEntries.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sprint Load</h3>
          <div className="space-y-2">
            {sprintEntries.map(({ sprint, hours }) => {
              const sprintTarget = targetPlannedHours(member)
              const pct = sprintTarget > 0 ? Math.round((hours / sprintTarget) * 100) : 0
              const barPct = Math.min(100, Math.round((hours / member.availableHoursPerSprint) * 100))
              const barColor = hours > member.availableHoursPerSprint
                ? 'bg-red-400'
                : pct >= 100 ? 'bg-amber-400' : 'bg-green-500'
              return (
                <div key={sprint} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500 w-16 shrink-0">S{sprint}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-200">
                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-gray-600 w-20 text-right shrink-0">{hours}h ({pct}% of target)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assigned Tasks */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Assigned Tasks ({assignedItems.length})</h3>
        </div>
        {assignedItems.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No tasks scheduled in roadmap.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Task</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Initiative</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Workspace</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Hours</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">Sprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignedItems.map((item) => {
                const ws = item.workspace?.replace('ws-', '').toUpperCase() ?? ''
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/tasks/${item.id}`} className="text-indigo-600 hover:underline line-clamp-1">
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/planning/${item.projectId}`} className="text-gray-500 hover:text-indigo-600 hover:underline">
                        {item.projectName}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {ws && (
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          ws === 'EOL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{ws}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{item.hours}h</td>
                    <td className="px-4 py-2 text-right text-gray-500">S{item.sprint}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Skills */}
      {member.userSkills.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {member.userSkills.map((us) => (
              <SkillChip key={us.skillId} skillId={us.skillId} level={us.level} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
