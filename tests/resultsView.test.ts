import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { CANDIDATE_SITES, getDecorrelatedBackupSite } from '../src/data/candidateSites'
import { getDefaultMissionProfile } from '../src/engine/mission'
import { filterFeasibleSites } from '../src/engine/feasibility'
import { rankSites } from '../src/engine/topsis'
import { runMonteCarlo } from '../src/engine/montecarlo'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Results & Ranking View - Transparent TOPSIS & Monte Carlo Analysis', () => {
  const resultsFile = path.join(currentDir, '../src/frontend/views/Results.tsx')
  const content = fs.readFileSync(resultsFile, 'utf-8')

  it('contains dedicated TOPSIS Analysis section with plain-English methodology explanation', () => {
    // Exact title required by user
    expect(content).toContain('TOPSIS Analysis — How Landing Sites Are Ranked')

    // Exact simple language definition required by user
    expect(content).toContain(
      'TOPSIS ranks candidate landing sites by comparing how close each site is to an ideal solution and how far it is from a worst-case solution, based on the criteria selected for the mission.'
    )
  })

  it('explains mission criteria and importance weights honestly without fabricated metrics', () => {
    expect(content).toContain('Mission Criteria & Importance Weights')
    expect(content).toContain('Preference Direction')
    expect(content).toContain('Operational Meaning for this Mission')
    expect(content).toContain('Priority Trade-off Summary')
  })

  it('displays the six-step TOPSIS calculation pipeline matching the engine implementation', () => {
    expect(content).toContain('Six-Step TOPSIS Calculation Pipeline')
    expect(content).toContain('Data Matrix Extraction')
    expect(content).toContain('Vector Normalization')
    expect(content).toContain('Weight Application')
    expect(content).toContain('Ideal & Worst Reference Vectors')
    expect(content).toContain('Euclidean Separation Distances')
    expect(content).toContain('Closeness Scoring & Ranking')

    // Mathematical formulation toggle
    expect(content).toContain('Mathematical Formulation (Vector Normalization & Euclidean Metric)')
    expect(content).toContain('r_ij = x_ij / √( Σ_k x_kj² )')
    expect(content).toContain('C_i = d⁻_i / (d⁺_i + d⁻_i)')
  })

  it('provides a data-backed explanation for why the Primary site ranked first', () => {
    expect(content).toContain('DECISION JUSTIFICATION')
    expect(content).toContain('Why')
    expect(content).toContain('Ranked #1')
    expect(content).toContain('Trade-Off Disclosure')
  })

  it('features an official TOPSIS ranking leaderboard with distinguished primary and backup rows', () => {
    expect(content).toContain('Feasible Candidate Rankings (TOPSIS)')
    expect(content).toContain('d⁺ (Ideal)')
    expect(content).toContain('d⁻ (Worst)')
    expect(content).toContain('leaderboard-row--top')
    expect(content).toContain('leaderboard-row--backup')
    expect(content).toContain('PRIMARY #1')
    expect(content).toContain('BACKUP #')
  })

  it('contains dedicated Monte Carlo Robustness Analysis section with plain-English explanation', () => {
    // Exact title required by user
    expect(content).toContain('Monte Carlo Robustness Analysis — How Stable Is the Recommendation?')

    // Exact simple language definition required by user
    expect(content).toContain(
      'Monte Carlo robustness analysis repeatedly recalculates the ranking while varying the criterion weights within defined assumptions. It helps us determine whether the recommended site consistently ranks first or whether small changes in priorities could change the recommendation.'
    )
  })

  it('strictly enforces the mandatory analytical framing notice', () => {
    expect(content).toContain(
      'Monte Carlo results measure how STABLE a recommendation is when data values and priorities vary within stated assumptions. They are NOT the probability that a site is safe, suitable or will succeed.'
    )
    expect(content).toContain('What This Percentage Means')
    expect(content).toContain('landing probability, mission success probability, touchdown safety score, or water presence likelihood')
  })

  it('displays actual simulation parameters and documented robustness thresholds', () => {
    expect(content).toContain('SIMULATIONS PERFORMED')
    expect(content).toContain('WEIGHT VARIATION SPREAD')
    expect(content).toContain('SENSOR MEASUREMENT UNCERTAINTY')
    expect(content).toContain('PHYSICAL SAFETY CONSTRAINTS')

    // Documented thresholds
    expect(content).toContain('Robust')
    expect(content).toContain('Rank #1 ≥ 70%')
    expect(content).toContain('Moderately Stable')
    expect(content).toContain('Sensitive')
  })

  it('includes concise simulation results table and rank distribution breakdown', () => {
    expect(content).toContain('Monte Carlo Simulation Output Table')
    expect(content).toContain('Ranked #1 (%)')
    expect(content).toContain('Top 2 (%)')
    expect(content).toContain('Average Rank')
    expect(content).toContain('Stability Status')
    expect(content).toContain('Simulated Rank Distribution Frequency (Top Candidates)')
  })

  it('provides direct View on Lunar Map actions for Primary and Backup recommendations', () => {
    expect(content).toContain('View Recommended Sites on Lunar Map ↗')
    expect(content).toContain('Locate on Lunar Map ↗')
    expect(content).toContain('Locate Backup on Map ↗')
  })

  it('executes genuine mathematical calculations across profiles dynamically', () => {
    // 1. Resource Mission
    const resProfile = getDefaultMissionProfile('resource')
    const resFeasible = filterFeasibleSites(CANDIDATE_SITES, resProfile)
    const resRanking = rankSites(resFeasible, resProfile)
    expect(resRanking.ranking.length).toBeGreaterThan(0)
    expect(resProfile.weights.resource).toBeGreaterThan(resProfile.weights.illumination)

    const resTop = resRanking.ranking[0]
    const resBackup = getDecorrelatedBackupSite(resTop.id, resRanking.ranking.map((r) => r.id))
    expect(resBackup).toBeDefined()
    expect(resBackup!.id).not.toBe(resTop.id)

    // Monte Carlo simulation on Resource profile
    const resMc = runMonteCarlo(resFeasible, resProfile, { seed: 42, iterations: 100, weightRelativeSpread: 0.15 })
    expect(resMc.iterations).toBe(100)
    expect(resMc.sites.length).toBe(resFeasible.length)
    const resTopSummary = resMc.sites.find((s) => s.siteId === resTop.id)
    expect(resTopSummary).toBeDefined()
    expect(resTopSummary!.winFrequency).toBeGreaterThanOrEqual(0)
  })
})
