'use client'

import { useState } from 'react'
import type { TeamMember, Role, Skill } from '@/types/planning'
import { SKILL_LEVEL_LABELS } from '@/types/planning'

interface TeamViewProps {
  members: TeamMember[]
  roles: Role[]
  skills: Skill[]
  onToggleActive?: (memberId: string, isActive: boolean) => void
}

function CapacityBar({ capacity }: { capacity: number }) {
  const pct = Math.min(100, Math.round(capacity * 100))
  const color = capacity >= 0.8 ? 'bg-green-500' : capacity >= 0.5 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function SkillChip({ skillId, level, skills }: { skillId: string; level: number; skills: Skill[] }) {
  const skill = skills.find((s) => s.id === skillId)
  const label = skill?.name ?? skillId.replace('skill-', '').replace(/-/g, ' ')
  const levelLabel = SKILL_LEVEL_LABELS[level as keyof typeof SKILL_LEVEL_LABELS] ?? String(level)

  const dotColors = ['bg-gray-300', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500', 'bg-violet-600']
  const dotColor = dotColors[level] ?? 'bg-gray-300'

  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700" title={levelLabel}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  )
}

function MemberCard({
  member,
  roles,
  skills,
  onToggleActive,
}: {
  member: TeamMember
  roles: Role[]
  skills: Skill[]
  onToggleActive?: (memberId: string, isActive: boolean) => void
}) {
  const role = roles.find((r) => r.id === member.primaryRoleId)

  return (
    <div className={`rounded-lg border p-4 ${member.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 truncate">{member.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{role?.name ?? member.primaryRoleId}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!member.isActive && (
            <span className="text-xs rounded bg-gray-200 text-gray-500 px-1.5 py-0.5">Inactive</span>
          )}
          {onToggleActive && (
            <button
              onClick={() => onToggleActive(member.id, !member.isActive)}
              className={`text-xs rounded px-2 py-0.5 transition-colors ${
                member.isActive
                  ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {member.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">Sprint capacity</p>
        <CapacityBar capacity={member.isActive ? member.sprintCapacity : 0} />
      </div>

      {/* Skills */}
      {member.userSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.userSkills.map((us) => (
            <SkillChip key={us.skillId} skillId={us.skillId} level={us.level} skills={skills} />
          ))}
        </div>
      )}

      {member.inactiveReason && (
        <p className="text-xs text-gray-400 mt-2">{member.inactiveReason}</p>
      )}
    </div>
  )
}

export function TeamView({ members, roles, skills, onToggleActive }: TeamViewProps) {
  const [showInactive, setShowInactive] = useState(false)

  const activeMembers = members.filter((m) => m.isActive)
  const inactiveMembers = members.filter((m) => !m.isActive)
  const totalCapacity = activeMembers.reduce((s, m) => s + m.sprintCapacity, 0)

  const displayedMembers = showInactive ? members : activeMembers

  return (
    <div className="space-y-4">
      {/* Team summary */}
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-center gap-6 text-sm">
        <span className="font-medium text-gray-900">{activeMembers.length} active members</span>
        <span className="text-gray-500">
          Total sprint capacity: <strong>{totalCapacity.toFixed(1)}</strong> sprints
        </span>
        {inactiveMembers.length > 0 && (
          <button
            onClick={() => setShowInactive((s) => !s)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-700 underline"
          >
            {showInactive ? 'Hide' : 'Show'} {inactiveMembers.length} inactive
          </button>
        )}
      </div>

      {/* Member cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayedMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            roles={roles}
            skills={skills}
            onToggleActive={onToggleActive}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="rounded border border-gray-100 bg-gray-50 px-4 py-2 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="font-medium">Skill levels:</span>
        {([0, 1, 2, 3, 4] as const).map((level) => {
          const dotColors = ['bg-gray-300', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500', 'bg-violet-600']
          return (
            <span key={level} className="flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[level]}`} />
              {level} — {SKILL_LEVEL_LABELS[level]}
            </span>
          )
        })}
      </div>
    </div>
  )
}
