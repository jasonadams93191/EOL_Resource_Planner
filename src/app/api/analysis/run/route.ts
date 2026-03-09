// ============================================================
// POST /api/analysis/run
//
// Runs Rovo-style evidence analysis against the current Jira
// snapshot. Requires at least one Jira snapshot to be present.
//
// For each high/medium priority project:
//   - Searches for related Jira evidence via JQL
//   - Generates task suggestions for initiatives with < 3 items
//
// Saves result to analysis-store (globalThis).
// READ-ONLY — no Jira writes permitted.
// ============================================================

import { NextResponse } from 'next/server'
import { getAllSnapshots } from '@/lib/jira/snapshot-store'
import { importPlanningFromJiraSnapshot } from '@/lib/jira/import-snapshot'
import { searchRelatedEvidence } from '@/lib/analysis/rovo-search'
import { saveAnalysis } from '@/lib/analysis/analysis-store'
import { createEolClient, createAtiClient } from '@/lib/jira/client'
import type { AnalysisResult, InitiativeAnalysis, WorkItemAnalysis } from '@/types/analysis'

export async function POST() {
  const snapshots = getAllSnapshots()

  if (!snapshots['ws-eol'] && !snapshots['ws-ati']) {
    return NextResponse.json(
      { error: 'No Jira snapshot found. Run POST /api/jira/sync first.' },
      { status: 400 }
    )
  }

  const { projects } = importPlanningFromJiraSnapshot(
    snapshots['ws-eol'],
    snapshots['ws-ati']
  )

  const eolClient = createEolClient()
  const atiClient = createAtiClient()
  const analyzedAt = new Date().toISOString()
  const initiatives: InitiativeAnalysis[] = []

  for (const project of projects) {
    // Only analyze high and medium priority projects
    if (project.priority === 'low') continue

    // Determine which client to use based on portfolio
    const client = project.portfolio === 'EOL' ? eolClient
      : project.portfolio === 'ATI' ? atiClient
      : eolClient.isConfigured ? eolClient : atiClient

    // Search for related evidence
    const evidenceRefs = await searchRelatedEvidence(client, project)

    // Build work item analyses
    const workItemAnalyses: WorkItemAnalysis[] = []
    for (const epic of project.epics) {
      for (const item of epic.workItems) {
        workItemAnalyses.push({
          workItemId: item.id,
          title: item.title,
          estimatedHours: item.estimatedHours,
          confidence: item.confidence,
          primarySkill: item.primarySkill,
          requiredSkillLevel: item.requiredSkillLevel,
          candidateAssigneeIds: item.candidateAssigneeIds,
          evidenceRefs: evidenceRefs.filter((ev) =>
            ev.issueKey && item.jira?.issueKey !== ev.issueKey
          ).slice(0, 3),
          isSuggested: false,
        })
      }
    }

    // Generate suggested tasks for thin initiatives (< 3 work items)
    const totalItems = project.epics.reduce((s, e) => s + e.workItems.length, 0)
    if (totalItems < 3) {
      workItemAnalyses.push({
        workItemId: undefined,
        title: `[Suggested] Define scope and requirements for ${project.name}`,
        estimatedHours: 8,
        confidence: 'low',
        isSuggested: true,
        evidenceRefs: [],
      })
      workItemAnalyses.push({
        workItemId: undefined,
        title: `[Suggested] Technical design review for ${project.name}`,
        estimatedHours: 4,
        confidence: 'low',
        isSuggested: true,
        evidenceRefs: [],
      })
    }

    initiatives.push({
      projectId: project.id,
      analyzedAt,
      workItemAnalyses,
      evidenceRefs,
    })
  }

  const result: AnalysisResult = { analyzedAt, initiatives }
  saveAnalysis(result)

  return NextResponse.json({
    success: true,
    analyzedAt,
    initiativesAnalyzed: initiatives.length,
    totalEvidenceRefs: initiatives.reduce((s, i) => s + i.evidenceRefs.length, 0),
  })
}
