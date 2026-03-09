'use client'
import { useState } from 'react'
import { WorkspaceSelector, type WorkspaceFilter } from '@/components/WorkspaceSelector'
import { TimelinePlaceholder } from '@/components/TimelinePlaceholder'
import { mockSchedules, mockProjects, mockResources } from '@/lib/mock/sample-data'

export default function TimelinePage() {
  const [workspace, setWorkspace] = useState<WorkspaceFilter>('all')

  const filteredProjects = mockProjects.filter((p) => {
    if (workspace === 'all') return true
    if (workspace === 'eol') return p.workspaceId === 'ws-eol'
    if (workspace === 'ati') return p.workspaceId === 'ws-ati'
    return true
  })

  const filteredSchedules = mockSchedules.filter((s) =>
    filteredProjects.some((p) => p.id === s.projectId)
  )

  const totalHours = filteredSchedules.reduce((sum, s) => sum + s.totalEstimatedHours, 0)
  const teamWeeklyCapacity = mockResources.reduce(
    (sum, r) => sum + r.weeklyCapacityHours * r.utilizationRate,
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Timeline</h2>
        <p className="text-sm text-gray-500 mt-1">Shared resource workload across all projects</p>
      </div>

      <WorkspaceSelector value={workspace} onChange={setWorkspace} />

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total Est. Hours</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalHours}h</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Team Weekly Capacity</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{Math.round(teamWeeklyCapacity)}h</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Est. Weeks to Complete</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.round(totalHours / teamWeeklyCapacity)}w
          </p>
        </div>
      </div>

      <TimelinePlaceholder schedules={filteredSchedules} projects={filteredProjects} />
    </div>
  )
}
