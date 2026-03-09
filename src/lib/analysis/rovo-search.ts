// ============================================================
// Rovo-style Evidence Search
//
// Note: Uses standard Jira JQL Search API as a Rovo-style proxy.
// The real Atlassian Rovo Search API requires additional product
// access beyond a basic Jira Cloud subscription. This module
// delivers equivalent functionality using JQL fulltext search.
//
// For each initiative, we search for related issues by:
//   - Keyword terms extracted from the project name
//   - Labels present on the initiative's work items
//
// READ-ONLY — uses GET /rest/api/3/search only.
// No Jira writes permitted.
// ============================================================

import type { JiraClient } from '@/lib/jira/client'
import type { PlanningProject } from '@/types/planning'
import type { EvidenceRef } from '@/types/analysis'

// ── Extract search terms from initiative ──────────────────────

function extractKeywords(project: PlanningProject): string[] {
  // Use first 2 words of project name (skip common stop words)
  const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'for', 'and', 'or', 'to', 'is'])
  const words = project.name
    .split(/[\s\/\-_]+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  return words.slice(0, 3)
}

function extractLabels(project: PlanningProject): string[] {
  const labelSet = new Set<string>()
  for (const epic of project.epics) {
    for (const item of epic.workItems) {
      for (const label of item.jira?.labels ?? []) {
        if (label.length > 1) labelSet.add(label)
      }
    }
  }
  return Array.from(labelSet).slice(0, 5)
}

// ── Build snippet from raw description ───────────────────────

function extractSnippet(
  description: string | { type: string; content?: unknown[] } | null | undefined
): string | undefined {
  if (!description) return undefined
  if (typeof description === 'string') return description.slice(0, 200) || undefined
  return undefined  // structured ADF content — skip for MVP
}

// ── Main search function ──────────────────────────────────────

/**
 * Search for Jira issues related to an initiative and return
 * them as EvidenceRef objects for the analysis model.
 *
 * Scope-locked: only searches the projectKeys present in the
 * initiative's work items (EOL or ATI).
 */
export async function searchRelatedEvidence(
  jiraClient: JiraClient,
  initiative: PlanningProject,
  maxResults = 10
): Promise<EvidenceRef[]> {
  if (!jiraClient.isConfigured) return []

  const keywords = extractKeywords(initiative)
  const labels = extractLabels(initiative)

  if (keywords.length === 0 && labels.length === 0) return []

  try {
    const issues = await jiraClient.searchRelated(
      keywords.join(' '),
      labels,
      maxResults
    )

    const retrievedAt = new Date().toISOString()

    return issues.map((issue): EvidenceRef => ({
      id: `ev-${issue.key.toLowerCase()}`,
      sourceType: 'jira',
      title: issue.fields.summary,
      issueKey: issue.key,
      snippet: extractSnippet(issue.fields.description),
      whyRelevant: buildWhyRelevant(issue.fields.summary, keywords, labels, issue.fields.labels ?? []),
      retrievedAt,
      url: issue.self.replace(/\/rest\/api\/3\/issue\/\d+$/, '') + '/browse/' + issue.key,
    }))
  } catch {
    // Evidence is best-effort — don't fail the whole analysis if search fails
    return []
  }
}

function buildWhyRelevant(
  summary: string,
  keywords: string[],
  searchLabels: string[],
  issueLabels: string[]
): string {
  const matchedKeywords = keywords.filter((kw) =>
    summary.toLowerCase().includes(kw)
  )
  const matchedLabels = searchLabels.filter((sl) =>
    issueLabels.some((il) => il.toLowerCase() === sl.toLowerCase())
  )

  const parts: string[] = []
  if (matchedKeywords.length > 0) parts.push(`summary matches "${matchedKeywords.join(', ')}"`)
  if (matchedLabels.length > 0) parts.push(`label matches "${matchedLabels.join(', ')}"`)
  return parts.length > 0 ? parts.join('; ') : 'related by JQL search'
}
