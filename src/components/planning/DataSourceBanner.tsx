'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDataSourceMode, setDataSourceMode, type DataSourceMode } from '@/lib/planning/data-source-mode'

// ── API response shapes ───────────────────────────────────────

interface SnapshotSummary {
  fetchedAt: string
  counts: { total: number; byProject: Record<string, number> }
}

interface SnapshotStatus {
  eol: SnapshotSummary | null
  ati: SnapshotSummary | null
}

interface EnhanceStat {
  projectId: string
  projectName: string
  tasksAdded: number
  fieldsUpdated: number
  overridesPreserved: number
}

interface AnalysisStatus {
  lastAnalyzedAt: string | null
  lastEnhancedAt: string | null
  initiativesAnalyzed: number
  tasksSuggested: number
  tasksAdded: number
  fieldsUpdated: number
  overridesPreserved: number
  llmEnabled: boolean
  model: string
  enhancementStats: EnhanceStat[]
}

interface RunResult {
  tasksAdded?: number
  fieldsUpdated?: number
  overridesPreserved?: number
  tasksSuggested?: number
}

// ── Props ─────────────────────────────────────────────────────

interface DataSourceBannerProps {
  onModeChange: (mode: DataSourceMode) => void
}

// ── Component ─────────────────────────────────────────────────

export function DataSourceBanner({ onModeChange }: DataSourceBannerProps) {
  const [mode, setMode] = useState<DataSourceMode>('seed')
  const [status, setStatus] = useState<SnapshotStatus | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null)
  const [lastRunResult, setLastRunResult] = useState<RunResult | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [enhancingRules, setEnhancingRules] = useState(false)
  const [enhancingAll, setEnhancingAll] = useState(false)

  const [autoEnhance, setAutoEnhance] = useState(true)

  const [syncError, setSyncError] = useState<string | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [enhanceSuccess, setEnhanceSuccess] = useState<'rules' | 'all' | null>(null)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = getDataSourceMode()
    setMode(stored)
    onModeChange(stored)
  }, [onModeChange])

  // Fetch snapshot metadata
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/jira/snapshot')
      if (res.ok) setStatus(await res.json())
    } catch {
      // best-effort
    }
  }, [])

  // Fetch analysis / enhancement status
  const fetchAnalysisStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis/status')
      if (res.ok) setAnalysisStatus(await res.json())
    } catch {
      // best-effort
    }
  }, [])

  useEffect(() => {
    if (mode === 'jiraSnapshot') {
      fetchStatus()
      fetchAnalysisStatus()
    }
  }, [mode, fetchStatus, fetchAnalysisStatus])

  function switchMode(next: DataSourceMode) {
    setMode(next)
    setDataSourceMode(next)
    onModeChange(next)
    if (next === 'jiraSnapshot') {
      fetchStatus()
      fetchAnalysisStatus()
    }
  }

  // ── Sync Jira ───────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setEnhanceError(null)
    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSyncError(data.error ?? 'Sync failed. Check Jira credentials.')
      } else {
        await fetchStatus()
        // Auto-enhance (rules only) after a successful sync
        if (autoEnhance) {
          await runEnhancement(false)
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSyncing(false)
    }
  }

  // ── Enhance ─────────────────────────────────────────────────

  async function runEnhancement(withLLM: boolean) {
    const url = withLLM ? '/api/analysis/run' : '/api/analysis/run?llm=false'
    setEnhanceError(null)
    setEnhanceSuccess(null)
    try {
      const res = await fetch(url, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setEnhanceError(data.error ?? 'Enhancement failed.')
      } else {
        setLastRunResult({
          tasksAdded: data.tasksAdded,
          fieldsUpdated: data.fieldsUpdated,
          overridesPreserved: data.overridesPreserved,
          tasksSuggested: data.tasksSuggested,
        })
        setEnhanceSuccess(withLLM ? 'all' : 'rules')
        setTimeout(() => setEnhanceSuccess(null), 6000)
        await fetchAnalysisStatus()
      }
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Network error')
    }
  }

  async function handleEnhanceRules() {
    setEnhancingRules(true)
    await runEnhancement(false)
    setEnhancingRules(false)
  }

  async function handleEnhanceAll() {
    setEnhancingAll(true)
    await runEnhancement(true)
    setEnhancingAll(false)
  }

  // ── Derived ──────────────────────────────────────────────────

  const hasSnapshot = !!(status?.eol || status?.ati)
  const totalIssues = (status?.eol?.counts.total ?? 0) + (status?.ati?.counts.total ?? 0)
  const lastSync = status?.eol?.fetchedAt ?? status?.ati?.fetchedAt
  const isRunning = syncing || enhancingRules || enhancingAll

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className={`rounded-lg border px-4 py-3 space-y-2.5 text-sm ${
      mode === 'jiraSnapshot'
        ? 'bg-blue-50 border-blue-200 text-blue-900'
        : 'bg-gray-50 border-gray-200 text-gray-600'
    }`}>
      {/* Row 1: mode + toggle + controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mode badge */}
        <span className={`text-xs font-bold tracking-wide rounded px-2 py-0.5 ${
          mode === 'jiraSnapshot'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-300 text-gray-700'
        }`}>
          {mode === 'jiraSnapshot' ? 'JIRA SNAPSHOT MODE' : 'SEED MODE'}
        </span>

        {/* Mode toggle */}
        <div className="flex rounded border overflow-hidden text-xs">
          <button
            onClick={() => switchMode('seed')}
            className={`px-2.5 py-1 transition-colors ${
              mode === 'seed' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Seed
          </button>
          <button
            onClick={() => switchMode('jiraSnapshot')}
            className={`px-2.5 py-1 transition-colors ${
              mode === 'jiraSnapshot' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Jira Snapshot
          </button>
        </div>

        {/* Jira snapshot controls */}
        {mode === 'jiraSnapshot' && (
          <>
            {/* Snapshot summary */}
            {hasSnapshot ? (
              <span className="text-xs text-blue-700">
                {totalIssues} issues
                {lastSync && ` · synced ${new Date(lastSync).toLocaleString()}`}
              </span>
            ) : (
              <span className="text-xs text-amber-700 font-medium">No snapshot — run Sync first</span>
            )}

            {/* Sync Jira */}
            <button
              onClick={handleSync}
              disabled={isRunning}
              className="text-xs rounded px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {syncing ? 'Syncing…' : 'Sync Jira'}
            </button>

            {/* Enhance (Rules) */}
            <button
              onClick={handleEnhanceRules}
              disabled={isRunning || !hasSnapshot}
              title="Apply deterministic templates only — no Anthropic"
              className="text-xs rounded px-2.5 py-1 bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {enhancingRules ? 'Enhancing…' : 'Enhance (Rules)'}
            </button>

            {/* Enhance (All) = Rules + Anthropic */}
            <button
              onClick={handleEnhanceAll}
              disabled={isRunning || !hasSnapshot}
              title="Apply deterministic templates then fill gaps with Anthropic"
              className="text-xs rounded px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {enhancingAll ? 'Analyzing…' : 'Enhance (All)'}
            </button>

            {/* Auto-enhance toggle */}
            <label className="flex items-center gap-1.5 text-xs text-blue-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoEnhance}
                onChange={(e) => setAutoEnhance(e.target.checked)}
                className="accent-teal-600"
              />
              Auto-enhance after sync
            </label>
          </>
        )}

        {mode === 'seed' && (
          <span className="text-xs text-gray-400">Sync controls available in Jira Snapshot mode</span>
        )}
      </div>

      {/* Row 2: enhancement status (only when something has been run) */}
      {mode === 'jiraSnapshot' && (analysisStatus || lastRunResult) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-700 border-t border-blue-100 pt-2">
          {/* Last enhance time */}
          {analysisStatus?.lastEnhancedAt && (
            <span>
              Last enhanced: <strong>{new Date(analysisStatus.lastEnhancedAt).toLocaleString()}</strong>
            </span>
          )}

          {/* Last run stats — prefer just-returned result for immediacy */}
          {(lastRunResult ?? analysisStatus) && (() => {
            const r = lastRunResult ?? analysisStatus!
            return (
              <>
                {(r.tasksAdded ?? 0) > 0 && (
                  <span className="text-teal-700">+{r.tasksAdded} tasks added</span>
                )}
                {(r.fieldsUpdated ?? 0) > 0 && (
                  <span>{r.fieldsUpdated} fields updated</span>
                )}
                {(r.overridesPreserved ?? 0) > 0 && (
                  <span className="text-amber-700">{r.overridesPreserved} overrides preserved</span>
                )}
                {(r.tasksSuggested ?? 0) > 0 && (
                  <span className="text-indigo-700">{r.tasksSuggested} AI tasks suggested</span>
                )}
              </>
            )
          })()}

          {/* Per-initiative breakdown */}
          {analysisStatus && analysisStatus.enhancementStats.length > 0 && (
            <details className="w-full">
              <summary className="cursor-pointer text-blue-600 hover:underline">
                Initiative breakdown
              </summary>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {analysisStatus.enhancementStats.map((s) => (
                  <div key={s.projectId} className="flex items-center gap-2 bg-white rounded px-2 py-1 border border-blue-100">
                    <span className="font-medium text-blue-800 truncate max-w-[120px]">{s.projectName}</span>
                    <span className="text-gray-400">·</span>
                    {s.tasksAdded > 0
                      ? <span className="text-teal-700">+{s.tasksAdded}</span>
                      : <span className="text-gray-400">0 added</span>}
                    {s.fieldsUpdated > 0 && <span>{s.fieldsUpdated} updated</span>}
                    {s.overridesPreserved > 0 && (
                      <span className="text-amber-700">{s.overridesPreserved} preserved</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Success flash */}
      {enhanceSuccess && (
        <div className="text-xs text-green-700 font-medium">
          {enhanceSuccess === 'rules' ? 'Rules enhancement complete' : 'Full analysis complete (rules + AI)'}
        </div>
      )}

      {/* Error messages */}
      {syncError && <div className="text-xs text-red-700 font-medium">{syncError}</div>}
      {enhanceError && <div className="text-xs text-red-700 font-medium">{enhanceError}</div>}
    </div>
  )
}
