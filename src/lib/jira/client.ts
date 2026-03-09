// ============================================================
// Jira API Client Stub
// TODO Wave 2: implement live Jira REST API calls using config credentials
// ============================================================
import type { JiraWorkspaceConfig } from '@/lib/config'

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotImplementedError'
  }
}

// Raw Jira API response shapes (to be expanded in Wave 2)
export interface RawJiraIssue {
  id: string
  key: string
  fields: Record<string, unknown>
}

export interface RawJiraProject {
  id: string
  key: string
  name: string
}

export class JiraClient {
  private config: JiraWorkspaceConfig
  private workspaceId: string

  constructor(config: JiraWorkspaceConfig, workspaceId: string) {
    this.config = config
    this.workspaceId = workspaceId
  }

  // TODO Wave 2: implement using fetch + Basic auth (email:apiToken base64)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchIssues(_projectKey: string): Promise<RawJiraIssue[]> {
    throw new NotImplementedError(
      `TODO Wave 2: implement live Jira fetchIssues for workspace ${this.workspaceId} at ${this.config.baseUrl}`
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchEpics(_projectKey: string): Promise<RawJiraIssue[]> {
    throw new NotImplementedError(
      `TODO Wave 2: implement live Jira fetchEpics for workspace ${this.workspaceId}`
    )
  }

  async fetchProjects(): Promise<RawJiraProject[]> {
    throw new NotImplementedError(
      `TODO Wave 2: implement live Jira fetchProjects for workspace ${this.workspaceId}`
    )
  }
}

// Pre-configured client instances (config loaded server-side only)
// TODO Wave 2: initialize with real config from getConfig()
export const eolJiraClient = new JiraClient(
  { baseUrl: '', email: '', apiToken: '', projectKey: 'EOL' },
  'ws-eol'
)

export const aaJiraClient = new JiraClient(
  { baseUrl: '', email: '', apiToken: '', projectKey: 'AA' },
  'ws-aa'
)
