'use client'

import type { SprintRoadmap } from '@/lib/planning/sprint-engine'

interface CapacityChartProps {
  roadmap: SprintRoadmap
  totalTeamCapacity: number
}

export function CapacityChart({ roadmap, totalTeamCapacity }: CapacityChartProps) {
  const { sprints } = roadmap

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 w-24">Sprint</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Load vs Capacity</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 w-40">Allocated / Total</th>
          </tr>
        </thead>
        <tbody>
          {sprints.map((sprint) => {
            const allocated = sprint.totalAllocatedSprints
            const maxBar = Math.max(allocated, totalTeamCapacity)
            const barPct = maxBar > 0 ? (allocated / maxBar) * 100 : 0
            const isOver = sprint.isOverloaded
            const isHigh = !isOver && allocated > totalTeamCapacity * 0.8
            const barColor = isOver ? 'bg-red-500' : isHigh ? 'bg-amber-400' : 'bg-green-500'
            const rowBg = isOver ? 'bg-red-50' : ''

            return (
              <tr key={sprint.number} className={`border-t border-gray-100 ${rowBg}`}>
                {/* Sprint label */}
                <td className="px-4 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                  Sprint {sprint.number}
                  <div className="text-gray-400 font-normal">
                    {sprint.startDate}
                  </div>
                </td>

                {/* Bar */}
                <td className="px-4 py-2">
                  <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${barPct}%` }}
                    />
                    {/* Capacity line marker */}
                    {totalTeamCapacity > 0 && maxBar > 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-gray-500 opacity-50"
                        style={{ left: `${(totalTeamCapacity / maxBar) * 100}%` }}
                        title={`Capacity: ${totalTeamCapacity.toFixed(1)}`}
                      />
                    )}
                  </div>
                </td>

                {/* Label */}
                <td className="px-4 py-2 text-right text-xs whitespace-nowrap">
                  <span className={`font-medium ${isOver ? 'text-red-700' : 'text-gray-700'}`}>
                    {allocated.toFixed(1)} / {totalTeamCapacity.toFixed(1)} sprint-fracs
                  </span>
                  {isOver && (
                    <span className="ml-2 text-red-600 font-semibold">⚠ OVER</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
