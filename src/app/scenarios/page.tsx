import { ScenarioComparison } from '@/components/ScenarioComparison'
import { AssumptionsPanel } from '@/components/AssumptionsPanel'
import { mockScenarioResult, mockCapacityProfile } from '@/lib/mock/sample-data'

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Scenarios</h2>
        <p className="text-sm text-gray-500 mt-1">
          Model how priority or staffing changes affect delivery timelines
        </p>
      </div>

      <ScenarioComparison result={mockScenarioResult} />

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Assumptions Used</h3>
        <AssumptionsPanel profile={mockCapacityProfile} readOnly />
      </div>
    </div>
  )
}
