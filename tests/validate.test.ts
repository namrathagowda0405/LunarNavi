// FIXTURE: fake numbers for testing only. NOT real lunar data.

import { describe, it, expect } from 'vitest'
import { Site } from '../src/engine/types'
import { validateSites } from '../src/engine/validate'

function makeValidSite(overrides?: Partial<Site>): Site {
  return {
    id: 'site-shackleton-01',
    name: 'Shackleton Connecting Ridge',
    region: 'South Pole',
    latitude: -89.9,
    longitude: 0.0,
    criteria: {
      slope: {
        value: 7.2,
        low: 5.0,
        high: 10.0,
        kind: 'measured',
        quality: 'high',
        source: 'LOLA DEM 30m',
      },
      roughness: {
        value: 0.12,
        low: 0.08,
        high: 0.2,
        kind: 'derived',
        quality: 'medium',
        source: 'LROC NAC roughness calculation',
      },
      illumination: {
        value: 0.88,
        low: 0.82,
        high: 0.94,
        kind: 'derived',
        quality: 'high',
        source: 'Mazarico 2011 illumination model',
      },
      resource: {
        value: null,
        low: null,
        high: null,
        kind: 'estimated',
        quality: 'low',
        source: 'LEND neutron suppression',
        note: 'Direct hydrogen concentration unconfirmed; surface samples pending.',
      },
      communication: {
        value: 0.8,
        low: 0.75,
        high: 0.85,
        kind: 'derived',
        quality: 'high',
        source: 'Direct-to-Earth line-of-sight simulation',
      },
      science: {
        value: 9.5,
        low: 8.5,
        high: 10.0,
        kind: 'estimated',
        quality: 'medium',
        source: 'Decadal Survey priorities report',
      },
    },
    ...overrides,
  }
}

describe('validateSites', () => {
  it('passes when given valid site inputs', () => {
    const site1 = makeValidSite({ id: 'site-1', name: 'Site One' })
    const site2 = makeValidSite({ id: 'site-2', name: 'Site Two' })

    const result = validateSites([site1, site2])
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  // Rule a: input must be a non-empty array
  it('fails rule a: input must be a non-empty array', () => {
    expect(validateSites(null).ok).toBe(false)
    expect(validateSites(null).errors[0]).toMatch(/must be an array/i)

    expect(validateSites({}).ok).toBe(false)
    expect(validateSites({}).errors[0]).toMatch(/must be an array/i)

    const emptyResult = validateSites([])
    expect(emptyResult.ok).toBe(false)
    expect(emptyResult.errors[0]).toMatch(/must be a non-empty array/i)
  })

  // Rule b: site ids must be non-empty strings and unique
  it('fails rule b: site ids must be non-empty strings and unique', () => {
    const emptyIdSite = makeValidSite({ id: '' })
    const resultEmpty = validateSites([emptyIdSite])
    expect(resultEmpty.ok).toBe(false)
    expect(resultEmpty.errors.some((err) => err.includes('field "id"') && err.includes('non-empty string'))).toBe(true)

    const duplicateSite1 = makeValidSite({ id: 'dup-id', name: 'First' })
    const duplicateSite2 = makeValidSite({ id: 'dup-id', name: 'Second' })
    const resultDup = validateSites([duplicateSite1, duplicateSite2])
    expect(resultDup.ok).toBe(false)
    expect(resultDup.errors.some((err) => err.includes('field "id"') && err.includes('unique'))).toBe(true)
  })

  // Rule c: name and region must be non-empty strings
  it('fails rule c: name and region must be non-empty strings', () => {
    const invalidSite = makeValidSite({ name: '  ', region: '' })
    const result = validateSites([invalidSite])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "name"') && err.includes('non-empty string'))).toBe(true)
    expect(result.errors.some((err) => err.includes('field "region"') && err.includes('non-empty string'))).toBe(true)
  })

  // Rule d: latitude between -90 and 90, longitude between -180 and 180, finite numbers
  it('fails rule d: latitude and longitude must be finite and within valid ranges', () => {
    const siteLatHigh = makeValidSite({ latitude: 95.0 })
    const resultLatHigh = validateSites([siteLatHigh])
    expect(resultLatHigh.ok).toBe(false)
    expect(resultLatHigh.errors.some((err) => err.includes('field "latitude"'))).toBe(true)

    const siteLatLow = makeValidSite({ latitude: -91.0 })
    expect(validateSites([siteLatLow]).errors.some((err) => err.includes('field "latitude"'))).toBe(true)

    const siteLonHigh = makeValidSite({ longitude: 181.0 })
    expect(validateSites([siteLonHigh]).errors.some((err) => err.includes('field "longitude"'))).toBe(true)

    const siteLonLow = makeValidSite({ longitude: -185.0 })
    expect(validateSites([siteLonLow]).errors.some((err) => err.includes('field "longitude"'))).toBe(true)

    const siteNonFinite = makeValidSite({ latitude: NaN, longitude: Infinity })
    const resultNonFinite = validateSites([siteNonFinite])
    expect(resultNonFinite.errors.some((err) => err.includes('field "latitude"'))).toBe(true)
    expect(resultNonFinite.errors.some((err) => err.includes('field "longitude"'))).toBe(true)
  })

  // Rule e: all six criteria must be present; unknown criterion names are errors
  it('fails rule e: all six criteria must be present and unknown criteria are errors', () => {
    const siteMissing = makeValidSite()
    const { science: _removed, ...restCriteria } = siteMissing.criteria
    const siteWithoutScience = { ...siteMissing, criteria: restCriteria }
    const resultMissing = validateSites([siteWithoutScience])
    expect(resultMissing.ok).toBe(false)
    expect(resultMissing.errors.some((err) => err.includes('field "criteria.science"') && err.includes('missing'))).toBe(true)

    const siteWithUnknown = makeValidSite()
    const criteriaWithUnknown = {
      ...siteWithUnknown.criteria,
      radiation: {
        value: 10,
        low: 5,
        high: 15,
        kind: 'measured' as const,
        quality: 'high' as const,
        source: 'RAD sensor',
      },
    }
    const resultUnknown = validateSites([{ ...siteWithUnknown, criteria: criteriaWithUnknown }])
    expect(resultUnknown.ok).toBe(false)
    expect(resultUnknown.errors.some((err) => err.includes('field "criteria.radiation"') && err.includes('unknown'))).toBe(true)
  })

  // Rule f: kind must be one of the allowed values; quality likewise
  it('fails rule f: kind and quality must be allowed values', () => {
    const site = makeValidSite()
    site.criteria.slope = {
      ...site.criteria.slope,
      kind: 'guessed' as any,
      quality: 'exceptional' as any,
    }

    const result = validateSites([site])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('criteria.slope.kind') && err.includes('measured'))).toBe(true)
    expect(result.errors.some((err) => err.includes('criteria.slope.quality') && err.includes('high'))).toBe(true)
  })

  // Rule g: source must be a non-empty string
  it('fails rule g: source must be a non-empty string', () => {
    const site = makeValidSite()
    site.criteria.slope = {
      ...site.criteria.slope,
      source: '',
    }

    const result = validateSites([site])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('criteria.slope.source') && err.includes('non-empty string'))).toBe(true)
  })

  // Rule h: if value is a number: it must be finite, low and high must be numbers, and low <= value <= high
  it('fails rule h: when value is a number, value, low, high must be finite numbers and low <= value <= high', () => {
    const siteNonFinite = makeValidSite()
    siteNonFinite.criteria = {
      ...siteNonFinite.criteria,
      slope: {
        ...siteNonFinite.criteria.slope,
        value: Infinity,
      },
    }
    expect(validateSites([siteNonFinite]).errors.some((err) => err.includes('criteria.slope.value') && err.includes('finite number'))).toBe(true)

    const siteLowNotNumber = makeValidSite()
    siteLowNotNumber.criteria.slope = {
      ...siteLowNotNumber.criteria.slope,
      low: null as any,
    }
    expect(validateSites([siteLowNotNumber]).errors.some((err) => err.includes('criteria.slope.low'))).toBe(true)

    const siteRangeLowViolated = makeValidSite()
    siteRangeLowViolated.criteria.slope = {
      ...siteRangeLowViolated.criteria.slope,
      low: 15.0,
      value: 10.0,
      high: 20.0,
    }
    expect(validateSites([siteRangeLowViolated]).errors.some((err) => err.includes('criteria.slope') && err.includes('low <= value <= high'))).toBe(true)

    const siteRangeHighViolated = makeValidSite()
    siteRangeHighViolated.criteria.slope = {
      ...siteRangeHighViolated.criteria.slope,
      low: 5.0,
      value: 25.0,
      high: 20.0,
    }
    expect(validateSites([siteRangeHighViolated]).errors.some((err) => err.includes('criteria.slope') && err.includes('low <= value <= high'))).toBe(true)
  })

  // Rule i: if value is null: low and high must also be null, and note must be a non-empty string explaining why the data is missing
  it('fails rule i: when value is null, low and high must be null and note must be a non-empty string', () => {
    const siteNullWithBounds = makeValidSite()
    siteNullWithBounds.criteria.resource = {
      ...siteNullWithBounds.criteria.resource,
      value: null,
      low: 2.0,
      high: 8.0,
      note: 'Missing surface measurement.',
    }
    const resultBounds = validateSites([siteNullWithBounds])
    expect(resultBounds.ok).toBe(false)
    expect(resultBounds.errors.some((err) => err.includes('criteria.resource.low') && err.includes('must be null'))).toBe(true)
    expect(resultBounds.errors.some((err) => err.includes('criteria.resource.high') && err.includes('must be null'))).toBe(true)

    const siteNullNoNote = makeValidSite()
    siteNullNoNote.criteria.resource = {
      ...siteNullNoNote.criteria.resource,
      value: null,
      low: null,
      high: null,
      note: '',
    }
    const resultNoNote = validateSites([siteNullNoNote])
    expect(resultNoNote.ok).toBe(false)
    expect(resultNoNote.errors.some((err) => err.includes('criteria.resource.note') && err.includes('non-empty string'))).toBe(true)
  })

  // Test that two errors in one site are both reported
  it('reports multiple errors on a single site simultaneously', () => {
    const siteMultipleErrors = makeValidSite({
      name: '',
      latitude: 120.0,
    })

    const result = validateSites([siteMultipleErrors])
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)

    const hasNameError = result.errors.some((err) => err.includes('field "name"') && err.includes('non-empty string'))
    const hasLatError = result.errors.some((err) => err.includes('field "latitude"'))

    expect(hasNameError).toBe(true)
    expect(hasLatError).toBe(true)
  })
})
