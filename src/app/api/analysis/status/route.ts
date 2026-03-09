// ============================================================
// GET /api/analysis/status
//
// Returns summary of the latest analysis run.
// READ-ONLY — no Jira writes.
// ============================================================

import { NextResponse } from 'next/server'
import { getAnalysis } from '@/lib/analysis/analysis-store'
import { getLLMConfig } from '@/lib/config'

export function GET() {
  const result = getAnalysis()
  const cfg = getLLMConfig()

  if (!result) {
    return NextResponse.json({
      lastAnalyzedAt: null,
      initiativesAnalyzed: 0,
      tasksSuggested: 0,
      tasksRefined: 0,
      llmEnabled: cfg.enabled,
      model: cfg.model,
    })
  }

  const tasksSuggested = result.initiatives.reduce(
    (s, i) => s + i.workItemAnalyses.filter((wi) => wi.isSuggested).length,
    0
  )

  return NextResponse.json({
    lastAnalyzedAt: result.analyzedAt,
    initiativesAnalyzed: result.initiatives.length,
    tasksSuggested,
    tasksRefined: result.initiatives.reduce(
      (s, i) => s + i.workItemAnalyses.filter((wi) => !wi.isSuggested).length,
      0
    ),
    llmEnabled: cfg.enabled,
    model: cfg.model,
  })
}
