import type { ProjectSchedule, Project } from '@/types/domain'

interface TimelinePlaceholderProps {
  schedules: ProjectSchedule[]
  projects: Project[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export function TimelinePlaceholder({ schedules, projects }: TimelinePlaceholderProps) {
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  return (
    <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="rounded bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800">
          Wave 2: Replace with Gantt chart
        </span>
        <span className="text-sm text-orange-700">Placeholder — simple table view</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 pr-4 text-left font-medium text-gray-600">Project</th>
              <th className="py-2 px-4 text-left font-medium text-gray-600">Start</th>
              <th className="py-2 px-4 text-left font-medium text-gray-600">End</th>
              <th className="py-2 px-4 text-left font-medium text-gray-600">Duration</th>
              <th className="py-2 px-4 text-left font-medium text-gray-600">Est. Hours</th>
              <th className="py-2 px-4 text-left font-medium text-gray-600">Milestones</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sched) => {
              const project = projectMap[sched.projectId]
              const days = daysBetween(sched.startDate, sched.endDate)
              return (
                <tr key={sched.projectId} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">
                      {project?.name ?? sched.projectId}
                    </div>
                    <div className="text-xs text-gray-500">{project?.key}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(sched.startDate)}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(sched.endDate)}</td>
                  <td className="py-3 px-4 text-gray-600">{days}d</td>
                  <td className="py-3 px-4 text-gray-600">{sched.totalEstimatedHours}h</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {sched.milestones.map((m) => (
                        <span
                          key={m.name}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                          title={m.description}
                        >
                          {m.name} ({formatDate(m.targetDate)})
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
