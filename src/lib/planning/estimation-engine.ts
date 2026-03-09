// ============================================================
// Planning Estimation Engine
//
// Assigns effort, confidence, primary role, and skill to work items.
// Rules are explicit and deterministic — no AI in Phase 1.
//
// TODO Wave 2: replace with AI-assisted or velocity-calibrated estimation
// ============================================================

import { ResourceType } from '@/types/domain'
import type { PlanningWorkItem } from '@/types/planning'

// ── Skill labels per ResourceType ─────────────────────────────
const SKILL_LABELS: Record<ResourceType, string> = {
  [ResourceType.PM_DEV_HYBRID]: 'Project Management + Development',
  [ResourceType.DEVELOPER]: 'Development',
  [ResourceType.ADMIN]: 'Administration',
}

// ── Role selection rules ──────────────────────────────────────
// Determined by the work item's source issue type and labels.
// These are explicit rules, not dynamic inference.
//
// Priority order:
//   1. 'request' issueType  → PM_DEV_HYBRID (intake work)
//   2. 'bug' issueType      → DEVELOPER
//   3. 'task' with admin label → ADMIN
//   4. 'story'              → DEVELOPER
//   5. default              → DEVELOPER
//
// The work item does not carry issueType directly —
// we infer from the work item's title/labels via the sourceType
// and a small set of heuristics on the title prefix.
// In Phase 1, callers pass issueType as a parameter.

export type WorkItemHint = {
  issueType?: 'story' | 'bug' | 'task' | 'sub-task' | 'request'
  labels?: string[]
  storyPoints?: number
}

export function selectPrimaryRole(hint: WorkItemHint): ResourceType {
  if (hint.issueType === 'request') return ResourceType.PM_DEV_HYBRID
  if (hint.issueType === 'bug') return ResourceType.DEVELOPER
  if (hint.issueType === 'task' && hint.labels?.includes('admin')) return ResourceType.ADMIN
  return ResourceType.DEVELOPER
}

export function selectEffortAndConfidence(hint: WorkItemHint): {
  estimatedHours: number
  confidence: 'low' | 'medium' | 'high'
} {
  // Request types: 2h, low confidence — human review needed
  if (hint.issueType === 'request') {
    return { estimatedHours: 2, confidence: 'low' }
  }
  // If story points provided: points × 4h, medium confidence
  if (hint.storyPoints != null && hint.storyPoints > 0) {
    return { estimatedHours: hint.storyPoints * 4, confidence: 'medium' }
  }
  // No story points: 8h default, low confidence
  return { estimatedHours: 8, confidence: 'low' }
}

// ── Main estimation function ──────────────────────────────────
// Accepts a partial work item (missing the fields we are computing)
// and returns the computed estimation fields.
//
// The caller is responsible for merging the result back into the item.

export function estimateWorkItem(
  item: Omit<PlanningWorkItem, 'estimatedHours' | 'confidence' | 'primaryRole' | 'skillRequired' | 'sprintNumber'>,
  hint: WorkItemHint = {}
): Pick<PlanningWorkItem, 'estimatedHours' | 'confidence' | 'primaryRole' | 'skillRequired'> {
  // Suppress unused-variable lint warning — item is the context anchor
  void item

  const primaryRole = selectPrimaryRole(hint)
  const { estimatedHours, confidence } = selectEffortAndConfidence(hint)
  const skillRequired = SKILL_LABELS[primaryRole]

  return { estimatedHours, confidence, primaryRole, skillRequired }
}

// ── Batch helper ──────────────────────────────────────────────
// Applies estimateWorkItem to a list of partial items.
// Returns full PlanningWorkItem objects with estimation fields populated.

export function estimateWorkItems(
  items: Array<
    Omit<PlanningWorkItem, 'estimatedHours' | 'confidence' | 'primaryRole' | 'skillRequired' | 'sprintNumber'> & {
      _hint?: WorkItemHint
    }
  >
): PlanningWorkItem[] {
  return items.map(({ _hint, ...item }) => ({
    ...item,
    ...estimateWorkItem(item, _hint ?? {}),
  }))
}
