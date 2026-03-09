// ============================================================
// Role-Skill Directory
//
// Single source of truth for which skills belong to which role.
// All consumers (sprint-engine, bottleneck-engine, assignment-engine)
// import from here instead of maintaining local copies.
// ============================================================

/**
 * Maps each role to the skills it covers.
 * When a work item requires a skill, the sprint engine checks
 * if the candidate member's role matches the skill's parent role.
 */
export const ROLE_SKILL_DIRECTORY: Record<string, string[]> = {
  'role-admin':           ['skill-sf-config', 'skill-sf-data', 'skill-sales-cloud', 'skill-litify', 'skill-web'],
  'role-pm':              ['skill-pm', 'skill-docs'],
  'role-ba':              ['skill-reporting', 'skill-qa'],
  'role-integration-dev': ['skill-sf-dev', 'skill-integration', 'skill-async'],
  'role-architect':       ['skill-cloud'],
  'role-prompt-engineer': ['skill-ai'],
}

/**
 * Reverse lookup: skill → primary role.
 * Generated from ROLE_SKILL_DIRECTORY so they never go out of sync.
 */
export const SKILL_PRIMARY_ROLE: Record<string, string> = {}
for (const [role, skills] of Object.entries(ROLE_SKILL_DIRECTORY)) {
  for (const skill of skills) {
    SKILL_PRIMARY_ROLE[skill] = role
  }
}
