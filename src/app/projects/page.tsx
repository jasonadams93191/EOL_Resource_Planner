'use client'
import { useState } from 'react'
import { WorkspaceSelector, type WorkspaceFilter } from '@/components/WorkspaceSelector'
import { mockProjects, mockIssues, mockEpics, mockWorkspaces } from '@/lib/mock/sample-data'

export default function ProjectsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceFilter>('all')

  const filteredProjects = mockProjects.filter((p) => {
    if (workspace === 'all') return true
    if (workspace === 'eol') return p.workspaceId === 'ws-eol'
    if (workspace === 'ati') return p.workspaceId === 'ws-ati'
    return true
  })

  const wsMap = Object.fromEntries(mockWorkspaces.map((w) => [w.id, w]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        <p className="text-sm text-gray-500 mt-1">Portfolio view across both Jira workspaces</p>
      </div>

      <WorkspaceSelector value={workspace} onChange={setWorkspace} />

      <div className="grid gap-4 md:grid-cols-2">
        {filteredProjects.map((project) => {
          const epicCount = mockEpics.filter((e) => e.projectId === project.id).length
          const issueCount = mockIssues.filter((i) => i.projectId === project.id).length
          const openIssues = mockIssues.filter(
            (i) => i.projectId === project.id && i.status !== 'done'
          ).length
          const ws = wsMap[project.workspaceId]

          return (
            <div key={project.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {project.key} · {ws?.name}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    project.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : project.status === 'on-hold'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
              )}
              <div className="flex gap-4 text-sm text-gray-500">
                <span>{epicCount} epics</span>
                <span>{issueCount} issues</span>
                <span className="text-orange-600">{openIssues} open</span>
              </div>
            </div>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <p className="text-gray-500 text-sm">No projects for selected workspace.</p>
      )}
    </div>
  )
}
