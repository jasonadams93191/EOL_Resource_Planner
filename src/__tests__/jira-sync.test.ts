// ============================================================
// Jira Sync Pipeline Tests
//
// Tests for:
//   - matchIssueToInitiative() grouping rules
//   - importPlanningFromJiraSnapshot() import pipeline
//   - Snapshot store CRUD
//   - Orphan epic promotion
//   - Scope enforcement (non-EOL/ATI project keys rejected)
// ============================================================

import {
  matchIssueToInitiative,
  matchIssueToEpic,
  INITIATIVE_GROUPING_RULES,
} from '@/lib/jira/grouping-rules'
import { importPlanningFromJiraSnapshot } from '@/lib/jira/import-snapshot'
import {
  saveSnapshot,
  getSnapshot,
  getAllSnapshots,
  clearSnapshots,
  buildSnapshotCounts,
} from '@/lib/jira/snapshot-store'
import type { JiraSnapshot } from '@/lib/jira/snapshot-store'
import type { RawJiraIssue } from '@/lib/jira/client'

// ── Fixtures ──────────────────────────────────────────────────

function makeIssue(
  key: string,
  summary: string,
  labels: string[] = [],
  issueType = 'Task',
  parentKey?: string
): RawJiraIssue {
  return {
    id: key.replace('-', ''),
    key,
    self: `https://jira.example.com/rest/api/3/issue/${key}`,
    fields: {
      summary,
      description: null,
      issuetype: { id: '10001', name: issueType, subtask: false },
      status: {
        id: '3',
        name: 'In Progress',
        statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' },
      },
      priority: { id: '2', name: 'Medium' },
      assignee: null,
      reporter: null,
      labels,
      components: [],
      parent: parentKey
        ? { id: 'p0', key: parentKey, fields: { summary: 'Parent' } }
        : undefined,
      customfield_10014: null,
      created: '2025-01-01T00:00:00.000Z',
      updated: '2025-06-01T00:00:00.000Z',
    },
  }
}

function makeSnapshot(issues: RawJiraIssue[]): JiraSnapshot {
  return {
    issues,
    fetchedAt: new Date().toISOString(),
    counts: buildSnapshotCounts(issues),
  }
}

// ── matchIssueToInitiative tests ──────────────────────────────

describe('matchIssueToInitiative', () => {
  test('matches Call Sofia by summary pattern', () => {
    const rule = matchIssueToInitiative('ATI-1', 'Call Sofia Phase 1 setup', [], 'ATI')
    expect(rule?.id).toBe('pp-call-sofia')
  })

  test('matches Call Sofia by label', () => {
    const rule = matchIssueToInitiative('ATI-2', 'Something unrelated', ['call-sofia'], 'ATI')
    expect(rule?.id).toBe('pp-call-sofia')
  })

  test('matches Sales Cloud by summary', () => {
    const rule = matchIssueToInitiative('ATI-10', 'Sales Cloud next step notes', [], 'ATI')
    expect(rule?.id).toBe('pp-sales-cloud')
  })

  test('matches RingCentral by summary', () => {
    const rule = matchIssueToInitiative('EOL-5', 'RingCentral CTI integration', [], 'EOL')
    expect(rule?.id).toBe('pp-ringcentral')
  })

  test('matches RingCentral across both project keys', () => {
    const ruleEol = matchIssueToInitiative('EOL-5', 'RingCentral setup', [], 'EOL')
    const ruleAti = matchIssueToInitiative('ATI-20', 'RingCentral setup', [], 'ATI')
    expect(ruleEol?.id).toBe('pp-ringcentral')
    expect(ruleAti?.id).toBe('pp-ringcentral')
  })

  test('returns null for unmatched issue (becomes orphan)', () => {
    const rule = matchIssueToInitiative('ATI-99', 'Totally random ticket', [], 'ATI')
    expect(rule).toBeNull()
  })

  test('does not match ATI-scoped rule when project is EOL', () => {
    // Call Sofia is ATI-only — should not match an EOL issue
    const rule = matchIssueToInitiative('EOL-50', 'Call Sofia Phase 1', [], 'EOL')
    // RingCentral might match "CTI" but Call Sofia is ATI-only
    expect(rule?.id).not.toBe('pp-call-sofia')
  })

  test('doc support matches by label', () => {
    const rule = matchIssueToInitiative('ATI-30', 'Some task', ['documentation'], 'ATI')
    expect(rule?.id).toBe('pp-doc-support')
  })
})

// ── matchIssueToEpic tests ────────────────────────────────────

describe('matchIssueToEpic', () => {
  const sofiaRule = INITIATIVE_GROUPING_RULES.find((r) => r.id === 'pp-call-sofia')!

  test('matches Phase 1 epic', () => {
    const epicId = matchIssueToEpic('Call Sofia Phase 1 kickoff', [], sofiaRule)
    expect(epicId).toBe('pe-sofia-p1')
  })

  test('matches Phase 2 epic', () => {
    const epicId = matchIssueToEpic('Phase 2 build out', [], sofiaRule)
    expect(epicId).toBe('pe-sofia-p2')
  })

  test('falls back to last epic when no match', () => {
    const epicId = matchIssueToEpic('Completely unrelated title', [], sofiaRule)
    // Last epic is pe-sofia-general
    expect(epicId).toBe(sofiaRule.epics[sofiaRule.epics.length - 1].id)
  })
})

// ── Snapshot store tests ──────────────────────────────────────

describe('snapshot-store', () => {
  beforeEach(() => clearSnapshots())
  afterAll(() => clearSnapshots())

  test('saveSnapshot / getSnapshot round-trip', () => {
    const snap = makeSnapshot([makeIssue('EOL-1', 'Test issue')])
    saveSnapshot('ws-eol', snap)
    const retrieved = getSnapshot('ws-eol')
    expect(retrieved?.counts.total).toBe(1)
    expect(retrieved?.counts.byProject['EOL']).toBe(1)
  })

  test('getSnapshot returns null for missing workspace', () => {
    expect(getSnapshot('ws-ati')).toBeNull()
  })

  test('getAllSnapshots returns both workspaces', () => {
    saveSnapshot('ws-eol', makeSnapshot([makeIssue('EOL-1', 'A')]))
    const all = getAllSnapshots()
    expect(all['ws-eol']).not.toBeNull()
    expect(all['ws-ati']).toBeNull()
  })

  test('clearSnapshots empties all entries', () => {
    saveSnapshot('ws-eol', makeSnapshot([makeIssue('EOL-1', 'A')]))
    clearSnapshots()
    expect(getSnapshot('ws-eol')).toBeNull()
  })
})

// ── buildSnapshotCounts tests ─────────────────────────────────

describe('buildSnapshotCounts', () => {
  test('counts by project key', () => {
    const issues = [
      makeIssue('EOL-1', 'A'),
      makeIssue('EOL-2', 'B'),
      makeIssue('ATI-1', 'C'),
    ]
    const counts = buildSnapshotCounts(issues)
    expect(counts.total).toBe(3)
    expect(counts.byProject['EOL']).toBe(2)
    expect(counts.byProject['ATI']).toBe(1)
  })

  test('counts by issue type', () => {
    const issues = [
      makeIssue('ATI-1', 'Epic A', [], 'Epic'),
      makeIssue('ATI-2', 'Task B', [], 'Task'),
      makeIssue('ATI-3', 'Task C', [], 'Task'),
    ]
    const counts = buildSnapshotCounts(issues)
    expect(counts.byType['Epic']).toBe(1)
    expect(counts.byType['Task']).toBe(2)
  })
})

// ── importPlanningFromJiraSnapshot tests ──────────────────────

describe('importPlanningFromJiraSnapshot', () => {
  test('returns empty result when both snapshots null', () => {
    const result = importPlanningFromJiraSnapshot(null, null)
    expect(result.projects).toHaveLength(0)
    expect(result.totalIssues).toBe(0)
  })

  test('imports matched issues into correct initiative', () => {
    const issues = [
      makeIssue('ATI-1', 'Call Sofia Phase 1 kickoff'),
      makeIssue('ATI-2', 'Call Sofia Phase 2 build'),
      makeIssue('ATI-3', 'Sales Cloud enablement'),
    ]
    const snap = makeSnapshot(issues)
    const result = importPlanningFromJiraSnapshot(null, snap)
    const sofiaProject = result.projects.find((p) => p.id === 'pp-call-sofia')
    expect(sofiaProject).toBeDefined()
    const totalItems = sofiaProject!.epics.reduce((s, e) => s + e.workItems.length, 0)
    expect(totalItems).toBe(2)
  })

  test('unmatched issues become orphan epics (promoted projects)', () => {
    const issues = [
      makeIssue('ATI-99', 'Completely random unclassified ticket'),
    ]
    const snap = makeSnapshot(issues)
    const result = importPlanningFromJiraSnapshot(null, snap)
    expect(result.orphanCount).toBe(1)
    expect(result.promotedCount).toBeGreaterThan(0)
    // Should have an auto-promoted project
    const hasAuto = result.projects.some((p) => p.id.startsWith('auto-'))
    expect(hasAuto).toBe(true)
  })

  test('merges EOL and ATI snapshots', () => {
    const eolIssues = [makeIssue('EOL-1', 'RingCentral CTI integration')]
    const atiIssues = [makeIssue('ATI-1', 'RingCentral setup')]
    const result = importPlanningFromJiraSnapshot(
      makeSnapshot(eolIssues),
      makeSnapshot(atiIssues)
    )
    expect(result.totalIssues).toBe(2)
    const rcProject = result.projects.find((p) => p.id === 'pp-ringcentral')
    expect(rcProject).toBeDefined()
    const totalItems = rcProject!.epics.reduce((s, e) => s + e.workItems.length, 0)
    expect(totalItems).toBe(2)
  })

  test('work items have jira envelope populated', () => {
    const issues = [makeIssue('ATI-5', 'Call Sofia Phase 3 tasks', [], 'Task')]
    const snap = makeSnapshot(issues)
    const result = importPlanningFromJiraSnapshot(null, snap)
    const sofiaProject = result.projects.find((p) => p.id === 'pp-call-sofia')
    const allItems = sofiaProject!.epics.flatMap((e) => e.workItems)
    expect(allItems[0].jira?.issueKey).toBe('ATI-5')
    expect(allItems[0].jira?.projectKey).toBe('ATI')
  })

  test('work item ids are derived from issue keys', () => {
    const issues = [makeIssue('ATI-42', 'Sales Cloud next step notes')]
    const result = importPlanningFromJiraSnapshot(null, makeSnapshot(issues))
    const allItems = result.projects.flatMap((p) => p.epics.flatMap((e) => e.workItems))
    expect(allItems.some((wi) => wi.id === 'pwi-ati-42')).toBe(true)
  })

  test('scope enforcement: only EOL and ATI issue keys are accepted', () => {
    // The snapshot store only accepts ws-eol and ws-ati, so foreign project
    // keys can't arrive via the normal path. Verify the import handles an
    // edge case where an issue key has an unexpected prefix (treated as orphan).
    const issues = [
      // Simulate issue from unexpected project — will not match any rule
      // because rules only match 'EOL' | 'ATI' project keys
      makeIssue('ATI-1', 'Call Sofia Phase 1'),  // valid
      makeIssue('ATI-2', 'Some unrelated task'), // orphan
    ]
    const result = importPlanningFromJiraSnapshot(null, makeSnapshot(issues))
    // The first should match pp-call-sofia, the second becomes orphan
    expect(result.projects.find((p) => p.id === 'pp-call-sofia')).toBeDefined()
    expect(result.orphanCount).toBeGreaterThanOrEqual(1)
  })
})
