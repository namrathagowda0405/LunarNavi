import { CRITERION_IDS, CriterionId, Site } from './types'
import { MissionProfile } from './mission'
import { evaluateFeasibility, FeasibilityStatus } from './feasibility'
import { rankSites } from './topsis'
import { createRng, Rng, sampleTriangular } from './random'

// Core framing: Monte Carlo measures ranking robustness under stated assumptions, not physical landing safety.
export const MONTE_CARLO_DISCLAIMER =
  'Monte Carlo results measure how STABLE a recommendation is when data values and priorities vary within stated assumptions. They are NOT the probability that a site is safe, suitable or will succeed.'

export interface MonteCarloOptions {
  seed: number
  // Design assumption defaults: 2000 iterations and 0.2 (±20%) weight spread.
  // These defaults are design assumptions for sensitivity exploration, not scientific facts.
  iterations?: number
  weightRelativeSpread?: number
}

/**
 * Perturbs criterion weights uniformly within a relative percentage spread [1 - spread, 1 + spread],
 * then renormalises the non-zero weights to sum exactly to 1.0. Zero weights remain zero.
 * Always draws a random number for each criterion in CRITERION_IDS order to preserve sequence alignment.
 *
 * @param rng - Pseudo-random number generator.
 * @param weights - Original mission criterion weights.
 * @param spread - Relative variation spread in [0, 1).
 * @returns Renormalised perturbed weights.
 */
export function perturbWeights(
  rng: Rng,
  weights: Record<CriterionId, number>,
  spread: number
): Record<CriterionId, number> {
  const perturbedRaw: Record<CriterionId, number> = {} as Record<CriterionId, number>
  let sum = 0

  for (const cid of CRITERION_IDS) {
    // 1. Draw u = rng.next() always, even for zero weights
    const u = rng.next()

    // 2. factor = 1 + spread * (2u - 1)
    const factor = 1 + spread * (2 * u - 1)

    // 3. new weight = weight * factor
    const origWeight = weights[cid] ?? 0
    const rawVal = origWeight * factor
    perturbedRaw[cid] = rawVal
    sum += rawVal
  }

  // Renormalise so weights sum to 1. If spread is 0, original weights are preserved.
  const result: Record<CriterionId, number> = {} as Record<CriterionId, number>
  for (const cid of CRITERION_IDS) {
    if (spread === 0 || sum === 0) {
      result[cid] = weights[cid] ?? 0
    } else {
      result[cid] = perturbedRaw[cid] / sum
    }
  }

  return result
}

export interface SiteMonteCarloSummary {
  siteId: string
  winCount: number
  winFrequency: number
  rankCounts: number[] // index 0 = rank 1; length = number of sites
  notRankedCount: number
  statusCounts: Record<FeasibilityStatus, number>
  eligibleCount: number
  eligibleFrequency: number
}

export interface MonteCarloResult {
  seed: number
  iterations: number
  weightRelativeSpread: number
  noEligibleCount: number
  noEligibleFrequency: number
  sites: SiteMonteCarloSummary[] // same order as input sites
  notes: string[]
}

/**
 * Runs a Monte Carlo simulation across multiple iterations to evaluate the robustness
 * of candidate lunar landing site recommendations against measurement uncertainty and weight variance.
 *
 * @param sites - Candidate lunar landing sites.
 * @param mission - Target mission profile.
 * @param options - Configuration specifying seed, iterations, and weight relative spread.
 * @returns MonteCarloResult with aggregated statistics per site and overall execution notes.
 */
export function runMonteCarlo(
  sites: Site[],
  mission: MissionProfile,
  options: MonteCarloOptions
): MonteCarloResult {
  // Validate options
  const seed = options.seed
  if (typeof seed !== 'number' || !Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error(`Invalid seed: seed must be a finite integer, got ${seed}.`)
  }

  const iterations = options.iterations ?? 2000
  if (
    typeof iterations !== 'number' ||
    !Number.isFinite(iterations) ||
    !Number.isInteger(iterations) ||
    iterations < 1
  ) {
    throw new Error(`Invalid iterations: iterations must be an integer >= 1, got ${iterations}.`)
  }

  const weightRelativeSpread = options.weightRelativeSpread ?? 0.2
  if (
    typeof weightRelativeSpread !== 'number' ||
    !Number.isFinite(weightRelativeSpread) ||
    weightRelativeSpread < 0 ||
    weightRelativeSpread >= 1
  ) {
    throw new Error(
      `Invalid weightRelativeSpread: spread must be >= 0 and < 1, got ${weightRelativeSpread}.`
    )
  }

  const notes = [
    MONTE_CARLO_DISCLAIMER,
    'Criteria values are perturbed using a triangular distribution centered on the nominal value between low and high bounds.',
    `Mission weights are perturbed with a relative uniform spread of ${(weightRelativeSpread * 100).toFixed(1)}%.`,
    'Missing data (null) is never guessed or filled in; missing values remain missing throughout all iterations.',
    'Constraint threshold limits (passLimit and marginalLimit) are fixed engineering parameters and are not perturbed.',
  ]

  // Edge case: empty sites array
  if (sites.length === 0) {
    return {
      seed,
      iterations,
      weightRelativeSpread,
      noEligibleCount: iterations,
      noEligibleFrequency: 1,
      sites: [],
      notes,
    }
  }

  const rng = createRng(seed)

  // Initialize accumulators in the exact order of input sites
  const siteSummaries: SiteMonteCarloSummary[] = sites.map((site) => ({
    siteId: site.id,
    winCount: 0,
    winFrequency: 0,
    rankCounts: new Array(sites.length).fill(0),
    notRankedCount: 0,
    statusCounts: {
      Pass: 0,
      Marginal: 0,
      Fail: 0,
      'Cannot Assess': 0,
    },
    eligibleCount: 0,
    eligibleFrequency: 0,
  }))

  const siteSummaryMap = new Map<string, SiteMonteCarloSummary>()
  for (const summary of siteSummaries) {
    siteSummaryMap.set(summary.siteId, summary)
  }

  let noEligibleCount = 0

  // Execute simulation iterations
  for (let iter = 0; iter < iterations; iter++) {
    // 1. Perturb weights with perturbWeights (draws first)
    const perturbedWeights = perturbWeights(rng, mission.weights, weightRelativeSpread)
    const perturbedMission: MissionProfile = {
      ...mission,
      weights: perturbedWeights,
    }

    // 2 & 3. For each site in input order, for each criterion in CRITERION_IDS order,
    // draw exactly ONE random number to ensure identical PRNG stream alignment across sites.
    const perturbedSites: Site[] = sites.map((site) => {
      const perturbedCriteria = { ...site.criteria }

      for (const cid of CRITERION_IDS) {
        const crit = site.criteria[cid]
        const val = crit?.value
        const low = crit?.low
        const high = crit?.high

        if (
          val !== null &&
          low !== null &&
          high !== null &&
          Number.isFinite(val) &&
          Number.isFinite(low) &&
          Number.isFinite(high) &&
          low <= val &&
          val <= high
        ) {
          // sampleTriangular consumes exactly ONE rng.next() call
          const sampledVal = sampleTriangular(rng, low, val, high)
          perturbedCriteria[cid] = {
            ...crit,
            value: sampledVal,
          }
        } else {
          // Consume exactly ONE random draw to maintain identical draw counts across all iterations
          rng.next()
          perturbedCriteria[cid] = { ...crit }
        }
      }

      return {
        ...site,
        criteria: perturbedCriteria,
      }
    })

    // 4. For every site, call evaluateFeasibility(perturbedSite, perturbedMission)
    const eligibleSites: Site[] = []

    for (let sIdx = 0; sIdx < perturbedSites.length; sIdx++) {
      const pSite = perturbedSites[sIdx]
      const summary = siteSummaries[sIdx]

      const feasResult = evaluateFeasibility(pSite, perturbedMission)
      summary.statusCounts[feasResult.status] += 1

      if (feasResult.eligible) {
        summary.eligibleCount += 1
        eligibleSites.push(pSite)
      }
    }

    // 5. If eligible set is empty:
    if (eligibleSites.length === 0) {
      noEligibleCount += 1
      for (const summary of siteSummaries) {
        summary.notRankedCount += 1
      }
      continue
    }

    // 6. Otherwise call rankSites(eligible perturbed sites, perturbed mission)
    const rankingResult = rankSites(eligibleSites, perturbedMission)

    if (rankingResult.ranking.length === 0) {
      // If all eligible sites were excluded by rankSites (e.g. missing weighted criteria)
      noEligibleCount += 1
      for (const summary of siteSummaries) {
        summary.notRankedCount += 1
      }
      continue
    }

    // The ranking[0] site wins
    const winningSiteId = rankingResult.ranking[0].id
    const winnerSummary = siteSummaryMap.get(winningSiteId)
    if (winnerSummary) {
      winnerSummary.winCount += 1
    }

    // Record each ranked site's rank
    const rankedIds = new Set<string>()
    for (const score of rankingResult.ranking) {
      rankedIds.add(score.id)
      const summary = siteSummaryMap.get(score.id)
      if (summary) {
        summary.rankCounts[score.rank - 1] += 1
      }
    }

    // Every site NOT in the ranking this iteration gets notRankedCount += 1
    for (const summary of siteSummaries) {
      if (!rankedIds.has(summary.siteId)) {
        summary.notRankedCount += 1
      }
    }
  }

  // Calculate frequencies
  for (const summary of siteSummaries) {
    summary.winFrequency = summary.winCount / iterations
    summary.eligibleFrequency = summary.eligibleCount / iterations
  }

  const noEligibleFrequency = noEligibleCount / iterations

  return {
    seed,
    iterations,
    weightRelativeSpread,
    noEligibleCount,
    noEligibleFrequency,
    sites: siteSummaries,
    notes,
  }
}
