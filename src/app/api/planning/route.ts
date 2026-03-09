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
import type { Portfolio, TeamMember } from '@/types/planning'

const START_DATE = '2026-03-09'

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const portfolioParam = searchParams.get('portfolio') as Portfolio | null

  // Filter by portfolio if requested
  const projects = portfolioParam
    ? mockAllPlanningProjects.filter((p) => p.portfolio === portfolioParam)
    : mockAllPlanningProjects

  // Build sprint plan (hours-based, for backward compat)
  const sprintPlan = buildSprintPlan(projects, mockCapacityProfile, START_DATE)

  // Build enhanced roadmap (team-member-based)
  const roadmap = buildSprintRoadmap(projects, TEAM_MEMBERS, START_DATE)

  return NextResponse.json({
    projects,
    teamMembers: TEAM_MEMBERS,
    skills: SKILLS,
    roles: ROLES,
    sprintPlan,
    roadmap,
    capacity: mockCapacityProfile,
    source: 'mock-phase1',
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

    // Filter projects if projectIds provided
    const projects = body.projectIds
      ? mockAllPlanningProjects.filter((p) => body.projectIds!.includes(p.id))
      : mockAllPlanningProjects

    const roadmap = buildSprintRoadmap(projects, members, startDate)
    const sprintPlan = buildSprintPlan(projects, mockCapacityProfile, startDate)

    return NextResponse.json({
      projects,
      teamMembers: members,
      roadmap,
      sprintPlan,
      source: 'mock-phase1-recomputed',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
