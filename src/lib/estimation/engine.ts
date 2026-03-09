// ============================================================
// Estimation Engine — Stub
// TODO Wave 2: replace with AI-assisted or rule-based estimation
// TODO Wave 3: integrate with historical Jira velocity data
// ============================================================
import type { Issue, IssueEstimate, ResourceType } from '@/types/domain'
import { ResourceType as RT } from '@/types/domain'

function storyPointsToHours(points?: number): number {
  // TODO Wave 2: calibrate against actual team velocity
  const HOURS_PER_POINT = 4
  return (points ?? 3) * HOURS_PER_POINT
}

function selectResourceType(issue: Issue): ResourceType {
  // TODO Wave 2: use issue type, labels, and component to determine resource
  if (issue.issueType === 'bug') return RT.DEVELOPER
  if (issue.issueType === 'task' && issue.labels.includes('admin')) return RT.ADMIN
  return RT.DEVELOPER
}

export function estimateIssue(issue: Issue): IssueEstimate {
  // TODO Wave 2: replace with AI/rule-based estimation using issue context
  const estimatedHours = storyPointsToHours(issue.storyPoints)
  return {
    issueId: issue.id,
    estimatedHours,
    confidence: issue.storyPoints ? 'medium' : 'low',
    rationale: `TODO Wave 2: replace with AI/rule-based estimation. Current: ${issue.storyPoints ?? 3} story points × 4h/point = ${estimatedHours}h`,
    assumptions: [
      'Using 4 hours per story point (placeholder rate)',
      'No historical velocity data available yet',
      'Wave 2 will calibrate against actual team throughput',
    ],
    resourceType: selectResourceType(issue),
  }
}
