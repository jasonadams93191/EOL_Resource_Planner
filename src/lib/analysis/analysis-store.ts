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

declare global {
  // eslint-disable-next-line no-var
  var __jiraAnalysis: AnalysisResult | undefined
}

export function saveAnalysis(result: AnalysisResult): void {
  globalThis.__jiraAnalysis = result
}

export function getAnalysis(): AnalysisResult | null {
  return globalThis.__jiraAnalysis ?? null
}

export function clearAnalysis(): void {
  globalThis.__jiraAnalysis = undefined
}
