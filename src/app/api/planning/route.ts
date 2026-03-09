// ============================================================
// Planning API Routes
//
// GET  /api/planning
//   Returns full planning data: projects, team, roadmap, estimates.
//   Query params:
//     ?portfolio=EOL|ATI|cross-workspace  (optional filter)
//
// POST /api/planning/recompute
//   Accepts scenario overrides and returns a recomputed roadmap.
//   Body: { members?, startDate?, projectIds? }
//
// Response shape (GET):
//   { projects, teamMembers, roadmap, capacity, source }
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { mockCapacityProfile } from '@/lib/mock/sample-data'
import { TEAM_MEMBERS, SKILLS, ROLES } from '@/lib/mock/team-data'
import { buildSprintPlan, buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { getAllSnapshotsAsync } from '@/lib/jira/snapshot-store'
import { importPlanningFromJiraSnapshot } from '@/lib/jira/import-snapshot'
import type { Portfolio, TeamMember, PlanningProject } from '@/types/planning'

const START_DATE = '2026-03-09'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const portfolioParam = searchParams.get('portfolio') as Portfolio | null
  const source = searchParams.get('source')

  // Jira snapshot — auto-detect when available; use mock only as fallback
  let baseProjects: PlanningProject[] = mockAllPlanningProjects
  let dataSource = 'mock-phase1'

  const useMock = source === 'mock'
  if (!useMock) {
    const snapshots = await getAllSnapshotsAsync()
    if (snapshots['ws-eol'] || snapshots['ws-ati']) {
      const { projects: imported } = importPlanningFromJiraSnapshot(
        snapshots['ws-eol'],
        snapshots['ws-ati']
      )
      if (imported.length > 0) {
        baseProjects = imported
        dataSource = 'jira-snapshot'
      }
    }
  }

  // Filter by portfolio if requested
  const projects = portfolioParam
    ? baseProjects.filter((p) => p.portfolio === portfolioParam)
    : baseProjects

  // Build sprint plan (hours-based, for backward compat)
  const sprintPlan = buildSprintPlan(projects, mockCapacityProfile, START_DATE)

  // Build enhanced roadmap (team-member-based)
  const roadmap = buildSprintRoadmap(projects, TEAM_MEMBERS, START_DATE)

  // Analyze bottlenecks
  const bottlenecks = analyzeBottlenecks(projects, TEAM_MEMBERS, SKILLS, ROLES, roadmap)

  return NextResponse.json({
    projects,
    teamMembers: TEAM_MEMBERS,
    skills: SKILLS,
    roles: ROLES,
    sprintPlan,
    roadmap,
    bottlenecks,
    capacity: mockCapacityProfile,
    source: dataSource,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      members?: TeamMember[]
      startDate?: string
      projectIds?: string[]
    }

    const members: TeamMember[] = body.members ?? TEAM_MEMBERS
    const startDate: string = body.startDate ?? START_DATE

    // Use Jira snapshot if available; fall back to mock
    let allProjects: PlanningProject[] = mockAllPlanningProjects
    const snapshots = await getAllSnapshotsAsync()
    if (snapshots['ws-eol'] || snapshots['ws-ati']) {
      const { projects: imported } = importPlanningFromJiraSnapshot(
        snapshots['ws-eol'],
        snapshots['ws-ati']
      )
      if (imported.length > 0) allProjects = imported
    }

    // Filter projects if projectIds provided
    const projects = body.projectIds
      ? allProjects.filter((p) => body.projectIds!.includes(p.id))
      : allProjects

    const roadmap = buildSprintRoadmap(projects, members, startDate)
    const sprintPlan = buildSprintPlan(projects, mockCapacityProfile, startDate)
    const bottlenecks = analyzeBottlenecks(projects, members, SKILLS, ROLES, roadmap)

    return NextResponse.json({
      projects,
      teamMembers: members,
      roadmap,
      sprintPlan,
      bottlenecks,
      source: allProjects === mockAllPlanningProjects ? 'mock-phase1-recomputed' : 'jira-snapshot-recomputed',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
