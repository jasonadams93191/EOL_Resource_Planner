// ============================================================
// Jira Snapshot Store
//
// Dual-layer persistence:
//   - Vercel KV (Redis) when KV_REST_API_URL + KV_REST_API_TOKEN are set
//   - globalThis in-memory fallback for local dev
//
// KV keys: "jira:snapshot:ws-eol" and "jira:snapshot:ws-ati"
// TTL: 24 hours (snapshots expire to force re-sync)
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

// ── KV detection ──────────────────────────────────────────────

function isKvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

function kvKey(ws: WorkspaceId): string {
  return `jira:snapshot:${ws}`
}

const KV_TTL_SECONDS = 60 * 60 * 24 // 24 hours

// ── In-memory fallback ────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __jiraSnapshots: Record<WorkspaceId, JiraSnapshot> | undefined
}

function getMemStore(): Record<WorkspaceId, JiraSnapshot> {
  if (!globalThis.__jiraSnapshots) {
    globalThis.__jiraSnapshots = {} as Record<WorkspaceId, JiraSnapshot>
  }
  return globalThis.__jiraSnapshots
}

// ── Public API (async for KV compatibility) ───────────────────

export async function saveSnapshotAsync(ws: WorkspaceId, snapshot: JiraSnapshot): Promise<void> {
  if (isKvConfigured()) {
    const { kv } = await import('@vercel/kv')
    await kv.set(kvKey(ws), snapshot, { ex: KV_TTL_SECONDS })
  } else {
    getMemStore()[ws] = snapshot
  }
}

export async function getSnapshotAsync(ws: WorkspaceId): Promise<JiraSnapshot | null> {
  if (isKvConfigured()) {
    const { kv } = await import('@vercel/kv')
    return (await kv.get<JiraSnapshot>(kvKey(ws))) ?? null
  }
  return getMemStore()[ws] ?? null
}

export async function getAllSnapshotsAsync(): Promise<Record<WorkspaceId, JiraSnapshot | null>> {
  return {
    'ws-eol': await getSnapshotAsync('ws-eol'),
    'ws-ati': await getSnapshotAsync('ws-ati'),
  }
}

// ── Sync wrappers (kept for the sync route) ───────────────────

/** Sync save — used by sync route (must await at call site) */
export function saveSnapshot(ws: WorkspaceId, snapshot: JiraSnapshot): void {
  // Fire-and-forget when KV is configured; immediate when in-memory
  if (isKvConfigured()) {
    void saveSnapshotAsync(ws, snapshot)
  } else {
    getMemStore()[ws] = snapshot
  }
}

export function getSnapshot(ws: WorkspaceId): JiraSnapshot | null {
  // Sync read only works for in-memory — callers on Vercel should use getSnapshotAsync
  if (isKvConfigured()) {
    return null // force callers to use async path
  }
  return getMemStore()[ws] ?? null
}

export function getAllSnapshots(): Record<WorkspaceId, JiraSnapshot | null> {
  if (isKvConfigured()) {
    return { 'ws-eol': null, 'ws-ati': null } // force async path
  }
  const store = getMemStore()
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
    const projectKey = issue.key.split('-')[0]
    byProject[projectKey] = (byProject[projectKey] ?? 0) + 1

    const issueType = issue.fields.issuetype?.name ?? 'Unknown'
    byType[issueType] = (byType[issueType] ?? 0) + 1
  }

  return { total: issues.length, byProject, byType }
}
