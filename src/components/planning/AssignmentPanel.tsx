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

/**
 * Generate a plain-English explanation of why the top candidate ranked highest
 * and why others scored lower.
 */
function explainRanking(
  top: AssignmentScoreBreakdown,
  others: AssignmentScoreBreakdown[]
): string {
  // Find top 2-3 scoring dimensions for the winner
  const dims = DIMENSION_LABELS
    .map((d) => ({ label: d.label, value: top[d.key] as number, max: d.max }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value / b.max - a.value / a.max)
    .slice(0, 3)

  const strengths = dims.map((d) => `${d.label} (${d.value}/${d.max})`).join(', ')

  if (others.length === 0) return `Top candidate scored ${top.totalScore}/100. Key strengths: ${strengths}.`

  // Find dimensions where others scored lower than top
  const gapDims = DIMENSION_LABELS
    .filter((d) => {
      const topVal = top[d.key] as number
      const avgOther = others.reduce((s, o) => s + (o[d.key] as number), 0) / others.length
      return topVal > avgOther + 2 // meaningful gap
    })
    .map((d) => d.label)
    .slice(0, 2)

  const gapText = gapDims.length > 0
    ? ` Others ranked lower primarily on: ${gapDims.join(', ')}.`
    : ''

  return `Top candidate scored ${top.totalScore}/100. Key strengths: ${strengths}.${gapText}`
}

function PlacementRationale({
  top,
  others,
}: {
  top: AssignmentScoreBreakdown
  others: AssignmentScoreBreakdown[]
}) {
  const rationale = explainRanking(top, others)
  return (
    <div className="rounded bg-indigo-50 border border-indigo-100 px-3 py-2 mt-3">
      <div className="text-xs font-semibold text-indigo-700 mb-0.5">Placement Rationale</div>
      <p className="text-xs text-indigo-600">{rationale}</p>
    </div>
  )
}

function ScoreBar({
  value,
  max,
  color,
  compareValue,
}: {
  value: number
  max: number
  color: string
  compareValue?: number
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const comparePct = compareValue != null && max > 0 ? Math.round((compareValue / max) * 100) : null
  const isWeaker = compareValue != null && value < compareValue

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 relative">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
        {/* Ghost bar showing top candidate's score for comparison */}
        {comparePct != null && isWeaker && (
          <div
            className="absolute top-0 left-0 h-1.5 rounded-full bg-indigo-200 opacity-40"
            style={{ width: `${comparePct}%` }}
          />
        )}
      </div>
      <span className={`text-xs w-6 text-right ${isWeaker ? 'text-red-400' : 'text-gray-500'}`}>
        {value}
      </span>
    </div>
  )
}

function CandidateCard({
  breakdown,
  member,
  rank,
  topBreakdown,
}: {
  breakdown: AssignmentScoreBreakdown
  member?: TeamMember
  rank: number
  topBreakdown?: AssignmentScoreBreakdown
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

  // Find key score drivers (top dimensions relative to max)
  const keyDrivers = DIMENSION_LABELS
    .map((d, i) => ({ ...d, value: breakdown[d.key] as number, color: barColors[i % barColors.length] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value / b.max - a.value / a.max)
    .slice(0, 2)

  // Find weaker dimensions vs top candidate
  const weakerDims = topBreakdown
    ? DIMENSION_LABELS
        .filter((d) => {
          const myVal = breakdown[d.key] as number
          const topVal = topBreakdown[d.key] as number
          return myVal < topVal - 2
        })
        .map((d) => d.label)
        .slice(0, 2)
    : []

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
              compareValue={topBreakdown && rank > 0 ? topBreakdown[dim.key] as number : undefined}
            />
            <span className="text-xs text-gray-300 w-6 text-right">/{dim.max}</span>
          </div>
        ))}
      </div>

      {/* Key score drivers (top candidate only) */}
      {rank === 0 && keyDrivers.length > 0 && (
        <div className="mt-2 mb-1">
          <div className="text-xs font-medium text-gray-600 mb-1">Key drivers:</div>
          <div className="flex flex-wrap gap-1">
            {keyDrivers.map((d) => (
              <span key={String(d.key)} className={`text-xs rounded px-1.5 py-0.5 ${d.color === 'bg-green-500' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {d.label}: {d.value}/{d.max}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Why weaker — for non-top candidates */}
      {rank > 0 && weakerDims.length > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          Weaker on: {weakerDims.join(', ')}
        </div>
      )}

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

  const topBreakdown = top[0]

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
            topBreakdown={idx > 0 ? topBreakdown : undefined}
          />
        )
      })}
      {top.length > 1 && (
        <PlacementRationale top={topBreakdown} others={top.slice(1)} />
      )}
      {candidates.length > topN && (
        <p className="text-xs text-gray-400 text-center">
          +{candidates.length - topN} more candidate{candidates.length - topN !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
