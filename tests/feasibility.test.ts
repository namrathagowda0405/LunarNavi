// FIXTURE: made-up numbers for testing only. NOT real lunar data or requirements.

import { describe, it, expect } from 'vitest'
import { CriterionId, CriterionValue, Site } from '../src/engine/types'
import { Constraint, MissionProfile } from '../src/engine/mission'
import { evaluateConstraint, evaluateFeasibility } from '../src/engine/feasibility'

function makeTestSite(criterionValues?: Partial<Record<CriterionId, number | null>>): Site {
  const defaultCriteria: Record<CriterionId, CriterionValue> = {
    slope: { value: 6.0, low: 5.0, high: 7.0, kind: 'measured', quality: 'high', source: 'LOLA' },
    roughness: { value: 0.1, low: 0.08, high: 0.15, kind: 'derived', quality: 'medium', source: 'LROC' },
    illumination: { value: 0.85, low: 0.8, high: 0.9, kind: 'derived', quality: 'high', source: 'Mazarico' },
    resource: { value: 0.4, low: 0.2, high: 0.6, kind: 'estimated', quality: 'low', source: 'LEND' },
    communication: { value: 0.9, low: 0.85, high: 0.95, kind: 'derived', quality: 'high', source: 'DTE' },
    science: { value: 8.5, low: 8.0, high: 9.0, kind: 'estimated', quality: 'medium', source: 'Decadal' },
  }

  if (criterionValues) {
    for (const [key, val] of Object.entries(criterionValues)) {
      const cid = key as CriterionId
      defaultCriteria[cid] = {
        ...defaultCriteria[cid],
        value: val,
      }
    }
  }

  return {
    id: 'test-site-alpha',
    name: 'Test Landing Site Alpha',
    region: 'South Pole',
    latitude: -89.8,
    longitude: 0.0,
    criteria: defaultCriteria,
  }
}

function makeTestMission(constraints: Constraint[]): MissionProfile {
  return {
    id: 'test-mission-bravo',
    name: 'Test Mission Bravo',
    description: 'Mission profile fixture for feasibility testing.',
    weights: {
      slope: 0.25,
      roughness: 0.15,
      illumination: 0.2,
      resource: 0.1,
      communication: 0.15,
      science: 0.15,
    },
    constraints,
  }
}

describe('evaluateConstraint', () => {
  it("'max' constraint: value equal to passLimit is Pass; equal to marginalLimit is Marginal; just above marginalLimit is Fail", () => {
    const constraint: Constraint = {
      criterion: 'slope',
      direction: 'max',
      passLimit: 10.0,
      marginalLimit: 15.0,
      essential: true,
      rationale: 'Slope stability constraint.',
    }

    expect(evaluateConstraint(10.0, constraint)).toBe('Pass')
    expect(evaluateConstraint(9.9, constraint)).toBe('Pass')
    expect(evaluateConstraint(15.0, constraint)).toBe('Marginal')
    expect(evaluateConstraint(12.0, constraint)).toBe('Marginal')
    expect(evaluateConstraint(15.001, constraint)).toBe('Fail')
    expect(evaluateConstraint(20.0, constraint)).toBe('Fail')
  })

  it("'min' constraint: the same three boundary cases mirrored", () => {
    const constraint: Constraint = {
      criterion: 'illumination',
      direction: 'min',
      passLimit: 80.0,
      marginalLimit: 60.0,
      essential: true,
      rationale: 'Solar array power constraint.',
    }

    expect(evaluateConstraint(80.0, constraint)).toBe('Pass')
    expect(evaluateConstraint(85.0, constraint)).toBe('Pass')
    expect(evaluateConstraint(60.0, constraint)).toBe('Marginal')
    expect(evaluateConstraint(70.0, constraint)).toBe('Marginal')
    expect(evaluateConstraint(59.999, constraint)).toBe('Fail')
    expect(evaluateConstraint(40.0, constraint)).toBe('Fail')
  })

  it('value null gives Cannot Assess', () => {
    const constraint: Constraint = {
      criterion: 'resource',
      direction: 'min',
      passLimit: 0.5,
      marginalLimit: 0.2,
      essential: true,
      rationale: 'Resource assessment.',
    }

    expect(evaluateConstraint(null, constraint)).toBe('Cannot Assess')
    expect(evaluateConstraint(NaN, constraint)).toBe('Cannot Assess')
    expect(evaluateConstraint(Infinity, constraint)).toBe('Cannot Assess')
  })
})

describe('evaluateFeasibility', () => {
  it('essential Fail beats an essential Marginal elsewhere (overall Fail, not eligible)', () => {
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Max slope constraint.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 0.8,
        marginalLimit: 0.6,
        essential: true,
        rationale: 'Min illumination constraint.',
      },
    ])

    // slope=15.0 (> 12.0 marginal -> Fail), illumination=0.7 (between 0.6 and 0.8 -> Marginal)
    const site = makeTestSite({ slope: 15.0, illumination: 0.7 })
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Fail')
    expect(result.eligible).toBe(false)
    expect(result.reasons.length).toBe(2)
  })

  it("essential Cannot Assess with no Fail gives overall 'Cannot Assess', not eligible", () => {
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Max slope constraint.',
      },
      {
        criterion: 'resource',
        direction: 'min',
        passLimit: 0.5,
        marginalLimit: 0.2,
        essential: true,
        rationale: 'Essential resource constraint.',
      },
    ])

    // slope=6.0 (Pass), resource=null (Cannot Assess)
    const site = makeTestSite({ slope: 6.0, resource: null })
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Cannot Assess')
    expect(result.eligible).toBe(false)
    expect(result.reasons.length).toBe(1)
    expect(result.reasons[0]).toMatch(/missing/i)
  })

  it('essential Marginal gives overall Marginal, eligible', () => {
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Max slope constraint.',
      },
    ])

    // slope=10.0 (Marginal)
    const site = makeTestSite({ slope: 10.0 })
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Marginal')
    expect(result.eligible).toBe(true)
    expect(result.reasons.length).toBe(1)
  })

  it('non-essential Fail gives overall Marginal, still eligible, reason listed', () => {
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Essential slope constraint.',
      },
      {
        criterion: 'science',
        direction: 'min',
        passLimit: 9.0,
        marginalLimit: 7.0,
        essential: false,
        rationale: 'Non-essential secondary science constraint.',
      },
    ])

    // slope=6.0 (Pass), science=5.0 (< 7.0 -> Fail)
    const site = makeTestSite({ slope: 6.0, science: 5.0 })
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Marginal')
    expect(result.eligible).toBe(true)
    expect(result.reasons.length).toBe(1)
    expect(result.reasons[0]).toMatch(/science/i)
    expect(result.reasons[0]).toMatch(/Fail/i)
  })

  it('non-essential Cannot Assess keeps overall Pass, but the reason is listed', () => {
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Essential slope constraint.',
      },
      {
        criterion: 'resource',
        direction: 'min',
        passLimit: 0.5,
        marginalLimit: 0.2,
        essential: false,
        rationale: 'Non-essential resource constraint.',
      },
    ])

    // slope=6.0 (Pass), resource=null (Cannot Assess)
    const site = makeTestSite({ slope: 6.0, resource: null })
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Pass')
    expect(result.eligible).toBe(true)
    expect(result.reasons.length).toBe(1)
    expect(result.reasons[0]).toMatch(/resource/i)
    expect(result.reasons[0]).toMatch(/missing/i)
  })

  it('mission with zero constraints gives Pass and no reasons', () => {
    const mission = makeTestMission([])
    const site = makeTestSite()
    const result = evaluateFeasibility(site, mission)

    expect(result.status).toBe('Pass')
    expect(result.eligible).toBe(true)
    expect(result.constraintResults).toEqual([])
    expect(result.reasons).toEqual([])
  })

  it("results keep the mission's constraint order", () => {
    const mission = makeTestMission([
      {
        criterion: 'science',
        direction: 'min',
        passLimit: 8.0,
        marginalLimit: 6.0,
        essential: false,
        rationale: 'Science rationale.',
      },
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 10.0,
        marginalLimit: 15.0,
        essential: true,
        rationale: 'Slope rationale.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 0.8,
        marginalLimit: 0.6,
        essential: true,
        rationale: 'Illumination rationale.',
      },
    ])

    const site = makeTestSite()
    const result = evaluateFeasibility(site, mission)

    const criteriaOrder = result.constraintResults.map((cr) => cr.criterion)
    expect(criteriaOrder).toEqual(['science', 'slope', 'illumination'])
  })

  it('input objects are not changed (freeze them with Object.freeze, call the function, expect no error and unchanged values)', () => {
    const site = makeTestSite({ slope: 7.0, illumination: 0.75 })
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Max slope constraint.',
      },
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 0.8,
        marginalLimit: 0.6,
        essential: false,
        rationale: 'Min illumination constraint.',
      },
    ])

    // Deep freeze
    Object.freeze(site.criteria.slope)
    Object.freeze(site.criteria.illumination)
    Object.freeze(site.criteria)
    Object.freeze(site)

    Object.freeze(mission.constraints[0])
    Object.freeze(mission.constraints[1])
    Object.freeze(mission.constraints)
    Object.freeze(mission.weights)
    Object.freeze(mission)

    expect(() => evaluateFeasibility(site, mission)).not.toThrow()

    const result = evaluateFeasibility(site, mission)
    expect(result.siteId).toBe(site.id)
    expect(result.missionId).toBe(mission.id)
    expect(site.criteria.slope.value).toBe(7.0)
    expect(site.criteria.illumination.value).toBe(0.75)
  })

  it('calling twice with the same input gives identical output', () => {
    const site = makeTestSite({ slope: 9.5, resource: null })
    const mission = makeTestMission([
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 8.0,
        marginalLimit: 12.0,
        essential: true,
        rationale: 'Slope constraint.',
      },
      {
        criterion: 'resource',
        direction: 'min',
        passLimit: 0.5,
        marginalLimit: 0.2,
        essential: false,
        rationale: 'Resource constraint.',
      },
    ])

    const run1 = evaluateFeasibility(site, mission)
    const run2 = evaluateFeasibility(site, mission)

    expect(run1).toEqual(run2)
  })
})
