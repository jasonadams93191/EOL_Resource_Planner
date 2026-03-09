'use client'

import { useEffect } from 'react'
import type { Portfolio } from '@/types/planning'

// ── Object types ──────────────────────────────────────────────

export type ObjectType = 'initiatives' | 'epics' | 'tasks' | 'resources' | 'scenarios'

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  initiatives: 'Initiatives',
  epics:       'Epics',
  tasks:       'Tasks',
  resources:   'Resources',
  scenarios:   'Scenarios',
}

export type SourceFilter = 'all' | 'jira' | 'template' | 'ai' | 'manual'
export type PortfolioFilter = 'all' | Portfolio

// ── Props ─────────────────────────────────────────────────────

export interface ObjectTypeFilterProps {
  /** Which object type is selected */
  objectType: ObjectType
  onObjectTypeChange: (t: ObjectType) => void
  /** Subset of types to show in dropdown */
  available?: ObjectType[]
  /** localStorage key for persisting objectType selection */
  storageKey?: string

  // Secondary filters — shown conditionally
  portfolio?: PortfolioFilter
  onPortfolioChange?: (p: PortfolioFilter) => void
  showPortfolio?: boolean

  source?: SourceFilter
  onSourceChange?: (s: SourceFilter) => void
  showSource?: boolean

  search?: string
  onSearchChange?: (s: string) => void
}

const PORTFOLIO_OPTIONS: Array<{ value: PortfolioFilter; label: string }> = [
  { value: 'all',              label: 'All Portfolios' },
  { value: 'EOL',              label: 'EOL' },
  { value: 'ATI',              label: 'ATI' },
  { value: 'cross-workspace',  label: 'Cross-Workspace' },
]

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all',      label: 'All Sources' },
  { value: 'jira',     label: 'Jira' },
  { value: 'template', label: 'Template' },
  { value: 'ai',       label: 'AI' },
  { value: 'manual',   label: 'Manual' },
]

// ── Component ─────────────────────────────────────────────────

export function ObjectTypeFilter({
  objectType,
  onObjectTypeChange,
  available = ['initiatives', 'epics', 'tasks', 'resources', 'scenarios'],
  storageKey,
  portfolio = 'all',
  onPortfolioChange,
  showPortfolio = false,
  source = 'all',
  onSourceChange,
  showSource = false,
  search = '',
  onSearchChange,
}: ObjectTypeFilterProps) {
  // Persist objectType to localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, objectType)
    }
  }, [objectType, storageKey])

  const selectClass =
    'rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "View:" label + object type dropdown */}
      <label className="text-xs font-medium text-gray-500 shrink-0">View:</label>
      <select
        value={objectType}
        onChange={(e) => onObjectTypeChange(e.target.value as ObjectType)}
        className={selectClass}
      >
        {available.map((t) => (
          <option key={t} value={t}>{OBJECT_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Portfolio filter */}
      {showPortfolio && onPortfolioChange && (
        <select
          value={portfolio}
          onChange={(e) => onPortfolioChange(e.target.value as PortfolioFilter)}
          className={selectClass}
        >
          {PORTFOLIO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Source filter */}
      {showSource && onSourceChange && (
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value as SourceFilter)}
          className={selectClass}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Text search */}
      {onSearchChange && (
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
        />
      )}
    </div>
  )
}
