// ============================================================
// Analysis Domain Types
//
// Used by the Rovo-style analysis engine (JQL-based).
// Evidence is gathered from Jira search results.
// READ-ONLY — no Jira writes permitted.
// ============================================================

export interface EvidenceRef {
  id: string
  sourceType: 'jira' | 'confluence'
  title: string
  url?: string
  issueKey?: string
  snippet?: string      // first 200 chars of description or comment
  whyRelevant: string   // human-readable reason this evidence is relevant
  retrievedAt: string   // ISO timestamp
}

export interface WorkItemAnalysis {
  workItemId?: string   // undefined = suggested task not yet in Jira
  title: string
  estimatedHours: number
  confidence: 'low' | 'medium' | 'high'
  primarySkill?: string
  requiredSkillLevel?: number
  candidateAssigneeIds?: string[]
  evidenceRefs: EvidenceRef[]
  isSuggested: boolean  // true = engine-suggested task, not from Jira
}

export interface InitiativeAnalysis {
  projectId: string
  analyzedAt: string
  workItemAnalyses: WorkItemAnalysis[]
  evidenceRefs: EvidenceRef[]   // initiative-level evidence
}

export interface AnalysisResult {
  analyzedAt: string
  initiatives: InitiativeAnalysis[]
}
