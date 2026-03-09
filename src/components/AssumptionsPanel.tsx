import type { CapacityProfile } from '@/types/domain'
import { ResourceType } from '@/types/domain'

interface AssumptionsPanelProps {
  profile: CapacityProfile
  readOnly?: boolean
}

const resourceTypeLabel: Record<ResourceType, string> = {
  [ResourceType.PM_DEV_HYBRID]: 'PM / Dev Hybrid',
  [ResourceType.DEVELOPER]: 'Developer',
  [ResourceType.ADMIN]: 'Admin',
}

export function AssumptionsPanel({ profile, readOnly = true }: AssumptionsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Capacity Assumptions</h3>
        <span className="text-xs text-gray-400">Effective {profile.effectiveDate}</span>
      </div>

      {profile.notes && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded p-3">{profile.notes}</p>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Resource</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Weekly Hrs</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Utilization</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Effective Hrs</th>
            </tr>
          </thead>
          <tbody>
            {profile.resources.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-gray-600">{resourceTypeLabel[r.resourceType]}</td>
                <td className="px-4 py-3 text-gray-600">{r.weeklyCapacityHours}h</td>
                <td className="px-4 py-3 text-gray-600">{Math.round(r.utilizationRate * 100)}%</td>
                <td className="px-4 py-3 text-gray-600">
                  {Math.round(r.weeklyCapacityHours * r.utilizationRate)}h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {readOnly && (
        <p className="text-xs text-gray-400">
          Wave 2: editable capacity assumptions with save/load
        </p>
      )}
    </div>
  )
}
