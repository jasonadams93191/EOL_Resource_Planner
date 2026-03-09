import type { ScenarioResult } from '@/types/domain'

interface ScenarioComparisonProps {
  result: ScenarioResult
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ScenarioComparison({ result }: ScenarioComparisonProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-purple-300 bg-purple-50 p-3">
        <span className="rounded bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-800">
          Wave 2: Replace with interactive scenario builder
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Baseline */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Baseline</h3>
          <p className="text-sm text-gray-500 mb-4">Current team composition</p>
          <div className="space-y-3">
            {result.baseline.map((sched) => (
              <div key={sched.projectId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {sched.projectId.replace('proj-', '').toUpperCase()}
                </span>
                <span className="text-gray-500">{formatDate(sched.endDate)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Adjusted */}
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">{result.scenarioInput.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{result.scenarioInput.notes}</p>
          <div className="space-y-3">
            {result.adjusted.map((sched, i) => {
              const d = result.delta[i]
              return (
                <div key={sched.projectId} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {sched.projectId.replace('proj-', '').toUpperCase()}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-500">{formatDate(sched.endDate)}</span>
                    <span className="text-green-700 text-xs font-medium">{d.daysDelta}d</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-5">
        <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
        <ul className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700">
              <span className="text-blue-500 flex-shrink-0">→</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
