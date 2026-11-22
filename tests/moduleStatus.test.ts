import { describe, it, expect } from 'vitest'
import { MODULES, STATUS_LABEL, ModuleStatus } from '../src/frontend/moduleStatus'

describe('moduleStatus registry', () => {
  it('has unique module ids', () => {
    const ids = MODULES.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('assigns only allowed ModuleStatus values', () => {
    const allowedStatuses: ModuleStatus[] = ['engine-ready', 'in-preparation', 'planned']
    for (const mod of MODULES) {
      expect(allowedStatuses).toContain(mod.status)
    }
  })

  it('contains non-empty name, description, and detail for each module', () => {
    for (const mod of MODULES) {
      expect(typeof mod.name).toBe('string')
      expect(mod.name.trim().length).toBeGreaterThan(0)

      expect(typeof mod.description).toBe('string')
      expect(mod.description.trim().length).toBeGreaterThan(0)

      expect(typeof mod.detail).toBe('string')
      expect(mod.detail.trim().length).toBeGreaterThan(0)
    }
  })

  it('maps all valid statuses to readable labels in STATUS_LABEL', () => {
    expect(STATUS_LABEL['engine-ready']).toBe('Engine built · not connected')
    expect(STATUS_LABEL['in-preparation']).toBe('In preparation')
    expect(STATUS_LABEL['planned']).toBe('Planned')
  })

  it('contains the expected core milestone entries', () => {
    const moduleMap = new Map(MODULES.map((m) => [m.id, m]))

    expect(moduleMap.get('mission-profile')?.status).toBe('engine-ready')
    expect(moduleMap.get('site-dataset')?.status).toBe('in-preparation')
    expect(moduleMap.get('feasibility')?.status).toBe('engine-ready')
    expect(moduleMap.get('topsis')?.status).toBe('planned')
    expect(moduleMap.get('monte-carlo')?.status).toBe('planned')
  })
})
