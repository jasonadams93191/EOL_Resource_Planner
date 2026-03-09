'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { mockAllPlanningProjects } from '@/lib/mock/planning-data'
import { TEAM_MEMBERS, SKILLS } from '@/lib/mock/team-data'
import { buildSprintRoadmap } from '@/lib/planning/sprint-engine'
import type { SprintRoadmap } from '@/lib/planning/sprint-engine'
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
  BLOCKER_TYPE_LABELS,
  BLOCKER_TYPE_ICONS,
} from '@/types/planning'
import type {
  PlanningProject,
  PlanningPriority,
  ProjectStage,
  PlanningType,
  PlanningWorkItem,
  PlanningEpic,
  ProjectBlocker,
  BlockerType,
} from '@/types/planning'

// ── Constants ─────────────────────────────────────────────────

const START_DATE = '2026-03-09'

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
  primarySkill?: string
  requiredSkillLevel?: number
  sprintNumber?: number
  status?: string
  confidence?: string
  priority?: string
}

function WorkItemRow({
  item,
  localOverride,
  onOverrideChange,
  roadmap,
}: {
  item: PlanningWorkItem
  localOverride: LocalOverride
  onOverrideChange: (updates: LocalOverride) => void
  roadmap: SprintRoadmap
}) {
  const placement = roadmap.workItemPlacements.find((p) => p.workItemId === item.id)
  const assignedMemberId = localOverride.assigneeId ?? placement?.assignedTeamMemberId ?? item.assigneeId
  const effortOverridden = localOverride.estimatedHours !== undefined
  const assigneeOverridden = localOverride.assigneeId !== undefined
  const skillOverridden = localOverride.primarySkill !== undefined
  const levelOverridden = localOverride.requiredSkillLevel !== undefined
  const sprintOverridden = localOverride.sprintNumber !== undefined
  const statusOverridden = localOverride.status !== undefined
  const confidenceOverridden = localOverride.confidence !== undefined
  const priorityOverridden = localOverride.priority !== undefined

  const effectiveStatus = localOverride.status ?? item.status

  const candidates = rankCandidates(
    TEAM_MEMBERS,
    item,
    { currentSprintAllocations: {}, existingProjectAssignments: new Set() }
  ).slice(0, 3)

  const readiness = workItemReadiness(item)
  const hasManualOverrides = (item.manualOverrides?.length ?? 0) > 0 || effortOverridden || assigneeOverridden || skillOverridden || levelOverridden || sprintOverridden || statusOverridden || confidenceOverridden || priorityOverridden

  return (
    <tr className={`border-t border-gray-100 text-sm ${hasManualOverrides ? 'bg-yellow-50' : 'bg-white'}`}>
      {/* Status dot + title */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[effectiveStatus] ?? 'bg-gray-300'}`} />
          {item.jira?.issueKey ? (
            item.jira.url ? (
              <a href={item.jira.url} target="_blank" rel="noopener noreferrer"
                className="text-xs rounded bg-blue-100 text-blue-700 px-1 py-0.5 font-mono shrink-0 hover:underline">
                {item.jira.issueKey}
              </a>
            ) : (
              <span className="text-xs rounded bg-blue-100 text-blue-700 px-1 py-0.5 font-mono shrink-0">{item.jira.issueKey}</span>
            )
          ) : item.aiSuggested ? (
            <span className="text-xs rounded bg-purple-100 text-purple-700 px-1 py-0.5 shrink-0" title="AI-suggested task">AI</span>
          ) : item.assumedEstimatedHours ? (
            <span className="text-xs rounded bg-teal-100 text-teal-700 px-1 py-0.5 shrink-0" title="Template-generated task">TPL</span>
          ) : (
            <span className="text-xs rounded bg-gray-100 text-gray-400 px-1 py-0.5 font-mono shrink-0" title="Manual item">[manual]</span>
          )}
          {item.assumedEstimatedHours && !item.jira?.issueKey && (
            <span className="text-xs text-amber-500" title="Hours are assumed">~h</span>
          )}
          <Link href={`/tasks/${item.id}`} className="text-gray-800 font-medium line-clamp-1 hover:text-indigo-600 hover:underline">{item.title}</Link>
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
            className={`w-16 border rounded px-1 py-0.5 text-xs bg-white text-gray-800 ${effortOverridden ? 'border-amber-400' : 'border-gray-200'}`}
          />
          <span className="text-gray-400 text-xs">h</span>
        </div>
      </td>
      {/* Primary skill (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.primarySkill ?? item.primarySkill ?? ''}
          onChange={(e) => onOverrideChange({ primarySkill: e.target.value || undefined })}
          className={`text-xs border rounded px-1 py-0.5 max-w-[120px] bg-white text-gray-800 ${skillOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          <option value="">— None —</option>
          {SKILLS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </td>
      {/* Required skill level (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.requiredSkillLevel ?? item.requiredSkillLevel ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : Number(e.target.value)
            onOverrideChange({ requiredSkillLevel: val })
          }}
          className={`text-xs border rounded px-1 py-0.5 w-14 bg-white text-gray-800 ${levelOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          <option value="">—</option>
          {[0, 1, 2, 3, 4].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </td>
      {/* Assignee (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.assigneeId ?? assignedMemberId ?? ''}
          onChange={(e) => onOverrideChange({ assigneeId: e.target.value || undefined })}
          className={`text-xs border rounded px-1 py-0.5 bg-white text-gray-800 ${assigneeOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          <option value="">— Unassigned —</option>
          {TEAM_MEMBERS.filter((m) => m.isActive).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
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
      {/* Sprint # (editable) */}
      <td className="px-3 py-2">
        <input
          type="number"
          min="1"
          max="52"
          value={localOverride.sprintNumber ?? item.sprintNumber ?? placement?.sprintNumber ?? ''}
          onChange={(e) => {
            const val = parseInt(e.target.value)
            onOverrideChange({ sprintNumber: isNaN(val) ? undefined : val })
          }}
          placeholder="—"
          className={`w-12 border rounded px-1 py-0.5 text-xs bg-white text-gray-800 ${sprintOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        />
      </td>
      {/* Status (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.status ?? item.status}
          onChange={(e) => onOverrideChange({ status: e.target.value })}
          className={`text-xs border rounded px-1 py-0.5 bg-white text-gray-800 ${statusOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          {['not-started', 'in-progress', 'done', 'blocked', 'on-hold'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      {/* Priority (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.priority ?? item.priority ?? ''}
          onChange={(e) => onOverrideChange({ priority: e.target.value || undefined })}
          className={`text-xs border rounded px-1 py-0.5 capitalize bg-white text-gray-800 ${priorityOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          <option value="">—</option>
          {['high', 'medium', 'low'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      {/* Confidence (editable) */}
      <td className="px-3 py-2">
        <select
          value={localOverride.confidence ?? item.confidence}
          onChange={(e) => onOverrideChange({ confidence: e.target.value })}
          className={`text-xs border rounded px-1 py-0.5 capitalize bg-white text-gray-800 ${confidenceOverridden ? 'border-amber-400' : 'border-gray-200'}`}
        >
          {['high', 'medium', 'low'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      {/* Readiness */}
      <td className="px-3 py-2">
        <span className={`text-xs rounded px-1.5 py-0.5 ${ESTIMATE_READINESS_STYLES[readiness]}`}>
          {ESTIMATE_READINESS_LABELS[readiness]}
        </span>
      </td>
    </tr>
  )
}

// ── Epic Panel ────────────────────────────────────────────────

function EpicPanel({
  epic,
  localOverrides,
  onOverrideChange,
  roadmap,
}: {
  epic: import('@/types/planning').PlanningEpic
  localOverrides: Record<string, LocalOverride>
  onOverrideChange: (itemId: string, updates: LocalOverride) => void
  roadmap: SprintRoadmap
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
        <Link href={`/epics/${epic.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>{epic.title}</Link>
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
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {epic.workItems.map((item) => (
                  <WorkItemRow
                    key={item.id}
                    item={item}
                    localOverride={localOverrides[item.id] ?? {}}
                    onOverrideChange={(updates) => onOverrideChange(item.id, updates)}
                    roadmap={roadmap}
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

export default function InitiativePage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''

  // Fetch live projects from API (supports both seed and Jira-synced data)
  const [allProjects, setAllProjects] = useState<PlanningProject[] | null>(null)
  useEffect(() => {
    fetch('/api/planning')
      .then(r => r.json())
      .then(data => setAllProjects(data.projects ?? mockAllPlanningProjects))
      .catch(() => setAllProjects(mockAllPlanningProjects))
  }, [])

  const project = allProjects?.find((p) => p.id === id)
  const roadmap = useMemo(
    () => buildSprintRoadmap(allProjects ?? mockAllPlanningProjects, TEAM_MEMBERS, START_DATE),
    [allProjects]
  )

  // Local editable state — initialize once project is loaded
  const [priority, setPriority] = useState<PlanningPriority>('medium')
  const [priorityRank, setPriorityRank] = useState<number | undefined>(undefined)
  const [stage, setStage] = useState<ProjectStage>('backlog')
  const [planningType, setPlanningType] = useState<PlanningType | undefined>(undefined)
  const [owner, setOwner] = useState<string | undefined>(undefined)
  const [localOverrides, setLocalOverrides] = useState<Record<string, LocalOverride>>({})
  const [localEpics, setLocalEpics] = useState<PlanningEpic[]>([])
  const [addingEpic, setAddingEpic] = useState(false)
  const [newEpicTitle, setNewEpicTitle] = useState('')
  // Jira sync state
  const [syncing, setSyncing] = useState(false)
  const [syncFlash, setSyncFlash] = useState('')
  const [syncError, setSyncError] = useState('')
  // Blockers
  const [blockers, setBlockers] = useState<ProjectBlocker[]>([])
  const [addingBlocker, setAddingBlocker] = useState(false)
  const [newBlocker, setNewBlocker] = useState<{
    type: BlockerType; title: string; description: string;
    minDays: number; maxDays: number; startAfterDate: string; resolutionDate: string;
  }>({ type: 'vendor', title: '', description: '', minDays: 60, maxDays: 90, startAfterDate: '', resolutionDate: '' })

  // Initialize local fields when project loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (project) {
      setPriority(project.priority ?? 'medium')
      setPriorityRank(project.priorityRank)
      setStage(project.stage ?? 'backlog')
      setPlanningType(project.planningType)
      setOwner(project.owner)
      setBlockers(project.blockers ?? [])
    }
  }, [project?.id]) // intentional: only re-init when the project ID changes

  function handleAddEpic() {
    const title = newEpicTitle.trim()
    if (!title || !project) return
    const newEpic: PlanningEpic = {
      id: `local-epic-${Date.now()}`,
      planningProjectId: project.id,
      title,
      portfolio: project.portfolio,
      status: 'not-started',
      workItems: [],
      sourceRefs: [{ sourceType: 'manual', label: 'Manual stub — added in session' }],
    }
    setLocalEpics((prev) => [...prev, newEpic])
    setNewEpicTitle('')
    setAddingEpic(false)
  }

  async function handleSyncInitiative() {
    if (!project || syncing) return
    setSyncing(true)
    setSyncError('')
    try {
      const res = await fetch('/api/jira/sync/initiative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiativeId: project.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      setSyncFlash(`✓ ${data.added} added, ${data.updated} updated`)
      setTimeout(() => setSyncFlash(''), 4000)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setSyncError(''), 5000)
    } finally {
      setSyncing(false)
    }
  }

  function handleAddBlocker() {
    const title = newBlocker.title.trim()
    if (!title) return
    const blocker: ProjectBlocker = {
      id: `blk-${Date.now()}`,
      type: newBlocker.type,
      title,
      description: newBlocker.description.trim() || undefined,
      minDays: (newBlocker.type === 'vendor' || newBlocker.type === 'dependency') ? newBlocker.minDays : undefined,
      maxDays: (newBlocker.type === 'vendor' || newBlocker.type === 'dependency') ? Math.max(newBlocker.minDays, newBlocker.maxDays) : undefined,
      startAfterDate: newBlocker.startAfterDate || undefined,
      resolutionDate: newBlocker.resolutionDate || undefined,
    }
    setBlockers((prev) => [...prev, blocker])
    setNewBlocker({ type: 'vendor', title: '', description: '', minDays: 60, maxDays: 90, startAfterDate: '', resolutionDate: '' })
    setAddingBlocker(false)
  }

  function handleItemOverride(itemId: string, updates: LocalOverride) {
    setLocalOverrides((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), ...updates },
    }))
  }

  if (allProjects === null) {
    return <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Initiative not found.</p>
        <Link href="/" className="text-indigo-600 hover:underline">← Dashboard</Link>
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
  const lastSprintNumber = projectSprintNumbers.length > 0 ? projectSprintNumbers[projectSprintNumbers.length - 1] : null
  const completionSprint = lastSprintNumber ? roadmap.sprints.find((s) => s.number === lastSprintNumber) : null

  // Compute readiness for the project
  const allEpicReadiness = project.epics.map(epicReadiness)
  const projectReadiness: import('@/types/planning').EstimateReadiness =
    allEpicReadiness.some((r) => r === 'needs-breakdown')
      ? 'needs-breakdown'
      : allEpicReadiness.every((r) => r === 'ready')
        ? 'ready'
        : 'partial'

  // Acceleration recommendation
  const acceleration = recommendAcceleration(project, allProjects ?? mockAllPlanningProjects, TEAM_MEMBERS, START_DATE)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back link + breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Dashboard</Link>
          <div className="text-xs text-gray-400 mt-1">Portfolio / {project.portfolio} / {project.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {syncFlash && <span className="text-xs text-green-600">{syncFlash}</span>}
          {syncError && <span className="text-xs text-red-500">{syncError}</span>}
          <button
            onClick={handleSyncInitiative}
            disabled={syncing}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              syncing ? 'bg-orange-300 text-white cursor-wait' : 'bg-[#f28c28] text-white hover:bg-[#e07d20]'
            }`}
            title="Re-sync this initiative's issues from Jira"
          >
            {syncing ? (
              <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Syncing…</>
            ) : (
              <>↻ Sync from Jira</>
            )}
          </button>
        </div>
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

          {/* Priority rank */}
          <span className="flex items-center gap-1">
            <span className="text-xs text-gray-400">#</span>
            <input
              type="number"
              min={1}
              max={20}
              value={priorityRank ?? ''}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                setPriorityRank(isNaN(v) ? undefined : v)
              }}
              placeholder="rank"
              className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
              title="Priority rank within band (1 = highest)"
            />
          </span>

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            {project.jira?.issueKey ? (
              <span className="text-xs rounded bg-blue-100 text-blue-700 px-2 py-0.5 font-mono">{project.jira!.issueKey}</span>
            ) : project.sourceRefs.every((r) => r.sourceType === 'manual') ? (
              <span className="text-xs rounded bg-gray-100 text-gray-400 px-2 py-0.5 font-mono" title="No Jira project linked">[manual]</span>
            ) : null}
          </div>
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

      {/* Summary stats bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
        <span><strong className="text-gray-700">{project.epics.length}</strong> epic{project.epics.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-gray-700">{allWorkItems.length}</strong> work item{allWorkItems.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-300">·</span>
        <span><strong className="text-gray-700">{allWorkItems.reduce((s, wi) => s + (wi.estimatedHours ?? 0), 0)}h</strong> total</span>
        {projectSprintNumbers.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span>
              <strong className="text-gray-700">
                {projectSprintNumbers.length === 1
                  ? `S${projectSprintNumbers[0]}`
                  : `S${projectSprintNumbers[0]}–S${projectSprintNumbers[projectSprintNumbers.length - 1]}`}
              </strong>
            </span>
          </>
        )}
        {completionSprint && (
          <>
            <span className="text-gray-300">·</span>
            <span>Est. complete: <strong className="text-gray-700">S{completionSprint.number} ({completionSprint.endDate.slice(5).replace('-', '/')})</strong></span>
          </>
        )}
        {ownerMember && (
          <>
            <span className="text-gray-300">·</span>
            <span>Owner: <strong className="text-gray-700">{ownerMember.name}</strong></span>
          </>
        )}
      </div>

      {/* Epics + work items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Epics & Work Items</h2>
          <button
            onClick={() => setAddingEpic(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Add Epic
          </button>
        </div>

        {/* Add epic inline form */}
        {addingEpic && (
          <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-4 py-3">
            <input
              autoFocus
              type="text"
              value={newEpicTitle}
              onChange={(e) => setNewEpicTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddEpic(); if (e.key === 'Escape') setAddingEpic(false) }}
              placeholder="Epic title…"
              className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={handleAddEpic} className="text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700">Save</button>
            <button onClick={() => setAddingEpic(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}

        {[...project.epics, ...localEpics].length === 0 ? (
          <p className="text-sm text-gray-400">No epics defined for this initiative.</p>
        ) : (
          [...project.epics, ...localEpics].map((epic) => (
            <EpicPanel
              key={epic.id}
              epic={epic}
              localOverrides={localOverrides}
              onOverrideChange={handleItemOverride}
              roadmap={roadmap}
            />
          ))
        )}
      </div>

      {/* Mini roadmap Gantt — epics × sprints */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Roadmap Slice</h2>
        {projectSprintNumbers.length === 0 ? (
          <p className="text-sm text-gray-400">No work items placed in sprints yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-600 font-semibold min-w-[160px]">Epic</th>
                  {projectSprintNumbers.map((sn) => {
                    const sp = roadmap.sprints.find((s) => s.number === sn)
                    return (
                      <th key={sn} className="border-b border-r border-gray-200 px-3 py-2 text-center text-gray-600 font-semibold min-w-[90px]">
                        <div>S{sn}</div>
                        {sp && <div className="font-normal text-gray-400">{sp.startDate.slice(5)}</div>}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {project.epics.map((epic) => {
                  const epicItemIds = new Set(epic.workItems.map((wi) => wi.id))
                  const epicReadinessVal = epicReadiness(epic)
                  const epicRowColor =
                    epicReadinessVal === 'ready' ? 'bg-green-50' :
                    epicReadinessVal === 'partial' ? 'bg-amber-50' : 'bg-red-50'
                  const epicBadgeStyle = ESTIMATE_READINESS_STYLES[epicReadinessVal]
                  return (
                    <tr key={epic.id} className={`border-b border-gray-100 ${epicRowColor}`}>
                      <td className="sticky left-0 border-r border-gray-200 px-3 py-2">
                        <div className="font-medium text-gray-800 truncate max-w-[150px]" title={epic.title}>{epic.title}</div>
                        <span className={`text-xs rounded px-1 py-0.5 ${epicBadgeStyle}`}>{ESTIMATE_READINESS_LABELS[epicReadinessVal]}</span>
                      </td>
                      {projectSprintNumbers.map((sn) => {
                        const cellPlacements = projectPlacements.filter(
                          (p) => p.sprintNumber === sn && epicItemIds.has(p.workItemId)
                        )
                        const cellHours = cellPlacements.reduce((s, p) => s + (p.estimatedHours ?? 0), 0)
                        return (
                          <td key={sn} className="border-r border-gray-100 px-2 py-2 text-center">
                            {cellPlacements.length > 0 ? (
                              <div>
                                <div className="text-gray-700 font-medium">{cellPlacements.length} item{cellPlacements.length !== 1 ? 's' : ''}</div>
                                <div className="text-gray-400">{cellHours}h</div>
                              </div>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Jira Field Details — all work items (full task info) */}
      <details className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <summary className="px-5 py-3 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
          Jira Field Details (full task info)
        </summary>
        <div className="px-5 pb-5 space-y-4 text-xs text-gray-600">
          {allWorkItems.map((wi) => (
            <div key={wi.id} className="border border-gray-100 rounded p-3 space-y-1">
              <div className="flex items-center gap-2 font-medium text-gray-800">
                {wi.jira?.issueKey ? (
                  <span className="font-mono text-blue-700">{wi.jira.issueKey}</span>
                ) : wi.aiSuggested ? (
                  <span className="text-purple-600">[AI-suggested]</span>
                ) : wi.assumedEstimatedHours ? (
                  <span className="text-teal-600">[Template-generated]</span>
                ) : (
                  <span className="text-gray-400">[manual]</span>
                )}
                <span>{wi.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-gray-500">
                <span>Status: <strong className="text-gray-700">{wi.jira?.status ?? wi.status}</strong></span>
                <span>Priority: <strong className="text-gray-700">{wi.jira?.priority ?? wi.priority ?? '—'}</strong></span>
                <span>Assignee: <strong className="text-gray-700">{wi.jira?.assignee?.displayName ?? '—'}</strong></span>
                <span>Reporter: <strong className="text-gray-700">{wi.jira?.reporter?.displayName ?? '—'}</strong></span>
                <span>Est. hours: <strong className="text-gray-700">{wi.estimatedHours}h{wi.assumedEstimatedHours ? ' (assumed)' : ''}</strong></span>
                <span>Confidence: <strong className="text-gray-700">{wi.confidence}</strong></span>
                {wi.jira?.labels && wi.jira.labels.length > 0 && (
                  <span className="col-span-2">Labels: {wi.jira.labels.map((l) => (
                    <span key={l} className="inline-block bg-gray-100 rounded px-1 mr-1">{l}</span>
                  ))}</span>
                )}
                {wi.jira?.updatedAt && (
                  <span className="col-span-2">Updated: {new Date(wi.jira.updatedAt).toLocaleDateString()}</span>
                )}
                {wi.jira?.description && (
                  <span className="col-span-2 text-gray-500 italic">{wi.jira.description.slice(0, 300)}{wi.jira.description.length > 300 ? '…' : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* Blockers & Dependencies */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Blockers &amp; Dependencies</h2>
            <p className="text-xs text-gray-400 mt-0.5">Vendor timelines, approvals, external dependencies, or resource constraints that affect this initiative</p>
          </div>
          <button
            onClick={() => setAddingBlocker(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Add Blocker
          </button>
        </div>

        {addingBlocker && (
          <div className="flex flex-wrap items-end gap-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Type *</label>
              <select
                value={newBlocker.type}
                onChange={(e) => setNewBlocker((p) => ({ ...p, type: e.target.value as BlockerType }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              >
                {(Object.entries(BLOCKER_TYPE_LABELS) as [BlockerType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{BLOCKER_TYPE_ICONS[val]} {label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Title *</label>
              <input
                autoFocus
                type="text"
                value={newBlocker.title}
                onChange={(e) => setNewBlocker((p) => ({ ...p, title: e.target.value }))}
                placeholder={newBlocker.type === 'vendor' ? 'e.g. RingCentral integration' : 'e.g. Legal review'}
                className="text-sm border border-gray-200 rounded px-2 py-1 w-48 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            {(newBlocker.type === 'vendor' || newBlocker.type === 'dependency') && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Min days</label>
                  <input type="number" min={1} value={newBlocker.minDays}
                    onChange={(e) => setNewBlocker((p) => ({ ...p, minDays: parseInt(e.target.value) || 1 }))}
                    className="text-sm border border-gray-200 rounded px-2 py-1 w-20 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Max days</label>
                  <input type="number" min={1} value={newBlocker.maxDays}
                    onChange={(e) => setNewBlocker((p) => ({ ...p, maxDays: parseInt(e.target.value) || 1 }))}
                    className="text-sm border border-gray-200 rounded px-2 py-1 w-20 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
                  />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Starts after</label>
              <input type="date" value={newBlocker.startAfterDate}
                onChange={(e) => setNewBlocker((p) => ({ ...p, startAfterDate: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Est. resolution</label>
              <input type="date" value={newBlocker.resolutionDate}
                onChange={(e) => setNewBlocker((p) => ({ ...p, resolutionDate: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Note</label>
              <input type="text" value={newBlocker.description}
                onChange={(e) => setNewBlocker((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description…"
                className="text-sm border border-gray-200 rounded px-2 py-1 w-48 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2e6b]"
              />
            </div>
            <button onClick={handleAddBlocker}
              className="text-sm bg-[#f28c28] text-white rounded px-3 py-1.5 hover:bg-[#d97a20] font-medium">
              Add
            </button>
            <button onClick={() => setAddingBlocker(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}

        {blockers.length === 0 ? (
          <p className="text-sm text-gray-400">No blockers or dependencies defined.</p>
        ) : (
          <div className="space-y-2">
            {blockers.map((blk) => (
              <div key={blk.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-base">{BLOCKER_TYPE_ICONS[blk.type]}</span>
                  <div>
                    <span className="text-xs rounded px-1.5 py-0.5 bg-gray-200 text-gray-600 mr-2">{BLOCKER_TYPE_LABELS[blk.type]}</span>
                    <span className="text-sm font-medium text-gray-800">{blk.title}</span>
                    {blk.minDays !== undefined && blk.maxDays !== undefined && (
                      <span className="text-sm text-gray-500 ml-2">— {blk.minDays}–{blk.maxDays} days</span>
                    )}
                    {blk.resolutionDate && (
                      <span className="text-xs text-green-600 ml-2">resolves {blk.resolutionDate}</span>
                    )}
                    {blk.startAfterDate && (
                      <span className="text-xs text-gray-400 ml-2">after {blk.startAfterDate}</span>
                    )}
                    {blk.description && (
                      <span className="text-xs text-gray-400 ml-2 italic">{blk.description}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setBlockers((prev) => prev.filter((b) => b.id !== blk.id))}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
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

    </div>
  )
}
