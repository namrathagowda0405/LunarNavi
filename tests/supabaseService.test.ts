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

  it('map10TableToCentralizedSite correctly assembles site from 10-table normalized measurements', async () => {
    const { map10TableToCentralizedSite } = await import('../src/services/siteService')

    const siteRow = {
      id: 'test-10table-site',
      name: 'Test 10-Table Site',
      region: 'Test South Pole',
      latitude: -89.1,
      longitude: 180.0,
      elevation_m: -1500.0,
      designation: 'official-artemis-candidate' as const,
      source_organization: 'NASA Artemis Program',
      source_url: 'https://www.nasa.gov',
      coordinate_frame: 'DE421',
      coordinate_status: 'verified',
      is_psr: false,
      psr_distance_km: 1.5,
      description: 'Normalized 10-table site description.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const measurements = [
      {
        id: 'test-slope',
        site_id: 'test-10table-site',
        criterion_id: 'slope',
        dataset_version_id: 'pgda-prod-90-v1',
        value: 7.2,
        uncertainty_low: 6.0,
        uncertainty_high: 8.5,
        unit: 'degrees',
        value_kind: 'measured' as const,
        quality_rating: 'high' as const,
        source_citation: 'NASA LOLA 50m Slope',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-roughness',
        site_id: 'test-10table-site',
        criterion_id: 'roughness',
        dataset_version_id: 'pgda-prod-90-v1',
        value: 0.15,
        uncertainty_low: 0.11,
        uncertainty_high: 0.19,
        unit: 'meters RMS',
        value_kind: 'derived' as const,
        quality_rating: 'high' as const,
        source_citation: 'NASA LOLA 50m RMS',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-illumination',
        site_id: 'test-10table-site',
        criterion_id: 'illumination',
        dataset_version_id: 'pgda-prod-69-v1',
        value: 80.0,
        uncertainty_low: 75.0,
        uncertainty_high: 85.0,
        unit: 'percent',
        value_kind: 'derived' as const,
        quality_rating: 'high' as const,
        source_citation: 'NASA PGDA Prod 69',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-resource',
        site_id: 'test-10table-site',
        criterion_id: 'resource',
        dataset_version_id: 'lend-epithermal-v1',
        value: 65.0,
        uncertainty_low: 50.0,
        uncertainty_high: 80.0,
        unit: 'score (0-100)',
        value_kind: 'derived' as const,
        quality_rating: 'medium' as const,
        source_citation: 'LRO LEND',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-communication',
        site_id: 'test-10table-site',
        criterion_id: 'communication',
        dataset_version_id: 'pgda-prod-69-v1',
        value: 85.0,
        uncertainty_low: 80.0,
        uncertainty_high: 90.0,
        unit: 'percent',
        value_kind: 'derived' as const,
        quality_rating: 'high' as const,
        source_citation: 'NASA PGDA Prod 69',
        created_at: new Date().toISOString(),
      },
      {
        id: 'test-science',
        site_id: 'test-10table-site',
        criterion_id: 'science',
        dataset_version_id: 'artemis-sdt-v1',
        value: null,
        uncertainty_low: null,
        uncertainty_high: null,
        unit: 'score (0-100)',
        value_kind: 'estimated' as const,
        quality_rating: 'low' as const,
        source_citation: 'NASA Artemis SDT',
        created_at: new Date().toISOString(),
      },
    ]

    const mapped = map10TableToCentralizedSite(siteRow, measurements)
    expect(mapped.id).toBe('test-10table-site')
    expect(mapped.criteria.slope.value).toBe(7.2)
    expect(mapped.criteria.slope.low).toBe(6.0)
    expect(mapped.criteria.slope.high).toBe(8.5)
    expect(mapped.criteria.roughness.value).toBe(0.15)
    expect(mapped.criteria.illumination.value).toBe(80.0)
    expect(mapped.criteria.science.value).toBeNull()
    expect(mapped.measurements.elevation.value).toBe(-1500.0)
    expect(mapped.measurements.isPsr.value).toBe(false)
  })
})

