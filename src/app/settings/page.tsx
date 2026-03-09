import { AssumptionsPanel } from '@/components/AssumptionsPanel'
import { mockCapacityProfile } from '@/lib/mock/sample-data'

const jiraEnvVars = [
  { key: 'JIRA_EOL_BASE_URL', label: 'EOL Jira Base URL', workspace: 'EOL Tech Team' },
  { key: 'JIRA_EOL_EMAIL', label: 'EOL Jira Email', workspace: 'EOL Tech Team' },
  {
    key: 'JIRA_EOL_API_TOKEN',
    label: 'EOL Jira API Token',
    workspace: 'EOL Tech Team',
    secret: true,
  },
  { key: 'JIRA_EOL_PROJECT_KEY', label: 'EOL Project Key', workspace: 'EOL Tech Team' },
  { key: 'JIRA_ATI_BASE_URL', label: 'ATI Jira Base URL', workspace: 'AA/TKO Projects' },
  { key: 'JIRA_ATI_EMAIL', label: 'ATI Jira Email', workspace: 'AA/TKO Projects' },
  {
    key: 'JIRA_ATI_API_TOKEN',
    label: 'ATI Jira API Token',
    workspace: 'AA/TKO Projects',
    secret: true,
  },
  { key: 'JIRA_ATI_PROJECT_KEY', label: 'ATI Project Key (ATI)', workspace: 'AA/TKO Projects' },
]

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Capacity assumptions and Jira configuration</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <AssumptionsPanel profile={mockCapacityProfile} readOnly />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Jira Configuration</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set these in{' '}
          <code className="bg-gray-100 px-1 rounded">.env.local</code>. Values are server-side only
          and never exposed to the browser.
        </p>

        <div className="space-y-3">
          {['EOL Tech Team', 'AA/TKO Projects'].map((wsName) => (
            <div key={wsName}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {wsName}
              </p>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {jiraEnvVars
                      .filter((v) => v.workspace === wsName)
                      .map((v) => (
                        <tr key={v.key} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2.5 font-mono text-xs text-blue-700 bg-gray-50 w-64">
                            {v.key}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{v.label}</td>
                          <td className="px-4 py-2.5">
                            {v.secret ? (
                              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                                secret
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">string</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Wave 2: Live Jira connection test + project/workspace discovery UI
        </p>
      </div>
    </div>
  )
}
