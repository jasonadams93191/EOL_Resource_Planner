// ============================================================
// POST /api/plan         — Lock the current plan as baseline
// GET  /api/plan         — Return current baseline (null if none)
// DELETE /api/plan       — Clear the baseline
// POST /api/plan?delta=1 — Run delta detection vs current Jira snapshot
//
// The baseline is built from:
//   1. Latest Jira snapshot (or seed data if no snapshot)
//   2. Deterministic enhancement layer
//   3. Sprint engine with TEAM_MEMBERS capacity
//
// Delta detection compares jira.updatedAt per work item to flag changes.
// Only changed items need re-enhancement; unchanged items keep baseline assignments.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { TEAM_MEMBERS } from '@/lib/mock/team-data'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { getAllSnapshotsAsync } from '@/lib/jira/snapshot-store'
import { importPlanningFromJiraSnapshot } from '@/lib/jira/import-snapshot'
import { applyEnhancementsWithStats } from '@/lib/planning/enhancements'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import {
  saveBaselinePlan,
  getBaselinePlan,
  clearBaselinePlan,
  detectDeltas,
} from '@/lib/planning/baseline-store'
import type { BaselinePlan } from '@/lib/planning/baseline-store'

const START_DATE = '2026-03-09'

// ── GET — return current baseline ─────────────────────────────

export async function GET() {
  const plan = getBaselinePlan()
  if (!plan) {
    return NextResponse.json({ baseline: null })
  }
  return NextResponse.json({
    baseline: {
      lockedAt: plan.lockedAt,
      source: plan.source,
      stats: plan.stats,
      assignmentCount: Object.keys(plan.assignments).length,
    },
  })
}

// ── DELETE — clear baseline ────────────────────────────────────

export async function DELETE() {
  clearBaselinePlan()
  return NextResponse.json({ success: true, message: 'Baseline cleared' })
}

// ── POST — lock plan or run delta ─────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const runDelta = searchParams.get('delta') === '1'

  // Load Jira snapshot if available, else fall back to seed
  const snapshots = await getAllSnapshotsAsync()
  const hasJira = !!(snapshots['ws-eol'] || snapshots['ws-ati'])

  let projects = mockAllPlanningProjects
  let source: 'jira' | 'seed' = 'seed'

  if (hasJira) {
    const { projects: imported } = importPlanningFromJiraSnapshot(
      snapshots['ws-eol'],
      snapshots['ws-ati']
    )
    const { projects: enhanced } = applyEnhancementsWithStats(imported)
    projects = enhanced
    source = 'jira'
  }

  // ── Delta detection mode ────────────────────────────────────
  if (runDelta) {
    const existing = getBaselinePlan()
    if (!existing) {
      return NextResponse.json(
        { error: 'No baseline locked. POST /api/plan first to create baseline.' },
        { status: 400 }
      )
    }

    // Build current version map
    const currentVersionMap: Record<string, string> = {}
    for (const project of projects) {
      for (const epic of project.epics) {
        for (const wi of epic.workItems) {
          currentVersionMap[wi.id] = wi.jira?.updatedAt ?? ''
        }
      }
    }

    const delta = detectDeltas(existing, currentVersionMap)
    return NextResponse.json({
      delta,
      baselineLockedAt: existing.lockedAt,
      recommendation:
        delta.changedWorkItemIds.length + delta.newWorkItemIds.length === 0
          ? 'Baseline is current — no changes detected'
          : `${delta.changedWorkItemIds.length} changed, ${delta.newWorkItemIds.length} new items — re-run POST /api/plan to update baseline`,
    })
  }

  // ── Lock plan mode ──────────────────────────────────────────
  const roadmap = buildSprintRoadmap(projects, TEAM_MEMBERS, START_DATE)

  const assignments: BaselinePlan['assignments'] = {}
  const jiraVersionMap: Record<string, string> = {}

  for (const placement of roadmap.workItemPlacements) {
    assignments[placement.workItemId] = {
      workItemId: placement.workItemId,
      projectId: '',   // filled in below
      epicId: '',
      sprintNumber: placement.sprintNumber,
      assignedTeamMemberId: placement.assignedTeamMemberId,
      estimatedHours: placement.estimatedHours,
    }
  }

  // Fill projectId / epicId and build jiraVersionMap
  let totalWorkItems = 0
  for (const project of projects) {
    for (const epic of project.epics) {
      for (const wi of epic.workItems) {
        totalWorkItems++
        if (assignments[wi.id]) {
          assignments[wi.id].projectId = project.id
          assignments[wi.id].epicId = epic.id
        }
        jiraVersionMap[wi.id] = wi.jira?.updatedAt ?? ''
      }
    }
  }

  const plan: BaselinePlan = {
    lockedAt: new Date().toISOString(),
    source,
    assignments,
    jiraVersionMap,
    stats: {
      totalProjects: projects.length,
      totalWorkItems,
      assignedCount: roadmap.workItemPlacements.length,
      overflowCount: roadmap.overflowItems.length,
    },
  }

  saveBaselinePlan(plan)

  return NextResponse.json({
    success: true,
    lockedAt: plan.lockedAt,
    source,
    stats: plan.stats,
    message: `Baseline locked from ${source} data. ${plan.stats.assignedCount} items assigned across ${roadmap.totalSprints} sprints. ${plan.stats.overflowCount} items over capacity.`,
  })
}
