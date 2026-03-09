// ============================================================
// POST /api/jira/sync/initiative
//
// Re-syncs a single planning initiative from Jira.
// Fetches only the issues matching that initiative's grouping rule,
// then merges them into the existing snapshot (add/update, keep others).
//
// Body: { initiativeId: string }
//
// Returns: { success, fetched, updated, added, fetchedAt }
//
// READ-ONLY — no Jira writes. Scope locked to EOL + ATI.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createEolClient, createAtiClient } from '@/lib/jira/client'
import { getConfig } from '@/lib/config'
import { INITIATIVE_GROUPING_RULES } from '@/lib/jira/grouping-rules'
import { getSnapshotAsync, saveSnapshotAsync, buildSnapshotCounts } from '@/lib/jira/snapshot-store'
import type { RawJiraIssue } from '@/lib/jira/client'

function buildJql(projectKey: string, rule: (typeof INITIATIVE_GROUPING_RULES)[number]): string {
  const jqlParts: string[] = [`project = "${projectKey}"`]
  const orConditions: string[] = []

  if (rule.matchLabels && rule.matchLabels.length > 0) {
    // Jira Cloud uses `labels` (plural) not `label`
    const labelList = rule.matchLabels.map((l) => `"${l}"`).join(', ')
    orConditions.push(`labels IN (${labelList})`)
  }

  if (rule.matchSummaryPatterns && rule.matchSummaryPatterns.length > 0) {
    // Use first pattern source, strip regex metacharacters for plain-text JQL search
    const pattern = rule.matchSummaryPatterns[0].source
      .replace(/[/\\^$*+?.()|[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 40)
    if (pattern) orConditions.push(`summary ~ "${pattern}"`)
  }

  if (rule.matchEpicKeys && rule.matchEpicKeys.length > 0) {
    // Use `parent` only — "Epic Link" is deprecated in Jira Cloud next-gen projects
    const epicKeyList = rule.matchEpicKeys.map((k) => `"${k}"`).join(', ')
    orConditions.push(`parent IN (${epicKeyList})`)
  }

  if (orConditions.length > 0) {
    jqlParts.push(`(${orConditions.join(' OR ')})`)
  }

  return jqlParts.join(' AND ') + ' ORDER BY updated DESC'
}

export async function POST(request: NextRequest) {
  let body: { initiativeId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { initiativeId } = body
  if (!initiativeId) {
    return NextResponse.json({ error: 'initiativeId is required' }, { status: 400 })
  }

  const rule = INITIATIVE_GROUPING_RULES.find((r) => r.id === initiativeId)
  if (!rule) {
    return NextResponse.json({ error: `No grouping rule found for initiative: ${initiativeId}` }, { status: 404 })
  }

  const fetchedAt = new Date().toISOString()
  const errors: string[] = []
  const newIssuesByKey = new Map<string, RawJiraIssue>()

  const config = getConfig()

  // ── Fetch from EOL workspace ─────────────────────────────────
  if (rule.matchProjectKeys.includes('EOL')) {
    const client = createEolClient()
    if (client.isConfigured) {
      try {
        const jql = buildJql(config.eolJira.projectKey, rule)
        const issues = await client.fetchIssuesByJql(jql)
        for (const issue of issues) newIssuesByKey.set(issue.key, issue)
      } catch (err) {
        errors.push(`EOL: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  // ── Fetch from ATI workspace ─────────────────────────────────
  if (rule.matchProjectKeys.includes('ATI')) {
    const client = createAtiClient()
    if (client.isConfigured) {
      try {
        const jql = buildJql(config.atiJira.projectKey, rule)
        const issues = await client.fetchIssuesByJql(jql)
        for (const issue of issues) newIssuesByKey.set(issue.key, issue)
      } catch (err) {
        errors.push(`ATI: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  if (newIssuesByKey.size === 0 && errors.length > 0) {
    return NextResponse.json({ error: 'Sync failed', errors }, { status: 400 })
  }

  // ── Merge into existing snapshots ────────────────────────────
  let totalUpdated = 0
  let totalAdded = 0

  try {
    for (const ws of ['ws-eol', 'ws-ati'] as const) {
      const projectKey = ws === 'ws-eol' ? 'EOL' : 'ATI'
      const relevant = Array.from(newIssuesByKey.values()).filter(
        (i) => i.key.startsWith(projectKey + '-')
      )
      if (relevant.length === 0) continue

      const existing = await getSnapshotAsync(ws)
      const issueMap = new Map<string, RawJiraIssue>(
        (existing?.issues ?? []).map((i) => [i.key, i])
      )

      for (const issue of relevant) {
        if (issueMap.has(issue.key)) {
          totalUpdated++
        } else {
          totalAdded++
        }
        issueMap.set(issue.key, issue)
      }

      const mergedIssues = Array.from(issueMap.values())
      await saveSnapshotAsync(ws, {
        issues: mergedIssues,
        fetchedAt,
        counts: buildSnapshotCounts(mergedIssues),
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Snapshot merge failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    initiativeId,
    fetched: newIssuesByKey.size,
    updated: totalUpdated,
    added: totalAdded,
    fetchedAt,
    errors: errors.length > 0 ? errors : undefined,
  })
}
