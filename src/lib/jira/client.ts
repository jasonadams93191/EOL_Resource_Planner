// ============================================================
// Jira API Client — READ-ONLY
//
// Implements paginated JQL search against the Jira Cloud REST API v3.
// Scope is permanently limited to EOL and ATI projects only.
//
// READ-ONLY: this client has NO create/update/delete methods.
// Jira writeback is NEVER permitted from this application.
//
// Auth: HTTP Basic with base64(email:apiToken) — server-side only.
// ============================================================

import type { JiraWorkspaceConfig } from '@/lib/config'
import { getConfig } from '@/lib/config'

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotImplementedError'
  }
}

// ── Raw Jira shapes ───────────────────────────────────────────

export interface RawJiraUser {
  accountId: string
  displayName: string
  emailAddress?: string
}

export interface RawJiraIssueType {
  id: string
  name: string
  subtask: boolean
}

export interface RawJiraStatus {
  id: string
  name: string
  statusCategory: { id: number; key: string; name: string }
}

export interface RawJiraPriority {
  id: string
  name: string
}

export interface RawJiraParent {
  id: string
  key: string
  fields?: { summary?: string; issuetype?: RawJiraIssueType; status?: RawJiraStatus }
}

export interface RawJiraComponent { id: string; name: string }

export interface RawJiraFields {
  summary: string
  description?: string | { type: string; content?: unknown[] } | null
  issuetype: RawJiraIssueType
  status: RawJiraStatus
  priority?: RawJiraPriority | null
  assignee?: RawJiraUser | null
  reporter?: RawJiraUser | null
  labels: string[]
  components: RawJiraComponent[]
  parent?: RawJiraParent | null
  // Team-managed epic link (ATI workspace may use this custom field)
  customfield_10014?: string | null
  created: string   // ISO timestamp
  updated: string   // ISO timestamp
}

export interface RawJiraIssue {
  id: string
  key: string
  self: string      // full Jira REST URL for this issue
  fields: RawJiraFields
}

export interface RawJiraProject {
  id: string
  key: string
  name: string
}

// JQL search response page shape
interface JiraSearchPage {
  startAt: number
  maxResults: number
  total: number
  issues: RawJiraIssue[]
}

// ── Default fields to request ─────────────────────────────────

export const JIRA_ISSUE_FIELDS = [
  'summary',
  'description',
  'issuetype',
  'status',
  'priority',
  'assignee',
  'reporter',
  'labels',
  'components',
  'parent',
  'customfield_10014',
  'created',
  'updated',
]

// ── Client class ──────────────────────────────────────────────

export class JiraClient {
  private readonly baseUrl: string
  private readonly authHeader: string
  private readonly projectKey: string
  readonly workspaceId: string

  constructor(config: JiraWorkspaceConfig, workspaceId: string) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.projectKey = config.projectKey
    this.workspaceId = workspaceId
    // Basic auth: base64(email:apiToken) — server-side only, never sent to client
    const creds = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
    this.authHeader = `Basic ${creds}`
  }

  get isConfigured(): boolean {
    // 'Basic Og==' is base64('') — means empty credentials
    return Boolean(this.baseUrl && this.authHeader !== 'Basic Og==')
  }

  // ── READ-ONLY methods ─────────────────────────────────────────
  // This client intentionally has NO POST/PUT/DELETE methods.
  // Jira writeback is permanently prohibited.

  /**
   * Fetch all issues matching a JQL query, paginating automatically.
   * READ-ONLY: uses GET /rest/api/3/search only.
   */
  async fetchIssuesByJql(
    jql: string,
    fields: string[] = JIRA_ISSUE_FIELDS,
    maxPerPage = 100
  ): Promise<RawJiraIssue[]> {
    if (!this.isConfigured) {
      throw new NotImplementedError(
        `Jira client not configured for workspace ${this.workspaceId}. ` +
        `Set JIRA_${this.workspaceId === 'ws-eol' ? 'EOL' : 'ATI'}_BASE_URL / EMAIL / API_TOKEN.`
      )
    }

    const allIssues: RawJiraIssue[] = []
    let startAt = 0
    let total = Infinity

    while (startAt < total) {
      const url = new URL(`${this.baseUrl}/rest/api/3/search`)
      url.searchParams.set('jql', jql)
      url.searchParams.set('fields', fields.join(','))
      url.searchParams.set('maxResults', String(maxPerPage))
      url.searchParams.set('startAt', String(startAt))

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Jira API ${res.status} for workspace ${this.workspaceId}: ${body.slice(0, 200)}`
        )
      }

      const page = (await res.json()) as JiraSearchPage
      allIssues.push(...page.issues)
      total = page.total
      startAt += page.issues.length

      // Safety valve — stop if Jira returns an empty page (prevents infinite loop)
      if (page.issues.length === 0) break
    }

    return allIssues
  }

  /**
   * Fetch all issues for this client's configured project (scope-locked).
   */
  async fetchProjectIssues(): Promise<RawJiraIssue[]> {
    const jql = `project = "${this.projectKey}" ORDER BY created DESC`
    return this.fetchIssuesByJql(jql)
  }

  /**
   * Search for issues related to a text query within this project (evidence gathering).
   * Scope-locked to this client's projectKey.
   * READ-ONLY: GET only.
   */
  async searchRelated(
    textQuery: string,
    labels: string[] = [],
    maxResults = 10
  ): Promise<RawJiraIssue[]> {
    const parts: string[] = [`project = "${this.projectKey}"`]
    if (textQuery.trim()) {
      const safeQuery = textQuery.replace(/"/g, '\\"').substring(0, 80)
      parts.push(`summary ~ "${safeQuery}"`)
    }
    if (labels.length > 0) {
      const labelList = labels.slice(0, 5).map((l) => `"${l}"`).join(', ')
      parts.push(`label in (${labelList})`)
    }
    const jql = parts.join(' AND ') + ' ORDER BY updated DESC'
    return this.fetchIssuesByJql(jql, JIRA_ISSUE_FIELDS, maxResults)
  }

  // ── Legacy stubs (kept for compat with existing imports) ──────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchIssues(_projectKey: string): Promise<RawJiraIssue[]> {
    return this.fetchProjectIssues()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetchEpics(_projectKey: string): Promise<RawJiraIssue[]> {
    const jql = `project = "${this.projectKey}" AND issuetype = Epic ORDER BY created DESC`
    return this.fetchIssuesByJql(jql)
  }

  async fetchProjects(): Promise<RawJiraProject[]> {
    throw new NotImplementedError('Use fetchProjectIssues() instead')
  }
}

// ── Client factories (lazy, avoids env-var issues at import time) ──

export function createEolClient(): JiraClient {
  return new JiraClient(getConfig().eolJira, 'ws-eol')
}

export function createAtiClient(): JiraClient {
  return new JiraClient(getConfig().atiJira, 'ws-ati')
}

// Legacy singleton stubs — kept for existing imports in normalize.ts
export const eolJiraClient = new JiraClient(
  { baseUrl: '', email: '', apiToken: '', projectKey: 'EOL' },
  'ws-eol'
)
export const atiJiraClient = new JiraClient(
  { baseUrl: '', email: '', apiToken: '', projectKey: 'ATI' },
  'ws-ati'
)
