// ============================================================
// Planning Override Store
//
// Persists manual field changes (status, hours, etc.) per item.
// Dual-layer: Neon (Postgres) when DATABASE_URL is set,
// in-memory globalThis fallback for local dev.
//
// Table: planning_overrides(id TEXT PK, item_type TEXT, overrides JSONB, updated_at TIMESTAMPTZ)
// ============================================================

export type ItemType = 'work-item' | 'epic' | 'project'

export interface PlanningOverride {
  // work-item fields
  status?: string
  estimatedHours?: number
  assigneeId?: string | null
  priority?: string
  primarySkill?: string | null
  sprintNumber?: number | null
  // epic fields
  stage?: string
  // project fields
  owner?: string | null
  confidence?: string
}

export interface OverrideRecord {
  itemId: string
  itemType: ItemType
  overrides: PlanningOverride
  updatedAt: string
}

// ── Neon detection ────────────────────────────────────────────

function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

async function getNeonSql() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.DATABASE_URL!)
}

async function ensureTable(sql: Awaited<ReturnType<typeof getNeonSql>>) {
  await sql`
    CREATE TABLE IF NOT EXISTS planning_overrides (
      item_id    TEXT PRIMARY KEY,
      item_type  TEXT NOT NULL,
      overrides  JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

// ── In-memory fallback ────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __planningOverrides: Record<string, OverrideRecord> | undefined
}

function getMemStore(): Record<string, OverrideRecord> {
  if (!globalThis.__planningOverrides) {
    globalThis.__planningOverrides = {}
  }
  return globalThis.__planningOverrides
}

// ── Public API ────────────────────────────────────────────────

export async function saveOverrideAsync(
  itemId: string,
  itemType: ItemType,
  overrides: PlanningOverride
): Promise<void> {
  if (isNeonConfigured()) {
    const sql = await getNeonSql()
    await ensureTable(sql)
    await sql`
      INSERT INTO planning_overrides (item_id, item_type, overrides, updated_at)
      VALUES (${itemId}, ${itemType}, ${JSON.stringify(overrides)}::jsonb, NOW())
      ON CONFLICT (item_id) DO UPDATE
        SET overrides  = planning_overrides.overrides || EXCLUDED.overrides,
            item_type  = EXCLUDED.item_type,
            updated_at = EXCLUDED.updated_at
    `
  } else {
    const store = getMemStore()
    const existing = store[itemId]?.overrides ?? {}
    store[itemId] = {
      itemId,
      itemType,
      overrides: { ...existing, ...overrides },
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function getAllOverridesAsync(): Promise<Record<string, OverrideRecord>> {
  if (isNeonConfigured()) {
    const sql = await getNeonSql()
    await ensureTable(sql)
    const rows = await sql`SELECT item_id, item_type, overrides, updated_at FROM planning_overrides`
    const result: Record<string, OverrideRecord> = {}
    for (const row of rows) {
      result[row.item_id as string] = {
        itemId: row.item_id as string,
        itemType: row.item_type as ItemType,
        overrides: row.overrides as PlanningOverride,
        updatedAt: String(row.updated_at),
      }
    }
    return result
  }
  return { ...getMemStore() }
}

/** Merge stored overrides onto computed planning projects. Returns patched copies. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyOverrides(projects: any[], overrides: Record<string, OverrideRecord>): any[] {
  return projects.map((p) => {
    const po = overrides[p.id]
    const pPatched = po ? { ...p, ...po.overrides } : p
    return {
      ...pPatched,
      epics: (pPatched.epics ?? []).map((e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const eo = overrides[e.id]
        const ePatched = eo ? { ...e, ...eo.overrides } : e
        return {
          ...ePatched,
          workItems: (ePatched.workItems ?? []).map((wi: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const wo = overrides[wi.id]
            return wo ? { ...wi, ...wo.overrides } : wi
          }),
        }
      }),
    }
  })
}
