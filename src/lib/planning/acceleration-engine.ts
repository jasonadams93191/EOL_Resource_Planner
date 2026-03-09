// ============================================================
// Acceleration Recommendation Engine — Phase 1
//
// Simulates adding each temp resource template to the current
// team and recomputes the sprint roadmap. Scores candidates by
// a composite of sprint reduction, bottleneck relief, skill gap
// coverage, and overload reduction. Returns top 3 recommendations.
//
// Scoring weights:
//   Sprint reduction   40%
//   Bottleneck relief  30%
//   Skill gap coverage 20%
//   Overload reduction 10%
// ============================================================

import type { PlanningProject, TeamMember, TempResourceTemplate } from '@/types/planning'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { SKILLS, ROLES } from '@/lib/mock/team-data'

// ── Template Catalog ──────────────────────────────────────────

export const TEMP_RESOURCE_TEMPLATES: TempResourceTemplate[] = [
  {
    id: 'trt-sf-admin',
    label: 'Salesforce Admin',
    primaryRoleId: 'role-sf-builder',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-sf-config', level: 3 },
      { skillId: 'skill-sf-data',   level: 2 },
    ],
  },
  {
    id: 'trt-sf-dev',
    label: 'Salesforce Developer',
    primaryRoleId: 'role-sf-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-integration', level: 2 },
    ],
  },
  {
    id: 'trt-integration-dev',
    label: 'Integration Developer',
    primaryRoleId: 'role-sf-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-integration', level: 3 },
      { skillId: 'skill-async',       level: 2 },
    ],
  },
  {
    id: 'trt-revops',
    label: 'RevOps Specialist',
    primaryRoleId: 'role-revops',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-reporting',   level: 2 },
    ],
  },
  {
    id: 'trt-qa',
    label: 'QA / Enablement',
    primaryRoleId: 'role-qa-docs',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-qa',   level: 3 },
      { skillId: 'skill-docs', level: 3 },
    ],
  },
  {
    id: 'trt-web',
    label: 'Web / WordPress',
    primaryRoleId: 'role-web-marketing',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    skills: [
      { skillId: 'skill-web', level: 3 },
    ],
  },
]

// ── Types ─────────────────────────────────────────────────────

export interface AccelerationCandidate {
  template: TempResourceTemplate
  sprintReduction: number       // sprints saved for target initiative
  bottleneckRelief: number      // 0–1 fraction of bottlenecks resolved
  skillGapCoverage: number      // 0–1 fraction of skill gaps covered
  overloadReduction: number     // 0–1 fraction of overloaded sprints resolved
  totalScore: number            // 0–100 weighted composite
  explanation: string[]
}

export interface AccelerationRecommendation {
  projectId: string
  bestCandidate: AccelerationCandidate | null
  topCandidates: AccelerationCandidate[]  // top 3
  currentSprintCount: number
  projectedSprintCount: number
  noImpactReason?: string
}

// ── Helpers ───────────────────────────────────────────────────

function templateToMember(
  template: TempResourceTemplate,
  startSprintId?: number,
  endSprintId?: number
): TeamMember {
  return {
    id: `tmp-${template.id}`,
    name: template.label,
    primaryRoleId: template.primaryRoleId,
    userSkills: template.skills,
    availableHoursPerSprint: template.availableHoursPerSprint,
    utilizationTargetPercent: template.utilizationTargetPercent,
    isActive: true,
    resourceKind: 'temp',
    startSprintId,
    endSprintId,
  }
}

// Count sprints used by a specific project in a roadmap
function projectSprintCount(projectId: string, projects: PlanningProject[], roadmap: ReturnType<typeof buildSprintRoadmap>): number {
  const projectWorkItemIds = new Set<string>()
  const project = projects.find((p) => p.id === projectId)
  if (!project) return 0
  for (const epic of project.epics) {
    for (const wi of epic.workItems) {
      projectWorkItemIds.add(wi.id)
    }
  }
  const placedSprints = roadmap.workItemPlacements
    .filter((p) => projectWorkItemIds.has(p.workItemId))
    .map((p) => p.sprintNumber)
  if (placedSprints.length === 0) return 0
  return Math.max(...placedSprints) - Math.min(...placedSprints) + 1
}

// ── Main Entry Point ──────────────────────────────────────────

/**
 * Recommend temp/external resources to accelerate a specific initiative.
 *
 * @param project - The initiative to accelerate
 * @param allProjects - All planning projects (for global roadmap computation)
 * @param members - Current team members
 * @param startDate - Roadmap start date
 * @param sprintWindow - Number of sprints the temp resource is available (default: all)
 */
export function recommendAcceleration(
  project: PlanningProject,
  allProjects: PlanningProject[],
  members: TeamMember[],
  startDate: string,
  sprintWindow?: number
): AccelerationRecommendation {
  // Baseline roadmap without any temp resources
  const baseRoadmap = buildSprintRoadmap(allProjects, members, startDate)
  const currentSprintCount = projectSprintCount(project.id, allProjects, baseRoadmap)

  // Baseline bottleneck analysis
  const baseBottlenecks = analyzeBottlenecks(allProjects, members, SKILLS, ROLES, baseRoadmap)
  const basePersonBN = baseBottlenecks.personBottlenecks.length
  const baseSkillBN = baseBottlenecks.skillBottlenecks.length
  const baseOverloaded = baseRoadmap.sprints.filter((s) => s.isOverloaded).length

  // Determine what skills the project's work items require
  const projectSkillIds = new Set<string>()
  for (const epic of project.epics) {
    for (const wi of epic.workItems) {
      if (wi.primarySkill) projectSkillIds.add(wi.primarySkill)
    }
  }

  const candidates: AccelerationCandidate[] = []

  for (const template of TEMP_RESOURCE_TEMPLATES) {
    const tempMember = templateToMember(
      template,
      1,
      sprintWindow != null ? sprintWindow : undefined
    )
    const augmentedMembers = [...members, tempMember]

    const augRoadmap = buildSprintRoadmap(allProjects, augmentedMembers, startDate)
    const projectedSprintCount = projectSprintCount(project.id, allProjects, augRoadmap)

    const sprintReduction = Math.max(0, currentSprintCount - projectedSprintCount)

    // Bottleneck relief
    const augBottlenecks = analyzeBottlenecks(allProjects, augmentedMembers, SKILLS, ROLES, augRoadmap)
    const augPersonBN = augBottlenecks.personBottlenecks.length
    const augSkillBN = augBottlenecks.skillBottlenecks.length
    const resolvedBN = Math.max(0, (basePersonBN + baseSkillBN) - (augPersonBN + augSkillBN))
    const totalBaseBN = basePersonBN + baseSkillBN
    const bottleneckRelief = totalBaseBN > 0 ? resolvedBN / totalBaseBN : 0

    // Skill gap coverage — fraction of project skills this template covers
    const templateSkillIds = new Set(template.skills.map((s) => s.skillId))
    const coveredSkills = Array.from(projectSkillIds).filter((sid) => templateSkillIds.has(sid))
    const skillGapCoverage = projectSkillIds.size > 0 ? coveredSkills.length / projectSkillIds.size : 0

    // Overload reduction
    const augOverloaded = augRoadmap.sprints.filter((s) => s.isOverloaded).length
    const resolvedOverload = Math.max(0, baseOverloaded - augOverloaded)
    const overloadReduction = baseOverloaded > 0 ? resolvedOverload / baseOverloaded : 0

    // Weighted score (0–100)
    // sprintReduction is normalized: assume max meaningful reduction is 3 sprints = 1.0
    const normalizedSprintReduction = Math.min(1, sprintReduction / 3)
    const totalScore = Math.round(
      (normalizedSprintReduction * 40) +
      (bottleneckRelief * 30) +
      (skillGapCoverage * 20) +
      (overloadReduction * 10)
    )

    const explanation: string[] = []
    if (sprintReduction > 0) explanation.push(`Saves ${sprintReduction} sprint(s)`)
    if (bottleneckRelief > 0) explanation.push(`Resolves ${resolvedBN} bottleneck(s)`)
    if (coveredSkills.length > 0) explanation.push(`Covers skills: ${coveredSkills.join(', ')}`)
    if (overloadReduction > 0) explanation.push(`Reduces overloaded sprints by ${resolvedOverload}`)
    if (explanation.length === 0) explanation.push('No measurable impact on this initiative')

    candidates.push({
      template,
      sprintReduction,
      bottleneckRelief,
      skillGapCoverage,
      overloadReduction,
      totalScore,
      explanation,
    })
  }

  // Sort by total score descending
  candidates.sort((a, b) => b.totalScore - a.totalScore)

  const topCandidates = candidates.slice(0, 3)
  const bestCandidate = topCandidates[0]?.totalScore > 0 ? topCandidates[0] : null

  const projectedSprintCount = bestCandidate
    ? Math.max(0, currentSprintCount - bestCandidate.sprintReduction)
    : currentSprintCount

  const noImpactReason = !bestCandidate
    ? 'No temp resource template would meaningfully accelerate this initiative.'
    : undefined

  return {
    projectId: project.id,
    bestCandidate,
    topCandidates,
    currentSprintCount,
    projectedSprintCount,
    noImpactReason,
  }
}
