// ============================================================
// LLM Analysis — Unit Tests
//
// Tests pure functions only (no Anthropic API calls):
//   - validateLLMTaskSuggestion: schema validation
//   - buildInitiativePack: pack construction + truncation
// ============================================================

jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      }),
    },
  })),
}))

import { validateLLMTaskSuggestion, buildInitiativePack } from '@/lib/llm/anthropic'
import type { PlanningProject, PlanningWorkItem, PlanningEpic } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────

function validSuggestion(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Set up Salesforce CTI connector',
    estimatedHours: 8,
    confidence: 'medium',
    rationale: 'Needed for voice AI integration',
    evidenceUsed: [],
    ...overrides,
  }
}

function makeWorkItem(id: string, epicId: string, overrides: Partial<PlanningWorkItem> = {}): PlanningWorkItem {
  return {
    id,
    title: id,
    planningEpicId: epicId,
    status: 'not-started',
    sourceRefs: [{ sourceType: 'manual', label: 'Test' }],
    estimatedHours: 8,
    confidence: 'medium',
    primaryRole: ResourceType.DEVELOPER,
    ...overrides,
  }
}

function makeEpic(id: string, projectId: string, workItems: PlanningWorkItem[] = []): PlanningEpic {
  return {
    id,
    title: `Epic ${id}`,
    planningProjectId: projectId,
    status: 'not-started',
    sourceRefs: [],
    workItems,
    portfolio: 'EOL' as import('@/types/planning').Portfolio,
  }
}

function makeProject(id: string, epics: PlanningEpic[] = []): PlanningProject {
  return {
    id,
    name: `Project ${id}`,
    portfolio: 'EOL' as import('@/types/planning').Portfolio,
    priority: 'high',
    stage: 'defined',
    status: 'not-started',
    sourceRefs: [],
    epics,
    confidence: 'medium',
  }
}

// ── validateLLMTaskSuggestion ─────────────────────────────────

describe('validateLLMTaskSuggestion', () => {
  describe('invalid inputs — returns null', () => {
    it('returns null for null', () => {
      expect(validateLLMTaskSuggestion(null)).toBeNull()
    })

    it('returns null for a number', () => {
      expect(validateLLMTaskSuggestion(42)).toBeNull()
    })

    it('returns null for a string', () => {
      expect(validateLLMTaskSuggestion('hello')).toBeNull()
    })

    it('returns null when title is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...noTitle } = validSuggestion()
      expect(validateLLMTaskSuggestion(noTitle)).toBeNull()
    })

    it('returns null when title is empty string', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ title: '' }))).toBeNull()
    })

    it('returns null when estimatedHours is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { estimatedHours: _h, ...noHours } = validSuggestion()
      expect(validateLLMTaskSuggestion(noHours)).toBeNull()
    })

    it('returns null when estimatedHours is zero', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ estimatedHours: 0 }))).toBeNull()
    })

    it('returns null when estimatedHours is negative', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ estimatedHours: -5 }))).toBeNull()
    })

    it('returns null when confidence is invalid', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ confidence: 'extreme' }))).toBeNull()
    })

    it('returns null when rationale is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rationale: _r, ...noRationale } = validSuggestion()
      expect(validateLLMTaskSuggestion(noRationale)).toBeNull()
    })

    it('returns null when urgency is invalid', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ urgency: 'asap' }))).toBeNull()
    })

    it('returns null when requiredSkillLevel is out of range (5)', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ requiredSkillLevel: 5 }))).toBeNull()
    })

    it('returns null when requiredSkillLevel is negative', () => {
      expect(validateLLMTaskSuggestion(validSuggestion({ requiredSkillLevel: -1 }))).toBeNull()
    })
  })

  describe('valid inputs', () => {
    it('returns a valid suggestion for a minimal valid object', () => {
      const result = validateLLMTaskSuggestion(validSuggestion())
      expect(result).not.toBeNull()
      expect(result!.title).toBe('Set up Salesforce CTI connector')
      expect(result!.estimatedHours).toBe(8)
      expect(result!.confidence).toBe('medium')
    })

    it('caps estimatedHours at 35', () => {
      const result = validateLLMTaskSuggestion(validSuggestion({ estimatedHours: 50 }))
      expect(result).not.toBeNull()
      expect(result!.estimatedHours).toBe(35)
    })

    it('accepts estimatedHours exactly at 35', () => {
      const result = validateLLMTaskSuggestion(validSuggestion({ estimatedHours: 35 }))
      expect(result!.estimatedHours).toBe(35)
    })

    it('accepts all valid confidence values', () => {
      for (const confidence of ['low', 'medium', 'high']) {
        const result = validateLLMTaskSuggestion(validSuggestion({ confidence }))
        expect(result).not.toBeNull()
        expect(result!.confidence).toBe(confidence)
      }
    })

    it('accepts all valid urgency values', () => {
      for (const urgency of ['critical', 'high', 'normal', 'low']) {
        const result = validateLLMTaskSuggestion(validSuggestion({ urgency }))
        expect(result).not.toBeNull()
        expect(result!.urgency).toBe(urgency)
      }
    })

    it('accepts all valid requiredSkillLevel values (0–4)', () => {
      for (const level of [0, 1, 2, 3, 4]) {
        const result = validateLLMTaskSuggestion(validSuggestion({ requiredSkillLevel: level }))
        expect(result).not.toBeNull()
        expect(result!.requiredSkillLevel).toBe(level)
      }
    })

    it('filters out malformed evidenceUsed entries (missing ref)', () => {
      const result = validateLLMTaskSuggestion(validSuggestion({
        evidenceUsed: [
          { sourceType: 'jira', ref: 'ATI-123' },   // valid
          { sourceType: 'jira' },                    // missing ref → filtered
          { ref: 'some-ref' },                        // missing sourceType → kept (defaults to heuristic)
        ],
      }))
      expect(result).not.toBeNull()
      // Only entries with a `ref` string survive
      expect(result!.evidenceUsed).toHaveLength(2)
      expect(result!.evidenceUsed[0].ref).toBe('ATI-123')
    })

    it('normalizes unknown sourceType to heuristic', () => {
      const result = validateLLMTaskSuggestion(validSuggestion({
        evidenceUsed: [{ sourceType: 'unknown', ref: 'FOO-1' }],
      }))
      expect(result!.evidenceUsed[0].sourceType).toBe('heuristic')
    })

    it('trims whitespace from title', () => {
      const result = validateLLMTaskSuggestion(validSuggestion({ title: '  My Task  ' }))
      expect(result!.title).toBe('My Task')
    })

    it('omits optional fields when absent', () => {
      const result = validateLLMTaskSuggestion(validSuggestion())
      expect(result!.description).toBeUndefined()
      expect(result!.requiredSkill).toBeUndefined()
      expect(result!.requiredSkillLevel).toBeUndefined()
      expect(result!.urgency).toBeUndefined()
      expect(result!.domainTag).toBeUndefined()
    })
  })
})

// ── buildInitiativePack ───────────────────────────────────────

describe('buildInitiativePack', () => {
  it('returns pack with correct initiativeId, initiativeName, priority', () => {
    const project = makeProject('pp-test')
    const pack = buildInitiativePack(project, 100_000)
    expect(pack.initiativeId).toBe('pp-test')
    expect(pack.initiativeName).toBe('Project pp-test')
    expect(pack.priority).toBe('high')
  })

  it('maps epics with epicId, epicTitle, existingTasks', () => {
    const wi = makeWorkItem('task-1', 'epic-1', { title: 'Do the thing' })
    const epic = makeEpic('epic-1', 'pp-test', [wi])
    const project = makeProject('pp-test', [epic])

    const pack = buildInitiativePack(project, 100_000)
    expect(pack.epics).toHaveLength(1)
    expect(pack.epics[0].epicId).toBe('epic-1')
    expect(pack.epics[0].epicTitle).toBe('Epic epic-1')
    expect(pack.epics[0].existingTasks).toEqual(['Do the thing'])
  })

  it('only includes jiraIssues for work items that have wi.jira.issueKey', () => {
    const withJira = makeWorkItem('wi-jira', 'epic-1', {
      title: 'Jira task',
      jira: { issueKey: 'ATI-42', summary: 'Jira summary', url: 'https://jira/ATI-42' },
    })
    const withoutJira = makeWorkItem('wi-no-jira', 'epic-1', { title: 'Manual task' })
    const epic = makeEpic('epic-1', 'pp-test', [withJira, withoutJira])
    const project = makeProject('pp-test', [epic])

    const pack = buildInitiativePack(project, 100_000)
    expect(pack.epics[0].existingTasks).toHaveLength(2) // both show up in existingTasks
    expect(pack.epics[0].jiraIssues).toHaveLength(1)    // only jira one
    expect(pack.epics[0].jiraIssues[0].key).toBe('ATI-42')
  })

  it('handles a project with no epics', () => {
    const project = makeProject('pp-empty')
    const pack = buildInitiativePack(project, 100_000)
    expect(pack.epics).toHaveLength(0)
  })

  describe('truncation', () => {
    it('truncates jiraIssues to 5 per epic when serialized length exceeds maxChars', () => {
      // Build an epic with 10 jira-linked work items to trigger truncation
      const workItems: PlanningWorkItem[] = Array.from({ length: 10 }, (_, i) =>
        makeWorkItem(`wi-${i}`, 'epic-1', {
          title: `Task ${i}`,
          jira: {
            issueKey: `ATI-${i}`,
            summary: `Summary for task ${i} — a reasonably long description to inflate the payload`,
            url: `https://jira/ATI-${i}`,
          },
        })
      )
      const epic = makeEpic('epic-1', 'pp-test', workItems)
      const project = makeProject('pp-test', [epic])

      // Use a very small maxChars to force truncation
      const pack = buildInitiativePack(project, 100)
      expect(pack.epics[0].jiraIssues.length).toBeLessThanOrEqual(5)
    })

    it('does not truncate when under the limit', () => {
      const workItems: PlanningWorkItem[] = Array.from({ length: 3 }, (_, i) =>
        makeWorkItem(`wi-${i}`, 'epic-1', {
          title: `Task ${i}`,
          jira: { issueKey: `ATI-${i}`, summary: `S${i}`, url: `https://j/ATI-${i}` },
        })
      )
      const epic = makeEpic('epic-1', 'pp-test', workItems)
      const project = makeProject('pp-test', [epic])

      const pack = buildInitiativePack(project, 100_000)
      expect(pack.epics[0].jiraIssues).toHaveLength(3)
    })
  })
})
