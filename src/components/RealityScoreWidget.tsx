'use client'

import { useState } from 'react'
import type { RealityScore } from '@/lib/planning/reality-score-engine'

const GRADE_STYLES: Record<string, string> = {
  A: 'text-green-700 bg-green-100',
  B: 'text-blue-700 bg-blue-100',
  C: 'text-amber-700 bg-amber-100',
  D: 'text-orange-700 bg-orange-100',
  F: 'text-red-700 bg-red-100',
}

const SEVERITY_BAR: Record<string, string> = {
  ok:       'bg-green-400',
  warn:     'bg-amber-400',
  critical: 'bg-red-500',
}

const SEVERITY_TEXT: Record<string, string> = {
  ok:       'text-green-600',
  warn:     'text-amber-600',
  critical: 'text-red-600',
}

function ScoreBar({ score, severity }: { score: number; severity: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${SEVERITY_BAR[severity] ?? 'bg-gray-400'} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right shrink-0 ${SEVERITY_TEXT[severity] ?? 'text-gray-500'}`}>
        {score}
      </span>
    </div>
  )
}

interface Props {
  score: RealityScore
}

export function RealityScoreWidget({ score }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      {/* Summary row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-left group"
          title="Click to expand dimension breakdown"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline Reality</span>
          <span className={`text-xs font-bold rounded px-1.5 py-0.5 ${GRADE_STYLES[score.grade] ?? 'text-gray-600 bg-gray-100'}`}>
            {score.grade}
          </span>
          <span className="text-sm font-bold text-gray-800">{score.overall}<span className="text-xs font-normal text-gray-400">/100</span></span>
          <span className="text-gray-300">·</span>
        </button>

        {/* Mini bar */}
        <div className="flex-1 min-w-[80px] max-w-[160px]">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                score.overall >= 85 ? 'bg-green-400' :
                score.overall >= 70 ? 'bg-blue-400' :
                score.overall >= 55 ? 'bg-amber-400' :
                score.overall >= 40 ? 'bg-orange-400' : 'bg-red-500'
              }`}
              style={{ width: `${score.overall}%` }}
            />
          </div>
        </div>

        {/* Top risks inline */}
        {score.topRisks.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs text-red-400 shrink-0">⚠</span>
            <span className="text-xs text-gray-500 truncate">{score.topRisks[0]}</span>
            {score.topRisks.length > 1 && (
              <span className="text-xs text-gray-400 shrink-0">+{score.topRisks.length - 1} more</span>
            )}
          </div>
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {score.dimensions.map(dim => (
              <div key={dim.key} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 font-medium">{dim.label}</span>
                  <span className="text-[10px] text-gray-400">{dim.weight}%</span>
                </div>
                <ScoreBar score={dim.score} severity={dim.severity} />
                <p className="text-[10px] text-gray-400 leading-tight">{dim.insight}</p>
              </div>
            ))}
          </div>

          {score.topRisks.length > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
              <p className="text-xs font-semibold text-gray-500">Top Risks</p>
              {score.topRisks.map((risk, i) => (
                <p key={i} className="text-xs text-red-600 flex gap-1.5">
                  <span className="shrink-0">⚠</span>
                  <span>{risk}</span>
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            <span><strong className="text-gray-600">{score.totalWorkItems}</strong> work items</span>
            <span><strong className="text-gray-600">{score.totalHours}h</strong> total</span>
            {score.overflowItems > 0 && (
              <span className="text-red-500"><strong>{score.overflowItems}</strong> overflow</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
