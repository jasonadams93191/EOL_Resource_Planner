'use client'

import { useState } from 'react'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS } from '@/lib/mock/team-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import { analyzeBottlenecks } from '@/lib/planning/bottleneck-engine'
import { recommendAcceleration } from '@/lib/planning/acceleration-engine'
import { getInitiativeWarnings, epicReadiness, workItemReadiness } from '@/lib/planning/readiness-engine'
import { rankCandidates } from '@/lib/planning/assignment-engine'
import {
  PROJECT_STAGE_LABELS,
  EFFORT_BAND_LABELS,
  PLANNING_TYPE_LABELS,
  PLANNING_TYPE_STYLES,
  ESTIMATE_READINESS_LABELS,
  ESTIMATE_READINESS_STYLES,
} from '@/types/planning'
import type {
  PlanningProject,
  PlanningPriority,
  ProjectStage,
  PlanningType,
  ManualOverride,
  PlanningWorkItem,
} from '@/types/planning'

// ── Constants ─────────────────────────────────────────────────

const START_DATE = '2026-03-09'

const roadmap = buildSprintRoadmap(mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)

// Suppress unused import warning — analyzeBottlenecks is imported per spec
void analyzeBottlenecks

const PRIORITY_STYLES: Record<PlanningPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
}

const STAGE_STYLES: Record<ProjectStage, string> = {
  'backlog': 'bg-gray-100 text-gray-500',
  'discovery': 'bg-blue-100 text-blue-600',
  'defined': 'bg-indigo-100 text-indigo-600',
  'ready-for-planning': 'bg-purple-100 text-purple-600',
  'planned': 'bg-violet-100 text-violet-700',
  'in-delivery': 'bg-green-100 text-green-700',
  'complete': 'bg-emerald-100 text-emerald-700',
  'archived': 'bg-gray-100 text-gray-400',
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300',
}

const STATUS_DOT: Record<string, string> = {
  'not-started': 'bg-gray-400',
  'in-progress': 'bg-blue-500',
  'done': 'bg-green-500',
  'blocked': 'bg-red-500',
  'on-hold': 'bg-amber-400',
}

const WARNING_SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  critical: 'bg-red-50 text-red-700 border-red-100',
}

const ALL_STAGES = Object.entries(PROJECT_STAGE_LABELS) as [ProjectStage, string][]
const ALL_PRIORITIES: PlanningPriority[] = ['high', 'medium', 'low']
const ALL_PLANNING_TYPES = Object.entries(PLANNING_TYPE_LABELS) as [PlanningType, string][]

// ── Work Item Row ─────────────────────────────────────────────

interface LocalOverride {
  estimatedHours?: number
  assigneeId?: string
}

function WorkItemRow({
  item,
  localOverride,
  onOverrideChange,
}: {
  item: PlanningWorkItem
  localOverride: LocalOverride
  onOverrideChange: (updates: LocalOverride) => void
}) {
  const placement = roadmap.workItemPlacements.find((p) => p.workItemId === item.id)
  const assignedMemberId = localOverride.assigneeId ?? placement?.assignedTeamMemberId ?? item.assigneeId
  const assignedMember = assignedMemberId ? TEAM_MEMBERS.find((m) => m.id === assignedMemberId) : undefined
  const effortOverridden = localOverride.estimatedHours !== undefined
  const assigneeOverridden = localOverride.assigneeId !== undefined

  const candidates = rankCandidates(
    TEAM_MEMBERS,
    item,
    { currentSprintAllocations: {}, existingProjectAssignments: new Set() }
  ).slice(0, 3)

  const skillName = item.primarySkill ? SKILLS.find((s) => s.id === item.primarySkill)?.name ?? item.primarySkill : null
  const readiness = workItemReadiness(item)
  const hasManualOverrides = (item.manualOverrides?.length ?? 0) > 0 || effortOverridden || assigneeOverridden

  return (
    <tr className={`border-t border-gray-100 text-sm ${hasManualOverrides ? 'bg-yellow-50' : 'bg-white'}`}>
      {/* Status dot + title */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] ?? 'bg-gray-300'}`} />
          <span className="text-gray-800 font-medium line-clamp-1">{item.title}</span>
          {hasManualOverrides && <span title="Has manual overrides" className="text-amber-500 text-xs">⚠</span>}
        </div>
      </td>
      {/* Effort (editable) */}
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="2"
            min="1"
            max="240"
            value={localOverride.estimatedHours ?? item.estimatedHours ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val) && val > 0) {
                onOverrideChange({ estimatedHours: val })
              }
            }}
            className={`w-16 border rounded px-1 py-0.5 text-xs ${effortOverridden ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
          />
          <span className="text-gray-400 text-xs">h</span>
        </div>
      </td>
      {/* Primary skill */}
      <td className="px-3 py-2">
        {skillName && (
          <span className="text-xs rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5">{skillName}</span>
        )}
      </td>
      {/* Required skill level */}
      <td className="px-3 py-2 text-xs text-gray-500">
        {item.requiredSkillLevel != null ? `Lv ${item.requiredSkillLevel}` : '—'}
      </td>
      {/* Assignee (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.assigneeId ?? assignedMemberId ?? ''}
          onChange={(e) => onOverrideChange({ assigneeId: e.target.value || undefined })}
          className={`text-xs border rounded px-1 py-0.5 ${assigneeOverridden ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
        >
          <option value="">— Unassigned —</option>
          {TEAM_MEMBERS.filter((m) => m.isActive).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {assignedMember && (
          <span className="text-xs text-gray-400 ml-1">{assignedMember.name}</span>
        )}
      </td>
      {/* Top 3 candidates */}
      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5">
          {candidates.map((c, i) => {
            const member = TEAM_MEMBERS.find((m) => m.id === c.teamMemberId)
            return (
              <span key={i} className="text-xs text-gray-500">
                {i + 1}. {member?.name ?? c.teamMemberId} ({c.totalScore}pt)
              </span>
            )
          })}
        </div>
      </td>
      {/* Sprint # */}
      <td className="px-3 py-2 text-xs text-gray-500">
        {placement ? `S${placement.sprintNumber}` : '—'}
      </td>
      {/* Readiness */}
      <td className="px-3 py-2">
        <span className={`text-xs rounded px-1.5 py-0.5 ${ESTIMATE_READINESS_STYLES[readiness]}`}>
          {ESTIMATE_READINESS_LABELS[readiness]}
        </span>
      </td>
      {/* Confidence */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT[item.confidence] ?? 'bg-gray-300'}`} />
          <span className="text-xs text-gray-500 capitalize">{item.confidence}</span>
        </div>
      </td>
    </tr>
  )
}

// ── Epic Panel ────────────────────────────────────────────────

function EpicPanel({
  epic,
  localOverrides,
  onOverrideChange,
}: {
  epic: import('@/types/planning').PlanningEpic
  localOverrides: Record<string, LocalOverride>
  onOverrideChange: (itemId: string, updates: LocalOverride) => void
}) {
  const [open, setOpen] = useState(true)
  const readiness = epicReadiness(epic)

  // Sprint range for this epic
  const epicItemIds = new Set(epic.workItems.map((wi) => wi.id))
  const epicSprints = roadmap.workItemPlacements
    .filter((p) => epicItemIds.has(p.workItemId))
    .map((p) => p.sprintNumber)
  const minSprint = epicSprints.length > 0 ? Math.min(...epicSprints) : null
  const maxSprint = epicSprints.length > 0 ? Math.max(...epicSprints) : null
  const sprintRange = minSprint !== null && maxSprint !== null
    ? minSprint === maxSprint ? `S${minSprint}` : `S${minSprint}–S${maxSprint}`
    : 'Not placed'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Epic header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
      >
        <span className="text-sm font-medium text-gray-800">{epic.title}</span>
        <span className={`text-xs rounded px-1.5 py-0.5 ml-1 ${STATUS_DOT[epic.status] ? '' : ''} bg-gray-100 text-gray-500`}>
          {epic.status.replace('-', ' ')}
        </span>
        <span className={`text-xs rounded px-1.5 py-0.5 ${ESTIMATE_READINESS_STYLES[readiness]}`}>
          {ESTIMATE_READINESS_LABELS[readiness]}
        </span>
        <span className="text-xs text-gray-400 ml-auto mr-2">{sprintRange}</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {/* Work items table */}
      {open && (
        <div className="overflow-x-auto">
          {epic.workItems.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">No work items in this epic.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-3 py-2">Work Item</th>
                  <th className="px-3 py-2">Effort</th>
                  <th className="px-3 py-2">Skill</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Assignee</th>
                  <th className="px-3 py-2">Top Candidates</th>
                  <th className="px-3 py-2">Sprint</th>
                  <th className="px-3 py-2">Readiness</th>
                  <th className="px-3 py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {epic.workItems.map((item) => (
                  <WorkItemRow
                    key={item.id}
                    item={item}
                    localOverride={localOverrides[item.id] ?? {}}
                    onOverrideChange={(updates) => onOverrideChange(item.id, updates)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function InitiativePage({ params }: { params: { id: string } }) {
  const project: PlanningProject | undefined = mockAllPlanningProjects.find((p) => p.id === params.id)

  // Local editable state
  const [priority, setPriority] = useState<PlanningPriority>(project?.priority ?? 'medium')
  const [stage, setStage] = useState<ProjectStage>(project?.stage ?? 'backlog')
  const [planningType, setPlanningType] = useState<PlanningType | undefined>(project?.planningType)
  const [owner, setOwner] = useState<string | undefined>(project?.owner)
  const [localOverrides, setLocalOverrides] = useState<Record<string, LocalOverride>>({})

  function handleItemOverride(itemId: string, updates: LocalOverride) {
    setLocalOverrides((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), ...updates },
    }))
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Initiative not found.</p>
        <Link href="/planning" className="text-indigo-600 hover:underline">← Back to Planning</Link>
      </div>
    )
  }

  // Derived data
  const allWorkItems = project.epics.flatMap((e) => e.workItems)
  const allWorkItemIds = new Set(allWorkItems.map((wi) => wi.id))
  const ownerMember = owner ? TEAM_MEMBERS.find((m) => m.id === owner) : undefined
  const warnings = getInitiativeWarnings(project, TEAM_MEMBERS, roadmap)

  // Sprint placement
  const projectPlacements = roadmap.workItemPlacements.filter((p) => allWorkItemIds.has(p.workItemId))
  const projectSprintNumbers = Array.from(new Set(projectPlacements.map((p) => p.sprintNumber))).sort((a, b) => a - b)

  // Compute readiness for the project
  const allEpicReadiness = project.epics.map(epicReadiness)
  const projectReadiness: import('@/types/planning').EstimateReadiness =
    allEpicReadiness.some((r) => r === 'needs-breakdown')
      ? 'needs-breakdown'
      : allEpicReadiness.every((r) => r === 'ready')
        ? 'ready'
        : 'partial'

  // Acceleration recommendation
  const acceleration = recommendAcceleration(project, mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back link + breadcrumb */}
      <div>
        <Link href="/planning" className="text-sm text-indigo-600 hover:underline">← Back to Planning</Link>
        <div className="text-xs text-gray-400 mt-1">Portfolio / {project.portfolio} / {project.name}</div>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Portfolio */}
          <span className="text-xs font-semibold rounded px-2 py-0.5 bg-violet-100 text-violet-700">{project.portfolio}</span>

          {/* Priority select */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PlanningPriority)}
            className={`text-xs font-medium rounded px-2 py-0.5 border-0 cursor-pointer capitalize ${PRIORITY_STYLES[priority]}`}
          >
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Stage select */}
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as ProjectStage)}
            className={`text-xs rounded px-2 py-0.5 border-0 cursor-pointer ${STAGE_STYLES[stage]}`}
          >
            {ALL_STAGES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Planning type select */}
          <select
            value={planningType ?? ''}
            onChange={(e) => setPlanningType((e.target.value as PlanningType) || undefined)}
            className={`text-xs rounded px-2 py-0.5 border-0 cursor-pointer ${planningType ? PLANNING_TYPE_STYLES[planningType] : 'bg-gray-100 text-gray-500'}`}
          >
            <option value="">No type</option>
            {ALL_PLANNING_TYPES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Readiness */}
          <span className={`text-xs rounded px-1.5 py-0.5 ${ESTIMATE_READINESS_STYLES[projectReadiness]}`}>
            {ESTIMATE_READINESS_LABELS[projectReadiness]}
          </span>
        </div>

        {/* Name */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1">{project.description}</p>
          )}
        </div>

        {/* Confidence + effort band + owner */}
        <div className="flex flex-wrap items-center gap-4">
          {project.confidence && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${CONFIDENCE_DOT[project.confidence]}`} />
              <span className="capitalize">{project.confidence} confidence</span>
            </span>
          )}
          {project.effortBand && (
            <span className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
              {project.effortBand} · {EFFORT_BAND_LABELS[project.effortBand]}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Owner:</span>
            <select
              value={owner ?? ''}
              onChange={(e) => setOwner(e.target.value || undefined)}
              className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
            >
              <option value="">— Unassigned —</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{!m.isActive ? ' (inactive)' : ''}</option>
              ))}
            </select>
            {ownerMember && !ownerMember.isActive && (
              <span className="text-xs text-red-500">(inactive)</span>
            )}
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className={`text-xs rounded px-2 py-1 border ${WARNING_SEVERITY_STYLES[w.severity]}`}>
                {w.message}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <p className="text-xs text-gray-400 italic">{project.notes}</p>
        )}
      </div>

      {/* Epics + work items */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Epics & Work Items</h2>
        {project.epics.length === 0 ? (
          <p className="text-sm text-gray-400">No epics defined for this initiative.</p>
        ) : (
          project.epics.map((epic) => (
            <EpicPanel
              key={epic.id}
              epic={epic}
              localOverrides={localOverrides}
              onOverrideChange={handleItemOverride}
            />
          ))
        )}
      </div>

      {/* Sprint placement */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Sprint Placement</h2>
        {projectSprintNumbers.length === 0 ? (
          <p className="text-sm text-gray-400">No work items placed in sprints yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projectSprintNumbers.map((sprintNum) => {
              const sprint = roadmap.sprints.find((s) => s.number === sprintNum)
              const itemsInSprint = projectPlacements.filter((p) => p.sprintNumber === sprintNum).length
              return (
                <div key={sprintNum} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                  <div className="text-xs font-semibold text-indigo-700">Sprint {sprintNum}</div>
                  {sprint && (
                    <div className="text-xs text-indigo-500">
                      {sprint.startDate} – {sprint.endDate}
                    </div>
                  )}
                  <div className="text-xs text-indigo-400">{itemsInSprint} item{itemsInSprint !== 1 ? 's' : ''}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Source refs */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Source References</h2>
        <div className="flex flex-wrap gap-2">
          {project.sourceRefs.map((ref, i) => (
            <span
              key={i}
              className={`text-xs rounded-full px-2.5 py-1 ${
                ref.sourceType === 'jira'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {ref.sourceType === 'jira' ? '🔗 ' : '📝 '}
              {ref.label ?? `${ref.workspaceId ?? 'unknown'} / ${ref.projectKey ?? ''}`}
            </span>
          ))}
          {/* Epic source refs */}
          {project.epics.flatMap((e) => e.sourceRefs).map((ref, i) => (
            <span
              key={`epic-${i}`}
              className={`text-xs rounded-full px-2.5 py-1 opacity-75 ${
                ref.sourceType === 'jira'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {ref.label ?? `${ref.workspaceId ?? 'manual'}`}
            </span>
          ))}
        </div>
      </div>

      {/* Speed Up Initiative */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Speed Up Initiative</h2>
        <p className="text-xs text-gray-400 mb-3">
          Simulates adding a temp resource to estimate sprint savings.
        </p>
        {acceleration.currentSprintCount === 0 ? (
          <p className="text-sm text-gray-400">No work items placed in the roadmap yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Current: <strong className="text-gray-800">{acceleration.currentSprintCount} sprint{acceleration.currentSprintCount !== 1 ? 's' : ''}</strong></span>
              {acceleration.bestCandidate && acceleration.bestCandidate.sprintReduction > 0 && (
                <>
                  <span className="text-gray-300">→</span>
                  <span className="text-green-700">Best case: <strong>{acceleration.projectedSprintCount} sprint{acceleration.projectedSprintCount !== 1 ? 's' : ''}</strong> (−{acceleration.bestCandidate.sprintReduction})</span>
                </>
              )}
            </div>
            {acceleration.noImpactReason ? (
              <p className="text-xs text-gray-400">{acceleration.noImpactReason}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-3 py-2 font-semibold border-b border-gray-200">Resource</th>
                      <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Score</th>
                      <th className="px-3 py-2 font-semibold border-b border-gray-200 text-center">Sprints Saved</th>
                      <th className="px-3 py-2 font-semibold border-b border-gray-200">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceleration.topCandidates.map((c, i) => (
                      <tr key={c.template.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {i === 0 && <span className="mr-1 text-amber-500">★</span>}
                          {c.template.label}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded px-1.5 py-0.5 font-medium ${c.totalScore >= 30 ? 'bg-green-100 text-green-700' : c.totalScore >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {c.totalScore}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700">
                          {c.sprintReduction > 0 ? `−${c.sprintReduction}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{c.explanation.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual overrides summary */}
      {Object.keys(localOverrides).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-yellow-800 mb-2">⚠ Session Overrides (not persisted)</h2>
          <div className="space-y-1">
            {Object.entries(localOverrides).map(([itemId, override]) => {
              const item = allWorkItems.find((wi) => wi.id === itemId)
              const overrideList: ManualOverride[] = []
              if (override.estimatedHours !== undefined) {
                overrideList.push({ field: 'estimatedHours', originalValue: item?.estimatedHours ?? 0, overriddenValue: override.estimatedHours })
              }
              if (override.assigneeId !== undefined) {
                const member = TEAM_MEMBERS.find((m) => m.id === override.assigneeId)
                overrideList.push({ field: 'assigneeId', originalValue: item?.assigneeId ?? '', overriddenValue: member?.name ?? override.assigneeId })
              }
              return overrideList.map((o, j) => (
                <div key={`${itemId}-${j}`} className="text-xs text-yellow-700">
                  <span className="font-medium">{item?.title ?? itemId}</span>: {o.field} changed from {String(o.originalValue) || '—'} to {String(o.overriddenValue)}
                </div>
              ))
            })}
          </div>
        </div>
      )}
    </div>
  )
}
