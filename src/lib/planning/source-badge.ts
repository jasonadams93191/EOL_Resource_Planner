// ============================================================
// Source Badge Utilities
//
// Shared helper for deriving source badge label/style from a
// PlanningWorkItem's id and jira envelope.
// ============================================================

export type SourceKind = 'jira' | 'template' | 'ai' | 'manual'

export function getSourceKind(wiId: string, hasJiraKey: boolean): SourceKind {
  if (hasJiraKey) return 'jira'
  if (wiId.startsWith('pwi-tpl-')) return 'template'
  if (wiId.startsWith('pwi-ai-')) return 'ai'
  return 'manual'
}

export const SOURCE_BADGE_STYLES: Record<SourceKind, string> = {
  jira:     'bg-blue-100 text-blue-700',
  template: 'bg-teal-100 text-teal-700',
  ai:       'bg-indigo-100 text-indigo-700',
  manual:   'bg-gray-100 text-gray-600',
}

export const SOURCE_BADGE_LABELS: Record<SourceKind, string> = {
  jira:     'Jira',
  template: 'TPL',
  ai:       'AI',
  manual:   'Manual',
}
