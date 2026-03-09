import { mockProjects, mockIssues, mockResources, mockWorkspaces } from '@/lib/mock/sample-data'
import { ResourceType } from '@/types/domain'

describe('Mock data domain type conformance', () => {
  it('workspaces have required fields', () => {
    mockWorkspaces.forEach((ws) => {
      expect(ws.id).toBeTruthy()
      expect(ws.name).toBeTruthy()
      expect(ws.projectKey).toBeTruthy()
    })
  })

  it('all issues reference valid projects', () => {
    const projectIds = new Set(mockProjects.map((p) => p.id))
    mockIssues.forEach((issue) => {
      expect(projectIds.has(issue.projectId)).toBe(true)
    })
  })

  it('all issues reference valid workspaces', () => {
    const workspaceIds = new Set(mockWorkspaces.map((w) => w.id))
    mockIssues.forEach((issue) => {
      expect(workspaceIds.has(issue.workspaceId)).toBe(true)
    })
  })

  it('resources have valid ResourceType', () => {
    const validTypes = Object.values(ResourceType)
    mockResources.forEach((r) => {
      expect(validTypes).toContain(r.resourceType)
    })
  })

  it('all projects have valid status', () => {
    const validStatuses = ['active', 'on-hold', 'completed', 'cancelled']
    mockProjects.forEach((p) => {
      expect(validStatuses).toContain(p.status)
    })
  })
})
