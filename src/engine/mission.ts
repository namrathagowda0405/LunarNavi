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
 * Four authoritative mission profile presets with scientifically defensible weights
 * and engineering constraint thresholds based on NASA Artemis and lunar surface studies.
 */
export const DEFAULT_MISSION_PROFILES: Record<string, MissionProfile> = {
  science: {
    id: 'mission-science',
    name: 'Science Mission',
    description:
      'Exploration profile prioritizing planetary science return, geologic sampling of the South Pole-Aitken basin, and ancient crustal terrain with rover mobility and instrument downlink.',
    weights: {
      science: 0.35,
      slope: 0.15,
      roughness: 0.10,
      illumination: 0.15,
      resource: 0.10,
      communication: 0.15,
    },
    constraints: [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 15.0,
        marginalLimit: 20.0,
        essential: true,
        rationale: 'Structural stability limit for robotic science landers on polar regolith.',
      },
      {
        criterion: 'roughness',
        direction: 'max',
        passLimit: 0.30,
        marginalLimit: 0.50,
        essential: true,
        rationale: 'Descent engine nozzle clearance and landing footpad obstacle clearance.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 40.0,
        marginalLimit: 25.0,
        essential: false,
        rationale: 'Solar array power generation during surface science operations; battery backup acceptable.',
      },
      {
        criterion: 'communication',
        direction: 'min',
        passLimit: 30.0,
        marginalLimit: 15.0,
        essential: false,
        rationale: 'Direct Earth line-of-sight communication; orbital relay buffering can mitigate low periods.',
      },
      {
        criterion: 'science',
        direction: 'min',
        passLimit: 60.0,
        marginalLimit: 45.0,
        essential: true,
        rationale: 'Site must meet high exploration and planetary science prioritization threshold.',
      },
    ],
  },
  resource: {
    id: 'mission-resource',
    name: 'Resource Exploration',
    description:
      'Prospecting profile prioritizing proximity to permanently shadowed regions (PSRs), water ice cold traps, and volatile deposits for in-situ resource utilization.',
    weights: {
      resource: 0.35,
      slope: 0.15,
      roughness: 0.10,
      illumination: 0.15,
      science: 0.15,
      communication: 0.10,
    },
    constraints: [
      {
        criterion: 'resource',
        direction: 'min',
        passLimit: 40.0,
        marginalLimit: 25.0,
        essential: true,
        rationale: 'Candidate must exhibit measurable evidence of cryogenic volatiles or cold-trap proximity.',
      },
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 12.0,
        marginalLimit: 16.0,
        essential: true,
        rationale: 'Mobility limit for prospecting rovers traversing between rim stations and shadowed floors.',
      },
      {
        criterion: 'roughness',
        direction: 'max',
        passLimit: 0.25,
        marginalLimit: 0.40,
        essential: true,
        rationale: 'Rover wheel and chassis obstacle clearance over polar blocky ejecta.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 35.0,
        marginalLimit: 20.0,
        essential: false,
        rationale: 'Rover battery survival margin when venturing into cryogenic shadowed cold traps.',
      },
    ],
  },
  crewed: {
    id: 'mission-crewed',
    name: 'Crewed Base',
    description:
      'Human lunar surface outpost profile with strict terrain safety, sustained solar illumination, and continuous direct-to-Earth astronaut safety communications.',
    weights: {
      slope: 0.25,
      roughness: 0.15,
      illumination: 0.25,
      resource: 0.10,
      communication: 0.20,
      science: 0.05,
    },
    constraints: [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 10.0,
        essential: true,
        rationale: 'Human Landing System (HLS) strict touchdown stability and landing leg structural limit.',
      },
      {
        criterion: 'roughness',
        direction: 'max',
        passLimit: 0.15,
        marginalLimit: 0.25,
        essential: true,
        rationale: 'Human-rated surface obstacle clearance to eliminate tip-over risk during landing.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 50.0,
        marginalLimit: 35.0,
        essential: true,
        rationale: 'Life support solar power generation and thermal survival requirements.',
      },
      {
        criterion: 'communication',
        direction: 'min',
        passLimit: 50.0,
        marginalLimit: 30.0,
        essential: true,
        rationale: 'Continuous direct-to-Earth communication for astronaut health and mission safety.',
      },
      {
        criterion: 'resource',
        direction: 'min',
        passLimit: 20.0,
        marginalLimit: 10.0,
        essential: false,
        rationale: 'Secondary proximity to volatile deposits for long-term outpost ISRU development.',
      },
    ],
  },
  communication: {
    id: 'mission-communication',
    name: 'Communication Mission',
    description:
      'Polar communications hub profile maximizing continuous Earth line-of-sight visibility, elevated terrain platform stability, and uninterrupted power for telecom relays.',
    weights: {
      communication: 0.40,
      illumination: 0.20,
      slope: 0.15,
      roughness: 0.10,
      science: 0.10,
      resource: 0.05,
    },
    constraints: [
      {
        criterion: 'communication',
        direction: 'min',
        passLimit: 70.0,
        marginalLimit: 50.0,
        essential: true,
        rationale: 'High-availability Earth line-of-sight requirement for polar telecom outpost.',
      },
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 12.0,
        marginalLimit: 16.0,
        essential: true,
        rationale: 'Relay mast structural stability and lander tip-over prevention.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 40.0,
        marginalLimit: 25.0,
        essential: false,
        rationale: 'Continuous power for communication payload transmitters; battery backup auxiliary.',
      },
    ],
  },
}

// Alias for generic access
export const MISSION_PROFILES = DEFAULT_MISSION_PROFILES

/**
 * Returns a cloned default mission profile for a given mission type id.
 * Defaults to 'science' if an unrecognized id is provided.
 */
export function getDefaultMissionProfile(typeId: string): MissionProfile {
  const profile = DEFAULT_MISSION_PROFILES[typeId] ?? DEFAULT_MISSION_PROFILES.science
  return JSON.parse(JSON.stringify(profile)) as MissionProfile
}

/**
 * Returns all four default mission profiles as an array.
 */
export function getAllDefaultMissionProfiles(): MissionProfile[] {
  return Object.values(DEFAULT_MISSION_PROFILES).map((p) =>
    JSON.parse(JSON.stringify(p)) as MissionProfile
  )
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
