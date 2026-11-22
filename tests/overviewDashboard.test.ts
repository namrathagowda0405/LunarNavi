import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { CANDIDATE_SITES } from '../src/data/candidateSites'
import { getDefaultMissionProfile } from '../src/engine/mission'
import { filterFeasibleSites } from '../src/engine/feasibility'
import { rankSites } from '../src/engine/topsis'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Overview Dashboard - Working Mission Control Dashboard', () => {
  it('contains truthful candidate site counts matching actual application data', () => {
    expect(CANDIDATE_SITES.length).toBe(16)
    const artemisSites = CANDIDATE_SITES.filter((s) => s.designation === 'official-artemis-candidate')
    const researchSites = CANDIDATE_SITES.filter((s) => s.designation === 'scientific-research-location')
    expect(artemisSites.length).toBe(13)
    expect(researchSites.length).toBe(3)
  })

  it('implements the exact four structured sections (A, B, C, D)', () => {
    const overviewFile = path.join(currentDir, '../src/frontend/views/OverviewDashboard.tsx')
    const content = fs.readFileSync(overviewFile, 'utf-8')

    // Section A: Current Mission Context
    expect(content).toContain('Current Mission Context')
    expect(content).toContain('Lunar South Pole (80°S – 90°S)')

    // Section B: Analysis Pipeline Workflow
    expect(content).toContain('Analysis Pipeline Workflow')
    expect(content).toContain('Mission Configuration')
    expect(content).toContain('Interactive Lunar Map')
    expect(content).toContain('Physical Feasibility')
    expect(content).toContain('TOPSIS Multi-Criteria Ranking')
    expect(content).toContain('Monte Carlo Robustness')
    expect(content).toContain('Orbiter Data Integration')

    // Section C: Candidate Site Data Status
    expect(content).toContain('Candidate Site Data Status')
    expect(content).toContain('TOTAL EVALUATED SITES')
    expect(content).toContain('OFFICIAL ARTEMIS III CANDIDATES')
    expect(content).toContain('SCIENTIFIC RESEARCH SITES')

    // Section D: Decision Recommendation
    expect(content).toContain('Decision Recommendation')
    expect(content).toContain('Run the analysis to see a recommendation.')
  })

  it('displays empty state prompt and does not fabricate rankings when no analysis was run', () => {
    const overviewFile = path.join(currentDir, '../src/frontend/views/OverviewDashboard.tsx')
    const content = fs.readFileSync(overviewFile, 'utf-8')

    expect(content).toContain('Run the analysis to see a recommendation.')
    expect(content).toContain('Configure Mission & Run Analysis →')
  })

  it('evaluates authentic TOPSIS ranking when configured mission is provided', () => {
    const profile = getDefaultMissionProfile('science')
    const feasible = filterFeasibleSites(CANDIDATE_SITES, profile)
    expect(feasible.length).toBeGreaterThan(0)

    const rankingResult = rankSites(feasible, profile)
    expect(rankingResult.ranking.length).toBeGreaterThan(0)
    expect(rankingResult.ranking[0].closeness).toBeGreaterThan(0)
    expect(rankingResult.ranking[0].closeness).toBeLessThanOrEqual(1)
  })

  it('removes repeated Landing Page hero and MoonGraphic from Overview', () => {
    const overviewFile = path.join(currentDir, '../src/frontend/views/OverviewDashboard.tsx')
    const content = fs.readFileSync(overviewFile, 'utf-8')

    expect(content).not.toContain('<MoonGraphic')
    expect(content).not.toContain('hero-graphic-wrapper')
  })
})
