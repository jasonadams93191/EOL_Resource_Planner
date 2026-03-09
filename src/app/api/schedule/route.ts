import { NextResponse } from 'next/server'
import { mockSchedules, mockScenarioResult } from '@/lib/mock/sample-data'

export async function GET() {
  try {
    // TODO Wave 2: replace with real scheduling engine
    return NextResponse.json({
      schedules: mockSchedules,
      scenario: mockScenarioResult,
      source: 'mock-wave1',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}
