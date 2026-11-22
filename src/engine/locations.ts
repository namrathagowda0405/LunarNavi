import { ValidationResult } from './types'

export type CoordinateStatus = 'verified' | 'to-verify'

/**
 * Each location represents one reference point for a larger candidate region.
 * The status 'verified' means only that the coordinate was directly read from the cited source.
 * It does NOT mean the landing site is scientifically verified or safe.
 */
export interface CandidateLocation {
  id: string
  name: string
  region: string
  latitude: number
  longitude: number
  coordinateSource: string
  sourceUrl: string
  coordinateConvention: string
  status: CoordinateStatus
  note?: string
}

export interface LocationValidationOptions {
  maxLatitude?: number
}

const COORDINATE_EPSILON = 0.000001

function isValidHttpsUrl(str: string): boolean {
  if (typeof str !== 'string' || str.trim() === '') {
    return false
  }
  try {
    const parsed = new URL(str)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates an input against the CandidateLocation data contract.
 * Collects all encountered errors without early termination.
 * Pure function with no React, browser APIs, external packages, or side effects.
 *
 * @param input - The unknown raw input to validate.
 * @param options - Optional validation parameters such as maxLatitude.
 * @returns ValidationResult with ok=true if valid, or ok=false with descriptive error messages.
 */
export function validateCandidateLocations(
  input: unknown,
  options?: LocationValidationOptions
): ValidationResult {
  const errors: string[] = []

  // 1. Input must be a non-empty array
  if (!Array.isArray(input)) {
    errors.push('Input must be an array of candidate locations.')
    return { ok: false, errors }
  }

  if (input.length === 0) {
    errors.push('Input must be a non-empty array of candidate locations.')
    return { ok: false, errors }
  }

  const seenIds = new Set<string>()

  // Keep track of valid parsed coordinates for duplicate detection
  const parsedLocations: Array<{
    id: string
    tag: string
    latitude: number
    longitude: number
  }> = []

  for (let i = 0; i < input.length; i++) {
    const rawItem = input[i]

    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      errors.push(`Location at index ${i}: item must be an object.`)
      continue
    }

    const loc = rawItem as Record<string, unknown>
    const hasValidId = typeof loc.id === 'string' && loc.id.trim() !== ''
    const locationTag = hasValidId ? `Location "${loc.id}"` : `Location at index ${i}`

    // 2. IDs must be non-empty strings and unique
    if (!hasValidId) {
      errors.push(`${locationTag}: field "id" must be a non-empty string.`)
    } else {
      const idStr = loc.id as string
      if (seenIds.has(idStr)) {
        errors.push(`${locationTag}: field "id" must be unique, but "${idStr}" was already used.`)
      } else {
        seenIds.add(idStr)
      }
    }

    // 3. name, region, coordinateSource, coordinateConvention must be non-empty strings
    if (typeof loc.name !== 'string' || loc.name.trim() === '') {
      errors.push(`${locationTag}: field "name" must be a non-empty string.`)
    }

    if (typeof loc.region !== 'string' || loc.region.trim() === '') {
      errors.push(`${locationTag}: field "region" must be a non-empty string.`)
    }

    if (typeof loc.coordinateSource !== 'string' || loc.coordinateSource.trim() === '') {
      errors.push(`${locationTag}: field "coordinateSource" must be a non-empty string.`)
    }

    if (typeof loc.coordinateConvention !== 'string' || loc.coordinateConvention.trim() === '') {
      errors.push(`${locationTag}: field "coordinateConvention" must be a non-empty string.`)
    }

    // 4. Latitude finite and [-90, 90], Longitude finite and [-180, 180]
    let isLatValid = false
    if (
      typeof loc.latitude !== 'number' ||
      !Number.isFinite(loc.latitude) ||
      loc.latitude < -90 ||
      loc.latitude > 90
    ) {
      errors.push(
        `${locationTag}: field "latitude" must be a finite number between -90 and 90 (got ${loc.latitude}).`
      )
    } else {
      isLatValid = true
    }

    let isLonValid = false
    if (
      typeof loc.longitude !== 'number' ||
      !Number.isFinite(loc.longitude) ||
      loc.longitude < -180 ||
      loc.longitude > 180
    ) {
      errors.push(
        `${locationTag}: field "longitude" must be a finite number between -180 and 180 (got ${loc.longitude}).`
      )
    } else {
      isLonValid = true
    }

    // 5. sourceUrl must be a non-empty HTTPS URL
    if (typeof loc.sourceUrl !== 'string' || loc.sourceUrl.trim() === '') {
      errors.push(`${locationTag}: field "sourceUrl" must be a non-empty HTTPS URL.`)
    } else if (!isValidHttpsUrl(loc.sourceUrl)) {
      errors.push(
        `${locationTag}: field "sourceUrl" must be a valid HTTPS URL (got "${loc.sourceUrl}").`
      )
    }

    // 6. status must be either 'verified' or 'to-verify'
    if (loc.status !== 'verified' && loc.status !== 'to-verify') {
      errors.push(
        `${locationTag}: field "status" must be either "verified" or "to-verify" (got "${loc.status}").`
      )
    }

    // 7. If maxLatitude is supplied, latitude must not exceed it
    if (options?.maxLatitude !== undefined && isLatValid) {
      const maxLat = options.maxLatitude
      if (typeof maxLat === 'number' && Number.isFinite(maxLat)) {
        if ((loc.latitude as number) > maxLat) {
          errors.push(
            `${locationTag}: field "latitude" (${loc.latitude}) exceeds the maximum allowed latitude of ${maxLat}.`
          )
        }
      }
    }

    // 9. If note exists, it must be a string
    if ('note' in loc && loc.note !== undefined && typeof loc.note !== 'string') {
      errors.push(`${locationTag}: field "note" must be a string if provided.`)
    }

    // Record for duplicate coordinate check
    if (hasValidId && isLatValid && isLonValid) {
      parsedLocations.push({
        id: loc.id as string,
        tag: locationTag,
        latitude: loc.latitude as number,
        longitude: loc.longitude as number,
      })
    }
  }

  // 8. Different IDs with coordinates equal within 0.000001 degrees must be flagged as possible duplicates
  for (let i = 0; i < parsedLocations.length; i++) {
    for (let j = i + 1; j < parsedLocations.length; j++) {
      const locA = parsedLocations[i]
      const locB = parsedLocations[j]

      if (locA.id !== locB.id) {
        const dLat = Math.abs(locA.latitude - locB.latitude)
        const dLon = Math.abs(locA.longitude - locB.longitude)

        if (dLat <= COORDINATE_EPSILON && dLon <= COORDINATE_EPSILON) {
          errors.push(
            `${locA.tag}: possible duplicate coordinates with ${locB.tag} (coordinates match within 0.000001 degrees).`
          )
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
