import { NextRequest, NextResponse } from 'next/server'
import { mockIssues } from '@/lib/mock/sample-data'
import type { Issue } from '@/types/domain'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspace = searchParams.get('workspace')

    let issues: Issue[] = mockIssues

    if (workspace === 'eol') {
      issues = mockIssues.filter((i) => i.workspaceId === 'ws-eol')
    } else if (workspace === 'aa') {
      issues = mockIssues.filter((i) => i.workspaceId === 'ws-aa')
    }

    // TODO Wave 2: replace mock with live Jira client calls
    return NextResponse.json({ issues, total: issues.length, source: 'mock-wave1' })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}
