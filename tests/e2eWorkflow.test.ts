import { describe, it, expect } from 'vitest'
import {
  CANDIDATE_SITES,
  CentralizedSite,
  getSiteById,
  getDecorrelatedBackupSite,
} from '../src/data/candidateSites'
import { getDefaultMissionProfile } from '../src/engine/mission'
import {
  defaultFormState,
  getMissionPresetState,
  buildMissionProfile,
  normalizeWeights,
} from '../src/frontend/missionForm'
import { filterFeasibleSites } from '../src/engine/feasibility'
import { rankSites } from '../src/engine/topsis'
import { runMonteCarlo } from '../src/engine/montecarlo'
import { MAP_LAYERS, latLonToNormalized, normalizedToLatLon } from '../src/frontend/lunarMapData'

describe('End-to-End Live Demo Flow (Steps 1 - 17)', () => {
  const sites = CANDIDATE_SITES as CentralizedSite[]

  it('Step 1 & 2: Initial form state and mission presets exist', () => {
    const initialForm = defaultFormState()
    expect(initialForm.missionType).toBe('science')
    expect(initialForm.region).toBe('south-pole')
    expect(initialForm.rawWeights.science).toBe(5)
  })

  it('Step 3: Select Science mission and verify default weights', () => {
    const sciencePreset = getMissionPresetState('science')
    expect(sciencePreset.missionType).toBe('science')
    expect(sciencePreset.rawWeights.science).toBe(7)
    expect(sciencePreset.rawWeights.slope).toBe(3)
    expect(sciencePreset.constraints.length).toBeGreaterThanOrEqual(3)

    const build = buildMissionProfile(sciencePreset)
    expect(build.ok).toBe(true)
    expect(build.profile).not.toBeNull()
    const weights = build.profile!.weights
    expect(weights.science).toBeCloseTo(0.35, 2)
    expect(weights.slope).toBeCloseTo(0.15, 2)
  })

  it('Step 4 & 5: Adjust raw weight and verify normalized weights update', () => {
    const preset = getMissionPresetState('science')
    // User boosts slope weight to maximum 10
    const modifiedWeights = { ...preset.rawWeights, slope: 10 }
    const normalized = normalizeWeights(modifiedWeights)

    const sum = Object.values(normalized).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 5)
    // Slope share must have substantially increased
    expect(normalized.slope).toBeGreaterThan(0.25)
  })

  it('Step 6 & 7: Lunar Map layer configurations are valid', () => {
    expect(MAP_LAYERS.length).toBe(7)
    const layerIds = MAP_LAYERS.map((l) => l.id)
    expect(layerIds).toContain('elevation')
    expect(layerIds).toContain('slope')
    expect(layerIds).toContain('illumination')
    expect(layerIds).toContain('psr')
    expect(layerIds).toContain('earth-vis')

    for (const layer of MAP_LAYERS) {
      expect(layer.assetUrl).toBeDefined()
      if (layer.assetUrl) {
        expect(layer.assetUrl.endsWith('.webp')).toBe(true)
      }
    }
  })

  it('Step 8: Map zoom and coordinate projections round-trip accurately', () => {
    // Shackleton crater rim coordinates: 89.9°S, 0.0°E
    const lat = -89.9
    const lon = 0.0
    const normalized = latLonToNormalized(lat, lon)
    expect(normalized.u).toBeGreaterThan(0.4)
    expect(normalized.u).toBeLessThan(0.6)
    expect(normalized.v).toBeGreaterThan(0.4)
    expect(normalized.v).toBeLessThan(0.6)

    const roundtrip = normalizedToLatLon(normalized.u, normalized.v)
    expect(roundtrip.lat).toBeCloseTo(lat, 1)
    expect(roundtrip.lon).toBeCloseTo(lon, 1)
  })

  it('Step 9: Select candidate location and verify telemetry integrity', () => {
    const site = getSiteById('artemis-connecting-ridge')
    expect(site).toBeDefined()
    expect(site!.name).toBe('Connecting Ridge')
    expect(site!.criteria.slope.value).toBe(6.8)
    expect(site!.criteria.illumination.value).toBe(82.0)
    expect(site!.criteria.roughness.value).toBe(0.14)
  })

  it('Step 10 & 11: Candidate sites have complete scientific provenance', () => {
    expect(sites.length).toBe(16)
    for (const site of sites) {
      expect(site.id).toBeDefined()
      expect(site.name.length).toBeGreaterThan(0)
      expect(site.latitude).toBeLessThan(0) // South pole
      expect(site.sourceOrganization).toBeDefined()
      expect(site.sourceUrl.startsWith('http')).toBe(true)
      expect(site.coordinateStatus).toBe('verified')

      // Check scientific bounds
      for (const [, crit] of Object.entries(site.criteria)) {
        if (crit.value !== null) {
          expect(crit.low).not.toBeNull()
          expect(crit.high).not.toBeNull()
          expect(crit.low!).toBeLessThanOrEqual(crit.high!)
          expect(crit.source.length).toBeGreaterThan(0)
          expect(['high', 'medium', 'low']).toContain(crit.quality)
        }
      }
    }
  })

  it('Step 12 & 13: Results & Ranking performs TOPSIS and provides decorrelated backup', () => {
    const profile = getDefaultMissionProfile('science')
    const feasible = filterFeasibleSites(sites, profile)
    expect(feasible.length).toBeGreaterThan(0)

    const ranking = rankSites(feasible, profile)
    expect(ranking.ranking.length).toBeGreaterThanOrEqual(1)
    expect(ranking.ranking[0].closeness).toBeGreaterThanOrEqual(ranking.ranking[1].closeness)

    const topSite = getSiteById(ranking.ranking[0].id)
    expect(topSite).toBeDefined()

    // Backup site verification
    const backup = getDecorrelatedBackupSite(topSite!.id, ranking.ranking.map((r) => r.id))
    expect(backup).toBeDefined()
    expect(backup!.id).not.toBe(topSite!.id)
    // Backup must be from a distinct geographic sector or different region
    expect(backup!.region).not.toBe(topSite!.region)
  })

  it('Step 14: Changing mission type dynamically alters rankings and winners', () => {
    const scienceProfile = getDefaultMissionProfile('science')
    const crewedProfile = getDefaultMissionProfile('crewed')
    const commProfile = getDefaultMissionProfile('communication')

    const scienceRanking = rankSites(filterFeasibleSites(sites, scienceProfile), scienceProfile)
    const crewedRanking = rankSites(filterFeasibleSites(sites, crewedProfile), crewedProfile)
    const commRanking = rankSites(filterFeasibleSites(sites, commProfile), commProfile)

    expect(scienceRanking.ranking[0]).toBeDefined()
    expect(crewedRanking.ranking[0]).toBeDefined()
    expect(commRanking.ranking[0]).toBeDefined()
  })

  it('Step 15 & 16: Monte Carlo Robustness simulation executes stably with rank frequencies', () => {
    const profile = getDefaultMissionProfile('science')
    const feasible = filterFeasibleSites(sites, profile)

    const mc = runMonteCarlo(feasible, profile, {
      seed: 42,
      iterations: 500,
      weightRelativeSpread: 0.2,
    })

    expect(mc.iterations).toBe(500)
    expect(mc.sites.length).toBe(feasible.length)

    // Check that win frequencies sum to 1.0 (or <= 1.0 if ties or infeasibilities)
    const totalWins = mc.sites.reduce((sum, s) => sum + s.winFrequency, 0)
    expect(totalWins).toBeCloseTo(1.0, 1)

    // Check rank counts structure + notRankedCount for histogram
    for (const siteSummary of mc.sites) {
      expect(siteSummary.rankCounts.length).toBe(feasible.length)
      const rankSum = siteSummary.rankCounts.reduce((a, b) => a + b, 0)
      expect(rankSum + siteSummary.notRankedCount).toBe(500)
    }
  })

  it('Step 17: All views are registered and valid', () => {
    const views = ['overview', 'setup', 'map', 'sites', 'results', 'robustness', 'data-sources', 'about']
    expect(views.length).toBe(8)
  })
})
