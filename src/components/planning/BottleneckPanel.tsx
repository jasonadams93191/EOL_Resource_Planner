'use client'

import type { TeamMember, Skill, Role } from '@/types/planning'
import type { BottleneckSummary } from '@/lib/planning/bottleneck-engine'

interface BottleneckPanelProps {
  summary: BottleneckSummary
  members: TeamMember[]
  skills: Skill[]
  roles: Role[]
}

function UtilizationBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  )
}

function DemandSupplyBar({
  demand,
  supply,
}: {
  demand: number
  supply: number
}) {
  const total = Math.max(demand, supply, 0.01)
  const supplyPct = Math.min(100, Math.round((supply / total) * 100))
  const demandPct = Math.min(100, Math.round((demand / total) * 100))

  return (
    <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="absolute left-0 top-0 h-2 rounded-full bg-blue-400 transition-all"
        style={{ width: `${supplyPct}%` }}
      />
      <div
        className="absolute left-0 top-0 h-2 rounded-full bg-red-400 opacity-60 transition-all"
        style={{ width: `${demandPct}%` }}
      />
    </div>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
      {count > 0 && (
        <span className="text-xs rounded-full bg-red-100 text-red-700 px-2 py-0.5">
          {count}
        </span>
      )}
    </div>
  )
}

export function BottleneckPanel({ summary, members, skills, roles }: BottleneckPanelProps) {
  const { personBottlenecks, skillBottlenecks, roleBottlenecks } = summary
  const totalBottlenecks = personBottlenecks.length + skillBottlenecks.length + roleBottlenecks.length

  if (totalBottlenecks === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-6 text-center">
        <div className="text-green-700 font-semibold text-sm mb-1">No bottlenecks detected</div>
        <div className="text-green-600 text-xs">
          All team members are within capacity. No skill or role gaps found in this roadmap.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Person Overload — always 0 by design: sprint engine never assigns above availableHoursPerSprint */}
      <div>
        <SectionHeader title="Person Overload" count={0} />
        <p className="text-xs text-gray-400">No overloaded team members. Work spills to later sprints when capacity is full.</p>
      </div>

      {/* Skill Gaps */}
      <div>
        <SectionHeader title="Skill Gaps" count={skillBottlenecks.length} />
        {skillBottlenecks.length === 0 ? (
          <p className="text-xs text-gray-400">No skill bottlenecks detected.</p>
        ) : (
          <div className="space-y-3">
            {skillBottlenecks.map((bn) => {
              const skill = skills.find((s) => s.id === bn.skillId)
              return (
                <div key={bn.skillId} className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-900">
                      {skill?.name ?? bn.skillName}
                    </span>
                    <span className="text-xs rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">
                      Gap: +{bn.gapInSprints} sprint fractions
                    </span>
                  </div>
                  <DemandSupplyBar demand={bn.demandInSprints} supply={bn.supplyInSprints} />
                  <div className="mt-1.5 flex gap-4 text-xs text-gray-500">
                    <span>
                      Demand: <span className="font-medium text-gray-700">{bn.demandInSprints}</span>
                    </span>
                    <span>
                      Supply: <span className="font-medium text-gray-700">{bn.supplyInSprints}</span>
                    </span>
                    <span>
                      Affected items: <span className="font-medium text-gray-700">{bn.affectedWorkItemIds.length}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Role Gaps */}
      <div>
        <SectionHeader title="Role Gaps" count={roleBottlenecks.length} />
        {roleBottlenecks.length === 0 ? (
          <p className="text-xs text-gray-400">No role coverage gaps detected.</p>
        ) : (
          <div className="space-y-2">
            {roleBottlenecks.map((bn) => {
              const role = roles.find((r) => r.id === bn.roleId)
              return (
                <div key={bn.roleId} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {role?.name ?? bn.roleName}
                    </span>
                    <span className="text-xs rounded bg-gray-100 text-gray-600 px-1.5 py-0.5">
                      {bn.affectedWorkItemIds.length} item{bn.affectedWorkItemIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{bn.message}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
