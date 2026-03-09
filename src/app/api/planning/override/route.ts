// ============================================================
// POST /api/planning/override
//
// Save a manual field override for a work item, epic, or project.
// Body: { itemId: string, itemType: ItemType, overrides: PlanningOverride }
//
// Overrides are merged (not replaced) with existing stored overrides.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { saveOverrideAsync } from '@/lib/planning/override-store'
import type { ItemType, PlanningOverride } from '@/lib/planning/override-store'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      itemId: string
      itemType: ItemType
      overrides: PlanningOverride
    }

    if (!body.itemId || !body.itemType || !body.overrides) {
      return NextResponse.json({ error: 'itemId, itemType, and overrides are required' }, { status: 400 })
    }

    await saveOverrideAsync(body.itemId, body.itemType, body.overrides)

    return NextResponse.json({ ok: true, itemId: body.itemId })
  } catch (err) {
    console.error('[override] save error', err)
    return NextResponse.json({ error: 'Failed to save override' }, { status: 500 })
  }
}
