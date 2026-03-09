// ============================================================
// Assignment Scoring Engine — Phase 1
//
// Scores each active team member against a work item using 7
// weighted dimensions (total: 100 pts).  All logic is explicit
// and deterministic — no AI in Phase 1.
//
// Weights:
//   Skill Match            35 — member has the required primary skill
//   Skill Level Match      20 — member's skill level >= required level
//   Domain Familiarity     15 — member has secondary/domain skills
//   Role Fit               10 — member's primary role matches work item
//   Capacity Availability  10 — member has sprint capacity remaining
//   Continuity              5 — member already assigned to this project
//   Priority Urgency Fit    5 — high-urgency items prefer higher-capacity members
//
// TODO Wave 2: incorporate historical velocity and AI-assisted matching
// ============================================================

import type { TeamMember, PlanningWorkItem, AssignmentScoreBreakdown, WorkItemEstimate, EffortSize, SkillLevel } from '@/types/planning'
import { EFFORT_SIZE_SPRINTS } from '@/types/planning'

// ── Context ───────────────────────────────────────────────────

export interface AssignmentContext {
  /** Current sprint allocations keyed by teamMemberId → allocated sprints used so far */
  currentSprintAllocations: Record<string, number>
  /** Set of teamMemberIds already assigned to work items in the same project */
  existingProjectAssignments: Set<string>
}

// ── Role → Skill mapping ──────────────────────────────────────
// Maps role ids to the skills that are typical for that role.
// Used for role-fit scoring when primarySkill is not set on the item.
const ROLE_SKILL_AFFINITY: Record<string, string[]> = {
  'role-solution-lead':   ['skill-pm', 'skill-litify', 'skill-sf-config'],
  'role-sf-dev':          ['skill-sf-dev', 'skill-integration', 'skill-async'],
  'role-sf-builder':      ['skill-sf-config', 'skill-litify', 'skill-reporting'],
  'role-ai-automation':   ['skill-ai', 'skill-docs', 'skill-qa'],
  'role-automation-dev':  ['skill-sf-config', 'skill-cloud', 'skill-qa'],
  'role-qa-docs':         ['skill-qa', 'skill-docs'],
  'role-sf-process':      ['skill-sf-config', 'skill-sf-data', 'skill-sales-cloud'],
  'role-revops':          ['skill-sales-cloud', 'skill-reporting'],
  'role-web-marketing':   ['skill-web'],
}

// ── Helpers ───────────────────────────────────────────────────

function getMemberSkillLevel(member: TeamMember, skillId: string): SkillLevel {
  return (member.userSkills.find((us) => us.skillId === skillId)?.level ?? 0) as SkillLevel
}

function hasSkill(member: TeamMember, skillId: string): boolean {
  return getMemberSkillLevel(member, skillId) > 0
}

// ── Effort sizing ─────────────────────────────────────────────
// Converts effortHours into an EffortSize bucket.
// 1 sprint ≈ 40h of a full-time member over 2 weeks.
function hoursToEffortSize(hours: number): EffortSize {
  const sprints = hours / 40
  if (sprints <= 0.25) return 'XS'
  if (sprints <= 0.5)  return 'S'
  if (sprints <= 1.0)  return 'M'
  if (sprints <= 2.0)  return 'L'
  return 'XL'
}

function hoursToSprints(hours: number): number {
  return Math.max(0.25, hours / 40)
}

// ── Scoring ───────────────────────────────────────────────────

/**
 * Score a single candidate against a work item.
 * Returns a full breakdown across all 7 dimensions.
 */
export function scoreCandidate(
  member: TeamMember,
  item: PlanningWorkItem,
  context: AssignmentContext
): AssignmentScoreBreakdown {
  const reasons: string[] = []

  // 1. Skill Match (0–35)
  let skillMatch = 0
  if (item.primarySkill) {
    if (hasSkill(member, item.primarySkill)) {
      skillMatch = 35
      reasons.push(`Has primary skill`)
    } else {
      reasons.push(`Missing primary skill ${item.primarySkill}`)
    }
  } else {
    // No skill specified — partial credit based on role affinity
    const affinitySkills = ROLE_SKILL_AFFINITY[member.primaryRoleId] ?? []
    if (affinitySkills.length > 0) {
      skillMatch = 20
      reasons.push(`Role affinity match (no skill constraint)`)
    }
  }

  // 2. Skill Level Match (0–20)
  let skillLevelMatch = 0
  if (item.primarySkill && item.requiredSkillLevel != null) {
    const memberLevel = getMemberSkillLevel(member, item.primarySkill)
    const required = item.requiredSkillLevel
    if (memberLevel >= required) {
      skillLevelMatch = 20
      reasons.push(`Skill level ${memberLevel} >= required ${required}`)
    } else if (memberLevel === required - 1) {
      skillLevelMatch = 10
      reasons.push(`Skill level ${memberLevel} is one below required ${required}`)
    } else {
      reasons.push(`Skill level ${memberLevel} below required ${required}`)
    }
  } else if (item.primarySkill && hasSkill(member, item.primarySkill)) {
    // Has the skill but no level requirement — give full credit
    skillLevelMatch = 20
    reasons.push(`Skill present, no level requirement`)
  }

  // 3. Domain Familiarity (0–15)
  let domainFamiliarity = 0
  if (item.secondarySkill && hasSkill(member, item.secondarySkill)) {
    domainFamiliarity += 8
    reasons.push(`Has secondary skill ${item.secondarySkill}`)
  }
  if (item.domainTag) {
    // Check if member has any skill whose id contains the domain tag substring
    const tagLower = item.domainTag.toLowerCase()
    const domainMatch = member.userSkills.some((us) => us.skillId.includes(tagLower))
    if (domainMatch) {
      domainFamiliarity = Math.min(15, domainFamiliarity + 7)
      reasons.push(`Domain tag match: ${item.domainTag}`)
    }
  }
  domainFamiliarity = Math.min(15, domainFamiliarity)

  // 4. Role Fit (0–10)
  let roleFit = 0
  const affinitySkills = ROLE_SKILL_AFFINITY[member.primaryRoleId] ?? []
  if (item.primarySkill && affinitySkills.includes(item.primarySkill)) {
    roleFit = 10
    reasons.push(`Role aligns with required skill`)
  } else if (affinitySkills.length > 0 && item.primarySkill && hasSkill(member, item.primarySkill)) {
    roleFit = 5
    reasons.push(`Role partially fits`)
  }

  // 5. Capacity Availability (0–10)
  let capacityAvailability = 0
  const allocated = context.currentSprintAllocations[member.id] ?? 0
  const remaining = member.sprintCapacity - allocated
  if (remaining >= 1.0) {
    capacityAvailability = 10
    reasons.push(`Full sprint available (${remaining.toFixed(2)} remaining)`)
  } else if (remaining >= 0.5) {
    capacityAvailability = 7
    reasons.push(`Half sprint available (${remaining.toFixed(2)} remaining)`)
  } else if (remaining > 0) {
    capacityAvailability = 3
    reasons.push(`Limited capacity (${remaining.toFixed(2)} remaining)`)
  } else {
    reasons.push(`No capacity remaining`)
  }

  // 6. Continuity (0–5)
  let continuity = 0
  if (context.existingProjectAssignments.has(member.id)) {
    continuity = 5
    reasons.push(`Already on this project`)
  }

  // 7. Priority Urgency Fit (0–5)
  let priorityUrgencyFit = 0
  const urgency = item.urgency ?? (item.priority === 'high' ? 'high' : 'normal')
  if (urgency === 'critical' || urgency === 'high') {
    // High-urgency items prefer higher-capacity members
    if (member.sprintCapacity >= 0.9) {
      priorityUrgencyFit = 5
      reasons.push(`High capacity member for urgent item`)
    } else if (member.sprintCapacity >= 0.5) {
      priorityUrgencyFit = 3
    }
  } else {
    // Low-urgency items: any member is fine
    priorityUrgencyFit = 5
    reasons.push(`Normal urgency — capacity fit fine`)
  }

  const totalScore = Math.min(
    100,
    skillMatch + skillLevelMatch + domainFamiliarity + roleFit +
    capacityAvailability + continuity + priorityUrgencyFit
  )

  return {
    teamMemberId: member.id,
    totalScore,
    skillMatch,
    skillLevelMatch,
    domainFamiliarity,
    roleFit,
    capacityAvailability,
    continuity,
    priorityUrgencyFit,
    explanation: reasons.join('; ') || 'No matching criteria',
  }
}

/**
 * Rank all active team members against a work item.
 * Inactive members are excluded by default.
 * Returns candidates sorted descending by totalScore.
 */
export function rankCandidates(
  members: TeamMember[],
  item: PlanningWorkItem,
  context: AssignmentContext,
  includeInactive = false
): AssignmentScoreBreakdown[] {
  const eligible = includeInactive ? members : members.filter((m) => m.isActive)
  return eligible
    .map((m) => scoreCandidate(m, item, context))
    .sort((a, b) => b.totalScore - a.totalScore)
}

/**
 * Suggest the best assignment for a work item.
 * Returns a WorkItemEstimate with the top candidates and the suggested assignee.
 */
export function suggestAssignment(
  members: TeamMember[],
  item: PlanningWorkItem,
  context: AssignmentContext
): WorkItemEstimate {
  const candidates = rankCandidates(members, item, context)
  const effortHours = item.effortHours
  const effortSize = hoursToEffortSize(effortHours)
  const effortInSprints = item.effortInSprints ?? hoursToSprints(effortHours)
  const splitRecommended = effortInSprints > EFFORT_SIZE_SPRINTS['L']

  // Confidence: if top candidate has high score, raise to 'high'; if no good match, 'low'
  const topScore = candidates[0]?.totalScore ?? 0
  const confidence: 'low' | 'medium' | 'high' =
    topScore >= 70 ? 'high' : topScore >= 40 ? 'medium' : 'low'

  return {
    workItemId: item.id,
    effortSize,
    effortInSprints,
    confidence,
    splitRecommended,
    candidateAssignees: candidates.slice(0, 5), // top 5 candidates
    suggestedAssigneeId: candidates[0]?.teamMemberId,
  }
}
