// ============================================================
// GET /api/analysis/status
//
// Returns summary of the latest analysis + enhancement run.
// READ-ONLY — no Jira writes.
// ============================================================

import { NextResponse } from 'next/server'
import { getAnalysis, getEnhancementStats } from '@/lib/analysis/analysis-store'
import { getLLMConfig } from '@/lib/config'

export function GET() {
  const result = getAnalysis()
  const enhancementStats = getEnhancementStats()
  const cfg = getLLMConfig()

  const tasksSuggested = result
    ? result.initiatives.reduce(
        (s, i) => s + i.workItemAnalyses.filter((wi) => wi.isSuggested).length,
        0
      )
    : 0

  const tasksRefined = result
    ? result.initiatives.reduce(
        (s, i) => s + i.workItemAnalyses.filter((wi) => !wi.isSuggested).length,
        0
      )
    : 0

  const totalTasksAdded = enhancementStats?.reduce((s, e) => s + e.tasksAdded, 0) ?? 0
  const totalFieldsUpdated = enhancementStats?.reduce((s, e) => s + e.fieldsUpdated, 0) ?? 0
  const totalOverridesPreserved = enhancementStats?.reduce((s, e) => s + e.overridesPreserved, 0) ?? 0
  const lastEnhancedAt = enhancementStats?.[0]?.lastEnhancedAt ?? null

  return NextResponse.json({
    lastAnalyzedAt: result?.analyzedAt ?? null,
    lastEnhancedAt,
    initiativesAnalyzed: result?.initiatives.length ?? 0,
    tasksSuggested,
    tasksRefined,
    tasksAdded: totalTasksAdded,
    fieldsUpdated: totalFieldsUpdated,
    overridesPreserved: totalOverridesPreserved,
    llmEnabled: cfg.enabled,
    model: cfg.model,
    enhancementStats: enhancementStats ?? [],
  })
}
