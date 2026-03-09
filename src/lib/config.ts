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

export interface AppConfig {
  eolJira: JiraWorkspaceConfig
  aaJira: JiraWorkspaceConfig
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
    aaJira: {
      baseUrl: requireEnv('JIRA_AA_BASE_URL'),
      email: requireEnv('JIRA_AA_EMAIL'),
      apiToken: requireEnv('JIRA_AA_API_TOKEN'),
      projectKey: requireEnv('JIRA_AA_PROJECT_KEY'),
    },
  }
}
