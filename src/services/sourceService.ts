import { supabase, isSupabaseConfigured } from './supabaseClient'
import { Database } from '../types/database.types'

export type SourceRecord = Database['public']['Tables']['sources']['Row']
export type DataSourceRow = Database['public']['Tables']['data_sources']['Row']
export type DatasetVersionRow = Database['public']['Tables']['dataset_versions']['Row']

// Static fallback sources metadata matching NASA catalog
export const FALLBACK_SOURCES: SourceRecord[] = [
  {
    id: 'nasa-lola-pds',
    name: 'LRO LOLA Gridded Data Record (LDEM_80S_80M)',
    organization: 'NASA Planetary Data System (PDS) Geosciences Node / MIT',
    url: 'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/JP2/LDEM_80S_80M.JP2',
    version: 'LRO-L-LOLA-4-GDR-V1.0',
    retrieval_date: '2023-11-15',
    processing_method: 'Laser altimeter soundings downsampled to 80m/pixel polar stereographic grid',
    description: 'High-resolution digital elevation model of the lunar south pole (80°S - 90°S).',
    created_at: new Date().toISOString(),
  },
  {
    id: 'nasa-pgda-prod-90',
    name: 'A New View of the Lunar South Pole from LOLA (Product 90)',
    organization: 'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    url: 'https://pgda.gsfc.nasa.gov/products/90',
    version: 'Barker et al. (2023)',
    retrieval_date: '2023-11-15',
    processing_method: 'Slope derived from elevation gradients; multi-baseline RMS roughness from elevation residuals',
    description: 'Multi-scale slope (100 m baseline) and multi-baseline roughness (50 m, 200 m, 1000 m).',
    created_at: new Date().toISOString(),
  },
  {
    id: 'nasa-pgda-prod-69',
    name: 'Illumination Conditions of the Lunar Polar Regions (Product 69)',
    organization: 'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    url: 'https://pgda.gsfc.nasa.gov/products/69',
    version: 'Mazarico et al. (2011)',
    retrieval_date: '2023-11-15',
    processing_method: 'Hourly ray-tracing simulations over 18.6-year lunar precession cycle at 2 m mast elevation',
    description: 'Average cumulative solar illumination, permanent shadow masks (PSRs), and direct line-of-sight Earth visibility.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lro-lend',
    name: 'Lunar Exploration Neutron Detector (LEND)',
    organization: 'NASA / IKI / LRO Science Team',
    url: 'https://pds-geosciences.wustl.edu/missions/lro/lend.htm',
    version: 'Sanin et al. (2017)',
    retrieval_date: '2023-11-15',
    processing_method: 'Neutron flux suppression mapping indicating hydrogen-equivalent enrichment',
    description: 'Orbiter epithermal neutron measurements serving as primary indicator for buried volatiles.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lro-diviner',
    name: 'Diviner Lunar Radiometer Experiment Polar Temperature Atlas',
    organization: 'NASA / UCLA / LRO Science Team',
    url: 'https://diviner.ucla.edu/',
    version: 'Paige et al. (2010)',
    retrieval_date: '2023-11-15',
    processing_method: 'Infrared radiometric thermal emission modeling across diurnal and seasonal extremes',
    description: 'Maximum annual surface temperatures identifying cold traps where volatiles remain stable.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'nasa-artemis-sdt',
    name: 'NASA Artemis III Science Definition Team Report',
    organization: 'NASA Science Mission Directorate (SMD)',
    url: 'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    version: 'NASA SP-20205009602',
    retrieval_date: '2023-11-15',
    processing_method: 'Expert synthesis of planetary science decadal priorities and SPA basin sample return',
    description: 'Framework prioritizing scientific value, crater chronology calibration, and volatile sampling accessibility.',
    created_at: new Date().toISOString(),
  },
]

/**
 * Fetches dataset sources from Supabase with fallback.
 * Checks:
 * 1. Normalized 10-table schema (data_sources + dataset_versions)
 * 2. Legacy schema (sources)
 * 3. Local fallback metadata (FALLBACK_SOURCES)
 */
export async function fetchSources(): Promise<{ sources: SourceRecord[]; source: 'supabase' | 'local' }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { sources: FALLBACK_SOURCES, source: 'local' }
  }

  // 1. Try fetching from 10-table data_sources and dataset_versions
  try {
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('data_sources')
      .select('*')
      .order('id', { ascending: true })

    if (!sourcesError && sourcesData && sourcesData.length > 0) {
      // Query dataset_versions
      let versionsBySource = new Map<string, DatasetVersionRow>()
      try {
        const { data: versionsData } = await supabase
          .from('dataset_versions')
          .select('*')

        if (versionsData && versionsData.length > 0) {
          for (const v of versionsData) {
            versionsBySource.set(v.source_id, v)
          }
        }
      } catch {
        // Continue without versions if table not queried
      }

      const mapped: SourceRecord[] = sourcesData.map((s) => {
        const v = versionsBySource.get(s.id)
        return {
          id: s.id,
          name: s.name,
          organization: s.organization,
          url: s.url,
          version: v?.version_name ?? null,
          retrieval_date: v?.retrieval_date ?? null,
          processing_method: v?.processing_method ?? null,
          description: s.description,
          created_at: s.created_at,
        }
      })

      return { sources: mapped, source: 'supabase' }
    }
  } catch {
    // Proceed to legacy sources check
  }

  // 2. Try fetching from legacy sources table
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .order('id', { ascending: true })

    if (!error && data && data.length > 0) {
      return { sources: data, source: 'supabase' }
    }
  } catch {
    // Fall back to local catalog
  }

  return { sources: FALLBACK_SOURCES, source: 'local' }
}
