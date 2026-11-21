import { describe, it, expect } from 'vitest'
import {
  defaultFormState,
  suggestedDirection,
  normalizeWeights,
  buildMissionProfile,
  formatWeightShare,
  MissionFormState,
  FormConstraint,
  getMissionPresetState,
} from '../src/frontend/missionForm'

describe('normalizeWeights', () => {
  it('equal weights normalize to 1/6 each', () => {
    const rawWeights = {
      slope: 5,
      roughness: 5,
      illumination: 5,
      resource: 5,
      communication: 5,
      science: 5,
    }

    const normalized = normalizeWeights(rawWeights)

    for (const key of Object.keys(normalized)) {
      expect(normalized[key as keyof typeof normalized]).toBeCloseTo(1 / 6, 6)
      expect(formatWeightShare(normalized[key as keyof typeof normalized])).toBe('16.7%')
    }

    const sum = Object.values(normalized).reduce((acc, v) => acc + v, 0)
    expect(sum).toBeCloseTo(1.0, 9)
  })

  it('single non-zero criterion receives 100%', () => {
    const rawWeights = {
      slope: 10,
      roughness: 0,
      illumination: 0,
      resource: 0,
      communication: 0,
      science: 0,
    }

    const normalized = normalizeWeights(rawWeights)
    expect(normalized.slope).toBe(1.0)
    expect(formatWeightShare(normalized.slope)).toBe('100.0%')
    expect(normalized.roughness).toBe(0)
    expect(normalized.illumination).toBe(0)
    expect(normalized.resource).toBe(0)
    expect(normalized.communication).toBe(0)
    expect(normalized.science).toBe(0)
  })

  it('all-zero weights are rejected with an error', () => {
    const allZeros = {
      slope: 0,
      roughness: 0,
      illumination: 0,
      resource: 0,
      communication: 0,
      science: 0,
    }

    expect(() => normalizeWeights(allZeros)).toThrow(/all weights are zero/i)
  })

  it('negative weights are rejected with an error', () => {
    const negativeWeights = {
      slope: -1,
      roughness: 5,
      illumination: 5,
      resource: 5,
      communication: 5,
      science: 5,
    }

    expect(() => normalizeWeights(negativeWeights)).toThrow(/non-negative/i)
  })

  it('non-finite weights are rejected with an error', () => {
    const nonFiniteWeights = {
      slope: NaN,
      roughness: 5,
      illumination: 5,
      resource: 5,
      communication: 5,
      science: 5,
    }

    expect(() => normalizeWeights(nonFiniteWeights)).toThrow(/non-negative/i)
  })
})

describe('suggestedDirection', () => {
  it('suggested constraint directions are correct for all criteria', () => {
    // Cost criteria: slope and roughness -> max (lower is safer)
    expect(suggestedDirection('slope')).toBe('max')
    expect(suggestedDirection('roughness')).toBe('max')

    // Benefit criteria: illumination, resource, communication, science -> min (higher is safer)
    expect(suggestedDirection('illumination')).toBe('min')
    expect(suggestedDirection('resource')).toBe('min')
    expect(suggestedDirection('communication')).toBe('min')
    expect(suggestedDirection('science')).toBe('min')
  })
})

describe('buildMissionProfile', () => {
  it('default form creates a valid mission', () => {
    const form = defaultFormState()
    const result = buildMissionProfile(form)

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.profile).not.toBeNull()
    expect(result.profile?.id).toBe('mission-science')
    expect(result.profile?.name).toBe('Lunar Scientific Exploration Profile')
    expect(result.profile?.constraints).toEqual([])

    // Weights sum to 1
    const weightsSum = Object.values(result.profile!.weights).reduce((a, b) => a + b, 0)
    expect(weightsSum).toBeCloseTo(1.0, 6)
  })

  it('invalid or empty limits produce errors naming the criterion', () => {
    const form: MissionFormState = {
      ...defaultFormState(),
      constraints: [
        {
          id: 'c1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '', // empty
          marginalLimit: '15',
          essential: true,
          rationale: 'Tip-over safety',
        },
        {
          id: 'c2',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '60',
          marginalLimit: 'abc', // invalid
          essential: false,
          rationale: 'Solar array sizing',
        },
      ],
    }

    const result = buildMissionProfile(form)
    expect(result.ok).toBe(false)
    expect(result.profile).toBeNull()

    // Errors must name the affected criterion
    const hasSlopeError = result.errors.some((e) => e.includes('slope'))
    const hasIllumError = result.errors.some((e) => e.includes('illumination'))

    expect(hasSlopeError).toBe(true)
    expect(hasIllumError).toBe(true)
  })

  it('invalid pass/marginal ordering produces an error', () => {
    // For 'max': passLimit must be <= marginalLimit
    const badMaxForm: MissionFormState = {
      ...defaultFormState(),
      constraints: [
        {
          id: 'c1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '20',
          marginalLimit: '10', // pass > marginal for max is invalid!
          essential: true,
          rationale: 'Invalid order test',
        },
      ],
    }

    const resultMax = buildMissionProfile(badMaxForm)
    expect(resultMax.ok).toBe(false)
    expect(resultMax.errors.some((e) => e.includes('slope') && e.includes('marginal'))).toBe(true)

    // For 'min': passLimit must be >= marginalLimit
    const badMinForm: MissionFormState = {
      ...defaultFormState(),
      constraints: [
        {
          id: 'c2',
          criterion: 'illumination',
          direction: 'min',
          passLimit: '40',
          marginalLimit: '70', // pass < marginal for min is invalid!
          essential: false,
          rationale: 'Invalid order test',
        },
      ],
    }

    const resultMin = buildMissionProfile(badMinForm)
    expect(resultMin.ok).toBe(false)
    expect(resultMin.errors.some((e) => e.includes('illumination') && e.includes('marginal'))).toBe(true)
  })

  it('empty constraint rationale is rejected', () => {
    const form: MissionFormState = {
      ...defaultFormState(),
      constraints: [
        {
          id: 'c1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '10',
          marginalLimit: '15',
          essential: true,
          rationale: '   ', // whitespace only
        },
      ],
    }

    const result = buildMissionProfile(form)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('rationale'))).toBe(true)
  })

  it('valid constraints are converted to numeric values correctly', () => {
    const validConstraint: FormConstraint = {
      id: 'c-test-1',
      criterion: 'slope',
      direction: 'max',
      passLimit: '12.5',
      marginalLimit: '15.0',
      essential: true,
      rationale: 'Lander gear stability limit.',
    }

    const form: MissionFormState = {
      ...defaultFormState(),
      missionType: 'crewed',
      constraints: [validConstraint],
    }

    const result = buildMissionProfile(form)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.profile?.constraints).toHaveLength(1)

    const converted = result.profile!.constraints[0]
    expect(converted.criterion).toBe('slope')
    expect(converted.direction).toBe('max')
    expect(converted.passLimit).toBe(12.5)
    expect(converted.marginalLimit).toBe(15.0)
    expect(converted.essential).toBe(true)
    expect(converted.rationale).toBe('Lander gear stability limit.')
  })

  it('rejects duplicate constraint for same criterion and direction', () => {
    const form: MissionFormState = {
      ...defaultFormState(),
      constraints: [
        {
          id: 'c1',
          criterion: 'slope',
          direction: 'max',
          passLimit: '10',
          marginalLimit: '15',
          essential: true,
          rationale: 'First limit',
        },
        {
          id: 'c2',
          criterion: 'slope',
          direction: 'max',
          passLimit: '12',
          marginalLimit: '16',
          essential: false,
          rationale: 'Duplicate limit',
        },
      ],
    }

    const result = buildMissionProfile(form)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('already exists') || e.includes('duplicate'))).toBe(true)
  })

  it('rejects form when all weights are zero', () => {
    const form: MissionFormState = {
      ...defaultFormState(),
      rawWeights: {
        slope: 0,
        roughness: 0,
        illumination: 0,
        resource: 0,
        communication: 0,
        science: 0,
      },
    }

    const result = buildMissionProfile(form)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('All weights are zero'))).toBe(true)
  })

  it('defaultFormState returns expected initial values including arrivalDate and durationDays', () => {
    const def = defaultFormState()
    expect(def.missionType).toBe('science')
    expect(def.region).toBe('south-pole')
    expect(def.arrivalDate).toBe('2027-06-01')
    expect(def.arrivalWindowDays).toBe(7)
    expect(def.durationDays).toBe(14)
    expect(def.constraints).toEqual([])
    expect(def.rawWeights).toEqual({
      slope: 5,
      roughness: 5,
      illumination: 5,
      resource: 5,
      communication: 5,
      science: 5,
    })
  })

  it('getMissionPresetState assigns appropriate default operational durations per purpose', () => {
    const science = getMissionPresetState('science')
    const resource = getMissionPresetState('resource')
    const crewed = getMissionPresetState('crewed')
    const comms = getMissionPresetState('communication')

    expect(science.durationDays).toBe(14)
    expect(resource.durationDays).toBe(30)
    expect(crewed.durationDays).toBe(30)
    expect(comms.durationDays).toBe(180)
  })

  it('buildMissionProfile validates arrival date and rejects invalid dates', () => {
    const emptyDateForm: MissionFormState = {
      ...defaultFormState(),
      arrivalDate: '   ',
    }
    const emptyRes = buildMissionProfile(emptyDateForm)
    expect(emptyRes.ok).toBe(false)
    expect(emptyRes.errors.some((e) => e.includes('arrival date is required'))).toBe(true)

    const invalidDateForm: MissionFormState = {
      ...defaultFormState(),
      arrivalDate: 'invalid-date-string',
    }
    const invalidRes = buildMissionProfile(invalidDateForm)
    expect(invalidRes.ok).toBe(false)
    expect(invalidRes.errors.some((e) => e.includes('valid calendar date'))).toBe(true)
  })

  it('buildMissionProfile validates surface duration and rejects non-positive or extreme values', () => {
    const zeroDurationForm: MissionFormState = {
      ...defaultFormState(),
      durationDays: 0,
    }
    const zeroRes = buildMissionProfile(zeroDurationForm)
    expect(zeroRes.ok).toBe(false)
    expect(zeroRes.errors.some((e) => e.includes('positive number between 1 and 730'))).toBe(true)

    const negativeDurationForm: MissionFormState = {
      ...defaultFormState(),
      durationDays: -5,
    }
    const negRes = buildMissionProfile(negativeDurationForm)
    expect(negRes.ok).toBe(false)

    const excessiveDurationForm: MissionFormState = {
      ...defaultFormState(),
      durationDays: 1000,
    }
    const excessRes = buildMissionProfile(excessiveDurationForm)
    expect(excessRes.ok).toBe(false)
  })

  it('buildMissionProfile incorporates arrival date and duration into profile description', () => {
    const form: MissionFormState = {
      ...defaultFormState(),
      arrivalDate: '2028-04-12',
      arrivalWindowDays: 6,
      durationDays: 28,
    }
    const result = buildMissionProfile(form)
    expect(result.ok).toBe(true)
    expect(result.profile?.description).toContain('2028-04-12')
    expect(result.profile?.description).toContain('±3d window')
    expect(result.profile?.description).toContain('28 Earth days')
  })

  it('does not mutate formState during profile building', () => {
    const form: MissionFormState = {
      missionType: 'resource',
      region: 'south-pole',
      arrivalDate: '2027-06-01',
      arrivalWindowDays: 7,
      durationDays: 30,
      rawWeights: {
        slope: 8,
        roughness: 4,
        illumination: 6,
        resource: 10,
        communication: 2,
        science: 5,
      },
      constraints: [
        {
          id: 'c1',
          criterion: 'resource',
          direction: 'min',
          passLimit: '5.0',
          marginalLimit: '3.0',
          essential: true,
          rationale: 'Minimum water equivalent hydrogen concentration.',
        },
      ],
    }

    const originalJson = JSON.stringify(form)
    const result = buildMissionProfile(form)

    expect(result.ok).toBe(true)
    expect(JSON.stringify(form)).toBe(originalJson)
  })
})
