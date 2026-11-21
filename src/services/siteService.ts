import { supabase, isSupabaseConfigured } from './supabaseClient'
import {
  CENTRALIZED_CANDIDATE_SITES,
  CentralizedSite,
  getSiteById as getLocalSiteById,
} from '../data/centralizedSites'
import { Database } from '../types/database.types'
import { CriterionId, CriterionValue } from '../engine/types'

export type LunarSiteRow = Database['public']['Tables']['lunar_sites']['Row']
export type SiteMeasurementRow = Database['public']['Tables']['site_measurements']['Row']

/**
 * Maps a 10-table normalized database site row and its associated measurements
 * to the rich CentralizedSite application interface.
 */
export function map10TableToCentralizedSite(
  siteRow: LunarSiteRow,
  measurements: SiteMeasurementRow[]
): CentralizedSite {
  // Index measurements by criterion_id for O(1) lookup
  const measMap = new Map<string, SiteMeasurementRow>()
  for (const m of measurements) {
    measMap.set(m.criterion_id, m)
  }

  // Helper to build CriterionValue from a measurement row
  const getCrit = (id: CriterionId, defaultCitation: string): CriterionValue => {
    const m = measMap.get(id)
    if (m && m.value !== null) {
      return {
        value: m.value,
        low: m.uncertainty_low,
        high: m.uncertainty_high,
        kind: m.value_kind,
        quality: m.quality_rating,
        source: m.source_citation || defaultCitation,
      }
    }
    // Fall back to local site's criterion if available, or null
    const localSite = getLocalSiteById(siteRow.id)
    if (localSite?.criteria[id]) {
      return localSite.criteria[id]
    }
    return {
      value: null,
      low: null,
      high: null,
      kind: 'estimated',
      quality: 'low',
      source: defaultCitation,
    }
  }

  const slopeCrit = getCrit('slope', 'NASA LOLA GDR (Barker et al. 2023)')
  const roughnessCrit = getCrit('roughness', 'NASA PGDA Prod 90 (LOLA 50m RMS)')
  const illuminationCrit = getCrit('illumination', 'NASA PGDA Prod 69 (Mazarico et al. 2011)')
  const resourceCrit = getCrit('resource', 'LRO LEND & Diviner Thermal Model')
  const communicationCrit = getCrit('communication', 'NASA PGDA Prod 69 (Earth Visibility)')
  const scienceCrit = getCrit('science', 'NASA Artemis III Science Definition Report')

  const criteriaRecord: Record<CriterionId, CriterionValue> = {
    slope: slopeCrit,
    roughness: roughnessCrit,
    illumination: illuminationCrit,
    resource: resourceCrit,
    communication: communicationCrit,
    science: scienceCrit,
  }

  const local = getLocalSiteById(siteRow.id)

  return {
    id: siteRow.id,
    name: siteRow.name,
    region: siteRow.region,
    latitude: siteRow.latitude,
    longitude: siteRow.longitude,
    designation: siteRow.designation,
    sourceOrganization: siteRow.source_organization,
    sourceUrl: siteRow.source_url,
    description: siteRow.description ?? (local?.description || ''),
    coordinateConvention: 'Mean Earth / Polar Axis (ME) of DE421, East Positive',
    coordinateStatus: 'verified',
    criteria: criteriaRecord,
    measurements: {
      elevation: {
        value: siteRow.elevation_m,
        unit: 'm',
        dataset: 'NASA LOLA GDR (LRO-L-LOLA-4-GDR-V1.0)',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Bilinear interpolation from 20m/pixel polar stereographic DEM',
        quality: 'high',
      },
      slope: {
        value: slopeCrit.value,
        unit: '°',
        dataset: 'NASA LOLA 50m Baseline Slope Product',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Bi-directional slope computed over 50m baseline grid cell',
        quality: slopeCrit.quality,
      },
      roughness: {
        value: roughnessCrit.value,
        unit: 'm',
        dataset: 'NASA LOLA 50m RMS Surface Roughness',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Point-to-planar RMS topographic deviation over 50m footprint',
        quality: roughnessCrit.quality,
      },
      illumination: {
        value: illuminationCrit.value,
        unit: '%',
        dataset: 'NASA PGDA Product 69 (Mazarico et al. 2011)',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/69',
        samplingMethod: 'Ray-tracing solar visibility simulation over 18.6-year nutation cycle at 2m above ground',
        quality: illuminationCrit.quality,
      },
      isPsr: {
        value: siteRow.is_psr,
        unit: 'boolean',
        dataset: 'LRO Diviner Lunar Radiometer PSR Atlas',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/69',
        samplingMethod: 'Thermal model thresholding (maximum annual temperature < 110 K)',
        quality: 'high',
      },
      psrDistanceKm: siteRow.psr_distance_km,
    },
    resourceEvidence: {
      kind: (resourceCrit.kind === 'measured' ? 'direct-observation' : resourceCrit.kind === 'derived' ? 'scientific-evidence' : 'proxy') as CentralizedSite['resourceEvidence']['kind'],
      score: resourceCrit.value,
      citation: 'LRO LEND & Diviner Science Teams',
      sourceUrl: siteRow.source_url,
      summary: local?.resourceEvidence.summary ?? 'Cold-trap volatile presence and epithermal neutron suppression.',
      directObservation: local?.resourceEvidence.directObservation,
      thermalEvidence: local?.resourceEvidence.thermalEvidence,
      neutronDeficitEvidence: local?.resourceEvidence.neutronDeficitEvidence,
    },
    communicationModel: {
      assumedScenario: 'Direct-to-Earth over full 18.6-year lunar libration cycle at 2m mast elevation.',
      directEarthVisibilityPercent: communicationCrit.value,
      relaySupported: true,
      sourceUrl: siteRow.source_url,
      dataset: 'NASA PGDA Product 69 Earth Visibility Model',
      modelNote: 'Visibility computed for lunar south pole topography with Earth topocentric ephemeris.',
    },
  }
}

/**
 * Maps a Supabase relational database row (with flattened legacy columns) to the rich CentralizedSite application interface.
 */
export function mapRowToCentralizedSite(row: LunarSiteRow): CentralizedSite {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    designation: row.designation,
    sourceOrganization: row.source_organization,
    sourceUrl: row.source_url,
    description: row.description ?? '',
    coordinateConvention: 'Mean Earth / Polar Axis (ME) of DE421, East Positive',
    coordinateStatus: 'verified',
    criteria: {
      slope: {
        value: row.slope_deg ?? null,
        low: row.slope_low ?? null,
        high: row.slope_high ?? null,
        kind: 'measured',
        quality: 'high',
        source: 'NASA LOLA GDR (Barker et al. 2023)',
      },
      roughness: {
        value: row.roughness_m ?? null,
        low: row.roughness_low ?? null,
        high: row.roughness_high ?? null,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 90 (LOLA 50m RMS)',
      },
      illumination: {
        value: row.illumination_pct ?? null,
        low: row.illumination_low ?? null,
        high: row.illumination_high ?? null,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 69 (Mazarico et al. 2011)',
      },
      resource: {
        value: row.resource_score ?? null,
        low: row.resource_low ?? null,
        high: row.resource_high ?? null,
        kind:
          row.resource_evidence_kind === 'direct-observation'
            ? 'measured'
            : row.resource_evidence_kind === 'scientific-evidence'
            ? 'derived'
            : 'estimated',
        quality: row.resource_evidence_kind === 'direct-observation' ? 'high' : 'medium',
        source: 'LRO LEND & Diviner Thermal Model',
      },
      communication: {
        value: row.communication_pct ?? null,
        low: row.communication_low ?? null,
        high: row.communication_high ?? null,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 69 (Earth Visibility)',
      },
      science: {
        value: row.scientific_value ?? null,
        low: row.scientific_value_low ?? null,
        high: row.scientific_value_high ?? null,
        kind: 'estimated',
        quality: 'medium',
        source: 'NASA Artemis III Science Definition Report',
      },
    },
    measurements: {
      elevation: {
        value: row.elevation_m,
        unit: 'm',
        dataset: 'NASA LOLA GDR (LRO-L-LOLA-4-GDR-V1.0)',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Bilinear interpolation from 20m/pixel polar stereographic DEM',
        quality: 'high',
      },
      slope: {
        value: row.slope_deg ?? null,
        unit: '°',
        dataset: 'NASA LOLA 50m Baseline Slope Product',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Bi-directional slope computed over 50m baseline grid cell',
        quality: 'high',
      },
      roughness: {
        value: row.roughness_m ?? null,
        unit: 'm',
        dataset: 'NASA LOLA 50m RMS Surface Roughness',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Point-to-planar RMS topographic deviation over 50m footprint',
        quality: 'high',
      },
      illumination: {
        value: row.illumination_pct ?? null,
        unit: '%',
        dataset: 'NASA PGDA Product 69 (Mazarico et al. 2011)',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/69',
        samplingMethod: 'Ray-tracing solar visibility simulation over 18.6-year nutation cycle at 2m above ground',
        quality: 'high',
      },
      isPsr: {
        value: row.is_psr,
        unit: 'boolean',
        dataset: 'LRO Diviner Lunar Radiometer PSR Atlas',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/69',
        samplingMethod: 'Thermal model thresholding (maximum annual temperature < 110 K)',
        quality: 'high',
      },
      psrDistanceKm: row.psr_distance_km,
    },
    resourceEvidence: {
      kind: row.resource_evidence_kind ?? 'unknown',
      score: row.resource_score ?? null,
      citation: 'LRO LEND & Diviner Science Teams',
      sourceUrl: row.source_url,
      summary: 'Cold-trap volatile presence and epithermal neutron suppression.',
    },
    communicationModel: {
      assumedScenario: 'Direct-to-Earth over full 18.6-year lunar libration cycle at 2m mast elevation.',
      directEarthVisibilityPercent: row.communication_pct ?? null,
      relaySupported: true,
      sourceUrl: row.source_url,
      dataset: 'NASA PGDA Product 69 Earth Visibility Model',
      modelNote: 'Visibility computed for lunar south pole topography with Earth topocentric ephemeris.',
    },
  }
}

/**
 * Fetches candidate sites from Supabase with automatic local fallback.
 * Supports both:
 * 1. Normalized 10-table schema (lunar_sites + site_measurements)
 * 2. Flattened legacy schema (lunar_sites columns)
 * 3. Local verified dataset fallback (CENTRALIZED_CANDIDATE_SITES)
 */
export async function fetchLunarSites(): Promise<{ sites: CentralizedSite[]; source: 'supabase' | 'local' }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { sites: CENTRALIZED_CANDIDATE_SITES, source: 'local' }
  }

  try {
    const { data: sitesData, error: sitesError } = await supabase
      .from('lunar_sites')
      .select('*')
      .order('id', { ascending: true })

    if (sitesError || !sitesData || sitesData.length === 0) {
      console.warn('Supabase lunar_sites query returned empty or error, falling back to local dataset:', sitesError?.message)
      return { sites: CENTRALIZED_CANDIDATE_SITES, source: 'local' }
    }

    // Try fetching normalized measurements from site_measurements table
    try {
      const { data: measData } = await supabase
        .from('site_measurements')
        .select('*')

      if (measData && measData.length > 0) {
        const measBySite = new Map<string, SiteMeasurementRow[]>()
        for (const m of measData) {
          const list = measBySite.get(m.site_id) || []
          list.push(m)
          measBySite.set(m.site_id, list)
        }
        return {
          sites: sitesData.map((s) => map10TableToCentralizedSite(s, measBySite.get(s.id) || [])),
          source: 'supabase',
        }
      }
    } catch {
      // site_measurements table may not exist if legacy schema is active
    }

    // If site_measurements has no rows, check if flattened columns are present
    if (sitesData[0].slope_deg !== undefined && sitesData[0].slope_deg !== null) {
      return {
        sites: sitesData.map(mapRowToCentralizedSite),
        source: 'supabase',
      }
    }

    // Fallback: merge coordinates from Supabase with verified local measurements
    const merged = sitesData.map((s) => {
      const local = getLocalSiteById(s.id)
      if (local) {
        return {
          ...local,
          name: s.name || local.name,
          latitude: s.latitude ?? local.latitude,
          longitude: s.longitude ?? local.longitude,
        }
      }
      return mapRowToCentralizedSite(s)
    })

    return {
      sites: merged,
      source: 'supabase',
    }
  } catch (err) {
    console.warn('Network error fetching from Supabase, using local verified dataset:', err)
    return { sites: CENTRALIZED_CANDIDATE_SITES, source: 'local' }
  }
}

/**
 * Retrieves a candidate site by ID with local fallback.
 */
export async function fetchSiteById(id: string): Promise<CentralizedSite | undefined> {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalSiteById(id)
  }

  try {
    const { data: siteData, error: siteError } = await supabase
      .from('lunar_sites')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (siteError || !siteData) {
      return getLocalSiteById(id)
    }

    // Check for measurements in site_measurements
    try {
      const { data: measData } = await supabase
        .from('site_measurements')
        .select('*')
        .eq('site_id', id)

      if (measData && measData.length > 0) {
        return map10TableToCentralizedSite(siteData, measData)
      }
    } catch {
      // Ignore and proceed
    }

    if (siteData.slope_deg !== undefined && siteData.slope_deg !== null) {
      return mapRowToCentralizedSite(siteData)
    }

    return getLocalSiteById(id)
  } catch {
    return getLocalSiteById(id)
  }
}
