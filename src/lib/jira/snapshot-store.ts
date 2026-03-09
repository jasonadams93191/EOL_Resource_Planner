// ============================================================
// Jira Snapshot Store
//
// In-memory cache using globalThis — persists across requests
// within the same Next.js serverless instance. Ephemeral:
// cleared on server restart / cold start. Acceptable for MVP.
//
// Scope: EOL and ATI workspaces only. READ-ONLY data.
// No Jira writes permitted anywhere in this module.
// ============================================================

import type { WorkspaceId } from '@/types/domain'
import type { RawJiraIssue } from './client'

export interface JiraSnapshot {
  issues: RawJiraIssue[]
  fetchedAt: string  // ISO timestamp
  counts: {
    total: number
    byProject: Record<string, number>
    byType: Record<string, number>
  }
}

// ── globalThis storage type ───────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __jiraSnapshots: Record<WorkspaceId, JiraSnapshot> | undefined
}

function getStore(): Record<WorkspaceId, JiraSnapshot> {
  if (!globalThis.__jiraSnapshots) {
    globalThis.__jiraSnapshots = {} as Record<WorkspaceId, JiraSnapshot>
  }
  return globalThis.__jiraSnapshots
}

// ── Public API ────────────────────────────────────────────────

export function saveSnapshot(ws: WorkspaceId, snapshot: JiraSnapshot): void {
  getStore()[ws] = snapshot
}

export function getSnapshot(ws: WorkspaceId): JiraSnapshot | null {
  return getStore()[ws] ?? null
}

export function getAllSnapshots(): Record<WorkspaceId, JiraSnapshot | null> {
  const store = getStore()
  return {
    'ws-eol': store['ws-eol'] ?? null,
    'ws-ati': store['ws-ati'] ?? null,
  }
}

export function clearSnapshots(): void {
  globalThis.__jiraSnapshots = {} as Record<WorkspaceId, JiraSnapshot>
}

// ── Summary helper ────────────────────────────────────────────

export interface SnapshotSummary {
  fetchedAt: string
  counts: JiraSnapshot['counts']
}

export function getSnapshotSummary(ws: WorkspaceId): SnapshotSummary | null {
  const snap = getSnapshot(ws)
  if (!snap) return null
  return { fetchedAt: snap.fetchedAt, counts: snap.counts }
}

// ── Build snapshot counts from raw issues ─────────────────────

export function buildSnapshotCounts(
  issues: RawJiraIssue[]
): JiraSnapshot['counts'] {
  const byProject: Record<string, number> = {}
  const byType: Record<string, number> = {}

  for (const issue of issues) {
    // Project key is derived from the issue key (e.g. "ATI-142" → "ATI")
    const projectKey = issue.key.split('-')[0]
    byProject[projectKey] = (byProject[projectKey] ?? 0) + 1

    const issueType = issue.fields.issuetype?.name ?? 'Unknown'
    byType[issueType] = (byType[issueType] ?? 0) + 1
  }

  return { total: issues.length, byProject, byType }
}
