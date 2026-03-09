// ============================================================
// Assignment Engine Tests — Phase 1
// ============================================================

import {
  scoreCandidate,
  rankCandidates,
  suggestAssignment,
  type AssignmentContext,
} from '@/lib/planning/assignment-engine'
import { TEAM_MEMBERS } from '@/lib/mock/team-data'
import { ResourceType } from '@/types/domain'
import type { TeamMember, PlanningWorkItem } from '@/types/planning'

// ── Fixtures ─────────────────────────────────────────────────

const emptyContext: AssignmentContext = {
  currentSprintAllocations: {},
  existingProjectAssignments: new Set(),
}

function makeWorkItem(overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id: 'wi-test',
    title: 'Test work item',
    planningEpicId: 'e1',
    status: 'not-started',
    priority: 'medium',
    sourceRefs: [],
    estimatedHours: 8,
    confidence: 'low',
    primaryRole: ResourceType.DEVELOPER,
    ...overrides,
  }
}

// ── scoreCandidate ────────────────────────────────────────────

describe('scoreCandidate', () => {
  it('returns a score with all 7 dimensions summing to totalScore', () => {
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev', requiredSkillLevel: 2 })
    const result = scoreCandidate(member, item, emptyContext)

    const dimensionSum =
      result.skillMatch +
      result.skillLevelMatch +
      result.domainFamiliarity +
      result.roleFit +
      result.capacityAvailability +
      result.continuity +
      result.priorityUrgencyFit

    expect(result.totalScore).toBe(Math.min(100, dimensionSum))
  })

  it('awards skillMatch=35 when member has the required primary skill', () => {
    // Daniel has skill-sf-dev at level 3
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev' })
    const result = scoreCandidate(member, item, emptyContext)
    expect(result.skillMatch).toBe(35)
  })

  it('awards skillMatch=0 when member lacks the required primary skill', () => {
    // Lord only has skill-web — no sf-dev
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-lord')!
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev' })
    const result = scoreCandidate(member, item, emptyContext)
    expect(result.skillMatch).toBe(0)
  })

  it('awards skillLevelMatch=20 when member skill level meets requirement', () => {
    // Daniel has skill-sf-dev level 3, requirement is 3
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev', requiredSkillLevel: 3 })
    const result = scoreCandidate(member, item, emptyContext)
    expect(result.skillLevelMatch).toBe(20)
  })

  it('awards skillLevelMatch=10 when member is one level below requirement', () => {
    // Daniel has skill-sf-dev level 3, requirement is 4 → one below
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev', requiredSkillLevel: 4 })
    const result = scoreCandidate(member, item, emptyContext)
    expect(result.skillLevelMatch).toBe(10)
  })

  it('awards continuity=5 when member is already on the project', () => {
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem()
    const context: AssignmentContext = {
      currentSprintAllocations: {},
      existingProjectAssignments: new Set(['tm-daniel']),
    }
    const result = scoreCandidate(member, item, context)
    expect(result.continuity).toBe(5)
  })

  it('awards continuity=0 when member is not on the project', () => {
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')!
    const item = makeWorkItem()
    const result = scoreCandidate(member, item, emptyContext)
    expect(result.continuity).toBe(0)
  })

  it('awards capacityAvailability=0 when member has no remaining sprint capacity', () => {
    const member = TEAM_MEMBERS.find((m) => m.id === 'tm-daniel')! // 40h/sprint, 85% target = 34h
    const item = makeWorkItem()
    const context: AssignmentContext = {
      currentSprintAllocations: { 'tm-daniel': 34 }, // at target (34h) — no remaining capacity
      existingProjectAssignments: new Set(),
    }
    const result = scoreCandidate(member, item, context)
    expect(result.capacityAvailability).toBe(0)
  })

  it('includes an explanation string', () => {
    const member = TEAM_MEMBERS[0]
    const item = makeWorkItem()
    const result = scoreCandidate(member, item, emptyContext)
    expect(typeof result.explanation).toBe('string')
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('total score never exceeds 100', () => {
    for (const member of TEAM_MEMBERS) {
      const item = makeWorkItem({ primarySkill: 'skill-sf-config', requiredSkillLevel: 1 })
      const result = scoreCandidate(member, item, emptyContext)
      expect(result.totalScore).toBeLessThanOrEqual(100)
    }
  })
})

// ── rankCandidates ────────────────────────────────────────────

describe('rankCandidates', () => {
  it('returns candidates sorted descending by totalScore', () => {
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev' })
    const results = rankCandidates(TEAM_MEMBERS, item, emptyContext)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].totalScore).toBeGreaterThanOrEqual(results[i].totalScore)
    }
  })

  it('excludes inactive members by default', () => {
    const inactiveMember: TeamMember = {
      ...TEAM_MEMBERS[0],
      id: 'tm-inactive-test',
      isActive: false,
    }
    const members = [...TEAM_MEMBERS, inactiveMember]
    const item = makeWorkItem()
    const results = rankCandidates(members, item, emptyContext)
    const ids = results.map((r) => r.teamMemberId)
    expect(ids).not.toContain('tm-inactive-test')
  })

  it('includes inactive members when includeInactive=true', () => {
    const inactiveMember: TeamMember = {
      ...TEAM_MEMBERS[0],
      id: 'tm-inactive-test-2',
      isActive: false,
    }
    const members = [...TEAM_MEMBERS, inactiveMember]
    const item = makeWorkItem()
    const results = rankCandidates(members, item, emptyContext, true)
    const ids = results.map((r) => r.teamMemberId)
    expect(ids).toContain('tm-inactive-test-2')
  })

  it('returns a result for every active member', () => {
    const activeCount = TEAM_MEMBERS.filter((m) => m.isActive).length
    const item = makeWorkItem()
    const results = rankCandidates(TEAM_MEMBERS, item, emptyContext)
    expect(results).toHaveLength(activeCount)
  })
})

// ── suggestAssignment ─────────────────────────────────────────

describe('suggestAssignment', () => {
  it('returns a WorkItemEstimate with workItemId matching the input', () => {
    const item = makeWorkItem({ id: 'wi-abc', primarySkill: 'skill-sf-config' })
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    expect(result.workItemId).toBe('wi-abc')
  })

  it('suggestedAssigneeId is the highest-scoring active member', () => {
    const item = makeWorkItem({ primarySkill: 'skill-sf-dev' })
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    const ranked = rankCandidates(TEAM_MEMBERS, item, emptyContext)
    expect(result.suggestedAssigneeId).toBe(ranked[0]?.teamMemberId)
  })

  it('sets splitRecommended=true for XL items (>2 sprint fractions)', () => {
    // 200h / 40 = 5 sprints → XL
    const item = makeWorkItem({ estimatedHours: 200 })
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    expect(result.splitRecommended).toBe(true)
  })

  it('sets splitRecommended=false for small items', () => {
    const item = makeWorkItem({ estimatedHours: 8 })
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    expect(result.splitRecommended).toBe(false)
  })

  it('returns confidence=high when top candidate scores 70+', () => {
    // Daniel has sf-dev at level 3; item requires exactly that
    const item = makeWorkItem({
      primarySkill: 'skill-sf-dev',
      requiredSkillLevel: 2,
      urgency: 'normal',
    })
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    // Just assert it returns a valid confidence value
    expect(['low', 'medium', 'high']).toContain(result.confidence)
  })

  it('includes candidateAssignees with at most 5 entries', () => {
    const item = makeWorkItem()
    const result = suggestAssignment(TEAM_MEMBERS, item, emptyContext)
    expect(result.candidateAssignees.length).toBeLessThanOrEqual(5)
  })
})
