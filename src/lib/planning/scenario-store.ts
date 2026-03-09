// ============================================================
// Scenario Store — localStorage persistence
//
// Saves scenario deltas (not full datasets) so they survive
// page refreshes. Server-restart safe: no server state used.
// ============================================================

import type { PlanningPriority } from '@/types/planning'

export interface SavedScenario {
  id: string
  name: string
  notes?: string
  createdAt: string    // ISO
  updatedAt: string    // ISO
  sprintStartDate: string
  dataMode: 'seed' | 'jiraSnapshot'
  /** projectId → override priority */
  projectPriorities: Record<string, PlanningPriority>
  /** memberId → capacity/active overrides */
  memberOverrides: Record<string, {
    utilizationTargetPercent: number
    isActive: boolean
  }>
  /** temp resources added in this scenario */
  tempResources: Array<{
    templateId: string
    sprintWindow: number
  }>
}

const KEY = 'eol-saved-scenarios'

function readAll(): SavedScenario[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedScenario[]
  } catch {
    return []
  }
}

function writeAll(scenarios: SavedScenario[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(scenarios))
}

export function listScenarios(): SavedScenario[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getScenario(id: string): SavedScenario | null {
  return readAll().find((s) => s.id === id) ?? null
}

/** Upsert by id */
export function saveScenario(scenario: SavedScenario): void {
  const all = readAll()
  const idx = all.findIndex((s) => s.id === scenario.id)
  if (idx >= 0) {
    all[idx] = scenario
  } else {
    all.push(scenario)
  }
  writeAll(all)
}

export function deleteScenario(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id))
}
