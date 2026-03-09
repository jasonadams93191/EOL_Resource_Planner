// ============================================================
// GET /api/jira/snapshot
//
// Returns summary metadata for the current Jira snapshots.
// Does NOT return raw issue data — summary only.
//
// READ-ONLY — no Jira writes permitted.
// ============================================================

import { NextResponse } from 'next/server'
import { getSnapshotSummary } from '@/lib/jira/snapshot-store'

export async function GET() {
  return NextResponse.json({
    eol: getSnapshotSummary('ws-eol'),
    ati: getSnapshotSummary('ws-ati'),
  })
}
