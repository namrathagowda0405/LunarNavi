// FIXTURE: made-up numbers for testing only. NOT real lunar data.

import { describe, it, expect } from 'vitest'
import { CriterionId, CriterionValue, Site } from '../src/engine/types'
import { Constraint, MissionProfile } from '../src/engine/mission'
import { rankSites } from '../src/engine/topsis'
import { createRng } from '../src/engine/random'
import { perturbWeights, runMonteCarlo } from '../src/engine/montecarlo'

// Local test helper: creates a Site with all 6 criteria populated
function makeTestSite(
  id: string,
  criteriaValues: Partial<
    Record<CriterionId, { value: number | null; low?: number | null; high?: number | null }>
  >
): Site {
  const getCriterion = (
    cid: CriterionId,
    defaultValue: number,
    kind: 'measured' | 'derived' | 'estimated',
    quality: 'high' | 'medium' | 'low',
    source: string
  ): CriterionValue => {
    const override = criteriaValues[cid]
    if (override !== undefined) {
      return {
        value: override.value,
        low: override.low ?? null,
        high: override.high ?? null,
        kind,
        quality,
        source,
      }
    }
    return {
      value: defaultValue,
      low: null,
      high: null,
      kind,
      quality,
      source,
    }
  }

  const criteria: Record<CriterionId, CriterionValue> = {
    slope: getCriterion('slope', 5, 'measured', 'high', 'DEM'),
    roughness: getCriterion('roughness', 2, 'derived', 'medium', 'DEM'),
    illumination: getCriterion('illumination', 70, 'derived', 'high', 'Illum'),
    resource: getCriterion('resource', 60, 'estimated', 'low', 'Neutron'),
    communication: getCriterion('communication', 80, 'derived', 'high', 'DTE'),
    science: getCriterion('science', 75, 'estimated', 'medium', 'Survey'),
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

// Local test helper: creates a MissionProfile with balanced or custom weights and constraints
function makeTestMission(
  weights?: Partial<Record<CriterionId, number>>,
  constraints: Constraint[] = []
): MissionProfile {
  const fullWeights: Record<CriterionId, number> = {
    slope: 1 / 6,
    roughness: 1 / 6,
    illumination: 1 / 6,
    resource: 1 / 6,
    communication: 1 / 6,
    science: 1 / 6,
    ...weights,
  }

  return {
    id: 'test-mission-profile',
    name: 'Test Mission',
    description: 'Test mission for Monte Carlo verification',
    weights: fullWeights,
    constraints,
  }
}

// Deep freeze utility to verify immutability
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key]
    if (val !== null && typeof val === 'object') {
      deepFreeze(val)
    }
  }
  return obj
}

describe('perturbWeights', () => {
  it('result sums to 1', () => {
    const rng = createRng(42)
    const weights: Record<CriterionId, number> = {
      slope: 0.3,
      roughness: 0.1,
      illumination: 0.2,
      resource: 0.2,
      communication: 0.1,
      science: 0.1,
    }

    const perturbed = perturbWeights(rng, weights, 0.2)
    const sum = Object.values(perturbed).reduce((acc, v) => acc + v, 0)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('zero weights stay zero', () => {
    const rng = createRng(100)
    const weights: Record<CriterionId, number> = {
      slope: 0.5,
      roughness: 0,
      illumination: 0.5,
      resource: 0,
      communication: 0,
      science: 0,
    }

    const perturbed = perturbWeights(rng, weights, 0.3)
    expect(perturbed.roughness).toBe(0)
    expect(perturbed.resource).toBe(0)
    expect(perturbed.communication).toBe(0)
    expect(perturbed.science).toBe(0)
    expect(perturbed.slope + perturbed.illumination).toBeCloseTo(1, 9)
  })

  it('spread 0 returns original weights', () => {
    const rng = createRng(777)
    const weights: Record<CriterionId, number> = {
      slope: 0.2,
      roughness: 0.1,
      illumination: 0.3,
      resource: 0.15,
      communication: 0.15,
      science: 0.1,
    }

    const perturbed = perturbWeights(rng, weights, 0)
    expect(perturbed).toEqual(weights)
  })
})

describe('runMonteCarlo', () => {
  it('zero spread and zero-width ranges: baseline winner from rankSites has winFrequency = 1', () => {
    const siteA = makeTestSite('A', {
      slope: { value: 3, low: 3, high: 3 },
      roughness: { value: 1, low: 1, high: 1 },
      illumination: { value: 85, low: 85, high: 85 },
      resource: { value: 90, low: 90, high: 90 },
      communication: { value: 95, low: 95, high: 95 },
      science: { value: 90, low: 90, high: 90 },
    })

    const siteB = makeTestSite('B', {
      slope: { value: 10, low: 10, high: 10 },
      roughness: { value: 4, low: 4, high: 4 },
      illumination: { value: 50, low: 50, high: 50 },
      resource: { value: 40, low: 40, high: 40 },
      communication: { value: 60, low: 60, high: 60 },
      science: { value: 50, low: 50, high: 50 },
    })

    const mission = makeTestMission()
    const baseline = rankSites([siteA, siteB], mission)
    const baselineWinnerId = baseline.ranking[0].id

    const mcResult = runMonteCarlo([siteA, siteB], mission, {
      seed: 42,
      iterations: 100,
      weightRelativeSpread: 0,
    })

    const winnerSummary = mcResult.sites.find((s) => s.siteId === baselineWinnerId)
    expect(winnerSummary?.winFrequency).toBe(1)
    expect(winnerSummary?.winCount).toBe(100)

    const loserSummary = mcResult.sites.find((s) => s.siteId !== baselineWinnerId)
    expect(loserSummary?.winFrequency).toBe(0)
    expect(loserSummary?.winCount).toBe(0)
  })

  it('one site far better than others with small ranges: winFrequency >= 0.99', () => {
    // Site A strongly dominates across cost and benefit criteria
    const siteA = makeTestSite('A', {
      slope: { value: 2, low: 1.9, high: 2.1 },
      roughness: { value: 0.5, low: 0.4, high: 0.6 },
      illumination: { value: 95, low: 94, high: 96 },
      resource: { value: 90, low: 89, high: 91 },
      communication: { value: 95, low: 94, high: 96 },
      science: { value: 95, low: 94, high: 96 },
    })

    const siteB = makeTestSite('B', {
      slope: { value: 15, low: 14, high: 16 },
      roughness: { value: 5, low: 4.5, high: 5.5 },
      illumination: { value: 30, low: 28, high: 32 },
      resource: { value: 20, low: 18, high: 22 },
      communication: { value: 35, low: 33, high: 37 },
      science: { value: 25, low: 23, high: 27 },
    })

    const mission = makeTestMission()
    const result = runMonteCarlo([siteA, siteB], mission, {
      seed: 42,
      iterations: 1000,
      weightRelativeSpread: 0.2,
    })

    const summaryA = result.sites.find((s) => s.siteId === 'A')!
    expect(summaryA.winFrequency).toBeGreaterThanOrEqual(0.99)
  })

  it('two sites with identical values and identical overlapping ranges (4000 iterations): each winFrequency between 0.45 and 0.55', () => {
    const site1 = makeTestSite('Site1', {
      slope: { value: 5, low: 3, high: 7 },
      roughness: { value: 2, low: 1, high: 3 },
      illumination: { value: 70, low: 50, high: 90 },
      resource: { value: 60, low: 40, high: 80 },
      communication: { value: 80, low: 70, high: 90 },
      science: { value: 75, low: 60, high: 90 },
    })

    const site2 = makeTestSite('Site2', {
      slope: { value: 5, low: 3, high: 7 },
      roughness: { value: 2, low: 1, high: 3 },
      illumination: { value: 70, low: 50, high: 90 },
      resource: { value: 60, low: 40, high: 80 },
      communication: { value: 80, low: 70, high: 90 },
      science: { value: 75, low: 60, high: 90 },
    })

    const mission = makeTestMission()
    const result = runMonteCarlo([site1, site2], mission, {
      seed: 12345,
      iterations: 4000,
      weightRelativeSpread: 0.2,
    })

    const s1 = result.sites.find((s) => s.siteId === 'Site1')!
    const s2 = result.sites.find((s) => s.siteId === 'Site2')!

    expect(s1.winFrequency).toBeGreaterThanOrEqual(0.45)
    expect(s1.winFrequency).toBeLessThanOrEqual(0.55)
    expect(s2.winFrequency).toBeGreaterThanOrEqual(0.45)
    expect(s2.winFrequency).toBeLessThanOrEqual(0.55)
  })

  it('feasibility frequency: 1 site, max constraint, range low 4 / mode 6 / high 8, passLimit 6, marginalLimit 8, 4000 iterations', () => {
    // low 4, mode 6, high 8: symmetric triangular distribution around mode 6
    // Pass: <= 6 (prob = 0.5)
    // Marginal: > 6 and <= 8 (prob = 0.5)
    // Fail: > 8 (prob = 0)
    const site = makeTestSite('SiteF', {
      slope: { value: 6, low: 4, high: 8 },
    })

    const mission = makeTestMission(undefined, [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 6,
        marginalLimit: 8,
        essential: true,
        rationale: 'Lander slope stability limit',
      },
    ])

    const result = runMonteCarlo([site], mission, {
      seed: 42,
      iterations: 4000,
    })

    const summary = result.sites[0]
    const passFraction = summary.statusCounts.Pass / 4000
    const marginalFraction = summary.statusCounts.Marginal / 4000

    expect(Math.abs(passFraction - 0.5)).toBeLessThanOrEqual(0.03)
    expect(Math.abs(marginalFraction - 0.5)).toBeLessThanOrEqual(0.03)
    expect(summary.statusCounts.Fail).toBe(0)
  })

  it('every site always failing an essential constraint: noEligibleFrequency = 1, no wins', () => {
    // Both sites have slope around 15, while passLimit is 5 and marginalLimit is 8 (essential)
    const siteA = makeTestSite('A', {
      slope: { value: 15, low: 14, high: 16 },
    })
    const siteB = makeTestSite('B', {
      slope: { value: 18, low: 17, high: 19 },
    })

    const mission = makeTestMission(undefined, [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 5,
        marginalLimit: 8,
        essential: true,
        rationale: 'Essential max slope limit',
      },
    ])

    const iterations = 500
    const result = runMonteCarlo([siteA, siteB], mission, {
      seed: 42,
      iterations,
    })

    expect(result.noEligibleCount).toBe(iterations)
    expect(result.noEligibleFrequency).toBe(1)

    for (const s of result.sites) {
      expect(s.winCount).toBe(0)
      expect(s.winFrequency).toBe(0)
      expect(s.eligibleCount).toBe(0)
      expect(s.eligibleFrequency).toBe(0)
      expect(s.notRankedCount).toBe(iterations)
      expect(s.statusCounts.Fail).toBe(iterations)
    }
  })

  it('null value in an essential-constraint criterion: status Cannot Assess in every iteration and site never ranked', () => {
    const siteWithNull = makeTestSite('MissingDataSite', {
      slope: { value: null, low: null, high: null },
    })
    const validSite = makeTestSite('ValidSite', {
      slope: { value: 4, low: 3, high: 5 },
    })

    const mission = makeTestMission(undefined, [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 6,
        marginalLimit: 8,
        essential: true,
        rationale: 'Slope is essential',
      },
    ])

    const iterations = 300
    const result = runMonteCarlo([siteWithNull, validSite], mission, {
      seed: 99,
      iterations,
    })

    const nullSummary = result.sites.find((s) => s.siteId === 'MissingDataSite')!
    expect(nullSummary.statusCounts['Cannot Assess']).toBe(iterations)
    expect(nullSummary.eligibleCount).toBe(0)
    expect(nullSummary.notRankedCount).toBe(iterations)
    expect(nullSummary.winCount).toBe(0)
    expect(nullSummary.rankCounts.every((c) => c === 0)).toBe(true)
  })

  it('null value in a weighted criterion with no constraint: eligible every iteration but notRankedCount = iterations', () => {
    // slope has weight > 0, but no constraint. Site has null slope.
    // Site passes feasibility because criteria with constraints pass.
    // But rankSites excludes sites with null in weighted criteria.
    const siteWithNull = makeTestSite('UnconstrainedNullSite', {
      slope: { value: null, low: null, high: null },
      illumination: { value: 80, low: 75, high: 85 },
    })

    const mission = makeTestMission({ slope: 0.5, illumination: 0.5 }, [
      {
        criterion: 'illumination',
        direction: 'min',
        passLimit: 50,
        marginalLimit: 40,
        essential: true,
        rationale: 'Need sunlight',
      },
    ])

    const iterations = 250
    const result = runMonteCarlo([siteWithNull], mission, {
      seed: 88,
      iterations,
    })

    const summary = result.sites[0]
    expect(summary.statusCounts.Pass).toBe(iterations)
    expect(summary.eligibleCount).toBe(iterations)
    // Excluded from ranking by rankSites due to null in weighted criterion 'slope'
    expect(summary.notRankedCount).toBe(iterations)
    expect(summary.winCount).toBe(0)
    expect(summary.rankCounts.every((c) => c === 0)).toBe(true)
  })

  it('consistency: win frequencies + noEligibleFrequency sum to 1, rankCounts + notRankedCount = iterations, statusCounts = iterations', () => {
    const siteA = makeTestSite('A', {
      slope: { value: 6, low: 4, high: 8 },
      illumination: { value: 60, low: 40, high: 80 },
    })
    const siteB = makeTestSite('B', {
      slope: { value: 8, low: 6, high: 10 },
      illumination: { value: 70, low: 50, high: 90 },
    })
    const siteC = makeTestSite('C', {
      slope: { value: 12, low: 10, high: 14 },
      illumination: { value: 30, low: 20, high: 40 },
    })

    const mission = makeTestMission(undefined, [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 7,
        marginalLimit: 9,
        essential: true,
        rationale: 'Slope constraint',
      },
    ])

    const iterations = 1000
    const result = runMonteCarlo([siteA, siteB, siteC], mission, {
      seed: 42,
      iterations,
    })

    // 1. Win frequencies + noEligibleFrequency sum to 1 (tolerance 1e-9)
    const totalWinFreq = result.sites.reduce((acc, s) => acc + s.winFrequency, 0)
    expect(totalWinFreq + result.noEligibleFrequency).toBeCloseTo(1, 9)

    for (const site of result.sites) {
      // 2. For each site, rankCounts total plus notRankedCount equals iterations
      const totalRankCounts = site.rankCounts.reduce((acc, c) => acc + c, 0)
      expect(totalRankCounts + site.notRankedCount).toBe(iterations)

      // 3. Status counts total equals iterations
      const totalStatus =
        site.statusCounts.Pass +
        site.statusCounts.Marginal +
        site.statusCounts.Fail +
        site.statusCounts['Cannot Assess']
      expect(totalStatus).toBe(iterations)
    }
  })

  it('same seed twice gives deep-equal results; different seeds give different results', () => {
    const sites = [
      makeTestSite('A', { slope: { value: 5, low: 3, high: 7 } }),
      makeTestSite('B', { slope: { value: 6, low: 4, high: 8 } }),
    ]
    const mission = makeTestMission()

    const res1 = runMonteCarlo(sites, mission, { seed: 12345, iterations: 500 })
    const res2 = runMonteCarlo(sites, mission, { seed: 12345, iterations: 500 })
    const res3 = runMonteCarlo(sites, mission, { seed: 67890, iterations: 500 })

    expect(res1).toEqual(res2)
    expect(res1).not.toEqual(res3)
  })

  it('inputs are not mutated (deep-freeze verification)', () => {
    const sites = deepFreeze([
      makeTestSite('A', { slope: { value: 4, low: 3, high: 5 } }),
      makeTestSite('B', { slope: { value: 7, low: 6, high: 8 } }),
    ])
    const mission = deepFreeze(makeTestMission())

    expect(() => {
      runMonteCarlo(sites, mission, { seed: 42, iterations: 100 })
    }).not.toThrow()
  })

  it('invalid options throw appropriate errors', () => {
    const sites = [makeTestSite('A', {})]
    const mission = makeTestMission()

    // iterations = 0
    expect(() => runMonteCarlo(sites, mission, { seed: 1, iterations: 0 })).toThrow(
      /iterations must be an integer >= 1/i
    )

    // iterations = 1.5
    expect(() => runMonteCarlo(sites, mission, { seed: 1, iterations: 1.5 })).toThrow(
      /iterations must be an integer >= 1/i
    )

    // negative spread
    expect(() => runMonteCarlo(sites, mission, { seed: 1, weightRelativeSpread: -0.1 })).toThrow(
      /weightRelativeSpread/i
    )

    // spread = 1
    expect(() => runMonteCarlo(sites, mission, { seed: 1, weightRelativeSpread: 1 })).toThrow(
      /weightRelativeSpread/i
    )

    // seed = NaN
    expect(() => runMonteCarlo(sites, mission, { seed: NaN })).toThrow(/seed must be a finite integer/i)
  })

  it('result.notes contains the phrase "not the probability"', () => {
    const sites = [makeTestSite('A', {})]
    const mission = makeTestMission()

    const result = runMonteCarlo(sites, mission, { seed: 42, iterations: 10 })
    const containsDisclaimer = result.notes.some((note) =>
      note.toLowerCase().includes('not the probability')
    )
    expect(containsDisclaimer).toBe(true)
  })

  it('handles empty sites array gracefully', () => {
    const mission = makeTestMission()
    const result = runMonteCarlo([], mission, { seed: 42, iterations: 50 })

    expect(result.sites).toEqual([])
    expect(result.noEligibleCount).toBe(50)
    expect(result.noEligibleFrequency).toBe(1)
  })

  it('timing test: 12 fixture sites, 2000 iterations finishes in under 10 seconds', () => {
    const sites: Site[] = []
    for (let i = 1; i <= 12; i++) {
      sites.push(
        makeTestSite(`Site_${i}`, {
          slope: { value: 3 + i * 0.5, low: 2 + i * 0.5, high: 4 + i * 0.5 },
          roughness: { value: 1 + i * 0.2, low: 0.8 + i * 0.2, high: 1.2 + i * 0.2 },
          illumination: { value: 90 - i * 3, low: 85 - i * 3, high: 95 - i * 3 },
          resource: { value: 80 - i * 2, low: 75 - i * 2, high: 85 - i * 2 },
          communication: { value: 85 - i * 1, low: 80 - i * 1, high: 90 - i * 1 },
          science: { value: 70 + (i % 5) * 4, low: 65 + (i % 5) * 4, high: 75 + (i % 5) * 4 },
        })
      )
    }

    const mission = makeTestMission(undefined, [
      {
        criterion: 'slope',
        direction: 'max',
        passLimit: 10,
        marginalLimit: 12,
        essential: true,
        rationale: 'Slope constraint',
      },
    ])

    const start = performance.now()
    const result = runMonteCarlo(sites, mission, { seed: 42, iterations: 2000 })
    const elapsed = performance.now() - start

    console.log(`Monte Carlo 12 sites x 2000 iterations took ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(10000)
    expect(result.sites.length).toBe(12)
  })

  it('Top-2 frequency and average rank: mathematically verified on deterministic 3-site benchmark', () => {
    // 3 sites with fixed deterministic values
    const siteA = makeTestSite('Site-Top', {
      slope: { value: 3, low: 3, high: 3 },
      roughness: { value: 1, low: 1, high: 1 },
      illumination: { value: 95, low: 95, high: 95 },
      resource: { value: 90, low: 90, high: 90 },
      communication: { value: 95, low: 95, high: 95 },
      science: { value: 95, low: 95, high: 95 },
    })
    const siteB = makeTestSite('Site-Mid', {
      slope: { value: 6, low: 6, high: 6 },
      roughness: { value: 2, low: 2, high: 2 },
      illumination: { value: 70, low: 70, high: 70 },
      resource: { value: 65, low: 65, high: 65 },
      communication: { value: 75, low: 75, high: 75 },
      science: { value: 70, low: 70, high: 70 },
    })
    const siteC = makeTestSite('Site-Low', {
      slope: { value: 12, low: 12, high: 12 },
      roughness: { value: 4, low: 4, high: 4 },
      illumination: { value: 30, low: 30, high: 30 },
      resource: { value: 25, low: 25, high: 25 },
      communication: { value: 40, low: 40, high: 40 },
      science: { value: 35, low: 35, high: 35 },
    })

    const mission = makeTestMission()
    const iterations = 200
    const res = runMonteCarlo([siteA, siteB, siteC], mission, {
      seed: 42,
      iterations,
      weightRelativeSpread: 0, // Deterministic ranking: A=1, B=2, C=3 in every iteration
    })

    const sumA = res.sites.find((s) => s.siteId === 'Site-Top')!
    const sumB = res.sites.find((s) => s.siteId === 'Site-Mid')!
    const sumC = res.sites.find((s) => s.siteId === 'Site-Low')!

    // Rank-1 frequencies
    expect(sumA.winFrequency).toBe(1.0)
    expect(sumB.winFrequency).toBe(0.0)
    expect(sumC.winFrequency).toBe(0.0)

    // Top-2 frequencies: P_i(Top 2) = (count(rank 1) + count(rank 2)) / N
    const top2A = (sumA.rankCounts[0] + sumA.rankCounts[1]) / iterations
    const top2B = (sumB.rankCounts[0] + sumB.rankCounts[1]) / iterations
    const top2C = (sumC.rankCounts[0] + sumC.rankCounts[1]) / iterations

    expect(top2A).toBe(1.0)
    expect(top2B).toBe(1.0)
    expect(top2C).toBe(0.0)

    // Average rank: MeanRank_i = sum_k(Rank_i,k) / N
    const avgRankA = sumA.rankCounts.reduce((acc, c, idx) => acc + c * (idx + 1), 0) / iterations
    const avgRankB = sumB.rankCounts.reduce((acc, c, idx) => acc + c * (idx + 1), 0) / iterations
    const avgRankC = sumC.rankCounts.reduce((acc, c, idx) => acc + c * (idx + 1), 0) / iterations

    expect(avgRankA).toBe(1.0)
    expect(avgRankB).toBe(2.0)
    expect(avgRankC).toBe(3.0)
  })

  it('simulation actually reruns TOPSIS and responds dynamically to mission input changes', () => {
    // Site Science: exceptional science return, lower resources
    const siteScience = makeTestSite('Site-Sci', {
      slope: { value: 5, low: 5, high: 5 },
      roughness: { value: 1, low: 1, high: 1 },
      illumination: { value: 70, low: 70, high: 70 },
      resource: { value: 30, low: 30, high: 30 },
      communication: { value: 70, low: 70, high: 70 },
      science: { value: 98, low: 98, high: 98 },
    })

    // Site Resource: exceptional resource potential, lower science
    const siteResource = makeTestSite('Site-Res', {
      slope: { value: 5, low: 5, high: 5 },
      roughness: { value: 1, low: 1, high: 1 },
      illumination: { value: 70, low: 70, high: 70 },
      resource: { value: 98, low: 98, high: 98 },
      communication: { value: 70, low: 70, high: 70 },
      science: { value: 30, low: 30, high: 30 },
    })

    // Mission 1: Science-weighted (science: 0.7, resource: 0.1, others: 0.05)
    const missionSci = makeTestMission({
      science: 0.7,
      resource: 0.1,
      slope: 0.05,
      roughness: 0.05,
      illumination: 0.05,
      communication: 0.05,
    })

    // Mission 2: Resource-weighted (resource: 0.7, science: 0.1, others: 0.05)
    const missionRes = makeTestMission({
      resource: 0.7,
      science: 0.1,
      slope: 0.05,
      roughness: 0.05,
      illumination: 0.05,
      communication: 0.05,
    })

    const resSci = runMonteCarlo([siteScience, siteResource], missionSci, {
      seed: 42,
      iterations: 200,
      weightRelativeSpread: 0.2,
    })
    const resRes = runMonteCarlo([siteScience, siteResource], missionRes, {
      seed: 42,
      iterations: 200,
      weightRelativeSpread: 0.2,
    })

    const winSciUnderMissionSci = resSci.sites.find((s) => s.siteId === 'Site-Sci')!.winFrequency
    const winResUnderMissionRes = resRes.sites.find((s) => s.siteId === 'Site-Res')!.winFrequency

    // Changing mission inputs dynamically reverses the dominant winner
    expect(winSciUnderMissionSci).toBeGreaterThanOrEqual(0.95)
    expect(winResUnderMissionRes).toBeGreaterThanOrEqual(0.95)
  })

  it('weight validity across 500 successive iterations: all weights >= 0, finite, and sum strictly to 1.0', () => {
    const rng = createRng(9999)
    const baseWeights: Record<CriterionId, number> = {
      slope: 0.25,
      roughness: 0.15,
      illumination: 0.20,
      resource: 0.10,
      communication: 0.20,
      science: 0.10,
    }

    for (let i = 0; i < 500; i++) {
      const perturbed = perturbWeights(rng, baseWeights, 0.25)
      let sum = 0

      for (const cid of Object.keys(perturbed) as CriterionId[]) {
        const w = perturbed[cid]
        expect(Number.isFinite(w)).toBe(true)
        expect(w).toBeGreaterThanOrEqual(0)
        sum += w
      }

      expect(sum).toBeCloseTo(1.0, 9)
    }
  })
})
