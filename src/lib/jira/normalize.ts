// ============================================================
// Jira Response Normalizer
// Converts raw Jira API shapes → domain types
//
// Supported projects and their issue type sets:
//   EOL (ws-eol): Task, Bug, Story, Epic, Sub-task
//   ATI (ws-ati): Task, Bug, Story, Epic, Sub-task, Request
//
// These are the only two projects — normalize to the fixed
// IssueType union rather than passing raw strings through.
// TODO Wave 2: implement full field mappings for each workspace
// ============================================================
import type { Issue, Epic, Project, IssueStatus, Priority, IssueType, WorkspaceId } from '@/types/domain'
import type { RawJiraIssue, RawJiraProject } from './client'

// TODO Wave 2: map Jira status names → IssueStatus
function normalizeStatus(jiraStatus: string): IssueStatus {
  const map: Record<string, IssueStatus> = {
    'To Do': 'todo',
    'In Progress': 'in-progress',
    'In Review': 'in-review',
    Done: 'done',
    Blocked: 'blocked',
  }
  return map[jiraStatus] ?? 'todo'
}

// TODO Wave 2: map Jira priority names → Priority
function normalizePriority(jiraPriority: string): Priority {
  const map: Record<string, Priority> = {
    Highest: 'highest',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
    Lowest: 'lowest',
  }
  return map[jiraPriority] ?? 'medium'
}

// Normalize Jira issue type name → controlled IssueType enum value.
// 'Request' is ATI-specific — not present in EOL project.
function normalizeIssueType(jiraTypeName: string | undefined): IssueType {
  const map: Record<string, IssueType> = {
    story: 'story',
    bug: 'bug',
    task: 'task',
    'sub-task': 'sub-task',
    subtask: 'sub-task',
    request: 'request', // ATI only
  }
  return map[(jiraTypeName ?? '').toLowerCase()] ?? 'task'
}

export function normalizeIssue(raw: RawJiraIssue, workspaceId: WorkspaceId, projectId: string): Issue {
  // TODO Wave 2: replace stub field access with real Jira field paths
  const fields = raw.fields as unknown as Record<string, unknown>
  return {
    id: raw.id,
    title: (fields.summary as string) ?? 'Untitled',
    epicId: (fields.epic as { id?: string })?.id,
    projectId,
    workspaceId,
    status: normalizeStatus((fields.status as { name?: string })?.name ?? ''),
    priority: normalizePriority((fields.priority as { name?: string })?.name ?? ''),
    issueType: normalizeIssueType((fields.issuetype as { name?: string })?.name),
    storyPoints: (fields.story_points as number) ?? undefined,
    assigneeId: (fields.assignee as { accountId?: string })?.accountId,
    labels: (fields.labels as string[]) ?? [],
  }
}

export function normalizeEpic(raw: RawJiraIssue, projectId: string): Epic {
  // TODO Wave 2: map epic-specific Jira fields
  const fields = raw.fields as unknown as Record<string, unknown>
  const fullPriority = normalizePriority((fields.priority as { name?: string })?.name ?? '')
  // Epic.priority only supports 'high' | 'medium' | 'low' — clamp highest/lowest
  const epicPriority: Epic['priority'] =
    fullPriority === 'highest' ? 'high' : fullPriority === 'lowest' ? 'low' : fullPriority
  return {
    id: raw.id,
    title: (fields.summary as string) ?? 'Untitled Epic',
    projectId,
    status: 'todo',
    priority: epicPriority,
    storyPoints: (fields.story_points as number) ?? undefined,
  }
}

export function normalizeProject(raw: RawJiraProject, workspaceId: WorkspaceId): Project {
  // TODO Wave 2: fetch full project details including status
  return {
    id: raw.id,
    name: raw.name,
    key: raw.key,
    workspaceId,
    status: 'active',
    description: undefined,
  }
}
