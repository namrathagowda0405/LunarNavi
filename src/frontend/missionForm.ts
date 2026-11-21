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
  arrivalDate?: string
  arrivalWindowDays?: number
  durationDays?: number
  rawWeights: Record<CriterionId, number>
  constraints: FormConstraint[]
}

export const DEFAULT_MISSION_DURATIONS: Record<MissionTypeId, number> = {
  science: 14,
  resource: 30,
  crewed: 30,
  communication: 180,
}

export const MISSION_WEIGHT_RATIONALE: Record<
  MissionTypeId,
  { title: string; rationale: string; weightsSummary: string }
> = {
  science: {
    title: 'Planetary Science Return Priority',
    rationale:
      'Prioritizes scientific value (35%) for maximum geologic and South Pole-Aitken sampling yield, balanced with touchdown safety (slope 15%, roughness 10%), solar power (15%), and data downlink (15%).',
    weightsSummary: 'Science (35%), Slope (15%), Illumination (15%), Comms (15%), Resource (10%), Roughness (10%)',
  },
  resource: {
    title: 'Cryogenic Volatile Prospecting Priority',
    rationale:
      'Prioritizes volatile indicators and cold-trap proximity (35%), paired with traverse slope safety (15%), rover mobility roughness (10%), illumination (15%), and geochemical context (15%).',
    weightsSummary: 'Resource (35%), Slope (15%), Illumination (15%), Science (15%), Roughness (10%), Comms (10%)',
  },
  crewed: {
    title: 'Astronaut Safety & Base Survival Priority',
    rationale:
      'Prioritizes strict human landing gear stability (slope 25%, roughness 15%), life-support solar array power (25%), and direct crew Earth communications (20%), with secondary ISRU potential (10%).',
    weightsSummary: 'Slope (25%), Illumination (25%), Comms (20%), Roughness (15%), Resource (10%), Science (5%)',
  },
  communication: {
    title: 'Telecom Hub Line-of-Sight Priority',
    rationale:
      'Prioritizes continuous direct line-of-sight Earth visibility (40%) and solar transmitter power (20%), with benign elevated plateau terrain (15%) for relay tower installation.',
    weightsSummary: 'Comms (40%), Illumination (20%), Slope (15%), Roughness (10%), Science (10%), Resource (5%)',
  },
}

/**
 * Returns the default raw slider weights (0-10) for a given mission profile.
 */
export function getDefaultRawWeightsForMission(
  typeId: MissionTypeId
): Record<CriterionId, number> {
  switch (typeId) {
    case 'science':
      return { slope: 3, roughness: 2, illumination: 3, resource: 2, communication: 3, science: 7 }
    case 'resource':
      return { slope: 3, roughness: 2, illumination: 3, resource: 7, communication: 2, science: 3 }
    case 'crewed':
      return { slope: 5, roughness: 3, illumination: 5, resource: 2, communication: 4, science: 1 }
    case 'communication':
      return { slope: 3, roughness: 2, illumination: 4, resource: 1, communication: 8, science: 2 }
    default:
      return { slope: 5, roughness: 5, illumination: 5, resource: 5, communication: 5, science: 5 }
  }
}

/**
 * Returns default engineering constraints for a given mission profile.
 */
export function getDefaultConstraintsForMission(typeId: MissionTypeId): FormConstraint[] {
  switch (typeId) {
    case 'science':
      return [
        {
          id: 'const-sci-1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '15.0',
          marginalLimit: '20.0',
          essential: true,
          rationale: 'Robotic science lander structural stability limit on polar regolith.',
        },
        {
          id: 'const-sci-2',
          criterion: 'roughness',
          direction: 'max',
          passLimit: '0.30',
          marginalLimit: '0.50',
          essential: true,
          rationale: 'Descent engine nozzle clearance and landing footpad obstacle clearance.',
        },
        {
          id: 'const-sci-3',
          criterion: 'science',
          direction: 'min',
          passLimit: '60.0',
          marginalLimit: '45.0',
          essential: true,
          rationale: 'Site must meet high exploration and planetary science prioritization threshold.',
        },
        {
          id: 'const-sci-4',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '40.0',
          marginalLimit: '25.0',
          essential: false,
          rationale: 'Solar array operational power threshold; battery buffering auxiliary.',
        },
        {
          id: 'const-sci-5',
          criterion: 'communication',
          direction: 'min',
          passLimit: '30.0',
          marginalLimit: '15.0',
          essential: false,
          rationale: 'Direct Earth telemetry downlink threshold.',
        },
      ]
    case 'resource':
      return [
        {
          id: 'const-res-1',
          criterion: 'resource',
          direction: 'min',
          passLimit: '40.0',
          marginalLimit: '25.0',
          essential: true,
          rationale: 'Proximity to cryogenic volatile indicators or permanently shadowed cold traps.',
        },
        {
          id: 'const-res-2',
          criterion: 'slope',
          direction: 'max',
          passLimit: '12.0',
          marginalLimit: '16.0',
          essential: true,
          rationale: 'Prospecting rover rim-to-floor traverse navigability limit.',
        },
        {
          id: 'const-res-3',
          criterion: 'roughness',
          direction: 'max',
          passLimit: '0.25',
          marginalLimit: '0.40',
          essential: true,
          rationale: 'Rover chassis clearance over blocky polar regolith.',
        },
        {
          id: 'const-res-4',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '35.0',
          marginalLimit: '20.0',
          essential: false,
          rationale: 'Rover battery solar recharging threshold.',
        },
      ]
    case 'crewed':
      return [
        {
          id: 'const-crew-1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '8.0',
          marginalLimit: '10.0',
          essential: true,
          rationale: 'Human Landing System (HLS) strict touchdown stability limit to prevent tip-over.',
        },
        {
          id: 'const-crew-2',
          criterion: 'roughness',
          direction: 'max',
          passLimit: '0.15',
          marginalLimit: '0.25',
          essential: true,
          rationale: 'Human-rated landing gear footpad obstacle tolerance.',
        },
        {
          id: 'const-crew-3',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '50.0',
          marginalLimit: '35.0',
          essential: true,
          rationale: 'Habitat life-support power generation and thermal survival requirements.',
        },
        {
          id: 'const-crew-4',
          criterion: 'communication',
          direction: 'min',
          passLimit: '50.0',
          marginalLimit: '30.0',
          essential: true,
          rationale: 'Continuous direct-to-Earth communication for astronaut health and safety.',
        },
        {
          id: 'const-crew-5',
          criterion: 'resource',
          direction: 'min',
          passLimit: '20.0',
          marginalLimit: '10.0',
          essential: false,
          rationale: 'Secondary proximity to volatile deposits for long-term outpost ISRU development.',
        },
      ]
    case 'communication':
      return [
        {
          id: 'const-comm-1',
          criterion: 'communication',
          direction: 'min',
          passLimit: '70.0',
          marginalLimit: '50.0',
          essential: true,
          rationale: 'High-availability Earth line-of-sight requirement for polar telecom outpost.',
        },
        {
          id: 'const-comm-2',
          criterion: 'slope',
          direction: 'max',
          passLimit: '12.0',
          marginalLimit: '16.0',
          essential: true,
          rationale: 'Relay antenna tower platform stability limit.',
        },
        {
          id: 'const-comm-3',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '40.0',
          marginalLimit: '25.0',
          essential: false,
          rationale: 'Continuous power for communication transmitter.',
        },
      ]
    default:
      return []
  }
}

/**
 * Returns a complete form state initialized with the default preset values
 * for a specific mission profile.
 */
export function getMissionPresetState(
  typeId: MissionTypeId,
  overrides?: Partial<MissionFormState>
): MissionFormState {
  const duration = overrides?.durationDays ?? DEFAULT_MISSION_DURATIONS[typeId] ?? 14
  return {
    missionType: typeId,
    region: 'south-pole',
    arrivalDate: overrides?.arrivalDate ?? '2027-06-01',
    arrivalWindowDays: overrides?.arrivalWindowDays ?? 7,
    durationDays: duration,
    rawWeights: getDefaultRawWeightsForMission(typeId),
    constraints: getDefaultConstraintsForMission(typeId),
  }
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
    arrivalDate: '2027-06-01',
    arrivalWindowDays: 7,
    durationDays: 14,
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

  // Validate Arrival Date if provided
  const arrivalDate = form.arrivalDate?.trim()
  if (arrivalDate !== undefined) {
    if (!arrivalDate) {
      errors.push('Expected lunar arrival date is required.')
    } else {
      const parsedDate = new Date(arrivalDate)
      if (isNaN(parsedDate.getTime())) {
        errors.push('Expected lunar arrival date must be a valid calendar date (YYYY-MM-DD).')
      }
    }
  }

  // Validate Duration if provided
  if (form.durationDays !== undefined) {
    if (
      typeof form.durationDays !== 'number' ||
      !Number.isFinite(form.durationDays) ||
      form.durationDays < 1 ||
      form.durationDays > 730
    ) {
      errors.push('Surface mission duration must be a positive number between 1 and 730 Earth days.')
    }
  }

  // Validate Arrival Window if provided
  if (form.arrivalWindowDays !== undefined) {
    if (
      typeof form.arrivalWindowDays !== 'number' ||
      !Number.isFinite(form.arrivalWindowDays) ||
      form.arrivalWindowDays < 0 ||
      form.arrivalWindowDays > 60
    ) {
      errors.push('Arrival window must be between 0 and 60 days.')
    }
  }

  if (errors.length > 0) {
    return { ok: false, profile: null, errors }
  }

  // Find mission type label and region label
  const typeOpt = MISSION_TYPES.find((t) => t.id === form.missionType)
  const typeLabel = typeOpt?.label ?? 'Custom Mission'

  const regionOpt = REGION_OPTIONS.find((r) => r.id === form.region)
  const regionLabel = regionOpt?.label ?? 'Lunar South Pole'

  const dateStr = arrivalDate ? arrivalDate : '2027-06-01'
  const windowDays = typeof form.arrivalWindowDays === 'number' ? form.arrivalWindowDays : 7
  const windowStr = windowDays > 0 ? ` (±${Math.round(windowDays / 2)}d window)` : ' (exact date)'
  const durationStr = typeof form.durationDays === 'number' ? `${form.durationDays} Earth days` : '14 Earth days'

  const profile: MissionProfile = {
    id: `mission-${form.missionType}`,
    name: `${typeLabel} Profile`,
    description: `User-configured ${typeLabel.toLowerCase()} profile targeting ${regionLabel}. Planned arrival: ${dateStr}${windowStr}, stay duration: ${durationStr}. (Illumination & Earth visibility evaluated via NASA PGDA 18.6-yr multi-year validated model).`,
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
