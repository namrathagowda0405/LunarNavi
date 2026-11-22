// FIXTURE: made-up numbers for testing only. NOT real lunar data.

import { describe, it, expect } from 'vitest'
import { CriterionId, CriterionValue, Site } from '../src/engine/types'
import { MissionProfile } from '../src/engine/mission'
import { CriterionDirection } from '../src/engine/criteria'
import { topsis, rankSites } from '../src/engine/topsis'

function makeTestSite(id: string, values: Record<CriterionId, number | null>): Site {
  const criteria: Record<CriterionId, CriterionValue> = {
    slope: { value: values.slope, low: null, high: null, kind: 'measured', quality: 'high', source: 'DEM' },
    roughness: { value: values.roughness, low: null, high: null, kind: 'derived', quality: 'medium', source: 'DEM' },
    illumination: { value: values.illumination, low: null, high: null, kind: 'derived', quality: 'high', source: 'Illum' },
    resource: { value: values.resource, low: null, high: null, kind: 'estimated', quality: 'low', source: 'Neutron' },
    communication: { value: values.communication, low: null, high: null, kind: 'derived', quality: 'high', source: 'DTE' },
    science: { value: values.science, low: null, high: null, kind: 'estimated', quality: 'medium', source: 'Survey' },
  }

  return {
    id,
    name: `Site ${id}`,
    region: 'South Pole',
    latitude: -89.0,
    longitude: 0.0,
    criteria,
  }
}

function makeTestMission(weights: Partial<Record<CriterionId, number>>): MissionProfile {
  const fullWeights: Record<CriterionId, number> = {
    slope: 0,
    roughness: 0,
    illumination: 0,
    resource: 0,
    communication: 0,
    science: 0,
    ...weights,
  }

  return {
    id: 'test-mission-profile',
    name: 'Test Mission',
    description: 'Test mission for TOPSIS verification',
    weights: fullWeights,
    constraints: [],
  }
}

describe('topsis core', () => {
  // GOLDEN TEST (hand-calculated)
  it('golden test: matches hand-calculated benchmark values', () => {
    const ids = ['A', 'B', 'C']
    const matrix = [
      [3, 2],
      [4, 3],
      [12, 6],
    ]
    const weights = [0.5, 0.5]
    const directions: CriterionDirection[] = ['benefit', 'cost']

    const result = topsis(ids, matrix, weights, directions)

    // Ranking order: C, A, B
    expect(result.ranking.map((s) => s.id)).toEqual(['C', 'A', 'B'])
    expect(result.ranking.map((s) => s.rank)).toEqual([1, 2, 3])

    // Expected weighted ideal = [6/13, 1/7] = [0.461538, 0.142857]
    expect(result.ideal[0]).toBeCloseTo(6 / 13, 5)
    expect(result.ideal[1]).toBeCloseTo(1 / 7, 5)

    // Expected anti-ideal = [3/26, 3/7] = [0.115385, 0.428571]
    expect(result.antiIdeal[0]).toBeCloseTo(3 / 26, 5)
    expect(result.antiIdeal[1]).toBeCloseTo(3 / 7, 5)

    // A scores and distances
    const scoreA = result.ranking.find((s) => s.id === 'A')!
    expect(scoreA.distanceToIdeal).toBeCloseTo(9 / 26, 5)
    expect(scoreA.distanceToAntiIdeal).toBeCloseTo(2 / 7, 5)
    expect(scoreA.closeness).toBeCloseTo(52 / 115, 4) // ~0.452174

    // C scores
    const scoreC = result.ranking.find((s) => s.id === 'C')!
    expect(scoreC.closeness).toBeCloseTo(63 / 115, 4) // ~0.547826

    // B scores
    const scoreB = result.ranking.find((s) => s.id === 'B')!
    expect(scoreB.closeness).toBeCloseTo(0.408, 3)
  })

  // RECALCULATION TEST
  it('recalculation test: removes C and confirms normalisation is recomputed', () => {
    const ids = ['A', 'B']
    const matrix = [
      [3, 2],
      [4, 3],
    ]
    const weights = [0.5, 0.5]
    const directions: CriterionDirection[] = ['benefit', 'cost']

    const result = topsis(ids, matrix, weights, directions)
    const scoreA = result.ranking.find((s) => s.id === 'A')!

    // A's closeness is about 0.581 (tolerance 0.001), proving normalisation is recomputed
    expect(scoreA.closeness).toBeCloseTo(0.581, 2)
  })

  it('single alternative returns closeness 1 and rank 1', () => {
    const result = topsis(['sole-candidate'], [[10, 20]], [0.6, 0.4], ['benefit', 'cost'])
    expect(result.ranking).toHaveLength(1)
    expect(result.ranking[0].id).toBe('sole-candidate')
    expect(result.ranking[0].closeness).toBe(1)
    expect(result.ranking[0].rank).toBe(1)
    expect(result.ranking[0].distanceToIdeal).toBe(0)
    expect(result.ranking[0].distanceToAntiIdeal).toBe(0)
  })

  it('two identical alternatives have tie broken by id with both closeness 1', () => {
    const ids = ['zeta', 'alpha']
    const matrix = [
      [5, 10],
      [5, 10],
    ]
    const weights = [0.5, 0.5]
    const directions: CriterionDirection[] = ['benefit', 'cost']

    const result = topsis(ids, matrix, weights, directions)
    expect(result.ranking).toHaveLength(2)

    // Both have closeness 1
    expect(result.ranking[0].closeness).toBe(1)
    expect(result.ranking[1].closeness).toBe(1)

    // Tied closeness broken by id ascending: 'alpha' (rank 1), 'zeta' (rank 2)
    expect(result.ranking[0].id).toBe('alpha')
    expect(result.ranking[0].rank).toBe(1)
    expect(result.ranking[1].id).toBe('zeta')
    expect(result.ranking[1].rank).toBe(2)
  })

  it('guarantees all closeness values are between 0 and 1', () => {
    const ids = ['S1', 'S2', 'S3', 'S4']
    const matrix = [
      [10, 50, 0.2],
      [15, 30, 0.8],
      [8, 70, 0.5],
      [22, 20, 0.9],
    ]
    const weights = [0.4, 0.3, 0.3]
    const directions: CriterionDirection[] = ['cost', 'benefit', 'benefit']

    const result = topsis(ids, matrix, weights, directions)
    for (const item of result.ranking) {
      expect(item.closeness).toBeGreaterThanOrEqual(0)
      expect(item.closeness).toBeLessThanOrEqual(1)
    }
  })

  it('flipping a direction from benefit to cost changes the result as expected', () => {
    const ids = ['opt1', 'opt2']
    const matrix = [
      [10, 20],
      [20, 10],
    ]
    const weights = [0.8, 0.2]

    // With benefit for col 0: opt2 has higher col 0 (20 vs 10), should win
    const resBenefit = topsis(ids, matrix, weights, ['benefit', 'benefit'])
    expect(resBenefit.ranking[0].id).toBe('opt2')

    // With cost for col 0: opt1 has lower col 0 (10 vs 20), should win
    const resCost = topsis(ids, matrix, weights, ['cost', 'benefit'])
    expect(resCost.ranking[0].id).toBe('opt1')
  })

  it('a column of all zeros does not produce NaN', () => {
    const ids = ['X', 'Y']
    const matrix = [
      [0, 15],
      [0, 25],
    ]
    const weights = [0.5, 0.5]
    const directions: CriterionDirection[] = ['benefit', 'benefit']

    const result = topsis(ids, matrix, weights, directions)
    expect(Number.isNaN(result.ranking[0].closeness)).toBe(false)
    expect(Number.isNaN(result.ranking[1].closeness)).toBe(false)
    expect(result.ideal[0]).toBe(0)
    expect(result.antiIdeal[0]).toBe(0)
  })

  it('throws on invalid inputs', () => {
    // Mismatched row counts
    expect(() => topsis(['A'], [[1, 2], [3, 4]], [0.5, 0.5], ['benefit', 'cost'])).toThrow(/mismatch/i)

    // Mismatched row column counts
    expect(() => topsis(['A', 'B'], [[1, 2], [3]], [0.5, 0.5], ['benefit', 'cost'])).toThrow(/mismatch/i)

    // Mismatched weights and directions length
    expect(() => topsis(['A'], [[1, 2]], [0.5], ['benefit', 'cost'])).toThrow(/mismatch/i)

    // Non-finite value in matrix
    expect(() => topsis(['A'], [[NaN, 2]], [0.5, 0.5], ['benefit', 'cost'])).toThrow(/non-finite/i)

    // Non-finite weight
    expect(() => topsis(['A'], [[1, 2]], [Infinity, 0.5], ['benefit', 'cost'])).toThrow(/finite/i)

    // Negative weight
    expect(() => topsis(['A'], [[1, 2]], [-0.5, 0.5], ['benefit', 'cost'])).toThrow(/negative/i)

    // All zero weights
    expect(() => topsis(['A'], [[1, 2]], [0, 0], ['benefit', 'cost'])).toThrow(/zero/i)
  })

  it('returns empty ranking for empty input without throwing', () => {
    const result = topsis([], [], [0.5, 0.5], ['benefit', 'cost'])
    expect(result).toEqual({ ranking: [], ideal: [], antiIdeal: [] })
  })

  it('does not mutate input arrays and produces identical output on repeated calls', () => {
    const ids = ['Site-1', 'Site-2']
    const matrix = [
      [12.5, 0.4],
      [8.0, 0.7],
    ]
    const weights = [0.6, 0.4]
    const directions: CriterionDirection[] = ['cost', 'benefit']

    Object.freeze(ids)
    Object.freeze(matrix[0])
    Object.freeze(matrix[1])
    Object.freeze(matrix)
    Object.freeze(weights)
    Object.freeze(directions)

    const run1 = topsis(ids as string[], matrix as number[][], weights as number[], directions as CriterionDirection[])
    const run2 = topsis(ids as string[], matrix as number[][], weights as number[], directions as CriterionDirection[])

    expect(run1).toEqual(run2)
  })
})

describe('rankSites wrapper', () => {
  it('prefers lower slope because slope is a cost criterion', () => {
    const siteLowSlope = makeTestSite('site-flat', {
      slope: 4.0,
      roughness: 0.1,
      illumination: 0.8,
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })
    const siteHighSlope = makeTestSite('site-steep', {
      slope: 14.0,
      roughness: 0.1,
      illumination: 0.8,
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })

    // Mission weights slope heavily
    const mission = makeTestMission({ slope: 1.0 })
    const result = rankSites([siteHighSlope, siteLowSlope], mission)

    expect(result.ranking).toHaveLength(2)
    expect(result.ranking[0].id).toBe('site-flat')
    expect(result.ranking[0].rank).toBe(1)
    expect(result.ranking[1].id).toBe('site-steep')
    expect(result.ranking[1].rank).toBe(2)
  })

  it('excludes a site with null value in a weighted criterion with a reason naming the criterion', () => {
    const siteComplete = makeTestSite('site-good', {
      slope: 6.0,
      roughness: 0.1,
      illumination: 0.85,
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })
    const siteMissing = makeTestSite('site-incomplete', {
      slope: 6.0,
      roughness: 0.1,
      illumination: null, // missing weighted criterion
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })

    const mission = makeTestMission({ slope: 0.5, illumination: 0.5 })
    const result = rankSites([siteComplete, siteMissing], mission)

    expect(result.ranking).toHaveLength(1)
    expect(result.ranking[0].id).toBe('site-good')

    expect(result.excluded).toHaveLength(1)
    expect(result.excluded[0].siteId).toBe('site-incomplete')
    expect(result.excluded[0].reason).toMatch(/illumination/i)
  })

  it('does NOT exclude a site with null in a zero-weight criterion', () => {
    const siteA = makeTestSite('site-a', {
      slope: 5.0,
      roughness: 0.1,
      illumination: 0.8,
      resource: null, // null in zero-weighted criterion
      communication: 0.9,
      science: 8.0,
    })
    const siteB = makeTestSite('site-b', {
      slope: 9.0,
      roughness: 0.2,
      illumination: 0.7,
      resource: 0.4,
      communication: 0.85,
      science: 7.0,
    })

    // resource has weight 0
    const mission = makeTestMission({ slope: 0.6, illumination: 0.4 })
    const result = rankSites([siteA, siteB], mission)

    expect(result.excluded).toHaveLength(0)
    expect(result.ranking).toHaveLength(2)
    expect(result.criteriaUsed).toEqual(['slope', 'illumination'])
  })

  it('returns an empty ranking when all sites are excluded', () => {
    const site1 = makeTestSite('site-1', {
      slope: null,
      roughness: 0.1,
      illumination: 0.8,
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })
    const site2 = makeTestSite('site-2', {
      slope: 6.0,
      roughness: null,
      illumination: 0.8,
      resource: 0.5,
      communication: 0.9,
      science: 8.0,
    })

    const mission = makeTestMission({ slope: 0.5, roughness: 0.5 })
    const result = rankSites([site1, site2], mission)

    expect(result.ranking).toHaveLength(0)
    expect(result.excluded).toHaveLength(2)
  })

  it('produces the exact same ranking regardless of the order sites are passed in', () => {
    const siteA = makeTestSite('site-alpha', {
      slope: 5.0,
      roughness: 0.1,
      illumination: 0.9,
      resource: 0.4,
      communication: 0.95,
      science: 9.0,
    })
    const siteB = makeTestSite('site-beta', {
      slope: 8.0,
      roughness: 0.2,
      illumination: 0.75,
      resource: 0.6,
      communication: 0.8,
      science: 7.5,
    })
    const siteC = makeTestSite('site-gamma', {
      slope: 12.0,
      roughness: 0.3,
      illumination: 0.6,
      resource: 0.8,
      communication: 0.7,
      science: 6.0,
    })

    const mission = makeTestMission({
      slope: 0.3,
      roughness: 0.1,
      illumination: 0.2,
      resource: 0.1,
      communication: 0.1,
      science: 0.2,
    })

    const order1 = rankSites([siteA, siteB, siteC], mission)
    const order2 = rankSites([siteC, siteA, siteB], mission)
    const order3 = rankSites([siteB, siteC, siteA], mission)

    expect(order1.ranking.map((s) => s.id)).toEqual(order2.ranking.map((s) => s.id))
    expect(order1.ranking.map((s) => s.id)).toEqual(order3.ranking.map((s) => s.id))

    expect(order1.ranking.map((s) => s.closeness)).toEqual(order2.ranking.map((s) => s.closeness))
    expect(order1.ranking.map((s) => s.closeness)).toEqual(order3.ranking.map((s) => s.closeness))
  })
})
