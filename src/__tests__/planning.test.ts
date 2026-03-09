import {
  mockPlanningProjects,
  mockCallSofiaProject,
  mockSalesCloudProject,
  mockRingCentralProject,
} from '@/lib/mock/planning-data'
import { toPlanningStatus, toPlanningPriority } from '@/lib/planning/normalize-planning'

describe('Planning domain model', () => {
  describe('mockPlanningProjects', () => {
    it('contains exactly 3 projects', () => {
      expect(mockPlanningProjects).toHaveLength(3)
    })

    it('all projects have ids, names, and at least one epic', () => {
      mockPlanningProjects.forEach((p) => {
        expect(p.id).toBeTruthy()
        expect(p.name).toBeTruthy()
        expect(p.epics.length).toBeGreaterThan(0)
      })
    })

    it('all epics have planningProjectId matching their parent', () => {
      mockPlanningProjects.forEach((p) => {
        p.epics.forEach((e) => {
          expect(e.planningProjectId).toBe(p.id)
        })
      })
    })

    it('all work items have planningEpicId matching their parent epic', () => {
      mockPlanningProjects.forEach((p) => {
        p.epics.forEach((e) => {
          e.workItems.forEach((wi) => {
            expect(wi.planningEpicId).toBe(e.id)
          })
        })
      })
    })

    it('all sourceRefs have a valid sourceType', () => {
      const validTypes = ['jira', 'manual']
      mockPlanningProjects.forEach((p) => {
        p.sourceRefs.forEach((ref) => {
          expect(validTypes).toContain(ref.sourceType)
        })
        p.epics.forEach((e) => {
          e.sourceRefs.forEach((ref) => {
            expect(validTypes).toContain(ref.sourceType)
          })
          e.workItems.forEach((wi) => {
            wi.sourceRefs.forEach((ref) => {
              expect(validTypes).toContain(ref.sourceType)
            })
          })
        })
      })
    })
  })

  describe('Call Sofia', () => {
    it('has 3 phase-based epics', () => {
      expect(mockCallSofiaProject.epics).toHaveLength(3)
      expect(mockCallSofiaProject.epics.map((e) => e.title)).toEqual([
        'Phase 1',
        'Phase 2',
        'Phase 3',
      ])
    })

    it('Phase 1 is in-progress', () => {
      expect(mockCallSofiaProject.epics[0].status).toBe('in-progress')
    })
  })

  describe('AA/TKO Sales Cloud Revamp', () => {
    it('has 4 thematic epics', () => {
      expect(mockSalesCloudProject.epics).toHaveLength(4)
    })

    it('includes a manual-source work item in Documentation epic', () => {
      const docsEpic = mockSalesCloudProject.epics.find((e) => e.id === 'pe-sc-docs')
      expect(docsEpic).toBeDefined()
      const hasManual = docsEpic!.workItems.some((wi) =>
        wi.sourceRefs.some((ref) => ref.sourceType === 'manual')
      )
      expect(hasManual).toBe(true)
    })
  })

  describe('RingCentral Setup', () => {
    it('has 3 epics', () => {
      expect(mockRingCentralProject.epics).toHaveLength(3)
    })

    it('spans both workspaces — ATI and EOL', () => {
      const workspaces = new Set(
        mockRingCentralProject.sourceRefs
          .filter((r) => r.workspaceId)
          .map((r) => r.workspaceId)
      )
      expect(workspaces.has('ws-ati')).toBe(true)
      expect(workspaces.has('ws-eol')).toBe(true)
    })

    it('EOL CTI Integration epic sources from ws-eol', () => {
      const ctiEpic = mockRingCentralProject.epics.find((e) => e.id === 'pe-rc-cti')
      expect(ctiEpic?.sourceRefs[0].workspaceId).toBe('ws-eol')
    })
  })

  describe('normalize-planning utilities', () => {
    it('maps jira statuses to planning statuses', () => {
      expect(toPlanningStatus('in-progress')).toBe('in-progress')
      expect(toPlanningStatus('in-review')).toBe('in-progress')
      expect(toPlanningStatus('done')).toBe('done')
      expect(toPlanningStatus('blocked')).toBe('blocked')
      expect(toPlanningStatus('todo')).toBe('not-started')
      expect(toPlanningStatus('unknown')).toBe('not-started')
    })

    it('maps jira priorities to planning priorities', () => {
      expect(toPlanningPriority('highest')).toBe('high')
      expect(toPlanningPriority('high')).toBe('high')
      expect(toPlanningPriority('medium')).toBe('medium')
      expect(toPlanningPriority('lowest')).toBe('low')
      expect(toPlanningPriority('unknown')).toBe('medium')
    })
  })
})
