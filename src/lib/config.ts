// ============================================================
// Server-side configuration — never expose to client
// TODO Wave 2: add credential validation and connection testing
// ============================================================

export interface JiraWorkspaceConfig {
  baseUrl: string
  email: string
  apiToken: string
  projectKey: string
}

// Two fixed workspaces — EOL Tech Team and AA/TKO Projects (ATI).
// These keys map directly to WorkspaceId in domain.ts.
export interface AppConfig {
  eolJira: JiraWorkspaceConfig // ws-eol
  atiJira: JiraWorkspaceConfig // ws-ati
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value ?? ''
}

export function getConfig(): AppConfig {
  return {
    eolJira: {
      baseUrl: requireEnv('JIRA_EOL_BASE_URL'),
      email: requireEnv('JIRA_EOL_EMAIL'),
      apiToken: requireEnv('JIRA_EOL_API_TOKEN'),
      projectKey: requireEnv('JIRA_EOL_PROJECT_KEY'),
    },
    atiJira: {
      baseUrl: requireEnv('JIRA_ATI_BASE_URL'),
      email: requireEnv('JIRA_ATI_EMAIL'),
      apiToken: requireEnv('JIRA_ATI_API_TOKEN'),
      projectKey: requireEnv('JIRA_ATI_PROJECT_KEY'),
    },
  }
}
