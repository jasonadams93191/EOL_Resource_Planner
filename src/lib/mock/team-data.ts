// ============================================================
// Team Seed Data — Phase 1
//
// Defines the canonical skills, roles, and team members for the
// AA / EOL shared delivery team.
//
// Rules:
//   - All ids are stable strings (never auto-generated)
//   - availableHoursPerSprint = gross hours per 2-week sprint (default 40)
//   - utilizationTargetPercent = soft ceiling (roadmap prefers staying under this)
//   - targetPlannedHours (derived) = availableHoursPerSprint × utilizationTargetPercent / 100
//   - Skill levels: 0=None 1=Awareness 2=Working 3=Strong 4=Expert
//   - isActive=true for all members at seed time
//
// TODO Wave 2: derive from Jira/HR system
// ============================================================

import type { Skill, Role, TeamMember } from '@/types/planning'

// ── Skills ────────────────────────────────────────────────────

export const SKILLS: Skill[] = [
  { id: 'skill-sf-config',    name: 'Salesforce Config / Flow',        category: 'Salesforce' },
  { id: 'skill-sf-dev',       name: 'Salesforce Dev / Apex',           category: 'Salesforce' },
  { id: 'skill-sf-data',      name: 'Salesforce Data Model',           category: 'Salesforce' },
  { id: 'skill-sales-cloud',  name: 'Sales Cloud / RevOps',            category: 'Salesforce' },
  { id: 'skill-litify',       name: 'Litify / Legal Workflow',          category: 'Domain' },
  { id: 'skill-integration',  name: 'Integration / API / Webhook',     category: 'Technical' },
  { id: 'skill-reporting',    name: 'Reporting / Analytics',           category: 'Technical' },
  { id: 'skill-docs',         name: 'Documentation / Enablement',      category: 'Process' },
  { id: 'skill-qa',           name: 'QA / Testing',                    category: 'Process' },
  { id: 'skill-ai',           name: 'AI / Workflow Automation',        category: 'Technical' },
  { id: 'skill-cloud',        name: 'Cloud / Deployment / AWS',        category: 'Technical' },
  { id: 'skill-web',          name: 'Web / WordPress / Marketing Tech', category: 'Marketing' },
  { id: 'skill-pm',           name: 'Project Management',              category: 'Process' },
  { id: 'skill-async',        name: 'Async / Worker Logic',            category: 'Technical' },
]

// ── Roles ─────────────────────────────────────────────────────
//
// Five canonical delivery roles. Each role is the PRIMARY assignment
// target for work items tagged with its owned skills. The sprint engine
// waits for a role-matched member before assigning cross-role.
//
// Skill ownership (SKILL_PRIMARY_ROLE in sprint-engine.ts):
//   Admin               → sf-config, sf-data, sales-cloud, litify, web
//   Project Manager     → pm, docs (coordination tasks)
//   Business Analyst    → reporting, qa, docs (analysis / QA tasks)
//   Integration Spec.   → sf-dev, integration, async
//   Architect           → ai, cloud (+ sf-dev, integration as secondary)

export const ROLES: Role[] = [
  { id: 'role-admin',           name: 'Admin' },
  { id: 'role-pm',              name: 'Project Manager' },
  { id: 'role-ba',              name: 'Business Analyst' },
  { id: 'role-integration-dev', name: 'Integration Specialist' },
  { id: 'role-architect',       name: 'Architect' },
]

// ── Team Members ──────────────────────────────────────────────
//
// Default skill level = 3 (Strong). Adjust down per individual.
// Role assignment follows the 5-role model above.

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-jusiah',
    name: 'Jusiah Sioson',
    primaryRoleId: 'role-pm',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 55,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      // PM
      { skillId: 'skill-pm',          level: 3 },
      { skillId: 'skill-docs',        level: 3 },
      // Admin
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-sf-data',     level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-litify',      level: 3 },
      // Dev
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-integration', level: 3 },
      { skillId: 'skill-async',       level: 3 },
      // BA
      { skillId: 'skill-reporting',   level: 3 },
      { skillId: 'skill-qa',          level: 3 },
    ],
  },
  {
    id: 'tm-jason',
    name: 'Jason',
    primaryRoleId: 'role-pm',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 55,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-sf-data',     level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-litify',      level: 3 },
      { skillId: 'skill-integration', level: 3 },
      { skillId: 'skill-reporting',   level: 3 },
      { skillId: 'skill-docs',        level: 3 },
      { skillId: 'skill-qa',          level: 3 },
      { skillId: 'skill-ai',          level: 3 },
      { skillId: 'skill-cloud',       level: 3 },
      { skillId: 'skill-web',         level: 3 },
      { skillId: 'skill-pm',          level: 3 },
      { skillId: 'skill-async',       level: 3 },
    ],
  },
  {
    id: 'tm-daniel',
    name: 'Daniel Dion',
    primaryRoleId: 'role-integration-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-integration', level: 3 },
    ],
  },
  {
    id: 'tm-lemuel',
    name: 'Lemuel Maturan',
    primaryRoleId: 'role-admin',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sf-config',  level: 3 },
      { skillId: 'skill-litify',     level: 3 },
      { skillId: 'skill-reporting',  level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
    ],
  },
  {
    id: 'tm-kumar',
    name: 'Kumar Abhineet',
    primaryRoleId: 'role-integration-dev',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 85,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-integration', level: 3 },
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-async',       level: 3 },
    ],
  },
  {
    id: 'tm-leslie',
    name: 'Leslie Wong',
    primaryRoleId: 'role-ba',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 75,
    isActive: false,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-docs',      level: 3 },
      { skillId: 'skill-qa',        level: 3 },
      { skillId: 'skill-ai',        level: 3 },
      { skillId: 'skill-reporting', level: 3 },
    ],
  },
  {
    id: 'tm-ayush',
    name: 'Ayush Gupta',
    primaryRoleId: 'role-admin',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 75,
    isActive: true,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sf-config', level: 3 },
      { skillId: 'skill-qa',        level: 3 },
      { skillId: 'skill-cloud',     level: 3 },
    ],
  },
  {
    id: 'tm-ryan',
    name: 'Ryan Magno',
    primaryRoleId: 'role-ba',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 70,
    isActive: false,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-qa',        level: 3 },
      { skillId: 'skill-docs',      level: 3 },
      { skillId: 'skill-reporting', level: 3 },
    ],
  },
  {
    id: 'tm-jeeleigh',
    name: 'Jeeleigh Amor Divinagracia',
    primaryRoleId: 'role-admin',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 75,
    isActive: false,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-sf-data',     level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-litify',      level: 3 },
    ],
  },
  {
    id: 'tm-stefan',
    name: 'Stefan Filipovic',
    primaryRoleId: 'role-ba',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 70,
    isActive: false,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-reporting',   level: 3 },
      { skillId: 'skill-async',       level: 3 },
    ],
  },
  {
    id: 'tm-lord',
    name: 'Lord Rynkar Tracy Dwight U. Arcamo',
    primaryRoleId: 'role-admin',
    availableHoursPerSprint: 40,
    utilizationTargetPercent: 75,
    isActive: false,
    resourceKind: 'core',
    userSkills: [
      { skillId: 'skill-web', level: 3 },
    ],
  },
]

// ── Lookup helpers ────────────────────────────────────────────

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id)
}

export function getRoleById(id: string): Role | undefined {
  return ROLES.find((r) => r.id === id)
}

export function getTeamMemberById(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.id === id)
}

export function getActiveTeamMembers(): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.isActive)
}
