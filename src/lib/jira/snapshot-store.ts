// ============================================================
// Jira Snapshot Store
//
// Dual-layer persistence:
//   - Neon (serverless Postgres) when DATABASE_URL is set
//   - globalThis in-memory fallback for local dev
//
// Table: jira_snapshots(workspace_id TEXT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ)
// Created automatically on first write.
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

// ── Neon detection ────────────────────────────────────────────

function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

async function getNeonSql() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.DATABASE_URL!)
}

async function ensureTable(sql: Awaited<ReturnType<typeof getNeonSql>>) {
  await sql`
    CREATE TABLE IF NOT EXISTS jira_snapshots (
      workspace_id TEXT PRIMARY KEY,
      data         JSONB NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

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

// ── Public API (async) ────────────────────────────────────────

export async function saveSnapshotAsync(ws: WorkspaceId, snapshot: JiraSnapshot): Promise<void> {
  if (isNeonConfigured()) {
    const sql = await getNeonSql()
    await ensureTable(sql)
    await sql`
      INSERT INTO jira_snapshots (workspace_id, data, updated_at)
      VALUES (${ws}, ${JSON.stringify(snapshot)}::jsonb, NOW())
      ON CONFLICT (workspace_id) DO UPDATE
        SET data = EXCLUDED.data,
            updated_at = EXCLUDED.updated_at
    `
  } else {
    getMemStore()[ws] = snapshot
  }
}

export async function getSnapshotAsync(ws: WorkspaceId): Promise<JiraSnapshot | null> {
  if (isNeonConfigured()) {
    const sql = await getNeonSql()
    await ensureTable(sql)
    const rows = await sql`
      SELECT data FROM jira_snapshots WHERE workspace_id = ${ws}
    `
    return rows.length > 0 ? (rows[0].data as JiraSnapshot) : null
  }
  return getMemStore()[ws] ?? null
}

export async function getAllSnapshotsAsync(): Promise<Record<WorkspaceId, JiraSnapshot | null>> {
  return {
    'ws-eol': await getSnapshotAsync('ws-eol'),
    'ws-ati': await getSnapshotAsync('ws-ati'),
  }
}

// ── Sync wrappers (in-memory only) ───────────────────────────

export function saveSnapshot(ws: WorkspaceId, snapshot: JiraSnapshot): void {
  if (isNeonConfigured()) {
    void saveSnapshotAsync(ws, snapshot)
  } else {
    getMemStore()[ws] = snapshot
  }
}

export function getSnapshot(ws: WorkspaceId): JiraSnapshot | null {
  if (isNeonConfigured()) return null // force async path on Vercel
  return getMemStore()[ws] ?? null
}

export function getAllSnapshots(): Record<WorkspaceId, JiraSnapshot | null> {
  if (isNeonConfigured()) return { 'ws-eol': null, 'ws-ati': null }
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
