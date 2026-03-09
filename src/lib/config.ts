// ============================================================
// Server-side configuration — never expose to client
//
// Supports two env var layouts:
//
// Layout A (shared Jira instance — EOL + ATI in same org):
//   JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
//   JIRA_PROJECT_KEYS=EOL,ATI (optional, defaults to EOL,ATI)
//
// Layout B (separate credentials per workspace — legacy):
//   JIRA_EOL_BASE_URL / JIRA_EOL_EMAIL / JIRA_EOL_API_TOKEN / JIRA_EOL_PROJECT_KEY
//   JIRA_ATI_BASE_URL / JIRA_ATI_EMAIL / JIRA_ATI_API_TOKEN / JIRA_ATI_PROJECT_KEY
//
// Layout A takes precedence when JIRA_BASE_URL is set.
// Jira writeback is permanently disabled (JIRA_WRITE_ENABLED=false default).
// ============================================================

export interface JiraWorkspaceConfig {
  baseUrl: string
  email: string
  apiToken: string
  projectKey: string
}

export interface AppConfig {
  eolJira: JiraWorkspaceConfig // ws-eol
  atiJira: JiraWorkspaceConfig // ws-ati
}

function env(key: string): string {
  return process.env[key] ?? ''
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value ?? ''
}

export function getConfig(): AppConfig {
  const sharedBaseUrl = env('JIRA_BASE_URL')
  const sharedEmail   = env('JIRA_EMAIL')
  const sharedToken   = env('JIRA_API_TOKEN')

  if (sharedBaseUrl) {
    // Layout A — shared Jira instance (EOL + ATI same org)
    return {
      eolJira: {
        baseUrl: sharedBaseUrl,
        email: sharedEmail,
        apiToken: sharedToken,
        projectKey: env('JIRA_EOL_PROJECT_KEY') || 'EOL',
      },
      atiJira: {
        baseUrl: sharedBaseUrl,
        email: sharedEmail,
        apiToken: sharedToken,
        projectKey: env('JIRA_ATI_PROJECT_KEY') || 'ATI',
      },
    }
  }

  // Layout B — separate credentials per workspace (legacy)
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

// ── LLM Configuration ─────────────────────────────────────────

export interface LLMConfig {
  enabled: boolean
  provider: string
  model: string
  maxInitiativesPerRun: number
  maxCharsPerInitiative: number
}

export function getLLMConfig(): LLMConfig {
  return {
    enabled: env('LLM_ENABLE') !== 'false',
    provider: env('LLM_PROVIDER') || 'anthropic',
    // Default to Haiku for cost-efficiency; override with ANTHROPIC_MODEL
    model: env('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001',
    maxInitiativesPerRun: parseInt(env('LLM_MAX_INITIATIVES_PER_RUN') || '20', 10),
    maxCharsPerInitiative: parseInt(env('LLM_MAX_CHARS_PER_INITIATIVE') || '20000', 10),
  }
}
