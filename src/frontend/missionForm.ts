import { CRITERION_IDS, CriterionId } from '../engine/types'
import { CRITERION_DIRECTION } from '../engine/criteria'
import { Constraint, ConstraintDirection, MissionProfile, validateMissions } from '../engine/mission'
import { MissionTypeId, MISSION_TYPES, RegionId, REGION_OPTIONS } from './missionTypes'

export interface FormConstraint {
  id: string
  criterion: CriterionId
  direction: ConstraintDirection
  passLimit: string
  marginalLimit: string
  essential: boolean
  rationale: string
}

export interface MissionFormState {
  missionType: MissionTypeId
  region: RegionId
  rawWeights: Record<CriterionId, number>
  constraints: FormConstraint[]
}

/**
 * Returns the default initial state for the Mission Setup form.
 * Starts with neutral equal priorities (5 out of 10) for all criteria,
 * science mission type, south pole region, and no constraints.
 */
export function defaultFormState(): MissionFormState {
  return {
    missionType: 'science',
    region: 'south-pole',
    rawWeights: {
      slope: 5,
      roughness: 5,
      illumination: 5,
      resource: 5,
      communication: 5,
      science: 5,
    },
    constraints: [],
  }
}

/**
 * Suggests the standard constraint direction for a given criterion.
 * Cost criteria (lower is better, e.g. slope, roughness) default to 'max' (upper limit).
 * Benefit criteria (higher is better, e.g. illumination, science) default to 'min' (lower limit).
 */
export function suggestedDirection(criterion: CriterionId): ConstraintDirection {
  return CRITERION_DIRECTION[criterion] === 'cost' ? 'max' : 'min'
}

/**
 * Normalizes raw slider weights (0-10) into relative proportions summing to 1.0.
 *
 * @param rawWeights - Map of criterion ID to raw weight value.
 * @returns Map of criterion ID to normalized weight in [0, 1] summing to 1.0.
 * @throws Error if any weight is negative or non-finite, or if all weights are zero.
 */
export function normalizeWeights(
  rawWeights: Record<CriterionId, number>
): Record<CriterionId, number> {
  let sum = 0

  for (const cid of CRITERION_IDS) {
    const val = rawWeights[cid]
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      throw new Error(
        `Invalid weight for criterion "${cid}": weights must be non-negative finite numbers (received ${val}).`
      )
    }
    sum += val
  }

  if (sum === 0) {
    throw new Error('All weights are zero. At least one criterion weight must be greater than zero.')
  }

  const normalized: Record<CriterionId, number> = {} as Record<CriterionId, number>
  for (const cid of CRITERION_IDS) {
    normalized[cid] = rawWeights[cid] / sum
  }

  return normalized
}

/**
 * Formats a normalized weight into a percentage string with one decimal place.
 * E.g. 1/6 (0.16666...) => "16.7%"
 */
export function formatWeightShare(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`
}

export interface BuildMissionResult {
  ok: boolean
  profile: MissionProfile | null
  errors: string[]
}

/**
 * Validates form state and constructs an engine-compliant MissionProfile.
 * Leverages the existing engine's validateMissions validator for strict specification compliance.
 *
 * @param form - Current Mission Setup form state.
 * @returns Result object with ok=true and profile if valid, or ok=false and list of errors.
 */
export function buildMissionProfile(form: MissionFormState): BuildMissionResult {
  const errors: string[] = []

  // 1. Validate weights and normalize
  let normalizedWeights: Record<CriterionId, number>
  try {
    normalizedWeights = normalizeWeights(form.rawWeights)
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err))
    // Return early if weights cannot be normalized
    return { ok: false, profile: null, errors }
  }

  // 2. Validate and convert constraints
  const parsedConstraints: Constraint[] = []
  const seenPairs = new Set<string>()

  for (let idx = 0; idx < form.constraints.length; idx++) {
    const fc = form.constraints[idx]
    const tag = `Constraint #${idx + 1} for "${fc.criterion}"`

    // Check criterion
    if (!CRITERION_IDS.includes(fc.criterion)) {
      errors.push(`${tag}: invalid criterion.`)
    }

    // Check direction
    if (fc.direction !== 'max' && fc.direction !== 'min') {
      errors.push(`${tag}: direction must be 'max' or 'min'.`)
    }

    // Check duplicate pair
    const pairKey = `${fc.criterion}:${fc.direction}`
    if (seenPairs.has(pairKey)) {
      errors.push(
        `${tag}: a constraint for "${fc.criterion}" with direction "${fc.direction}" already exists.`
      )
    } else {
      seenPairs.add(pairKey)
    }

    // Parse passLimit
    const passTrim = fc.passLimit.trim()
    if (passTrim === '') {
      errors.push(`${tag}: pass limit cannot be empty.`)
    }
    const passNum = Number(passTrim)
    if (passTrim !== '' && (!Number.isFinite(passNum) || isNaN(passNum))) {
      errors.push(`${tag}: pass limit must be a finite number (got "${fc.passLimit}").`)
    }

    // Parse marginalLimit
    const marginalTrim = fc.marginalLimit.trim()
    if (marginalTrim === '') {
      errors.push(`${tag}: marginal limit cannot be empty.`)
    }
    const marginalNum = Number(marginalTrim)
    if (marginalTrim !== '' && (!Number.isFinite(marginalNum) || isNaN(marginalNum))) {
      errors.push(`${tag}: marginal limit must be a finite number (got "${fc.marginalLimit}").`)
    }

    // Validate limit ordering
    if (
      passTrim !== '' &&
      marginalTrim !== '' &&
      Number.isFinite(passNum) &&
      Number.isFinite(marginalNum)
    ) {
      if (fc.direction === 'max' && passNum > marginalNum) {
        errors.push(
          `${tag} with direction 'max' must have pass limit <= marginal limit (got pass=${passNum}, marginal=${marginalNum}).`
        )
      } else if (fc.direction === 'min' && passNum < marginalNum) {
        errors.push(
          `${tag} with direction 'min' must have pass limit >= marginal limit (got pass=${passNum}, marginal=${marginalNum}).`
        )
      }
    }

    // Validate rationale
    if (!fc.rationale || fc.rationale.trim() === '') {
      errors.push(`${tag}: rationale is required. Explain why this limit is set.`)
    }

    parsedConstraints.push({
      criterion: fc.criterion,
      direction: fc.direction,
      passLimit: passNum,
      marginalLimit: marginalNum,
      essential: Boolean(fc.essential),
      rationale: fc.rationale.trim(),
    })
  }

  if (errors.length > 0) {
    return { ok: false, profile: null, errors }
  }

  // Find mission type label and region label
  const typeOpt = MISSION_TYPES.find((t) => t.id === form.missionType)
  const typeLabel = typeOpt?.label ?? 'Custom Mission'

  const regionOpt = REGION_OPTIONS.find((r) => r.id === form.region)
  const regionLabel = regionOpt?.label ?? 'Lunar South Pole'

  const profile: MissionProfile = {
    id: `mission-${form.missionType}`,
    name: `${typeLabel} Profile`,
    description: `User-configured ${typeLabel.toLowerCase()} profile targeting ${regionLabel}.`,
    weights: normalizedWeights,
    constraints: parsedConstraints,
  }

  // 3. Validate against engine validator
  const validation = validateMissions([profile])
  if (!validation.ok) {
    return { ok: false, profile: null, errors: validation.errors }
  }

  return { ok: true, profile, errors: [] }
}
