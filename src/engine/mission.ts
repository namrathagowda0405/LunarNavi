import { CRITERION_IDS, CriterionId, ValidationResult } from './types'

const ALLOWED_CRITERIA: ReadonlySet<string> = new Set(CRITERION_IDS)
const WEIGHT_TOLERANCE = 0.000001

// Indicates whether a constraint specifies an upper bound ('max') or lower bound ('min').
// 'max' means the value must stay at or below the limit (e.g. slope, roughness).
// 'min' means the value must stay at or above the limit (e.g. illumination, communication).
export type ConstraintDirection = 'max' | 'min'

// A mission constraint defining threshold limits for a criterion.
// For 'max': value <= passLimit is Pass, value <= marginalLimit is Marginal, above that is Fail.
// For 'min': value >= passLimit is Pass, value >= marginalLimit is Marginal, below that is Fail.
export interface Constraint {
  criterion: CriterionId
  direction: ConstraintDirection
  passLimit: number
  marginalLimit: number
  essential: boolean
  rationale: string
}

// A mission profile specifying operational importance (weights) and physical limits (constraints).
export interface MissionProfile {
  id: string
  name: string
  description: string
  weights: Record<CriterionId, number>
  constraints: Constraint[]
}

/**
 * Validates an input to ensure it is a valid list of mission profiles adhering to all schema rules.
 * Pure function with no external or browser dependencies.
 * Collects all encountered errors without early exit.
 *
 * @param input - The unknown raw input to validate.
 * @returns ValidationResult with ok=true if valid, or ok=false with detailed error messages.
 */
export function validateMissions(input: unknown): ValidationResult {
  const errors: string[] = []

  // Rule a: input must be a non-empty array
  if (!Array.isArray(input)) {
    errors.push('Input must be an array of mission profiles.')
    return { ok: false, errors }
  }

  if (input.length === 0) {
    errors.push('Input must be a non-empty array of mission profiles.')
    return { ok: false, errors }
  }

  const seenIds = new Set<string>()

  for (let i = 0; i < input.length; i++) {
    const rawItem = input[i]

    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      errors.push(`Mission at index ${i}: item must be an object.`)
      continue
    }

    const mission = rawItem as Record<string, unknown>
    const hasValidId = typeof mission.id === 'string' && mission.id.trim() !== ''
    const missionTag = hasValidId ? `Mission "${mission.id}"` : `Mission at index ${i}`

    // Rule b: mission ids non-empty strings and unique
    if (!hasValidId) {
      errors.push(`${missionTag}: field "id" must be a non-empty string.`)
    } else {
      if (seenIds.has(mission.id as string)) {
        errors.push(`${missionTag}: field "id" must be unique, but "${mission.id}" was already used.`)
      } else {
        seenIds.add(mission.id as string)
      }
    }

    // Rule c: name and description non-empty strings
    if (typeof mission.name !== 'string' || mission.name.trim() === '') {
      errors.push(`${missionTag}: field "name" must be a non-empty string.`)
    }

    if (typeof mission.description !== 'string' || mission.description.trim() === '') {
      errors.push(`${missionTag}: field "description" must be a non-empty string.`)
    }

    // Rule d: weights: all six criteria present, no unknown names, every weight finite and >= 0, and weights add up to 1
    if (!mission.weights || typeof mission.weights !== 'object' || Array.isArray(mission.weights)) {
      errors.push(`${missionTag}: field "weights" must be an object containing all criteria weights.`)
    } else {
      const weightsObj = mission.weights as Record<string, unknown>

      // Check all six criteria present
      for (const criterionId of CRITERION_IDS) {
        if (!(criterionId in weightsObj)) {
          errors.push(`${missionTag}: field "weights.${criterionId}" is missing.`)
        }
      }

      // Check for unknown criterion names
      const weightKeys = Object.keys(weightsObj)
      for (const key of weightKeys) {
        if (!ALLOWED_CRITERIA.has(key)) {
          errors.push(`${missionTag}: field "weights.${key}" is an unknown criterion name.`)
        }
      }

      // Check each weight is finite and >= 0, then sum
      let weightSum = 0
      let allWeightsNumeric = true

      for (const key of weightKeys) {
        if (!ALLOWED_CRITERIA.has(key)) {
          continue
        }

        const w = weightsObj[key]
        if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) {
          errors.push(`${missionTag}: field "weights.${key}" must be a finite number >= 0.`)
          allWeightsNumeric = false
        } else {
          weightSum += w
        }
      }

      // If all six criteria are present and numeric, check sum tolerance
      const allPresent = CRITERION_IDS.every((cid) => cid in weightsObj)
      if (allPresent && allWeightsNumeric) {
        if (Math.abs(weightSum - 1.0) > WEIGHT_TOLERANCE) {
          errors.push(
            `${missionTag}: field "weights" must sum to 1.0 within tolerance ${WEIGHT_TOLERANCE} (got ${weightSum}).`
          )
        }
      }
    }

    // Rule e: constraints must be an array (it may be empty)
    if (!Array.isArray(mission.constraints)) {
      errors.push(`${missionTag}: field "constraints" must be an array.`)
    } else {
      const seenPairs = new Set<string>()

      for (let cIdx = 0; cIdx < mission.constraints.length; cIdx++) {
        const cItem = mission.constraints[cIdx]
        const cPrefix = `${missionTag}: field "constraints[${cIdx}]`

        if (!cItem || typeof cItem !== 'object' || Array.isArray(cItem)) {
          errors.push(`${cPrefix}" must be an object.`)
          continue
        }

        const c = cItem as Record<string, unknown>

        // Rule f: criterion is a valid CriterionId
        const isValidCriterion = typeof c.criterion === 'string' && ALLOWED_CRITERIA.has(c.criterion)
        if (!isValidCriterion) {
          errors.push(`${cPrefix}.criterion" must be a valid CriterionId.`)
        }

        // Rule g: direction is 'max' or 'min'
        const isValidDirection = c.direction === 'max' || c.direction === 'min'
        if (!isValidDirection) {
          errors.push(`${cPrefix}.direction" must be 'max' or 'min'.`)
        }

        // Rule f (duplicate pair check): no duplicate (criterion + direction) pair inside one mission
        if (isValidCriterion && isValidDirection) {
          const pairKey = `${c.criterion}:${c.direction}`
          if (seenPairs.has(pairKey)) {
            errors.push(
              `${cPrefix}" contains duplicate constraint for criterion "${c.criterion}" and direction "${c.direction}".`
            )
          } else {
            seenPairs.add(pairKey)
          }
        }

        // Rule h: passLimit and marginalLimit are finite numbers
        const isPassFinite = typeof c.passLimit === 'number' && Number.isFinite(c.passLimit)
        if (!isPassFinite) {
          errors.push(`${cPrefix}.passLimit" must be a finite number.`)
        }

        const isMarginalFinite = typeof c.marginalLimit === 'number' && Number.isFinite(c.marginalLimit)
        if (!isMarginalFinite) {
          errors.push(`${cPrefix}.marginalLimit" must be a finite number.`)
        }

        // Rule i: for 'max': passLimit <= marginalLimit. for 'min': passLimit >= marginalLimit
        if (isValidDirection && isPassFinite && isMarginalFinite) {
          const pass = c.passLimit as number
          const marginal = c.marginalLimit as number

          if (c.direction === 'max' && pass > marginal) {
            errors.push(
              `${cPrefix}" with direction 'max' must have passLimit <= marginalLimit (got passLimit=${pass}, marginalLimit=${marginal}).`
            )
          } else if (c.direction === 'min' && pass < marginal) {
            errors.push(
              `${cPrefix}" with direction 'min' must have passLimit >= marginalLimit (got passLimit=${pass}, marginalLimit=${marginal}).`
            )
          }
        }

        // Rule j: essential is a boolean
        if (typeof c.essential !== 'boolean') {
          errors.push(`${cPrefix}.essential" must be a boolean.`)
        }

        // Rule k: rationale is a non-empty string
        if (typeof c.rationale !== 'string' || c.rationale.trim() === '') {
          errors.push(`${cPrefix}.rationale" must be a non-empty string.`)
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}
