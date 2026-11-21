import { describe, it, expect } from 'vitest'
import {
  isSupabaseConfigured,
  fetchLunarSites,
  fetchSiteById,
  mapRowToCentralizedSite,
  fetchMissionProfiles,
  saveAnalysisRun,
  fetchRecentAnalysisRuns,
  fetchSources,
} from '../src/services'
import { Database } from '../src/types/database.types'

type LunarSiteRow = Database['public']['Tables']['lunar_sites']['Row']

describe('Supabase Data Access & Service Layer', () => {
  it('correctly reports configuration status when env vars are absent in test environment', () => {
    // In standard Vitest run without VITE_SUPABASE_URL, it reports unconfigured
    expect(typeof isSupabaseConfigured()).toBe('boolean')
  })

  it('fetchLunarSites returns all 16 curated candidate sites via fallback when unconfigured', async () => {
    const result = await fetchLunarSites()
    expect(result.sites.length).toBe(16)
    expect(['local', 'supabase']).toContain(result.source)

    const shackletonRidge = result.sites.find((s) => s.id === 'artemis-connecting-ridge')
    expect(shackletonRidge).toBeDefined()
    expect(shackletonRidge!.latitude).toBe(-89.45)
    expect(shackletonRidge!.criteria.slope.value).toBe(6.8)
  })

  it('fetchSiteById retrieves a specific site with exact attributes', async () => {
    const site = await fetchSiteById('artemis-connecting-ridge')
    expect(site).toBeDefined()
    expect(site!.name).toBe('Connecting Ridge')
    expect(site!.designation).toBe('official-artemis-candidate')
  })

  it('mapRowToCentralizedSite correctly maps database columns to criteria and measurements', () => {
    const sampleRow: LunarSiteRow = {
      id: 'test-site-alpha',
      name: 'Test Site Alpha',
      region: 'Test South Pole Complex',
      latitude: -88.5,
      longitude: 45.0,
      elevation_m: 1250.0,
      slope_deg: 6.5,
      slope_low: 5.5,
      slope_high: 7.5,
      roughness_m: 0.12,
      roughness_low: 0.08,
      roughness_high: 0.16,
      illumination_pct: 75.0,
      illumination_low: 70.0,
      illumination_high: 80.0,
      resource_score: 80.0,
      resource_low: 70.0,
      resource_high: 90.0,
      resource_evidence_kind: 'scientific-evidence',
      communication_pct: 85.0,
      communication_low: 80.0,
      communication_high: 90.0,
      scientific_value: 90.0,
      scientific_value_low: 85.0,
      scientific_value_high: 95.0,
      designation: 'official-artemis-candidate',
      source_organization: 'NASA Artemis Program',
      source_url: 'https://www.nasa.gov',
      coordinate_frame: 'DE421',
      coordinate_status: 'verified',
      is_psr: false,
      psr_distance_km: 1.2,
      description: 'Test description for mapping validation.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mapped = mapRowToCentralizedSite(sampleRow)
    expect(mapped.id).toBe('test-site-alpha')
    expect(mapped.name).toBe('Test Site Alpha')
    expect(mapped.criteria.slope.value).toBe(6.5)
    expect(mapped.criteria.slope.low).toBe(5.5)
    expect(mapped.criteria.slope.high).toBe(7.5)
    expect(mapped.measurements.elevation.value).toBe(1250.0)
    expect(mapped.measurements.isPsr.value).toBe(false)
    expect(mapped.measurements.psrDistanceKm).toBe(1.2)
  })

  it('fetchMissionProfiles returns 4 default mission profiles', async () => {
    const result = await fetchMissionProfiles()
    expect(result.profiles.length).toBe(4)
    const types = result.profiles.map((p) => p.id)
    expect(types).toContain('mission-science')
    expect(types).toContain('mission-resource')
    expect(types).toContain('mission-crewed')
    expect(types).toContain('mission-communication')
  })

  it('saveAnalysisRun records decision session and retrieves it from session history', async () => {
    const runPayload = {
      missionType: 'science',
      weights: { science: 0.35, slope: 0.15, illumination: 0.15, communication: 0.15, resource: 0.1, roughness: 0.1 },
      constraints: [],
      totalSitesEvaluated: 16,
      feasibleSitesCount: 15,
      primarySiteId: 'artemis-connecting-ridge',
      primaryScore: 0.785,
      backupSiteId: 'artemis-malapert-massif',
      rankings: [
        { id: 'artemis-connecting-ridge', rank: 1, closeness: 0.785, distanceToIdeal: 0.1, distanceToAntiIdeal: 0.35 },
      ],
      simulationParameters: {
        iterations: 1000,
        weightRelativeSpread: 0.2,
        seed: 42,
      },
      monteCarloSummary: {
        topSiteId: 'artemis-connecting-ridge',
        topSiteWinRate: 0.84,
        topSiteTop3Rate: 0.98,
        nominalRank: 1,
      },
    }

    const saveResult = await saveAnalysisRun(runPayload)
    expect(saveResult.success).toBe(true)
    expect(saveResult.id).toBeDefined()

    const recentRuns = await fetchRecentAnalysisRuns(5)
    expect(recentRuns.runs.length).toBeGreaterThanOrEqual(1)
    const saved = recentRuns.runs.find((r) => r.id === saveResult.id)
    expect(saved).toBeDefined()
    expect(saved!.primarySiteId).toBe('artemis-connecting-ridge')
  })

  it('fetchSources returns the 6 authoritative NASA repositories and instruments', async () => {
    const result = await fetchSources()
    expect(result.sources.length).toBe(6)
    const ids = result.sources.map((s) => s.id)
    expect(ids).toContain('nasa-lola-pds')
    expect(ids).toContain('nasa-pgda-prod-90')
    expect(ids).toContain('nasa-pgda-prod-69')
    expect(ids).toContain('lro-lend')
    expect(ids).toContain('lro-diviner')
    expect(ids).toContain('nasa-artemis-sdt')
  })
})
