import { CRITERION_IDS, ValidationResult } from './types'

const ALLOWED_CRITERIA: ReadonlySet<string> = new Set(CRITERION_IDS)
const ALLOWED_KINDS = new Set(['measured', 'derived', 'estimated'])
const ALLOWED_QUALITIES = new Set(['high', 'medium', 'low'])

/**
 * Validates an input to ensure it is a valid list of lunar landing sites adhering to all schema rules.
 * Pure function with no external or browser dependencies.
 * Collects all encountered errors without early exit.
 *
 * @param input - The unknown raw input to validate.
 * @returns ValidationResult with ok=true if valid, or ok=false with detailed error messages.
 */
export function validateSites(input: unknown): ValidationResult {
  const errors: string[] = []

  // Rule a: input must be a non-empty array
  if (!Array.isArray(input)) {
    errors.push('Input must be an array of sites.')
    return { ok: false, errors }
  }

  if (input.length === 0) {
    errors.push('Input must be a non-empty array of sites.')
    return { ok: false, errors }
  }

  const seenIds = new Set<string>()

  for (let i = 0; i < input.length; i++) {
    const rawSite = input[i]

    if (!rawSite || typeof rawSite !== 'object' || Array.isArray(rawSite)) {
      errors.push(`Site at index ${i}: item must be an object.`)
      continue
    }

    const site = rawSite as Record<string, unknown>
    const hasValidId = typeof site.id === 'string' && site.id.trim() !== ''
    const siteTag = hasValidId ? `Site "${site.id}"` : `Site at index ${i}`

    // Rule b: site ids must be non-empty strings and unique
    if (!hasValidId) {
      errors.push(`${siteTag}: field "id" must be a non-empty string.`)
    } else {
      if (seenIds.has(site.id as string)) {
        errors.push(`${siteTag}: field "id" must be unique, but "${site.id}" was already used.`)
      } else {
        seenIds.add(site.id as string)
      }
    }

    // Rule c: name and region must be non-empty strings
    if (typeof site.name !== 'string' || site.name.trim() === '') {
      errors.push(`${siteTag}: field "name" must be a non-empty string.`)
    }

    if (typeof site.region !== 'string' || site.region.trim() === '') {
      errors.push(`${siteTag}: field "region" must be a non-empty string.`)
    }

    // Rule d: latitude between -90 and 90, longitude between -180 and 180, finite numbers
    if (
      typeof site.latitude !== 'number' ||
      !Number.isFinite(site.latitude) ||
      site.latitude < -90 ||
      site.latitude > 90
    ) {
      errors.push(
        `${siteTag}: field "latitude" must be a finite number between -90 and 90.`
      )
    }

    if (
      typeof site.longitude !== 'number' ||
      !Number.isFinite(site.longitude) ||
      site.longitude < -180 ||
      site.longitude > 180
    ) {
      errors.push(
        `${siteTag}: field "longitude" must be a finite number between -180 and 180.`
      )
    }

    // Rule e: all six criteria must be present; unknown criterion names are errors
    if (!site.criteria || typeof site.criteria !== 'object' || Array.isArray(site.criteria)) {
      errors.push(`${siteTag}: field "criteria" must be an object containing all evaluation criteria.`)
      continue
    }

    const criteriaObj = site.criteria as Record<string, unknown>

    // Check for missing criteria
    for (const criterionId of CRITERION_IDS) {
      if (!(criterionId in criteriaObj)) {
        errors.push(`${siteTag}: field "criteria.${criterionId}" is missing.`)
      }
    }

    // Check for unknown criterion names
    const criterionKeys = Object.keys(criteriaObj)
    for (const key of criterionKeys) {
      if (!ALLOWED_CRITERIA.has(key)) {
        errors.push(`${siteTag}: field "criteria.${key}" is an unknown criterion name.`)
      }
    }

    // Validate criterion values for all present criteria
    for (const key of criterionKeys) {
      if (!ALLOWED_CRITERIA.has(key)) {
        continue
      }

      const crit = criteriaObj[key]
      const fieldPrefix = `${siteTag}: field "criteria.${key}`

      if (!crit || typeof crit !== 'object' || Array.isArray(crit)) {
        errors.push(`${fieldPrefix}" must be an object.`)
        continue
      }

      const c = crit as Record<string, unknown>

      // Rule f: kind must be one of the allowed values; quality likewise
      if (typeof c.kind !== 'string' || !ALLOWED_KINDS.has(c.kind)) {
        errors.push(
          `${fieldPrefix}.kind" must be one of 'measured', 'derived', or 'estimated'.`
        )
      }

      if (typeof c.quality !== 'string' || !ALLOWED_QUALITIES.has(c.quality)) {
        errors.push(
          `${fieldPrefix}.quality" must be one of 'high', 'medium', or 'low'.`
        )
      }

      // Rule g: source must be a non-empty string
      if (typeof c.source !== 'string' || c.source.trim() === '') {
        errors.push(`${fieldPrefix}.source" must be a non-empty string.`)
      }

      // Rule h & i
      if (c.value === null) {
        // Rule i: if value is null: low and high must also be null, and note must be a non-empty string explaining why the data is missing
        if (c.low !== null) {
          errors.push(`${fieldPrefix}.low" must be null when value is null.`)
        }
        if (c.high !== null) {
          errors.push(`${fieldPrefix}.high" must be null when value is null.`)
        }
        if (typeof c.note !== 'string' || c.note.trim() === '') {
          errors.push(
            `${fieldPrefix}.note" must be a non-empty string explaining why the data is missing when value is null.`
          )
        }
      } else if (typeof c.value === 'number') {
        // Rule h: if value is a number: it must be finite, low and high must be numbers, and low <= value <= high
        const isValFinite = Number.isFinite(c.value)
        if (!isValFinite) {
          errors.push(`${fieldPrefix}.value" must be a finite number.`)
        }

        const isLowFinite = typeof c.low === 'number' && Number.isFinite(c.low)
        if (!isLowFinite) {
          errors.push(`${fieldPrefix}.low" must be a finite number when value is a number.`)
        }

        const isHighFinite = typeof c.high === 'number' && Number.isFinite(c.high)
        if (!isHighFinite) {
          errors.push(`${fieldPrefix}.high" must be a finite number when value is a number.`)
        }

        if (isValFinite && isLowFinite && isHighFinite) {
          const val = c.value as number
          const low = c.low as number
          const high = c.high as number

          if (low > val || val > high) {
            errors.push(
              `${fieldPrefix}" values must satisfy low <= value <= high (got low=${low}, value=${val}, high=${high}).`
            )
          }
        }

        if (c.note !== undefined && typeof c.note !== 'string') {
          errors.push(`${fieldPrefix}.note" must be a string if provided.`)
        }
      } else {
        errors.push(`${fieldPrefix}.value" must be a number or null.`)
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
