// ============================================================
// Team Seed Data — Phase 1
//
// Defines the canonical skills, roles, and team members for the
// AA / EOL shared delivery team.
//
// Rules:
//   - All ids are stable strings (never auto-generated)
//   - sprintCapacity is a fraction: 1.0 = full sprint, 0.5 = half
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

export const ROLES: Role[] = [
  { id: 'role-solution-lead',   name: 'Solution Lead / PM' },
  { id: 'role-sf-dev',          name: 'Salesforce Dev / Integration' },
  { id: 'role-sf-builder',      name: 'Salesforce Builder / Admin' },
  { id: 'role-ai-automation',   name: 'AI / Automation / Enablement' },
  { id: 'role-automation-dev',  name: 'Automation / Dev Support' },
  { id: 'role-qa-docs',         name: 'QA / Documentation / Enablement' },
  { id: 'role-sf-process',      name: 'Salesforce Builder / Process Automation' },
  { id: 'role-revops',          name: 'RevOps / Sales Cloud / Marketing Ops' },
  { id: 'role-web-marketing',   name: 'Web / Marketing Tech' },
]

// ── Team Members ──────────────────────────────────────────────

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-jusiah',
    name: 'Jusiah Sioson',
    primaryRoleId: 'role-solution-lead',
    sprintCapacity: 0.5,
    isActive: true,
    userSkills: [
      { skillId: 'skill-litify',      level: 3 },
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-reporting',   level: 3 },
      { skillId: 'skill-docs',        level: 3 },
      { skillId: 'skill-pm',          level: 3 },
    ],
  },
  {
    id: 'tm-daniel',
    name: 'Daniel Dion',
    primaryRoleId: 'role-sf-dev',
    sprintCapacity: 1.0,
    isActive: true,
    userSkills: [
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-integration', level: 3 },
    ],
  },
  {
    id: 'tm-lemuel',
    name: 'Lemuel Maturan',
    primaryRoleId: 'role-sf-builder',
    sprintCapacity: 1.0,
    isActive: true,
    userSkills: [
      { skillId: 'skill-sf-config',  level: 3 },
      { skillId: 'skill-litify',     level: 3 },
      { skillId: 'skill-reporting',  level: 3 },
    ],
  },
  {
    id: 'tm-kumar',
    name: 'Kumar Abhineet',
    primaryRoleId: 'role-sf-dev',
    sprintCapacity: 0.9,
    isActive: true,
    userSkills: [
      { skillId: 'skill-integration', level: 3 },
      { skillId: 'skill-sf-dev',      level: 3 },
      { skillId: 'skill-async',       level: 3 },
    ],
  },
  {
    id: 'tm-leslie',
    name: 'Leslie Wong',
    primaryRoleId: 'role-ai-automation',
    sprintCapacity: 0.6,
    isActive: true,
    userSkills: [
      { skillId: 'skill-docs', level: 3 },
      { skillId: 'skill-qa',   level: 3 },
      { skillId: 'skill-ai',   level: 3 },
    ],
  },
  {
    id: 'tm-ayush',
    name: 'Ayush Gupta',
    primaryRoleId: 'role-automation-dev',
    sprintCapacity: 0.6,
    isActive: true,
    userSkills: [
      { skillId: 'skill-sf-config', level: 3 },
      { skillId: 'skill-qa',        level: 3 },
      { skillId: 'skill-cloud',     level: 3 },
    ],
  },
  {
    id: 'tm-ryan',
    name: 'Ryan Magno',
    primaryRoleId: 'role-qa-docs',
    sprintCapacity: 0.5,
    isActive: true,
    userSkills: [
      { skillId: 'skill-qa',   level: 3 },
      { skillId: 'skill-docs', level: 3 },
    ],
  },
  {
    id: 'tm-jeeleigh',
    name: 'Jeeleigh Amor Divinagracia',
    primaryRoleId: 'role-sf-process',
    sprintCapacity: 0.5,
    isActive: true,
    userSkills: [
      { skillId: 'skill-sf-config',   level: 3 },
      { skillId: 'skill-sf-data',     level: 3 },
      { skillId: 'skill-sales-cloud', level: 3 },
    ],
  },
  {
    id: 'tm-stefan',
    name: 'Stefan Filipovic',
    primaryRoleId: 'role-revops',
    sprintCapacity: 0.5,
    isActive: true,
    userSkills: [
      { skillId: 'skill-sales-cloud', level: 3 },
      { skillId: 'skill-reporting',   level: 3 },
      { skillId: 'skill-async',       level: 2 },
    ],
  },
  {
    id: 'tm-lord',
    name: 'Lord Rynkar Tracy Dwight U. Arcamo',
    primaryRoleId: 'role-web-marketing',
    sprintCapacity: 0.5,
    isActive: true,
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
