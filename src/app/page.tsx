import { StatusCard } from '@/components/StatusCard'
import { mockProjects, mockIssues, mockResources, mockEpics } from '@/lib/mock/sample-data'

export default function OverviewPage() {
  const activeProjects = mockProjects.filter((p) => p.status === 'active').length
  const openIssues = mockIssues.filter((i) => i.status !== 'done').length
  const inProgressEpics = mockEpics.filter((e) => e.status === 'in-progress').length

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
          value={mockResources.length}
          subtitle="shared resource pool"
          status="neutral"
          href="/settings"
        />
        <StatusCard
          title="In-Progress Epics"
          value={inProgressEpics}
          status="active"
          href="/timeline"
        />
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-5">
        <h3 className="font-medium text-blue-900 mb-2">About This Tool</h3>
        <p className="text-sm text-blue-800">
          This internal planner combines work from <strong>EOL Tech Team</strong> and{' '}
          <strong>AA/TKO Projects</strong> into a single shared capacity model for a 4-person team.
          Use it to estimate effort, view delivery timelines, and model staffing scenarios.
        </p>
        <p className="text-xs text-blue-600 mt-3">
          Wave 1 — All data is mock. Wave 2 will connect live Jira workspaces.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { href: '/projects', label: 'View Projects', desc: 'Browse work by workspace' },
          { href: '/timeline', label: 'View Timeline', desc: 'Shared resource workload' },
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
