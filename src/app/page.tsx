import { StatusCard } from '@/components/StatusCard'
import { mockProjects, mockIssues, mockEpics, mockCapacityProfile } from '@/lib/mock/sample-data'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS } from '@/lib/mock/team-data'
import { buildSprintPlan } from '@/lib/planning/sprint-engine'

export default function OverviewPage() {
  const activeProjects = mockProjects.filter((p) => p.status === 'active').length
  const openIssues = mockIssues.filter((i) => i.status !== 'done').length
  const inProgressEpics = mockEpics.filter((e) => e.status === 'in-progress').length

  // Planning summary
  const sprintPlan = buildSprintPlan(mockAllPlanningProjects, mockCapacityProfile, '2026-03-09')
  const totalPlanningItems = mockAllPlanningProjects.reduce(
    (s, p) => s + p.epics.reduce((se, e) => se + e.workItems.length, 0),
    0
  )
  const activeTeamMembers = TEAM_MEMBERS.filter((m) => m.isActive).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
        <p className="text-sm text-gray-500 mt-1">
          Shared capacity model — EOL Tech Team + AA/TKO Projects
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard title="Active Projects" value={activeProjects} status="active" href="/projects" />
        <StatusCard
          title="Open Issues"
          value={openIssues}
          subtitle="across both workspaces"
          status="neutral"
          href="/projects"
        />
        <StatusCard
          title="Team Members"
          value={activeTeamMembers}
          subtitle="active in sprint model"
          status="neutral"
          href="/planning"
        />
        <StatusCard
          title="In-Progress Epics"
          value={inProgressEpics}
          status="active"
          href="/timeline"
        />
      </div>

      {/* Planning summary card */}
      <div className="rounded-lg border border-violet-200 bg-violet-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-violet-900 mb-1">Planning Engine — Phase 1</h3>
            <p className="text-sm text-violet-800">
              {mockAllPlanningProjects.length} planning projects · {totalPlanningItems} work items across{' '}
              {sprintPlan.totalSprints} sprints · {activeTeamMembers} team members
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {mockAllPlanningProjects.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded bg-white border border-violet-200 px-2 py-0.5 text-xs text-violet-700"
                >
                  {p.name}
                  <span className="text-violet-400">·</span>
                  <span className="text-violet-500">{p.portfolio}</span>
                </span>
              ))}
            </div>
          </div>
          <a
            href="/planning"
            className="shrink-0 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors"
          >
            View Planning
          </a>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-5">
        <h3 className="font-medium text-blue-900 mb-2">About This Tool</h3>
        <p className="text-sm text-blue-800">
          This internal planner combines work from <strong>EOL Tech Team</strong> and{' '}
          <strong>AA/TKO Projects</strong> into a single shared capacity model for a 4-person team.
          Use it to estimate effort, view delivery timelines, and model staffing scenarios.
        </p>
        <p className="text-xs text-blue-600 mt-3">
          Phase 1 — All data is mock. Wave 2 will connect live Jira workspaces.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { href: '/planning', label: 'View Planning', desc: 'Sprint plan + work items' },
          { href: '/projects', label: 'View Projects', desc: 'Browse work by workspace' },
          { href: '/scenarios', label: 'Run Scenarios', desc: 'Model staffing changes' },
          { href: '/settings', label: 'Settings', desc: 'Capacity assumptions' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <p className="font-medium text-gray-900 text-sm">{link.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
