import { supabase, isSupabaseConfigured } from './supabaseClient'
import {
  CENTRALIZED_CANDIDATE_SITES,
  CentralizedSite,
  getSiteById as getLocalSiteById,
} from '../data/centralizedSites'
import { Database } from '../types/database.types'

type LunarSiteRow = Database['public']['Tables']['lunar_sites']['Row']

/**
 * Maps a Supabase relational database row to the rich CentralizedSite application interface.
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
        value: row.slope_deg,
        low: row.slope_low,
        high: row.slope_high,
        kind: 'measured',
        quality: 'high',
        source: 'NASA LOLA GDR (Barker et al. 2023)',
      },
      roughness: {
        value: row.roughness_m,
        low: row.roughness_low,
        high: row.roughness_high,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 90 (LOLA 50m RMS)',
      },
      illumination: {
        value: row.illumination_pct,
        low: row.illumination_low,
        high: row.illumination_high,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 69 (Mazarico et al. 2011)',
      },
      resource: {
        value: row.resource_score,
        low: row.resource_low,
        high: row.resource_high,
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
        value: row.communication_pct,
        low: row.communication_low,
        high: row.communication_high,
        kind: 'derived',
        quality: 'high',
        source: 'NASA PGDA Prod 69 (Earth Visibility)',
      },
      science: {
        value: row.scientific_value,
        low: row.scientific_value_low,
        high: row.scientific_value_high,
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
        value: row.slope_deg,
        unit: '°',
        dataset: 'NASA LOLA 50m Baseline Slope Product',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Bi-directional slope computed over 50m baseline grid cell',
        quality: 'high',
      },
      roughness: {
        value: row.roughness_m,
        unit: 'm',
        dataset: 'NASA LOLA 50m RMS Surface Roughness',
        sourceUrl: 'https://pgda.gsfc.nasa.gov/products/90',
        samplingMethod: 'Point-to-planar RMS topographic deviation over 50m footprint',
        quality: 'high',
      },
      illumination: {
        value: row.illumination_pct,
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
      kind: row.resource_evidence_kind,
      score: row.resource_score,
      citation: 'LRO LEND & Diviner Science Teams',
      sourceUrl: row.source_url,
      summary: 'Cold-trap volatile presence and epithermal neutron suppression.',
    },
    communicationModel: {
      assumedScenario: 'Direct-to-Earth over full 18.6-year lunar libration cycle at 2m mast elevation.',
      directEarthVisibilityPercent: row.communication_pct,
      relaySupported: true,
      sourceUrl: row.source_url,
      dataset: 'NASA PGDA Product 69 Earth Visibility Model',
      modelNote: 'Visibility computed for lunar south pole topography with Earth topocentric ephemeris.',
    },
  }
}

/**
 * Fetches candidate sites from Supabase with automatic local fallback.
 */
export async function fetchLunarSites(): Promise<{ sites: CentralizedSite[]; source: 'supabase' | 'local' }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { sites: CENTRALIZED_CANDIDATE_SITES, source: 'local' }
  }

  try {
    const { data, error } = await supabase
      .from('lunar_sites')
      .select('*')
      .order('id', { ascending: true })

    if (error || !data || data.length === 0) {
      console.warn('Supabase lunar_sites query returned empty or error, falling back to local dataset:', error?.message)
      return { sites: CENTRALIZED_CANDIDATE_SITES, source: 'local' }
    }

    return {
      sites: data.map(mapRowToCentralizedSite),
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
    const { data, error } = await supabase
      .from('lunar_sites')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return getLocalSiteById(id)
    }

    return mapRowToCentralizedSite(data)
  } catch {
    return getLocalSiteById(id)
  }
}
