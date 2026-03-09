'use client'

import { useState } from 'react'
import type { PlanningProject, PlanningEpic, PlanningWorkItem } from '@/types/planning'
import type { WorkItemEstimate } from '@/types/planning'
import { SKILL_LEVEL_LABELS } from '@/types/planning'

interface ProjectEpicViewProps {
  projects: PlanningProject[]
  estimates?: Record<string, WorkItemEstimate>
}

const STATUS_STYLES: Record<string, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  'on-hold': 'bg-orange-100 text-orange-700',
}
const STATUS_LABEL: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  'on-hold': 'On Hold',
}

const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-200 text-red-800',
  high: 'bg-red-100 text-red-700',
  normal: 'bg-gray-100 text-gray-600',
  low: 'bg-green-50 text-green-700',
}

const CONFIDENCE_STYLES: Record<string, string> = {
  low: 'bg-red-50 text-red-600',
  medium: 'bg-yellow-50 text-yellow-700',
  high: 'bg-green-50 text-green-700',
}

function SkillChip({ skillId }: { skillId: string }) {
  const label = skillId.replace('skill-', '').replace(/-/g, ' ')
  return (
    <span className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
      {label}
    </span>
  )
}

function WorkItemRow({ item, estimate }: { item: PlanningWorkItem; estimate?: WorkItemEstimate }) {
  return (
    <div className={`flex items-start gap-2 py-2 px-3 rounded ${item.status === 'done' ? 'opacity-60' : ''} hover:bg-gray-50`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
          {item.priority === 'high' && (
            <span className="text-xs rounded px-1.5 py-0.5 bg-red-100 text-red-700">High</span>
          )}
          {item.urgency && item.urgency !== 'normal' && (
            <span className={`text-xs rounded px-1.5 py-0.5 ${URGENCY_STYLES[item.urgency]}`}>
              {item.urgency}
            </span>
          )}
          <span className={`text-xs rounded px-1.5 py-0.5 ${CONFIDENCE_STYLES[item.confidence]}`}>
            {item.confidence} conf
          </span>
        </div>
        <p className={`text-sm ${item.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {item.primarySkill && <SkillChip skillId={item.primarySkill} />}
          {item.secondarySkill && <SkillChip skillId={item.secondarySkill} />}
          {item.requiredSkillLevel != null && (
            <span className="text-xs text-gray-400">
              lvl {item.requiredSkillLevel} ({SKILL_LEVEL_LABELS[item.requiredSkillLevel]})
            </span>
          )}
          {item.domainTag && (
            <span className="text-xs rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
              {item.domainTag}
            </span>
          )}
        </div>
      </div>
      <div className="text-right text-xs text-gray-500 whitespace-nowrap shrink-0 mt-0.5">
        <div>{item.effortHours}h</div>
        {item.effortInSprints && <div>{item.effortInSprints.toFixed(2)} sp</div>}
        {estimate?.suggestedAssigneeId && (
          <div className="text-indigo-600 mt-0.5">
            #{estimate.suggestedAssigneeId.replace('tm-', '')}
          </div>
        )}
      </div>
    </div>
  )
}

function EpicPanel({ epic, estimates }: { epic: PlanningEpic; estimates?: Record<string, WorkItemEstimate> }) {
  const [expanded, setExpanded] = useState(true)
  const totalHours = epic.workItems.reduce((s, wi) => s + wi.effortHours, 0)
  const doneCount = epic.workItems.filter((wi) => wi.status === 'done').length

  return (
    <div className="rounded border border-gray-200 bg-white mb-3">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
        <span className="font-medium text-sm text-gray-800 flex-1">{epic.title}</span>
        <span className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLES[epic.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABEL[epic.status] ?? epic.status}
        </span>
        <span className="text-xs text-gray-400 ml-2">
          {doneCount}/{epic.workItems.length} · {totalHours}h
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {epic.workItems.map((item) => (
            <WorkItemRow
              key={item.id}
              item={item}
              estimate={estimates?.[item.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectEpicView({ projects, estimates }: ProjectEpicViewProps) {
  const [openProjectId, setOpenProjectId] = useState<string | null>(projects[0]?.id ?? null)

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const isOpen = openProjectId === project.id
        const totalItems = project.epics.reduce((s, e) => s + e.workItems.length, 0)
        const doneItems = project.epics.reduce(
          (s, e) => s + e.workItems.filter((wi) => wi.status === 'done').length,
          0
        )

        return (
          <div key={project.id} className="rounded-lg border border-gray-200 bg-white">
            <button
              className="flex w-full items-start gap-3 px-5 py-4 text-left border-b border-gray-100 hover:bg-gray-50"
              onClick={() => setOpenProjectId(isOpen ? null : project.id)}
            >
              <span className="text-gray-400 text-sm mt-0.5">{isOpen ? '▼' : '▶'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className={`text-xs rounded px-1.5 py-0.5 ${STATUS_STYLES[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[project.status] ?? project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
                )}
              </div>
              <div className="text-xs text-gray-500 text-right shrink-0">
                <div>{doneItems}/{totalItems} done</div>
                <div>{project.epics.length} epics</div>
              </div>
            </button>
            {isOpen && (
              <div className="px-5 py-4">
                {project.epics.map((epic) => (
                  <EpicPanel key={epic.id} epic={epic} estimates={estimates} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
