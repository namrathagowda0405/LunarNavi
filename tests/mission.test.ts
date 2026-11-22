// FIXTURE: made-up numbers for testing only. NOT real mission requirements.

import { describe, it, expect } from 'vitest'
import { MissionProfile } from '../src/engine/mission'
import { validateMissions } from '../src/engine/mission'

function makeValidMission(overrides?: Partial<MissionProfile>): MissionProfile {
  return {
    id: 'mission-artemis-lander-01',
    name: 'Artemis Crewed Lander Profile',
    description: 'Human landing system evaluation profile prioritizing surface slope and communication safety.',
    weights: {
      slope: 0.25,
      roughness: 0.15,
      illumination: 0.2,
      resource: 0.1,
      communication: 0.15,
      science: 0.15,
    },
    constraints: [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Lander stability limits allow safe touchdown up to 12 degrees with ideal safety under 8 degrees.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 0.8,
        marginalLimit: 0.6,
        essential: false,
        rationale: 'Solar arrays require sustained sunlight throughout the surface stay window.',
      },
    ],
    ...overrides,
  }
}

describe('validateMissions', () => {
  it('passes when given valid mission profiles', () => {
    const mission1 = makeValidMission({ id: 'mission-1', name: 'Mission One' })
    const mission2 = makeValidMission({
      id: 'mission-2',
      name: 'Mission Two (No constraints)',
      constraints: [],
    })

    const result = validateMissions([mission1, mission2])
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('passes when a min constraint has correct ordering (passLimit >= marginalLimit)', () => {
    const mission = makeValidMission({
      constraints: [
        {
          criterion: 'communication',
          direction: 'min',
          passLimit: 0.9,
          marginalLimit: 0.7,
          essential: true,
          rationale: 'Continuous direct-to-Earth link needed during landing trajectory.',
        },
      ],
    })

    const result = validateMissions([mission])
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  // Rule a: input must be a non-empty array
  it('fails rule a: input must be a non-empty array', () => {
    expect(validateMissions(null).ok).toBe(false)
    expect(validateMissions(null).errors[0]).toMatch(/must be an array/i)

    expect(validateMissions({}).ok).toBe(false)
    expect(validateMissions({}).errors[0]).toMatch(/must be an array/i)

    const emptyResult = validateMissions([])
    expect(emptyResult.ok).toBe(false)
    expect(emptyResult.errors[0]).toMatch(/must be a non-empty array/i)
  })

  // Rule b: mission ids non-empty strings and unique
  it('fails rule b: mission ids must be non-empty strings and unique', () => {
    const emptyIdMission = makeValidMission({ id: '  ' })
    const resultEmpty = validateMissions([emptyIdMission])
    expect(resultEmpty.ok).toBe(false)
    expect(resultEmpty.errors.some((err) => err.includes('field "id"') && err.includes('non-empty string'))).toBe(true)

    const dupMission1 = makeValidMission({ id: 'dup-id', name: 'Profile A' })
    const dupMission2 = makeValidMission({ id: 'dup-id', name: 'Profile B' })
    const resultDup = validateMissions([dupMission1, dupMission2])
    expect(resultDup.ok).toBe(false)
    expect(resultDup.errors.some((err) => err.includes('field "id"') && err.includes('unique'))).toBe(true)
  })

  // Rule c: name and description non-empty strings
  it('fails rule c: name and description must be non-empty strings', () => {
    const invalidMission = makeValidMission({ name: '', description: '   ' })
    const result = validateMissions([invalidMission])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "name"') && err.includes('non-empty string'))).toBe(true)
    expect(result.errors.some((err) => err.includes('field "description"') && err.includes('non-empty string'))).toBe(true)
  })

  // Rule d: weights: all six criteria present, no unknown names, every weight finite and >= 0, and weights add up to 1
  it('fails rule d: weights validation rules', () => {
    // Missing criterion
    const missionMissing = makeValidMission()
    const { science: _removed, ...incompleteWeights } = missionMissing.weights
    const resultMissing = validateMissions([{ ...missionMissing, weights: incompleteWeights as any }])
    expect(resultMissing.ok).toBe(false)
    expect(resultMissing.errors.some((err) => err.includes('field "weights.science"') && err.includes('missing'))).toBe(true)

    // Unknown criterion name
    const missionUnknown = makeValidMission({
      weights: {
        ...missionMissing.weights,
        gravity: 0.1,
      } as any,
    })
    const resultUnknown = validateMissions([missionUnknown])
    expect(resultUnknown.ok).toBe(false)
    expect(resultUnknown.errors.some((err) => err.includes('field "weights.gravity"') && err.includes('unknown'))).toBe(true)

    // Negative weight
    const missionNegative = makeValidMission({
      weights: {
        ...missionMissing.weights,
        slope: -0.25,
      },
    })
    const resultNegative = validateMissions([missionNegative])
    expect(resultNegative.ok).toBe(false)
    expect(resultNegative.errors.some((err) => err.includes('field "weights.slope"') && err.includes('>= 0'))).toBe(true)

    // Non-finite weight
    const missionNonFinite = makeValidMission({
      weights: {
        ...missionMissing.weights,
        slope: NaN,
      },
    })
    const resultNonFinite = validateMissions([missionNonFinite])
    expect(resultNonFinite.ok).toBe(false)
    expect(resultNonFinite.errors.some((err) => err.includes('field "weights.slope"') && err.includes('finite number'))).toBe(true)
  })

  // Specific requirement: one test where weights sum to 0.9
  it('fails when weights sum to 0.9 instead of 1.0', () => {
    const missionSum09 = makeValidMission({
      weights: {
        slope: 0.15,
        roughness: 0.15,
        illumination: 0.2,
        resource: 0.1,
        communication: 0.15,
        science: 0.15,
      },
    })

    const result = validateMissions([missionSum09])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "weights"') && err.includes('must sum to 1.0') && err.includes('0.9'))).toBe(true)
  })

  // Rule e: constraints must be an array (it may be empty)
  it('fails rule e: constraints must be an array', () => {
    const invalidConstraints = makeValidMission({ constraints: 'not-an-array' as any })
    const result = validateMissions([invalidConstraints])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "constraints"') && err.includes('must be an array'))).toBe(true)
  })

  // Rule f: each constraint: criterion is a valid CriterionId, no duplicate (criterion + direction) pair inside one mission
  it('fails rule f: constraint criterion must be valid and (criterion + direction) must be unique in one mission', () => {
    const missionInvalidCriterion = makeValidMission({
      constraints: [
        {
          criterion: 'atmosphere' as any,
          direction: 'max',
          passLimit: 5,
          marginalLimit: 10,
          essential: false,
          rationale: 'Invalid planetary criterion.',
        },
      ],
    })
    const resultInvalidCriterion = validateMissions([missionInvalidCriterion])
    expect(resultInvalidCriterion.ok).toBe(false)
    expect(resultInvalidCriterion.errors.some((err) => err.includes('field "constraints[0].criterion"') && err.includes('valid CriterionId'))).toBe(true)

    const missionDuplicatePair = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 8,
          marginalLimit: 12,
          essential: true,
          rationale: 'First slope constraint.',
        },
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 10,
          marginalLimit: 14,
          essential: false,
          rationale: 'Duplicate slope constraint.',
        },
      ],
    })
    const resultDuplicatePair = validateMissions([missionDuplicatePair])
    expect(resultDuplicatePair.ok).toBe(false)
    expect(resultDuplicatePair.errors.some((err) => err.includes('duplicate constraint for criterion "slope" and direction "max"'))).toBe(true)
  })

  // Rule g: direction is 'max' or 'min'
  it('fails rule g: direction must be max or min', () => {
    const mission = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'equal' as any,
          passLimit: 8,
          marginalLimit: 12,
          essential: true,
          rationale: 'Slope constraint with invalid direction.',
        },
      ],
    })

    const result = validateMissions([mission])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "constraints[0].direction"') && err.includes("'max' or 'min'"))).toBe(true)
  })

  // Rule h: passLimit and marginalLimit are finite numbers
  it('fails rule h: passLimit and marginalLimit must be finite numbers', () => {
    const mission = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: Infinity,
          marginalLimit: NaN,
          essential: true,
          rationale: 'Non-finite limits.',
        },
      ],
    })

    const result = validateMissions([mission])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "constraints[0].passLimit"') && err.includes('finite number'))).toBe(true)
    expect(result.errors.some((err) => err.includes('field "constraints[0].marginalLimit"') && err.includes('finite number'))).toBe(true)
  })

  // Rule i: for 'max': passLimit <= marginalLimit. for 'min': passLimit >= marginalLimit
  it('fails rule i: limit ordering requirements for max and min directions', () => {
    // For max: passLimit must be <= marginalLimit
    const missionMaxInvalid = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 15.0,
          marginalLimit: 10.0,
          essential: true,
          rationale: 'Invalid max order where passLimit is higher than marginalLimit.',
        },
      ],
    })
    const resultMax = validateMissions([missionMaxInvalid])
    expect(resultMax.ok).toBe(false)
    expect(resultMax.errors.some((err) => err.includes("direction 'max'") && err.includes('passLimit <= marginalLimit'))).toBe(true)

    // For min: passLimit must be >= marginalLimit
    const missionMinInvalid = makeValidMission({
      constraints: [
        {
          criterion: 'illumination',
          direction: 'min',
          passLimit: 0.5,
          marginalLimit: 0.8,
          essential: false,
          rationale: 'Invalid min order where passLimit is lower than marginalLimit.',
        },
      ],
    })
    const resultMin = validateMissions([missionMinInvalid])
    expect(resultMin.ok).toBe(false)
    expect(resultMin.errors.some((err) => err.includes("direction 'min'") && err.includes('passLimit >= marginalLimit'))).toBe(true)
  })

  // Rule j: essential is a boolean
  it('fails rule j: essential must be a boolean', () => {
    const mission = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 8,
          marginalLimit: 12,
          essential: 'yes' as any,
          rationale: 'Essential provided as string instead of boolean.',
        },
      ],
    })

    const result = validateMissions([mission])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "constraints[0].essential"') && err.includes('boolean'))).toBe(true)
  })

  // Rule k: rationale is a non-empty string
  it('fails rule k: rationale must be a non-empty string', () => {
    const mission = makeValidMission({
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 8,
          marginalLimit: 12,
          essential: true,
          rationale: '   ',
        },
      ],
    })

    const result = validateMissions([mission])
    expect(result.ok).toBe(false)
    expect(result.errors.some((err) => err.includes('field "constraints[0].rationale"') && err.includes('non-empty string'))).toBe(true)
  })

  // Specific requirement: test where two errors in one mission are both reported
  it('reports two errors in one mission simultaneously', () => {
    const multiErrorMission = makeValidMission({
      name: '',
      constraints: [
        {
          criterion: 'slope',
          direction: 'max',
          passLimit: 8,
          marginalLimit: 12,
          essential: 123 as any,
          rationale: 'Valid rationale.',
        },
      ],
    })

    const result = validateMissions([multiErrorMission])
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)

    const hasNameError = result.errors.some((err) => err.includes('field "name"') && err.includes('non-empty string'))
    const hasEssentialError = result.errors.some((err) => err.includes('field "constraints[0].essential"') && err.includes('boolean'))

    expect(hasNameError).toBe(true)
    expect(hasEssentialError).toBe(true)
  })
})
