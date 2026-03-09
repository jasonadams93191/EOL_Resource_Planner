// ============================================================
// Initiative Grouping Rules
//
// Hard-coded rules that map Jira issues (by summary pattern,
// label, or epic key) to known planning initiatives.
//
// Scope: EOL and ATI projects only. READ-ONLY source data.
// ============================================================

import type { Portfolio, PlanningPriority, PlanningType, ProjectStage } from '@/types/planning'

export interface EpicGroupingRule {
  id: string
  title: string
  matchSummaryPatterns?: RegExp[]
  matchLabels?: string[]
}

export interface InitiativeGroupingRule {
  id: string
  name: string
  portfolio: Portfolio
  priority: PlanningPriority
  priorityRank: number
  planningType: PlanningType
  stage: ProjectStage
  // Match criteria — an issue matching ANY of these belongs to this initiative
  matchProjectKeys: Array<'EOL' | 'ATI'>
  matchLabels?: string[]           // issue has ≥1 of these labels
  matchSummaryPatterns?: RegExp[]  // issue summary matches ≥1 of these
  matchEpicKeys?: string[]         // issue's parent key matches ≥1 of these
  epics: EpicGroupingRule[]
}

// ── Rules — ordered by evaluation priority (most specific first) ──

export const INITIATIVE_GROUPING_RULES: InitiativeGroupingRule[] = [
  {
    id: 'pp-call-sofia',
    name: 'Call Sofia',
    portfolio: 'ATI',
    priority: 'high',
    priorityRank: 1,
    planningType: 'phased-program',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/call.?sofia/i, /\bsofia\b/i],
    matchLabels: ['call-sofia', 'callsofia'],
    epics: [
      { id: 'pe-sofia-p1', title: 'Phase 1', matchSummaryPatterns: [/phase.?1/i] },
      { id: 'pe-sofia-p2', title: 'Phase 2', matchSummaryPatterns: [/phase.?2/i] },
      { id: 'pe-sofia-p3', title: 'Phase 3', matchSummaryPatterns: [/phase.?3/i] },
      { id: 'pe-sofia-general', title: 'General / Setup', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-sales-cloud',
    name: 'AA/TKO Sales Cloud Revamp',
    portfolio: 'ATI',
    priority: 'high',
    priorityRank: 2,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/sales.?cloud/i, /next.?step.?note/i, /aa.*sales.*retir/i, /revops/i, /cadence/i, /sales.?engagement.?cadence/i],
    matchLabels: ['sales-cloud', 'revenue-ops', 'sales_cloud'],
    epics: [
      { id: 'pe-sc-enablement', title: 'Sales Cloud Enablement', matchSummaryPatterns: [/sales.?cloud/i] },
      { id: 'pe-sc-notes', title: 'Next Step Notes', matchSummaryPatterns: [/next.?step/i] },
      { id: 'pe-sc-retirement', title: 'AA Sales Member Retirement', matchSummaryPatterns: [/retir/i] },
      { id: 'pe-sc-cadences', title: 'Sales Engagement Cadences', matchSummaryPatterns: [/cadence/i, /sales.?engagement/i] },
      { id: 'pe-sc-docs', title: 'Documentation / Adoption', matchSummaryPatterns: [/doc|adoption/i] },
    ],
  },
  {
    id: 'pp-ringcentral',
    name: 'RingCentral Setup',
    portfolio: 'cross-workspace',
    priority: 'medium',
    priorityRank: 1,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL', 'ATI'],
    matchSummaryPatterns: [/ringcentral/i, /ringsense/i, /\bcti\b/i],
    matchLabels: ['ringcentral', 'telephony', 'cti'],
    epics: [
      { id: 'pe-rc-setup', title: 'RingCentral Setup', matchSummaryPatterns: [/ringcentral.?setup/i] },
      { id: 'pe-rc-ringsense', title: 'RingSense AI', matchSummaryPatterns: [/ringsense/i] },
      { id: 'pe-rc-cti', title: 'EOL CTI Integration', matchSummaryPatterns: [/\bcti\b/i] },
    ],
  },
  {
    id: 'pp-intake360',
    name: 'Intake360 / Intake Automation',
    portfolio: 'ATI',
    priority: 'medium',
    priorityRank: 2,
    planningType: 'delivery-project',
    stage: 'defined',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/intake.?360/i, /intake.?auto/i, /intake.?form/i, /\bintake\b/i],
    matchLabels: ['intake', 'intake360'],
    epics: [
      { id: 'pe-intake-forms', title: 'Intake Forms', matchSummaryPatterns: [/form/i] },
      { id: 'pe-intake-routing', title: 'Routing & Automation', matchSummaryPatterns: [/routing|auto/i] },
      { id: 'pe-intake-reporting', title: 'Reporting', matchSummaryPatterns: [/report/i] },
    ],
  },
  {
    id: 'pp-doc-retrieval',
    name: 'AI Document Retrieval / RAG',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 1,
    planningType: 'evaluation-discovery',
    stage: 'discovery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/document.?retrieval/i, /\brag\b/i, /vector.?search/i, /ai.?doc/i],
    matchLabels: ['rag', 'ai', 'document-retrieval'],
    epics: [
      { id: 'pe-rag-poc', title: 'POC / Evaluation', matchSummaryPatterns: [/poc|eval/i] },
      { id: 'pe-rag-impl', title: 'Implementation', matchSummaryPatterns: [/impl|build/i] },
    ],
  },
  // ── EOL Initiatives (reclassified from orphans) ──────────────

  {
    id: 'pp-booking-engine',
    name: 'Booking Engine & Distribution Setup',
    portfolio: 'EOL',
    priority: 'medium',
    priorityRank: 3,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/booking.?engine/i, /distribution.?engine/i, /attorney.?assignment/i, /scheduling.?onboarding/i],
    epics: [
      { id: 'pe-booking-main', title: 'Booking Engine & Distribution Setup', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-noca-ai',
    name: 'NOCA AI Meeting Intelligence',
    portfolio: 'EOL',
    priority: 'medium',
    priorityRank: 4,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/noca.?ai/i, /\botter\b/i, /record.?team.?meeting/i],
    epics: [
      { id: 'pe-noca-ai-main', title: 'NOCA AI Meeting Intelligence', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-docrio',
    name: 'Document Management (Docrio)',
    portfolio: 'EOL',
    priority: 'medium',
    priorityRank: 5,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/docrio/i, /pandadoc/i, /pandadocs/i, /document.?request/i, /dropboxsign/i],
    epics: [
      { id: 'pe-docrio-main', title: 'Document Management (Docrio)', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-tiktok-ads',
    name: 'TikTok Ads Integration',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 6,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/tiktok/i, /tik.?tok/i],
    epics: [
      { id: 'pe-tiktok-main', title: 'TikTok Ads Integration', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-ai-litify',
    name: 'AI Enablement for Litify',
    portfolio: 'EOL',
    priority: 'medium',
    priorityRank: 7,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/ai.?enablement.+litify/i],
    epics: [
      { id: 'pe-ai-litify-main', title: 'AI Enablement for Litify', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-doctors-map',
    name: 'Doctors Map Enhancements',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 8,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/doctor.?s?.?map/i, /provider.?location/i, /health.?care.?facility/i, /map.?layer/i, /map.?centering/i, /accepts.?llp/i],
    epics: [
      { id: 'pe-doctors-map-main', title: 'Doctors Map Enhancements', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-fb-ads',
    name: 'Facebook Ads Integration',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 9,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/fb.?ads/i, /facebook.?ad/i, /make\.com.*fb/i, /auth.?tokens?.+fb/i],
    epics: [
      { id: 'pe-fb-ads-main', title: 'Facebook Ads Integration', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-eol-campaigns',
    name: 'Campaign & Marketing Reports',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 10,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/campaign.+kpi/i, /\bdlrs\b/i, /marketing.+report/i, /department.+report/i, /lemuel.+kpi/i, /campaign.+matter/i],
    epics: [
      { id: 'pe-eol-campaigns-main', title: 'Campaign & Marketing Reports', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-hona',
    name: 'HONA Migration',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 11,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/\bhona\b/i, /titan.?form/i],
    epics: [
      { id: 'pe-hona-main', title: 'HONA Migration', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-evenup',
    name: 'EvenUp Integration',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 12,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/evenup/i, /even.?up/i],
    epics: [
      { id: 'pe-evenup-main', title: 'EvenUp Integration', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-eo-law-app',
    name: 'Ethen Ostroff Law App',
    portfolio: 'EOL',
    priority: 'medium',
    priorityRank: 13,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/ethen?.?ostroff/i, /ostroff.?law/i],
    epics: [
      { id: 'pe-eo-law-app-main', title: 'Ethen Ostroff Law App', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-litify-ui',
    name: 'Litify UI & Homepage Improvements',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 14,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [/homepage.+layout/i, /homepage.+clean/i, /ui.?improvement/i, /tab.?based.?layout/i, /lit.?component/i, /eo.?homepage/i],
    epics: [
      { id: 'pe-litify-ui-main', title: 'Litify UI & Homepage Improvements', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-eol-ops',
    name: 'EOL Platform Operations',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 15,
    planningType: 'backlog-container',
    stage: 'in-delivery',
    matchProjectKeys: ['EOL'],
    matchSummaryPatterns: [
      /quickbooks.+litify/i, /\bgrax\b/i, /wordpress.?plugin/i, /callrail/i,
      /sms.?magic/i, /retell.?ai/i, /conflict.?checker/i, /case.?opening/i,
      /in.?the.?news/i, /anthropic.?account/i, /safe.?release/i,
      /non-epic/i, /invoice.+expense/i, /nrr.?post/i, /round.?robin/i,
      /calendly.?automation/i, /lexamica/i, /submit.?ticket/i,
      /injury.?check/i, /attorney.?review/i, /formula.?field/i,
      /final.?resolution/i, /phone.?validator/i, /landing.?page.*survey/i,
      /matter.+legal.*report/i, /finance.+report/i,
    ],
    epics: [
      { id: 'pe-eol-ops-main', title: 'EOL Platform Operations', matchSummaryPatterns: [] },
    ],
  },

  // ── ATI Initiatives (reclassified from orphans) ──────────────

  {
    id: 'pp-voice-ai',
    name: 'Voice AI Platform',
    portfolio: 'ATI',
    priority: 'high',
    priorityRank: 3,
    planningType: 'delivery-project',
    stage: 'planned',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/voice.?ai/i, /conversation.?widget/i, /human.?in.?the.?loop/i, /overnight.?coverage/i, /aws.?account.?set/i],
    epics: [
      { id: 'pe-voice-ai-main', title: 'Voice AI Platform', matchSummaryPatterns: [] },
    ],
  },
  // Sales cadences are now part of pp-sales-cloud (pe-sc-cadences epic)
  {
    id: 'pp-outbound-webhooks',
    name: 'Outbound Lead Webhooks',
    portfolio: 'ATI',
    priority: 'medium',
    priorityRank: 5,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/outbound.?lead/i, /webhook/i, /payload.?builder/i, /\benqueue\b/i, /async.?sender/i, /retry.?mechanism/i],
    epics: [
      { id: 'pe-outbound-webhooks-main', title: 'Outbound Lead Webhooks', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-sf-flow-refactor',
    name: 'Salesforce Flow Refactoring',
    portfolio: 'ATI',
    priority: 'medium',
    priorityRank: 6,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/\(fullsandbox\)/i, /\(full.?sandbox\)/i, /retire.+generate.+nsn/i],
    epics: [
      { id: 'pe-sf-flow-refactor-main', title: 'Salesforce Flow Refactoring', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-aa-survey',
    name: 'AA Survey Funnel',
    portfolio: 'ATI',
    priority: 'low',
    priorityRank: 7,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/survey.?type.?funnel/i, /marketing.?waste/i, /exposure.?tier/i, /operational.?failure/i, /aa.+funnel/i],
    epics: [
      { id: 'pe-aa-survey-main', title: 'AA Survey Funnel', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-regal',
    name: 'Regal Process Management',
    portfolio: 'ATI',
    priority: 'low',
    priorityRank: 8,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/\bregal\b/i, /disposition/i],
    epics: [
      { id: 'pe-regal-main', title: 'Regal Process Management', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-aws-metadata',
    name: 'AWS Metadata App Deployment',
    portfolio: 'ATI',
    priority: 'low',
    priorityRank: 9,
    planningType: 'delivery-project',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [/metadata.?app/i, /aws.+hosting/i, /aws.+deploy/i, /aws.+infrastructure/i, /elley.+deployment/i],
    epics: [
      { id: 'pe-aws-metadata-main', title: 'AWS Metadata App Deployment', matchSummaryPatterns: [] },
    ],
  },
  {
    id: 'pp-ati-ops',
    name: 'ATI Platform Operations',
    portfolio: 'ATI',
    priority: 'low',
    priorityRank: 10,
    planningType: 'backlog-container',
    stage: 'in-delivery',
    matchProjectKeys: ['ATI'],
    matchSummaryPatterns: [
      /commission.?split/i, /record.?type.+opportunit/i, /pandadoc/i,
      /lead.?layout/i, /opted.?out/i, /certificate.+expir/i,
      /non-epic/i, /nsn.+lead/i, /populate.+account.+lookup/i,
      /quickbooks/i, /\bgrax\b/i,
    ],
    epics: [
      { id: 'pe-ati-ops-main', title: 'ATI Platform Operations', matchSummaryPatterns: [] },
    ],
  },

  // Catch-all buckets — evaluated last
  {
    id: 'pp-doc-support',
    name: 'Documentation / Support Bucket',
    portfolio: 'EOL',
    priority: 'low',
    priorityRank: 2,
    planningType: 'documentation-support',
    stage: 'backlog',
    matchProjectKeys: ['EOL', 'ATI'],
    matchLabels: ['documentation', 'support', 'wishlist', 'backlog', 'docs'],
    matchSummaryPatterns: [],
    epics: [
      { id: 'pe-doc-bucket', title: 'Documentation & Support', matchSummaryPatterns: [] },
    ],
  },
]

// ── Matcher function ──────────────────────────────────────────

/**
 * Match a Jira issue to an initiative rule.
 * Returns the first matching rule or null (issue becomes orphan).
 *
 * Matching order (any match wins):
 *   1. Epic key match (most explicit)
 *   2. Summary pattern match
 *   3. Label match
 */
export function matchIssueToInitiative(
  _issueKey: string,
  summary: string,
  labels: string[],
  projectKey: 'EOL' | 'ATI',
  parentKey?: string
): InitiativeGroupingRule | null {
  const lcLabels = labels.map((l) => l.toLowerCase())

  for (const rule of INITIATIVE_GROUPING_RULES) {
    // Must match project scope
    if (!rule.matchProjectKeys.includes(projectKey)) continue

    // 1. Epic key match
    if (parentKey && rule.matchEpicKeys?.some((k) => k === parentKey)) {
      return rule
    }

    // 2. Summary pattern match
    if (rule.matchSummaryPatterns?.some((re) => re.test(summary))) {
      return rule
    }

    // 3. Label match
    if (rule.matchLabels?.some((rl) => lcLabels.includes(rl.toLowerCase()))) {
      return rule
    }
  }

  return null
}

/**
 * Within a matched initiative, find the best-fitting epic for an issue.
 * Returns the epic id or the first epic's id if nothing matches.
 */
export function matchIssueToEpic(
  summary: string,
  labels: string[],
  rule: InitiativeGroupingRule
): string {
  const lcLabels = labels.map((l) => l.toLowerCase())

  for (const epic of rule.epics) {
    if (epic.matchSummaryPatterns?.some((re) => re.test(summary))) return epic.id
    if (epic.matchLabels?.some((el) => lcLabels.includes(el.toLowerCase()))) return epic.id
  }

  // Fallback: last epic (usually a "General" catch-all)
  return rule.epics[rule.epics.length - 1].id
}
