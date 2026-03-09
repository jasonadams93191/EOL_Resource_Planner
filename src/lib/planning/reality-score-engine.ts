// ============================================================
// Reality Score Engine
//
// Produces a 0–100 composite "Timeline Reality Score" grounded
// in 7 weighted dimensions that reflect real delivery risk.
//
// Higher score = more credible, realistic timeline.
// Lower score = timeline is aspirational and likely to slip.
//
// Weights total 100 points:
//   Skill Coverage        20  — are the required skills actually on the team?
//   Capacity Headroom     20  — is there slack, or is the plan at 100%?
//   Estimate Confidence   15  — how many items have medium/high confidence?
//   Bottleneck Severity   15  — how bad are the per-person overloads?
//   Blocker Risk          10  — unresolved blockers with no resolution date
//   Dependency Chains     10  — depth of dependsOn chains (serial risk)
//   Sprint Distribution   10  — balance of load across team members
// ============================================================

import type { PlanningProject, TeamMember, Skill } from '@/types/planning'
import type { SprintRoadmap } from './sprint-engine'
import type { PersonBottleneck } from './bottleneck-engine'

// ── Output Types ──────────────────────────────────────────────

export interface RealityScoreDimension {
  key: string
  label: string
  score: number        // 0–100 within this dimension
  weight: number       // weight in final composite (sums to 100)
  weighted: number     // score * weight / 100
  insight: string      // one-line human-readable explanation
  severity: 'ok' | 'warn' | 'critical'
}

export interface RealityScore {
  overall: number                    // 0–100 weighted composite
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: RealityScoreDimension[]
  topRisks: string[]                 // up to 3 most critical issues
  totalWorkItems: number
  totalHours: number
  overflowItems: number
}

// ── Grade thresholds ──────────────────────────────────────────

function toGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function severity(score: number): 'ok' | 'warn' | 'critical' {
  if (score >= 70) return 'ok'
  if (score >= 45) return 'warn'
  return 'critical'
}

// ── Dimension scorers ─────────────────────────────────────────

function scoreSkillCoverage(
  projects: PlanningProject[],
  members: TeamMember[],
  skills: Skill[]
): { score: number; insight: string } {
  const skillIds = new Set(skills.map(s => s.id))
  const teamSkillIds = new Set(
    members.flatMap(m => m.userSkills.filter(us => us.level >= 2).map(us => us.skillId))
  )

  let total = 0
  let covered = 0

  for (const p of projects) {
    for (const e of p.epics) {
      for (const wi of e.workItems) {
        if (!wi.primarySkill) { total++; covered++; continue } // no skill req = covered
        total++
        if (!skillIds.has(wi.primarySkill) || teamSkillIds.has(wi.primarySkill)) covered++
      }
    }
  }

  if (total === 0) return { score: 100, insight: 'No skill requirements defined' }
  const pct = Math.round((covered / total) * 100)
  const uncovered = total - covered
  return {
    score: pct,
    insight: uncovered === 0
      ? 'All skill requirements are covered by the team'
      : `${uncovered} work item(s) require skills not at working level on the team`,
  }
}

function scoreCapacityHeadroom(
  roadmap: SprintRoadmap
): { score: number; insight: string } {
  if (roadmap.sprints.length === 0) return { score: 50, insight: 'No sprints computed yet' }

  const overloaded = roadmap.sprints.filter(s => s.isOverloaded || s.isOverTarget).length
  const total = roadmap.sprints.length
  const overflowPenalty = roadmap.overflowItems.length > 0
    ? Math.min(30, roadmap.overflowItems.length * 5)
    : 0
  const overloadPct = overloaded / total
  const baseScore = Math.max(0, Math.round(100 - overloadPct * 80 - overflowPenalty))

  const insight = roadmap.overflowItems.length > 0
    ? `${roadmap.overflowItems.length} work item(s) overflow beyond planned sprints`
    : overloaded > 0
    ? `${overloaded}/${total} sprints are over target capacity`
    : 'Capacity headroom looks healthy'

  return { score: baseScore, insight }
}

function scoreEstimateConfidence(
  projects: PlanningProject[]
): { score: number; insight: string } {
  let total = 0
  let highOrMed = 0

  for (const p of projects) {
    for (const e of p.epics) {
      for (const wi of e.workItems) {
        total++
        if (wi.confidence === 'high' || wi.confidence === 'medium') highOrMed++
      }
    }
  }

  if (total === 0) return { score: 50, insight: 'No work items to evaluate' }
  const pct = Math.round((highOrMed / total) * 100)
  const lowCount = total - highOrMed
  return {
    score: pct,
    insight: lowCount === 0
      ? 'All estimates have medium or high confidence'
      : `${lowCount} work item(s) have low confidence estimates`,
  }
}

function scoreBottleneckSeverity(
  personBottlenecks: PersonBottleneck[]
): { score: number; insight: string } {
  if (personBottlenecks.length === 0) return { score: 90, insight: 'No person-level bottlenecks detected' }

  const worstUtil = Math.max(...personBottlenecks.map(b => b.utilizationPct))
  const overloaded = personBottlenecks.filter(b => b.utilizationPct > 100).length

  // Score: 100 at 80% util, drops linearly to 0 at 150%+
  const baseScore = Math.max(0, Math.round(100 - Math.max(0, worstUtil - 80) * 2))
  const insight = overloaded > 0
    ? `${overloaded} team member(s) are overloaded (worst: ${Math.round(worstUtil)}% utilization)`
    : `Peak utilization: ${Math.round(worstUtil)}%`

  return { score: baseScore, insight }
}

function scoreBlockerRisk(
  projects: PlanningProject[]
): { score: number; insight: string } {
  let totalBlockers = 0
  let unresolvedBlockers = 0

  for (const p of projects) {
    const allBlockers = [...(p.blockers ?? []), ...(p.vendorBlocks ?? [])]
    for (const b of allBlockers) {
      totalBlockers++
      if (!b.resolutionDate) unresolvedBlockers++
    }
  }

  if (totalBlockers === 0) return { score: 100, insight: 'No external blockers logged' }
  const score = Math.round(100 - unresolvedBlockers * 12)
  return {
    score: Math.max(0, score),
    insight: unresolvedBlockers === 0
      ? `All ${totalBlockers} blocker(s) have resolution dates`
      : `${unresolvedBlockers} blocker(s) have no resolution date — timeline may slip`,
  }
}

function scoreDependencyChains(
  projects: PlanningProject[]
): { score: number; insight: string } {
  const depMap = new Map<string, string[]>()

  for (const p of projects) {
    for (const e of p.epics) {
      for (const wi of e.workItems) {
        if (wi.dependsOnWorkItemIds && wi.dependsOnWorkItemIds.length > 0) {
          depMap.set(wi.id, wi.dependsOnWorkItemIds)
        }
      }
    }
  }

  if (depMap.size === 0) return { score: 90, insight: 'No dependency chains defined' }

  // Find max chain depth
  const visited = new Map<string, number>()
  function depth(id: string, seen: Set<string>): number {
    if (seen.has(id)) return 0 // cycle guard
    if (visited.has(id)) return visited.get(id)!
    seen.add(id)
    const deps = depMap.get(id) ?? []
    const d = deps.length === 0 ? 0 : 1 + Math.max(...deps.map(d => depth(d, new Set(seen))))
    visited.set(id, d)
    return d
  }

  let maxDepth = 0
  for (const id of Array.from(depMap.keys())) {
    maxDepth = Math.max(maxDepth, depth(id, new Set()))
  }

  const score = Math.max(0, 100 - maxDepth * 15)
  return {
    score,
    insight: maxDepth === 0
      ? 'Shallow dependency chains'
      : `Deepest dependency chain: ${maxDepth} level(s) — serial delivery risk`,
  }
}

function scoreSprintDistribution(
  roadmap: SprintRoadmap,
  members: TeamMember[]
): { score: number; insight: string } {
  if (roadmap.sprints.length === 0 || members.length === 0) {
    return { score: 70, insight: 'Not enough data to evaluate sprint distribution' }
  }

  // Compute per-member total allocated hours
  const memberHours = new Map<string, number>()
  for (const m of members) memberHours.set(m.id, 0)

  for (const sprint of roadmap.sprints) {
    for (const alloc of sprint.allocations) {
      const cur = memberHours.get(alloc.teamMemberId) ?? 0
      memberHours.set(alloc.teamMemberId, cur + alloc.allocatedSprints)
    }
  }

  const hours = Array.from(memberHours.values()).filter(h => h > 0)
  if (hours.length < 2) return { score: 80, insight: 'Single-person team — no distribution to measure' }

  const mean = hours.reduce((s, h) => s + h, 0) / hours.length
  const variance = hours.reduce((s, h) => s + (h - mean) ** 2, 0) / hours.length
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0  // coefficient of variation

  // Low CV = well balanced (good). High CV = concentrated on few people (bad).
  const score = Math.max(0, Math.round(100 - cv * 80))
  return {
    score,
    insight: cv < 0.2
      ? 'Workload is well distributed across the team'
      : cv < 0.5
      ? 'Some workload concentration — a few members carry most of the load'
      : 'High workload concentration — key-person risk is elevated',
  }
}

// ── Main export ───────────────────────────────────────────────

export function computeRealityScore(
  projects: PlanningProject[],
  members: TeamMember[],
  skills: Skill[],
  roadmap: SprintRoadmap,
  personBottlenecks: PersonBottleneck[]
): RealityScore {
  const dims: Array<{ key: string; label: string; weight: number; result: { score: number; insight: string } }> = [
    { key: 'skill',         label: 'Skill Coverage',      weight: 20, result: scoreSkillCoverage(projects, members, skills) },
    { key: 'capacity',      label: 'Capacity Headroom',   weight: 20, result: scoreCapacityHeadroom(roadmap) },
    { key: 'confidence',    label: 'Estimate Confidence', weight: 15, result: scoreEstimateConfidence(projects) },
    { key: 'bottleneck',    label: 'Bottleneck Severity', weight: 15, result: scoreBottleneckSeverity(personBottlenecks) },
    { key: 'blockers',      label: 'Blocker Risk',        weight: 10, result: scoreBlockerRisk(projects) },
    { key: 'dependencies',  label: 'Dependency Chains',   weight: 10, result: scoreDependencyChains(projects) },
    { key: 'distribution',  label: 'Sprint Distribution', weight: 10, result: scoreSprintDistribution(roadmap, members) },
  ]

  const dimensions: RealityScoreDimension[] = dims.map(d => ({
    key: d.key,
    label: d.label,
    score: d.result.score,
    weight: d.weight,
    weighted: Math.round(d.result.score * d.weight / 100),
    insight: d.result.insight,
    severity: severity(d.result.score),
  }))

  const overall = Math.round(dimensions.reduce((s, d) => s + d.weighted, 0))

  const topRisks = dimensions
    .filter(d => d.severity !== 'ok')
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(d => d.insight)

  const totalWorkItems = projects.reduce((s, p) =>
    s + p.epics.reduce((es, e) => es + e.workItems.length, 0), 0)
  const totalHours = projects.reduce((s, p) =>
    s + p.epics.reduce((es, e) => es + e.workItems.reduce((ws, wi) => ws + wi.estimatedHours, 0), 0), 0)

  return {
    overall,
    grade: toGrade(overall),
    dimensions,
    topRisks,
    totalWorkItems,
    totalHours,
    overflowItems: roadmap.overflowItems.length,
  }
}
