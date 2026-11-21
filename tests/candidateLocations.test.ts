import { describe, it, expect } from 'vitest'
import { CANDIDATE_LOCATIONS } from '../src/data/candidateLocations'
import { validateCandidateLocations } from '../src/engine/locations'

describe('Candidate Locations Dataset Validation', () => {
  it('passes validateCandidateLocations strictly with zero errors', () => {
    const result = validateCandidateLocations(CANDIDATE_LOCATIONS)
    if (!result.ok) {
      console.log('VALIDATION ERRORS:', result.errors)
    }
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('contains all 13 official Artemis III candidate regions', () => {
    expect(CANDIDATE_LOCATIONS.length).toBeGreaterThanOrEqual(13)

    const expectedArtemisIds = [
      'artemis-faustini-rim-a',
      'artemis-peak-near-shackleton',
      'artemis-connecting-ridge',
      'artemis-connecting-ridge-ext',
      'artemis-de-gerlache-rim-1',
      'artemis-de-gerlache-rim-2',
      'artemis-de-gerlache-kocher-massif',
      'artemis-haworth',
      'artemis-malapert-massif',
      'artemis-leibnitz-beta-plateau',
      'artemis-nobile-rim-1',
      'artemis-nobile-rim-2',
      'artemis-amundsen-rim',
    ]

    const actualIds = CANDIDATE_LOCATIONS.map((loc) => loc.id)
    for (const expectedId of expectedArtemisIds) {
      expect(actualIds).toContain(expectedId)
    }
  })

  it('validates with maxLatitude = -80.0 option constraint', () => {
    const result = validateCandidateLocations(CANDIDATE_LOCATIONS, { maxLatitude: -80.0 })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('ensures all coordinates have valid HTTPS URLs and DE421 coordinate convention', () => {
    for (const loc of CANDIDATE_LOCATIONS) {
      expect(loc.sourceUrl.startsWith('https://')).toBe(true)
      expect(loc.coordinateConvention).toContain('DE421')
      expect(loc.status).toBe('verified')
      expect(loc.latitude).toBeLessThanOrEqual(-80.0)
      expect(loc.latitude).toBeGreaterThanOrEqual(-90.0)
    }
  })
})
