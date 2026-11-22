import { CRITERION_IDS, CriterionId, Site } from './types'
import { MissionProfile } from './mission'
import { CRITERION_DIRECTION, CriterionDirection } from './criteria'

export interface TopsisScore {
  id: string
  closeness: number
  rank: number
  distanceToIdeal: number
  distanceToAntiIdeal: number
}

export interface TopsisResult {
  ranking: TopsisScore[]
  ideal: number[]
  antiIdeal: number[]
}

/**
 * Generic TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) algorithm.
 * Pure mathematical core operating on numeric matrices.
 *
 * @param ids - Unique identifiers for each alternative (row).
 * @param matrix - Numeric evaluation matrix of dimensions [m alternatives x n criteria].
 * @param weights - Importance weights for each criterion column.
 * @param directions - Preference direction ('benefit' | 'cost') for each criterion column.
 * @returns TopsisResult with ranked scores and weighted ideal/anti-ideal vectors.
 */
export function topsis(
  ids: string[],
  matrix: number[][],
  weights: number[],
  directions: CriterionDirection[]
): TopsisResult {
  // Empty input returns an empty ranking immediately
  if (ids.length === 0) {
    return { ranking: [], ideal: [], antiIdeal: [] }
  }

  // Validation: row counts
  if (ids.length !== matrix.length) {
    throw new Error(
      `Row count mismatch: received ${ids.length} ids but matrix has ${matrix.length} rows.`
    )
  }

  // Validation: weights and directions length
  if (weights.length !== directions.length) {
    throw new Error(
      `Dimension mismatch: weights has ${weights.length} items but directions has ${directions.length} items.`
    )
  }

  if (weights.length === 0) {
    throw new Error('Weights and directions cannot be empty.')
  }

  // Validation: weights finite and non-negative
  for (let j = 0; j < weights.length; j++) {
    const w = weights[j]
    if (typeof w !== 'number' || !Number.isFinite(w)) {
      throw new Error(`Invalid weight at index ${j}: value must be a finite number.`)
    }
    if (w < 0) {
      throw new Error(`Negative weight at index ${j}: weights must be non-negative (got ${w}).`)
    }
  }

  // Validation: not all weights are zero
  const allWeightsZero = weights.every((w) => w === 0)
  if (allWeightsZero) {
    throw new Error('All weights are zero; at least one criterion must have a positive weight.')
  }

  // Validation: directions
  for (let j = 0; j < directions.length; j++) {
    const dir = directions[j]
    if (dir !== 'benefit' && dir !== 'cost') {
      throw new Error(`Invalid direction at index ${j}: must be 'benefit' or 'cost'.`)
    }
  }

  // Validation: matrix rows and finite values
  const numRows = matrix.length
  const numCols = weights.length

  for (let i = 0; i < numRows; i++) {
    const row = matrix[i]
    if (!Array.isArray(row) || row.length !== numCols) {
      throw new Error(
        `Column count mismatch at row ${i}: expected ${numCols} columns, got ${row ? row.length : 'non-array'}.`
      )
    }
    for (let j = 0; j < numCols; j++) {
      const val = row[j]
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new Error(
          `Non-finite value at row ${i}, column ${j}: received ${val}.`
        )
      }
    }
  }

  // Step a: Vector normalisation per criterion column
  // value / sqrt(sum of squares of that column). If sum of squares is 0, normalised values are 0.
  const normMatrix: number[][] = Array.from({ length: numRows }, () => new Array(numCols).fill(0))

  for (let j = 0; j < numCols; j++) {
    let sumSq = 0
    for (let i = 0; i < numRows; i++) {
      sumSq += matrix[i][j] * matrix[i][j]
    }

    const colNorm = Math.sqrt(sumSq)
    for (let i = 0; i < numRows; i++) {
      normMatrix[i][j] = colNorm === 0 ? 0 : matrix[i][j] / colNorm
    }
  }

  // Step b: Multiply each column by its weight (use weights as given, do NOT rescale)
  const weightedMatrix: number[][] = Array.from({ length: numRows }, () => new Array(numCols).fill(0))

  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      weightedMatrix[i][j] = normMatrix[i][j] * weights[j]
    }
  }

  // Step c: Ideal per column: max for 'benefit', min for 'cost'. Anti-ideal: opposite.
  // Recomputed dynamically from the alternatives passed in each call.
  const ideal: number[] = new Array(numCols).fill(0)
  const antiIdeal: number[] = new Array(numCols).fill(0)

  for (let j = 0; j < numCols; j++) {
    let minVal = weightedMatrix[0][j]
    let maxVal = weightedMatrix[0][j]

    for (let i = 1; i < numRows; i++) {
      const v = weightedMatrix[i][j]
      if (v < minVal) minVal = v
      if (v > maxVal) maxVal = v
    }

    if (directions[j] === 'benefit') {
      ideal[j] = maxVal
      antiIdeal[j] = minVal
    } else {
      ideal[j] = minVal
      antiIdeal[j] = maxVal
    }
  }

  // Step d: Euclidean distance of each alternative to ideal and to anti-ideal
  const distanceToIdeal: number[] = new Array(numRows).fill(0)
  const distanceToAntiIdeal: number[] = new Array(numRows).fill(0)

  for (let i = 0; i < numRows; i++) {
    let sumSqIdeal = 0
    let sumSqAntiIdeal = 0

    for (let j = 0; j < numCols; j++) {
      const diffIdeal = weightedMatrix[i][j] - ideal[j]
      const diffAntiIdeal = weightedMatrix[i][j] - antiIdeal[j]
      sumSqIdeal += diffIdeal * diffIdeal
      sumSqAntiIdeal += diffAntiIdeal * diffAntiIdeal
    }

    distanceToIdeal[i] = Math.sqrt(sumSqIdeal)
    distanceToAntiIdeal[i] = Math.sqrt(sumSqAntiIdeal)
  }

  // Step e: closeness = distanceToAntiIdeal / (distanceToIdeal + distanceToAntiIdeal)
  // When all alternatives are identical or only a single alternative is evaluated,
  // distanceToIdeal and distanceToAntiIdeal are both 0. In decision support, this is
  // defined as closeness = 1.0 because the candidate has no relative disadvantage.
  const scores: TopsisScore[] = []

  for (let i = 0; i < numRows; i++) {
    const dIdeal = distanceToIdeal[i]
    const dAntiIdeal = distanceToAntiIdeal[i]
    const denominator = dIdeal + dAntiIdeal
    const closeness = denominator === 0 ? 1 : dAntiIdeal / denominator

    scores.push({
      id: ids[i],
      closeness,
      rank: 0,
      distanceToIdeal: dIdeal,
      distanceToAntiIdeal: dAntiIdeal,
    })
  }

  // Step f: Sort by closeness descending; ties broken by id ascending (deterministic output).
  // rank = position starting at 1 (no shared ranks).
  scores.sort((a, b) => {
    if (Math.abs(b.closeness - a.closeness) > 1e-12) {
      return b.closeness - a.closeness
    }
    return a.id.localeCompare(b.id)
  })

  scores.forEach((s, idx) => {
    s.rank = idx + 1
  })

  // Step g: ideal and antiIdeal arrays hold the weighted ideal and anti-ideal values
  return {
    ranking: scores,
    ideal,
    antiIdeal,
  }
}

export interface SiteRankingResult {
  ranking: TopsisScore[]
  criteriaUsed: CriterionId[]
  excluded: { siteId: string; reason: string }[]
  ideal: number[]
  antiIdeal: number[]
}

/**
 * Site wrapper for TOPSIS ranking.
 *
 * NOTE: The caller passes ONLY sites already judged eligible. This function does not
 * check feasibility and must not import feasibility.ts.
 *
 * @param sites - Eligible candidate landing sites.
 * @param mission - Mission profile specifying criterion weights.
 * @returns SiteRankingResult with ranked scores, criteria used, excluded sites, and reference vectors.
 */
export function rankSites(sites: Site[], mission: MissionProfile): SiteRankingResult {
  // criteriaUsed = criteria (in CRITERION_IDS order) whose mission weight > 0.
  // Zero-weight criteria are ignored completely, even if a site has null for them.
  const criteriaUsed: CriterionId[] = CRITERION_IDS.filter(
    (cid) => (mission.weights[cid] ?? 0) > 0
  )

  if (criteriaUsed.length === 0 || sites.length === 0) {
    return {
      ranking: [],
      criteriaUsed,
      excluded: [],
      ideal: [],
      antiIdeal: [],
    }
  }

  // Exclude sites with null or non-finite values in any criterionUsed
  const eligibleSites: Site[] = []
  const excluded: { siteId: string; reason: string }[] = []

  for (const site of sites) {
    const missingCriteria: CriterionId[] = []
    for (const cid of criteriaUsed) {
      const val = site.criteria[cid]?.value
      if (val === null || typeof val !== 'number' || !Number.isFinite(val)) {
        missingCriteria.push(cid)
      }
    }

    if (missingCriteria.length > 0) {
      excluded.push({
        siteId: site.id,
        reason: `Site "${site.id}" is excluded because data for weighted criterion "${missingCriteria.join(', ')}" is missing or non-finite.`,
      })
    } else {
      eligibleSites.push(site)
    }
  }

  // If no sites remain after exclusions, return an empty ranking without throwing
  if (eligibleSites.length === 0) {
    return {
      ranking: [],
      criteriaUsed,
      excluded,
      ideal: [],
      antiIdeal: [],
    }
  }

  const ids = eligibleSites.map((s) => s.id)
  const weights = criteriaUsed.map((cid) => mission.weights[cid])
  const directions = criteriaUsed.map((cid) => CRITERION_DIRECTION[cid])
  const matrix = eligibleSites.map((s) =>
    criteriaUsed.map((cid) => s.criteria[cid].value as number)
  )

  const topsisResult = topsis(ids, matrix, weights, directions)

  return {
    ranking: topsisResult.ranking,
    criteriaUsed,
    excluded,
    ideal: topsisResult.ideal,
    antiIdeal: topsisResult.antiIdeal,
  }
}
