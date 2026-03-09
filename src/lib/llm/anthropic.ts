// ============================================================
// Anthropic LLM Client — SERVER-ONLY
//
// Never import this in client components. ANTHROPIC_API_KEY
// is a server-side secret and must never reach the browser.
//
// Role: fill gaps where Jira data is sparse/low-confidence.
// "Rules First, LLM Second" — run enhancement layer before this.
//
// READ-ONLY data: only Jira snapshot content is sent as context.
// No Jira writes occur here.
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { getLLMConfig } from '@/lib/config'
import type { PlanningProject, PlanningWorkItem } from '@/types/planning'
import { ResourceType } from '@/types/domain'

// ── LLM I/O types ────────────────────────────────────────────

export interface LLMTaskSuggestion {
  title: string
  description?: string
  estimatedHours: number          // 1–35; > 35 means split recommended
  confidence: 'low' | 'medium' | 'high'
  requiredSkill?: string
  requiredSkillLevel?: 0 | 1 | 2 | 3 | 4
  domainTag?: string
  urgency?: 'critical' | 'high' | 'normal' | 'low'
  rationale: string
  evidenceUsed: Array<{ sourceType: 'jira' | 'heuristic'; ref: string }>
}

export interface InitiativePack {
  initiativeId: string
  initiativeName: string
  priority: string
  epics: Array<{
    epicId: string
    epicTitle: string
    existingTasks: string[]  // titles of existing work items
    jiraIssues: Array<{ key: string; summary: string; status?: string; labels?: string[] }>
  }>
}

// ── Schema validation ─────────────────────────────────────────

const VALID_CONFIDENCE = new Set(['low', 'medium', 'high'])
const VALID_URGENCY    = new Set(['critical', 'high', 'normal', 'low'])
const VALID_SKILL_LEVELS = new Set([0, 1, 2, 3, 4])

export function validateLLMTaskSuggestion(raw: unknown): LLMTaskSuggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.title !== 'string' || !r.title.trim()) return null
  if (typeof r.estimatedHours !== 'number' || r.estimatedHours <= 0) return null
  if (typeof r.rationale !== 'string') return null
  if (!VALID_CONFIDENCE.has(r.confidence as string)) return null

  const urgency = r.urgency as string | undefined
  if (urgency && !VALID_URGENCY.has(urgency)) return null

  const skillLevel = r.requiredSkillLevel as number | undefined
  if (skillLevel !== undefined && !VALID_SKILL_LEVELS.has(skillLevel)) return null

  const evidenceUsed = Array.isArray(r.evidenceUsed)
    ? (r.evidenceUsed as unknown[]).filter(
        (e): e is { sourceType: string; ref: string } =>
          typeof e === 'object' && e !== null &&
          typeof (e as Record<string, unknown>).ref === 'string'
      ).map((e) => ({
        sourceType: (e.sourceType === 'jira' ? 'jira' : 'heuristic') as 'jira' | 'heuristic',
        ref: e.ref,
      }))
    : []

  return {
    title: String(r.title).trim(),
    description: typeof r.description === 'string' ? r.description : undefined,
    estimatedHours: Math.min(Number(r.estimatedHours), 35), // cap at 35; split recommended above
    confidence: r.confidence as 'low' | 'medium' | 'high',
    requiredSkill: typeof r.requiredSkill === 'string' ? r.requiredSkill : undefined,
    requiredSkillLevel: skillLevel as (0|1|2|3|4) | undefined,
    domainTag: typeof r.domainTag === 'string' ? r.domainTag : undefined,
    urgency: urgency as LLMTaskSuggestion['urgency'],
    rationale: String(r.rationale),
    evidenceUsed,
  }
}

// ── Initiative pack builder ───────────────────────────────────

export function buildInitiativePack(
  project: PlanningProject,
  maxChars: number
): InitiativePack {
  const epics = project.epics.map((epic) => ({
    epicId: epic.id,
    epicTitle: epic.title,
    existingTasks: epic.workItems.map((wi) => wi.title),
    jiraIssues: epic.workItems
      .filter((wi) => wi.jira?.issueKey)
      .map((wi) => ({
        key: wi.jira!.issueKey!,
        summary: wi.jira!.summary ?? wi.title,
        status: wi.jira!.status,
        labels: wi.jira!.labels,
      })),
  }))

  const pack: InitiativePack = {
    initiativeId: project.id,
    initiativeName: project.name,
    priority: project.priority,
    epics,
  }

  // Truncate if serialized pack exceeds maxChars
  let serialized = JSON.stringify(pack)
  if (serialized.length > maxChars) {
    // Trim jiraIssues descriptions until under limit
    for (const epic of pack.epics) {
      epic.jiraIssues = epic.jiraIssues.slice(0, 5)
      serialized = JSON.stringify(pack)
      if (serialized.length <= maxChars) break
    }
  }

  return pack
}

// ── Prompt builder ────────────────────────────────────────────

function buildPrompt(pack: InitiativePack): string {
  return `You are a senior Salesforce / Litify delivery planner.
Analyze the initiative below and suggest concrete planning work items.

STRICT RULES:
- Output VALID JSON ONLY — no markdown, no prose, no code fences.
- Hour bands: XS=1-2, S=2-6, M=6-12, L=12-20, XL=20-35. Tasks >35h must be split.
- Return an array of task objects. Each task must have:
  title, estimatedHours, confidence (low|medium|high), rationale, evidenceUsed (array).
- Optional fields: description, requiredSkill, requiredSkillLevel (0-4), domainTag, urgency (critical|high|normal|low).
- Only suggest tasks that are genuinely missing from existingTasks.
- Max 5 suggestions per initiative.

INITIATIVE:
${JSON.stringify(pack, null, 2)}

Return JSON array only:`
}

// ── Main analysis function ────────────────────────────────────

let _client: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

export async function runLLMAnalysis(pack: InitiativePack): Promise<LLMTaskSuggestion[]> {
  const cfg = getLLMConfig()
  if (!cfg.enabled) return []

  const client = getAnthropicClient()
  const prompt = buildPrompt(pack)

  let responseText: string
  try {
    const message = await client.messages.create({
      model: cfg.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = message.content[0]
    responseText = block.type === 'text' ? block.text : ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Anthropic API error: ${msg}`)
  }

  // Strip any accidental markdown fences
  const cleaned = responseText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`LLM returned invalid JSON: ${cleaned.slice(0, 200)}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`LLM returned non-array: ${cleaned.slice(0, 200)}`)
  }

  return parsed
    .map((item) => validateLLMTaskSuggestion(item))
    .filter((t): t is LLMTaskSuggestion => t !== null)
}

// ── Needs-LLM heuristic ───────────────────────────────────────

/**
 * Returns true if the initiative/epic needs LLM enrichment:
 * - All work items are low-confidence
 * - Fewer than 2 work items in any epic
 * - Any work item has no description
 */
export function needsLLMEnrichment(project: PlanningProject): boolean {
  for (const epic of project.epics) {
    if (epic.workItems.length < 2) return true
    for (const wi of epic.workItems) {
      if (wi.confidence === 'low' && !wi.jira?.description) return true
    }
  }
  return false
}

// ── LLM suggestion → PlanningWorkItem ────────────────────────

export function llmSuggestionToWorkItem(
  suggestion: LLMTaskSuggestion,
  planningEpicId: string,
  index: number
): PlanningWorkItem {
  return {
    id: `pwi-ai-${planningEpicId}-${index}`,
    title: suggestion.title,
    planningEpicId,
    status: 'not-started',
    sourceRefs: [{ sourceType: 'manual', label: 'AI-suggested' }],
    estimatedHours: suggestion.estimatedHours,
    confidence: suggestion.confidence,
    primaryRole: ResourceType.DEVELOPER,
    description: suggestion.description,
    primarySkill: suggestion.requiredSkill,
    requiredSkillLevel: suggestion.requiredSkillLevel as (0|1|2|3|4) | undefined,
    domainTag: suggestion.domainTag,
    urgency: suggestion.urgency,
    splitRecommended: suggestion.estimatedHours >= 35,
    aiSuggested: true,
    assumedEstimatedHours: true,
    assumedSkill: !suggestion.requiredSkill,
    jira: {}, // blank envelope placeholder
  }
}
