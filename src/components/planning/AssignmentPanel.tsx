'use client'

import type { AssignmentScoreBreakdown, TeamMember } from '@/types/planning'

interface AssignmentPanelProps {
  candidates: AssignmentScoreBreakdown[]
  members: TeamMember[]
  /** How many top candidates to display (default: 3) */
  topN?: number
}

const DIMENSION_LABELS: Array<{ key: keyof AssignmentScoreBreakdown; label: string; max: number }> = [
  { key: 'skillMatch',            label: 'Skill Match',          max: 35 },
  { key: 'skillLevelMatch',       label: 'Skill Level',          max: 20 },
  { key: 'domainFamiliarity',     label: 'Domain Familiarity',   max: 15 },
  { key: 'roleFit',               label: 'Role Fit',             max: 10 },
  { key: 'capacityAvailability',  label: 'Capacity',             max: 10 },
  { key: 'continuity',            label: 'Continuity',           max: 5  },
  { key: 'priorityUrgencyFit',    label: 'Urgency Fit',          max: 5  },
]

function ScoreBar({
  value,
  max,
  color,
}: {
  value: number
  max: number
  color: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  )
}

function CandidateCard({
  breakdown,
  member,
  rank,
}: {
  breakdown: AssignmentScoreBreakdown
  member?: TeamMember
  rank: number
}) {
  const score = breakdown.totalScore
  const scoreColor =
    score >= 70 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 40 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-600 bg-red-50 border-red-200'

  const barColors = [
    'bg-green-500', 'bg-blue-500', 'bg-violet-500',
    'bg-indigo-400', 'bg-teal-400', 'bg-orange-400', 'bg-pink-400',
  ]

  return (
    <div className={`rounded-lg border p-3 ${rank === 0 ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
          rank === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {rank + 1}
        </span>
        <span className="font-medium text-sm text-gray-900 flex-1 truncate">
          {member?.name ?? breakdown.teamMemberId}
        </span>
        <span className={`text-sm font-bold rounded px-1.5 py-0.5 border ${scoreColor}`}>
          {score}
        </span>
      </div>

      {/* Score breakdown bars */}
      <div className="space-y-1 mb-2">
        {DIMENSION_LABELS.map((dim, idx) => (
          <div key={dim.key} className="flex items-center gap-1">
            <span className="text-xs text-gray-400 w-24 shrink-0 truncate">{dim.label}</span>
            <ScoreBar
              value={breakdown[dim.key] as number}
              max={dim.max}
              color={barColors[idx % barColors.length]}
            />
            <span className="text-xs text-gray-300 w-6 text-right">/{dim.max}</span>
          </div>
        ))}
      </div>

      {/* Explanation */}
      {breakdown.explanation && (
        <p className="text-xs text-gray-500 mt-1 italic">{breakdown.explanation}</p>
      )}
    </div>
  )
}

export function AssignmentPanel({ candidates, members, topN = 3 }: AssignmentPanelProps) {
  const top = candidates.slice(0, topN)

  if (top.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
        No candidates available.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Top {top.length} candidate{top.length !== 1 ? 's' : ''} · scored out of 100
      </p>
      {top.map((candidate, idx) => {
        const member = members.find((m) => m.id === candidate.teamMemberId)
        return (
          <CandidateCard
            key={candidate.teamMemberId}
            breakdown={candidate}
            member={member}
            rank={idx}
          />
        )
      })}
      {candidates.length > topN && (
        <p className="text-xs text-gray-400 text-center">
          +{candidates.length - topN} more candidate{candidates.length - topN !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
