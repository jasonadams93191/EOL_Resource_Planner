import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await GET()
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('1.0.0-wave1')
    expect(typeof body.timestamp).toBe('string')
  })
})
