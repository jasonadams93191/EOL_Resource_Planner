import { NextResponse } from 'next/server'
import { mockEstimates } from '@/lib/mock/sample-data'

export async function GET() {
  try {
    // TODO Wave 2: replace with real estimation engine
    return NextResponse.json({
      estimates: mockEstimates,
      total: mockEstimates.length,
      source: 'mock-wave1',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 })
  }
}
