// ============================================================
// Data Source Mode
//
// Controls whether the planning UI renders seed (mock) data
// or live Jira snapshot data. The two sources are mutually
// exclusive — never mix seed and Jira data in the same view.
//
// Persisted in localStorage (client-side only).
// Server-side code reads this via query params or request body.
// ============================================================

export type DataSourceMode = 'seed' | 'jiraSnapshot'

const STORAGE_KEY = 'eol-planner-data-source-mode'

export function getDataSourceMode(): DataSourceMode {
  if (typeof window === 'undefined') return 'seed'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'jiraSnapshot' ? 'jiraSnapshot' : 'seed'
  } catch {
    return 'seed'
  }
}

export function setDataSourceMode(mode: DataSourceMode): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // localStorage unavailable — ignore
  }
}
