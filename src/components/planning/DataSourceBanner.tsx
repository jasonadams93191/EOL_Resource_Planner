'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDataSourceMode, setDataSourceMode, type DataSourceMode } from '@/lib/planning/data-source-mode'

interface SnapshotSummary {
  fetchedAt: string
  counts: { total: number; byProject: Record<string, number> }
}

interface SnapshotStatus {
  eol: SnapshotSummary | null
  ati: SnapshotSummary | null
}

interface DataSourceBannerProps {
  onModeChange: (mode: DataSourceMode) => void
}

export function DataSourceBanner({ onModeChange }: DataSourceBannerProps) {
  const [mode, setMode] = useState<DataSourceMode>('seed')
  const [status, setStatus] = useState<SnapshotStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzeSuccess, setAnalyzeSuccess] = useState(false)

  // Hydrate from localStorage after mount
  useEffect(() => {
    const stored = getDataSourceMode()
    setMode(stored)
    onModeChange(stored)
  }, [onModeChange])

  // Poll snapshot status in jiraSnapshot mode
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/jira/snapshot')
      if (res.ok) setStatus(await res.json())
    } catch {
      // best-effort
    }
  }, [])

  useEffect(() => {
    if (mode === 'jiraSnapshot') fetchStatus()
  }, [mode, fetchStatus])

  function switchMode(next: DataSourceMode) {
    setMode(next)
    setDataSourceMode(next)
    onModeChange(next)
    if (next === 'jiraSnapshot') fetchStatus()
  }

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/jira/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSyncError(data.error ?? 'Sync failed. Check Jira credentials.')
      } else {
        await fetchStatus()
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError(null)
    setAnalyzeSuccess(false)
    try {
      const res = await fetch('/api/analysis/run', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAnalyzeError(data.error ?? 'Analysis failed.')
      } else {
        setAnalyzeSuccess(true)
        setTimeout(() => setAnalyzeSuccess(false), 4000)
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setAnalyzing(false)
    }
  }

  const hasSnapshot = !!(status?.eol || status?.ati)
  const totalIssues = (status?.eol?.counts.total ?? 0) + (status?.ati?.counts.total ?? 0)
  const lastSync = status?.eol?.fetchedAt ?? status?.ati?.fetchedAt

  return (
    <div className={`rounded-lg border px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm ${
      mode === 'jiraSnapshot'
        ? 'bg-blue-50 border-blue-200 text-blue-900'
        : 'bg-gray-50 border-gray-200 text-gray-600'
    }`}>
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

      {/* Snapshot info */}
      {mode === 'jiraSnapshot' && (
        <>
          {hasSnapshot ? (
            <span className="text-xs text-blue-700">
              {totalIssues} issues synced
              {lastSync && ` · ${new Date(lastSync).toLocaleString()}`}
            </span>
          ) : (
            <span className="text-xs text-amber-700 font-medium">No snapshot — run Sync first</span>
          )}

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs rounded px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {syncing ? 'Syncing…' : 'Sync Jira'}
          </button>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !hasSnapshot}
            className="text-xs rounded px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {analyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>

          {analyzeSuccess && (
            <span className="text-xs text-green-700 font-medium">Analysis complete</span>
          )}
        </>
      )}

      {mode === 'seed' && (
        <span className="text-xs text-gray-400">Sync controls available in Jira Snapshot mode</span>
      )}

      {/* Error messages */}
      {syncError && (
        <span className="text-xs text-red-700 font-medium">{syncError}</span>
      )}
      {analyzeError && (
        <span className="text-xs text-red-700 font-medium">{analyzeError}</span>
      )}
    </div>
  )
}
