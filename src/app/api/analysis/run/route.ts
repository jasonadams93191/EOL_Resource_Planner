// ============================================================
// POST /api/analysis/run
//
// Pipeline:
//   1. Load Jira snapshot (required)
//   2. Import snapshot → planning model
//   3. Apply deterministic enhancement layer (Boss-approved templates)
//   4. For low-confidence initiatives: run Anthropic LLM (gaps only)
//   5. Merge AI suggestions into planning model
//   6. Save AnalysisResult to analysis-store
//
// READ-ONLY — no Jira writes. LLM only fills gaps.
// Scope locked to EOL + ATI projects.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllSnapshots } from '@/lib/jira/snapshot-store'
import { importPlanningFromJiraSnapshot } from '@/lib/jira/import-snapshot'
import { applyEnhancements } from '@/lib/planning/enhancements'
import {
  runLLMAnalysis,
  needsLLMEnrichment,
  buildInitiativePack,
  llmSuggestionToWorkItem,
} from '@/lib/llm/anthropic'
import { saveAnalysis } from '@/lib/analysis/analysis-store'
import { getLLMConfig } from '@/lib/config'
import type { AnalysisResult, InitiativeAnalysis, WorkItemAnalysis, EvidenceRef } from '@/types/analysis'
import type { PlanningProject } from '@/types/planning'

// ── Cache signature ───────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __analysisCache: Map<string, InitiativeAnalysis> | undefined
}

function getCache(): Map<string, InitiativeAnalysis> {
  if (!globalThis.__analysisCache) globalThis.__analysisCache = new Map()
  return globalThis.__analysisCache
}

function cacheKey(projectId: string, latestUpdated: string, model: string): string {
  return `${projectId}:${latestUpdated}:${model}`
}

function getLatestUpdated(project: PlanningProject): string {
  let latest = '1970-01-01'
  for (const epic of project.epics) {
    for (const wi of epic.workItems) {
      const upd = wi.jira?.updatedAt ?? ''
      if (upd > latest) latest = upd
    }
  }
  return latest
}

// ── Work item → WorkItemAnalysis ─────────────────────────────

function wiToAnalysis(wi: { id: string; title: string; estimatedHours: number; confidence: string; primarySkill?: string; requiredSkillLevel?: number; candidateAssigneeIds?: string[]; aiSuggested?: boolean }): WorkItemAnalysis {
  return {
    workItemId: wi.id,
    title: wi.title,
    estimatedHours: wi.estimatedHours,
    confidence: wi.confidence as 'low' | 'medium' | 'high',
    primarySkill: wi.primarySkill,
    requiredSkillLevel: wi.requiredSkillLevel,
    candidateAssigneeIds: wi.candidateAssigneeIds,
    evidenceRefs: [],
    isSuggested: wi.aiSuggested ?? false,
  }
}

// ── Main handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const forceRecompute = searchParams.get('force') === 'true'

  const snapshots = getAllSnapshots()
  if (!snapshots['ws-eol'] && !snapshots['ws-ati']) {
    return NextResponse.json(
      { error: 'No Jira snapshot found. Run POST /api/jira/sync first.' },
      { status: 400 }
    )
  }

  const cfg = getLLMConfig()
  const cache = getCache()

  // Import snapshot → planning model
  const { projects: imported } = importPlanningFromJiraSnapshot(
    snapshots['ws-eol'],
    snapshots['ws-ati']
  )

  // Apply deterministic enhancement layer
  const enhanced = applyEnhancements(imported)

  const analyzedAt = new Date().toISOString()
  const initiatives: InitiativeAnalysis[] = []
  const errors: string[] = []

  let analyzed = 0
  let tasksSuggested = 0

  for (const project of enhanced) {
    if (project.priority === 'low') continue
    if (analyzed >= cfg.maxInitiativesPerRun) break

    const latestUpdated = getLatestUpdated(project)
    const key = cacheKey(project.id, latestUpdated, cfg.model)

    // Use cache if available and not forced
    if (!forceRecompute && cache.has(key)) {
      initiatives.push(cache.get(key)!)
      analyzed++
      continue
    }

    // Build work item analyses from enhanced model
    const workItemAnalyses: WorkItemAnalysis[] = enhanced
      .find((p) => p.id === project.id)!
      .epics.flatMap((e) => e.workItems.map(wiToAnalysis))

    // Build initiative-level evidence refs from Jira data
    const evidenceRefs: EvidenceRef[] = project.epics.flatMap((epic) =>
      epic.workItems
        .filter((wi) => wi.jira?.issueKey)
        .map((wi): EvidenceRef => ({
          id: `ev-${wi.jira!.issueKey!.toLowerCase()}`,
          sourceType: 'jira',
          title: wi.jira!.summary ?? wi.title,
          issueKey: wi.jira!.issueKey,
          whyRelevant: `Linked Jira issue for epic "${epic.title}"`,
          retrievedAt: analyzedAt,
          url: wi.jira!.url,
        }))
    )

    // Run LLM for gaps only
    if (cfg.enabled && needsLLMEnrichment(project)) {
      try {
        const pack = buildInitiativePack(project, cfg.maxCharsPerInitiative)
        const suggestions = await runLLMAnalysis(pack)

        // Find the first epic with few items to inject suggestions into
        const targetEpic = project.epics.find((e) => e.workItems.length < 3) ?? project.epics[0]
        if (targetEpic) {
          suggestions.forEach((suggestion, idx) => {
            const wi = llmSuggestionToWorkItem(suggestion, targetEpic.id, idx)
            workItemAnalyses.push(wiToAnalysis(wi))
            tasksSuggested++
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`LLM error for ${project.id}: ${msg}`)
      }
    }

    const initiativeAnalysis: InitiativeAnalysis = {
      projectId: project.id,
      analyzedAt,
      workItemAnalyses,
      evidenceRefs,
    }

    cache.set(key, initiativeAnalysis)
    initiatives.push(initiativeAnalysis)
    analyzed++
  }

  const result: AnalysisResult = { analyzedAt, initiatives }
  saveAnalysis(result)

  return NextResponse.json({
    success: true,
    analyzedAt,
    initiativesAnalyzed: initiatives.length,
    tasksSuggested,
    llmEnabled: cfg.enabled,
    model: cfg.model,
    errors: errors.length > 0 ? errors : undefined,
  })
}
