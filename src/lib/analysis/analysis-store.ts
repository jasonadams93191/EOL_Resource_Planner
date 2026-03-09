// ============================================================
// Analysis Result Store
//
// In-memory cache using globalThis. Stores the latest
// AnalysisResult from the analysis engine.
// Ephemeral — cleared on server restart.
//
// READ-ONLY source data. No Jira writes permitted.
// ============================================================

import type { AnalysisResult } from '@/types/analysis'
import type { EnhancementRunStats } from '@/lib/planning/enhancements'

declare global {
  // eslint-disable-next-line no-var
  var __jiraAnalysis: AnalysisResult | undefined
  // eslint-disable-next-line no-var
  var __enhancementStats: EnhancementRunStats[] | undefined
}

// ── Analysis result ───────────────────────────────────────────

export function saveAnalysis(result: AnalysisResult): void {
  globalThis.__jiraAnalysis = result
}

export function getAnalysis(): AnalysisResult | null {
  return globalThis.__jiraAnalysis ?? null
}

export function clearAnalysis(): void {
  globalThis.__jiraAnalysis = undefined
}

// ── Enhancement stats ─────────────────────────────────────────

export function saveEnhancementStats(stats: EnhancementRunStats[]): void {
  globalThis.__enhancementStats = stats
}

export function getEnhancementStats(): EnhancementRunStats[] | null {
  return globalThis.__enhancementStats ?? null
}

export function clearEnhancementStats(): void {
  globalThis.__enhancementStats = undefined
}
