// FIXTURE: made-up names and coordinates for testing only. NOT real lunar locations.

import { describe, it, expect } from 'vitest'
import {
  CandidateLocation,
  validateCandidateLocations,
} from '../src/engine/locations'

function makeValidLocation(overrides?: Partial<CandidateLocation>): CandidateLocation {
  return {
    id: 'loc-test-crater-rim',
    name: 'Test Crater Rim A',
    region: 'South Pole',
    latitude: -89.5,
    longitude: 120.0,
    coordinateSource: 'Synthetic Test DEM Reference',
    sourceUrl: 'https://example.org/lunar/data/test-crater.json',
    coordinateConvention: 'Mean Earth/Polar Axis (ME)',
    status: 'verified',
    note: 'Reference point for synthetic testing.',
    ...overrides,
  }
}

describe('validateCandidateLocations', () => {
  it('valid location passes validation', () => {
    const loc = makeValidLocation()
    const result = validateCandidateLocations([loc])

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('empty array fails validation', () => {
    const resultEmpty = validateCandidateLocations([])
    expect(resultEmpty.ok).toBe(false)
    expect(resultEmpty.errors.some((e) => e.toLowerCase().includes('non-empty array'))).toBe(true)

    const resultNotArray = validateCandidateLocations('not an array')
    expect(resultNotArray.ok).toBe(false)
    expect(resultNotArray.errors.some((e) => e.toLowerCase().includes('must be an array'))).toBe(true)
  })

  it('invalid or duplicate ID fails', () => {
    // Missing / whitespace ID
    const emptyIdLoc = makeValidLocation({ id: '   ' })
    const resEmpty = validateCandidateLocations([emptyIdLoc])
    expect(resEmpty.ok).toBe(false)
    expect(resEmpty.errors.some((e) => e.includes('field "id" must be a non-empty string'))).toBe(true)

    // Non-string ID
    const numIdLoc = makeValidLocation({ id: 12345 as any })
    const resNum = validateCandidateLocations([numIdLoc])
    expect(resNum.ok).toBe(false)
    expect(resNum.errors.some((e) => e.includes('field "id" must be a non-empty string'))).toBe(true)

    // Duplicate IDs
    const loc1 = makeValidLocation({ id: 'loc-dup', latitude: -89.1, longitude: 10.0 })
    const loc2 = makeValidLocation({ id: 'loc-dup', latitude: -85.2, longitude: 20.0 })
    const resDup = validateCandidateLocations([loc1, loc2])
    expect(resDup.ok).toBe(false)
    expect(resDup.errors.some((e) => e.includes('field "id" must be unique'))).toBe(true)
  })

  it('required text fields fail when empty', () => {
    const locEmptyFields = makeValidLocation({
      name: '  ',
      region: '',
      coordinateSource: '   ',
      coordinateConvention: '',
    })

    const result = validateCandidateLocations([locEmptyFields])
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('field "name" must be a non-empty string'))).toBe(true)
    expect(result.errors.some((e) => e.includes('field "region" must be a non-empty string'))).toBe(true)
    expect(
      result.errors.some((e) => e.includes('field "coordinateSource" must be a non-empty string'))
    ).toBe(true)
    expect(
      result.errors.some((e) => e.includes('field "coordinateConvention" must be a non-empty string'))
    ).toBe(true)
  })

  it('invalid latitude and longitude values fail', () => {
    // Latitude out of bounds (> 90 or < -90)
    const latHigh = makeValidLocation({ id: 'loc-lat-high', latitude: 90.1 })
    const latLow = makeValidLocation({ id: 'loc-lat-low', latitude: -90.5 })
    const latNan = makeValidLocation({ id: 'loc-lat-nan', latitude: NaN })
    const latInf = makeValidLocation({ id: 'loc-lat-inf', latitude: -Infinity })

    const resLat = validateCandidateLocations([latHigh, latLow, latNan, latInf])
    expect(resLat.ok).toBe(false)
    expect(resLat.errors.length).toBeGreaterThanOrEqual(4)
    expect(resLat.errors.every((e) => e.includes('latitude'))).toBe(true)

    // Longitude out of bounds (> 180 or < -180)
    const lonHigh = makeValidLocation({ id: 'loc-lon-high', longitude: 180.1 })
    const lonLow = makeValidLocation({ id: 'loc-lon-low', longitude: -180.5 })
    const lonNan = makeValidLocation({ id: 'loc-lon-nan', longitude: NaN })

    const resLon = validateCandidateLocations([lonHigh, lonLow, lonNan])
    expect(resLon.ok).toBe(false)
    expect(resLon.errors.length).toBeGreaterThanOrEqual(3)
    expect(resLon.errors.every((e) => e.includes('longitude'))).toBe(true)
  })

  it('invalid or non-HTTPS source URL fails', () => {
    // HTTP url
    const httpLoc = makeValidLocation({ sourceUrl: 'http://example.org/data' })
    const resHttp = validateCandidateLocations([httpLoc])
    expect(resHttp.ok).toBe(false)
    expect(resHttp.errors.some((e) => e.includes('valid HTTPS URL'))).toBe(true)

    // FTP url
    const ftpLoc = makeValidLocation({ sourceUrl: 'ftp://example.org/file' })
    const resFtp = validateCandidateLocations([ftpLoc])
    expect(resFtp.ok).toBe(false)
    expect(resFtp.errors.some((e) => e.includes('valid HTTPS URL'))).toBe(true)

    // Empty string
    const emptyUrlLoc = makeValidLocation({ sourceUrl: '' })
    const resEmpty = validateCandidateLocations([emptyUrlLoc])
    expect(resEmpty.ok).toBe(false)
    expect(resEmpty.errors.some((e) => e.includes('sourceUrl'))).toBe(true)

    // Malformed URL string
    const malformedLoc = makeValidLocation({ sourceUrl: 'not a url at all' })
    const resMalformed = validateCandidateLocations([malformedLoc])
    expect(resMalformed.ok).toBe(false)
    expect(resMalformed.errors.some((e) => e.includes('valid HTTPS URL'))).toBe(true)
  })

  it('invalid status fails', () => {
    const invalidStatusLoc = makeValidLocation({ status: 'pending' as any })
    const result = validateCandidateLocations([invalidStatusLoc])

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('field "status" must be either "verified" or "to-verify"'))).toBe(
      true
    )
  })

  it('to-verify status passes validation', () => {
    const toVerifyLoc = makeValidLocation({ status: 'to-verify' })
    const result = validateCandidateLocations([toVerifyLoc])

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('maxLatitude enforcement works', () => {
    // When maxLatitude is -80, a location at -75 exceeds it and fails
    const loc1 = makeValidLocation({ id: 'loc-1', latitude: -75.0 })
    const resFail = validateCandidateLocations([loc1], { maxLatitude: -80 })

    expect(resFail.ok).toBe(false)
    expect(resFail.errors.some((e) => e.includes('exceeds the maximum allowed latitude of -80'))).toBe(true)

    // A location at -85 is <= -80, so it passes
    const loc2 = makeValidLocation({ id: 'loc-2', latitude: -85.0 })
    const resPass = validateCandidateLocations([loc2], { maxLatitude: -80 })

    expect(resPass.ok).toBe(true)
    expect(resPass.errors).toEqual([])
  })

  it('without maxLatitude, that restriction is not applied', () => {
    // Location at -75 passes when maxLatitude option is omitted
    const loc = makeValidLocation({ latitude: -75.0 })
    const result = validateCandidateLocations([loc])

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('duplicate coordinates with different IDs are detected', () => {
    const locA = makeValidLocation({
      id: 'loc-ridge-alpha',
      latitude: -89.900000,
      longitude: 45.000000,
    })
    const locB = makeValidLocation({
      id: 'loc-ridge-beta',
      latitude: -89.9000005, // within 0.000001
      longitude: 45.0000004, // within 0.000001
    })

    const result = validateCandidateLocations([locA, locB])
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('possible duplicate coordinates'))).toBe(true)
  })

  it('non-string note fails', () => {
    const invalidNoteLoc = makeValidLocation({ note: 9999 as any })
    const result = validateCandidateLocations([invalidNoteLoc])

    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('field "note" must be a string if provided'))).toBe(true)
  })

  it('two errors in one location are both reported', () => {
    const multiErrorLoc = makeValidLocation({
      name: '', // Error 1: empty name
      latitude: 120.0, // Error 2: invalid latitude
    })

    const result = validateCandidateLocations([multiErrorLoc])
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)

    const hasNameError = result.errors.some((e) => e.includes('field "name" must be a non-empty string'))
    const hasLatError = result.errors.some((e) => e.includes('field "latitude" must be a finite number between -90 and 90'))

    expect(hasNameError).toBe(true)
    expect(hasLatError).toBe(true)
  })
})
