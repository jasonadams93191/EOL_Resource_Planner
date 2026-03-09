// ============================================================
// POST /api/jira/sync
//
// Fetches all issues from configured Jira workspaces (EOL + ATI)
// and saves them to the in-memory snapshot store.
//
// READ-ONLY — uses GET /rest/api/3/search only.
// Scope locked to EOL and ATI projects.
// No Jira writes permitted.
// ============================================================

import { NextResponse } from 'next/server'
import { createEolClient, createAtiClient } from '@/lib/jira/client'
import { saveSnapshotAsync, getAllSnapshotsAsync, buildSnapshotCounts } from '@/lib/jira/snapshot-store'

export async function GET() {
  const snapshots = await getAllSnapshotsAsync()
  return NextResponse.json({
    neonConfigured: Boolean(process.env.DATABASE_URL),
    'ws-eol': snapshots['ws-eol']
      ? { fetchedAt: snapshots['ws-eol'].fetchedAt, counts: snapshots['ws-eol'].counts }
      : null,
    'ws-ati': snapshots['ws-ati']
      ? { fetchedAt: snapshots['ws-ati'].fetchedAt, counts: snapshots['ws-ati'].counts }
      : null,
  })
}

export async function POST() {
  const results: Record<string, unknown> = {}
  const configured: string[] = []
  const errors: string[] = []

  const eolClient = createEolClient()
  const atiClient = createAtiClient()

  // ── EOL workspace ─────────────────────────────────────────────
  if (eolClient.isConfigured) {
    try {
      const issues = await eolClient.fetchProjectIssues()
      const counts = buildSnapshotCounts(issues)
      await saveSnapshotAsync('ws-eol', {
        issues,
        fetchedAt: new Date().toISOString(),
        counts,
      })
      configured.push('eol')
      results.eol = { count: issues.length, counts }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`EOL: ${msg}`)
      results.eol = { error: msg }
    }
  } else {
    results.eol = null
  }

  // ── ATI workspace ─────────────────────────────────────────────
  if (atiClient.isConfigured) {
    try {
      const issues = await atiClient.fetchProjectIssues()
      const counts = buildSnapshotCounts(issues)
      await saveSnapshotAsync('ws-ati', {
        issues,
        fetchedAt: new Date().toISOString(),
        counts,
      })
      configured.push('ati')
      results.ati = { count: issues.length, counts }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`ATI: ${msg}`)
      results.ati = { error: msg }
    }
  } else {
    results.ati = null
  }

  // ── Response ──────────────────────────────────────────────────
  if (configured.length === 0 && errors.length === 0) {
    return NextResponse.json(
      { error: 'No Jira credentials configured. Set JIRA_EOL_* and JIRA_ATI_* env vars.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: errors.length === 0,
    fetchedAt: new Date().toISOString(),
    configured,
    errors: errors.length > 0 ? errors : undefined,
    workspaces: results,
  })
}
