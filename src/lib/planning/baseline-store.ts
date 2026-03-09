// ============================================================
// Baseline Plan Store
//
// A "baseline plan" is a locked sprint assignment generated from Jira data.
// It represents the canonical schedule:
//   - Created once by running the full pipeline (Jira → enhance → assign)
//   - Persisted in memory (globalThis) — survives hot-reload but not pod restarts
//   - Future: persist to Neon DB alongside jira_snapshots
//
// Delta detection:
//   - Each Jira work item tracks its jira.updatedAt
//   - When a new Jira snapshot comes in, compare updatedAt per workItemId
//   - Items with newer updatedAt are "changed" → need re-enhancement + re-assignment
//   - Items unchanged → keep existing baseline assignment
// ============================================================

export interface BaselineAssignment {
  workItemId: string
  projectId: string
  epicId: string
  sprintNumber: number
  assignedTeamMemberId?: string
  estimatedHours: number
}

export interface BaselinePlan {
  lockedAt: string
  source: 'jira' | 'seed'
  // workItemId → assignment
  assignments: Record<string, BaselineAssignment>
  // workItemId → jira.updatedAt (for delta detection)
  jiraVersionMap: Record<string, string>
  stats: {
    totalProjects: number
    totalWorkItems: number
    assignedCount: number
    overflowCount: number
  }
}

// ── In-memory store ───────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __baselinePlan: BaselinePlan | null | undefined
}

export function getBaselinePlan(): BaselinePlan | null {
  return globalThis.__baselinePlan ?? null
}

export function saveBaselinePlan(plan: BaselinePlan): void {
  globalThis.__baselinePlan = plan
}

export function clearBaselinePlan(): void {
  globalThis.__baselinePlan = null
}

// ── Delta detection ───────────────────────────────────────────

export interface DeltaResult {
  changedWorkItemIds: string[]    // items updated in Jira since baseline
  newWorkItemIds: string[]        // items in current snapshot not in baseline
  removedWorkItemIds: string[]    // items in baseline no longer in Jira
  unchangedCount: number
}

/**
 * Compare a new version map (workItemId → updatedAt) against the baseline.
 * Returns which items need re-processing.
 */
export function detectDeltas(
  baseline: BaselinePlan,
  currentVersionMap: Record<string, string>
): DeltaResult {
  const baselineIds = new Set(Object.keys(baseline.jiraVersionMap))
  const currentIds = new Set(Object.keys(currentVersionMap))

  const changedWorkItemIds: string[] = []
  const newWorkItemIds: string[] = []
  const removedWorkItemIds: string[] = []
  let unchangedCount = 0

  for (const id of Array.from(currentIds)) {
    if (!baselineIds.has(id)) {
      newWorkItemIds.push(id)
    } else {
      const baseVer = baseline.jiraVersionMap[id]
      const curVer = currentVersionMap[id]
      if (curVer && baseVer && curVer > baseVer) {
        changedWorkItemIds.push(id)
      } else {
        unchangedCount++
      }
    }
  }

  for (const id of Array.from(baselineIds)) {
    if (!currentIds.has(id)) {
      removedWorkItemIds.push(id)
    }
  }

  return { changedWorkItemIds, newWorkItemIds, removedWorkItemIds, unchangedCount }
}
