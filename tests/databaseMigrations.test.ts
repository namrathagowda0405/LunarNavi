import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Supabase Database Migrations & Seed Verification', () => {
  const migrationsDir = path.join(currentDir, '../supabase/migrations')
  const schemaFile = path.join(migrationsDir, '20261122000000_create_lunarnavi_schema.sql')
  const seedFile = path.join(currentDir, '../supabase/seed.sql')

  it('migration and seed files exist and are populated', () => {
    expect(fs.existsSync(schemaFile)).toBe(true)
    expect(fs.existsSync(seedFile)).toBe(true)

    const schemaContent = fs.readFileSync(schemaFile, 'utf-8')
    const seedContent = fs.readFileSync(seedFile, 'utf-8')

    expect(schemaContent.length).toBeGreaterThan(1000)
    expect(seedContent.length).toBeGreaterThan(5000)
  })

  it('schema creates all 5 tables with strict constraints, indexes, and RLS policies', () => {
    const schema = fs.readFileSync(schemaFile, 'utf-8')

    // 5 normalized tables
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.sources')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.criteria_definitions')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.missions')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.lunar_sites')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.analysis_runs')

    // Foreign Keys
    expect(schema).toContain('REFERENCES public.sources(id)')
    expect(schema).toContain('REFERENCES public.missions(id)')
    expect(schema).toContain('REFERENCES public.lunar_sites(id)')

    // Constraints
    expect(schema).toContain("direction IN ('benefit', 'cost')")
    expect(schema).toContain("mission_type IN ('science', 'resource', 'crewed', 'communication')")
    expect(schema).toContain('latitude >= -90.0 AND latitude <= 90.0')
    expect(schema).toContain("resource_evidence_kind IN ('direct-observation', 'scientific-evidence', 'proxy', 'unknown')")
    expect(schema).toContain("designation IN ('official-artemis-candidate', 'scientific-research-location')")

    // Indexes
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_lunar_sites_region')
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_lunar_sites_lat_lon')
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_lunar_sites_designation')
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_analysis_runs_mission_type')
    expect(schema).toContain('CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at')

    // Row Level Security (RLS)
    expect(schema).toContain('ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY')
    expect(schema).toContain('ALTER TABLE public.criteria_definitions ENABLE ROW LEVEL SECURITY')
    expect(schema).toContain('ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY')
    expect(schema).toContain('ALTER TABLE public.lunar_sites ENABLE ROW LEVEL SECURITY')
    expect(schema).toContain('ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY')

    // Policies
    expect(schema).toContain('CREATE POLICY "Allow public read on sources"')
    expect(schema).toContain('CREATE POLICY "Allow public read on criteria_definitions"')
    expect(schema).toContain('CREATE POLICY "Allow public read on missions"')
    expect(schema).toContain('CREATE POLICY "Allow public read on lunar_sites"')
    expect(schema).toContain('CREATE POLICY "Allow public read on analysis_runs"')
    expect(schema).toContain('CREATE POLICY "Allow anonymous insert on analysis_runs"')
    expect(schema).toContain('CREATE POLICY "Disallow update on analysis_runs"')
    expect(schema).toContain('CREATE POLICY "Disallow delete on analysis_runs"')
  })

  it('seed script contains all 6 sources, criteria definitions, 4 missions, and 16 sites', () => {
    const seed = fs.readFileSync(seedFile, 'utf-8')

    // 6 Authoritative sources
    expect(seed).toContain("'nasa-lola-pds'")
    expect(seed).toContain("'nasa-pgda-prod-90'")
    expect(seed).toContain("'nasa-pgda-prod-69'")
    expect(seed).toContain("'lro-lend'")
    expect(seed).toContain("'lro-diviner'")
    expect(seed).toContain("'nasa-artemis-sdt'")

    // Criteria definitions
    expect(seed).toContain("'slope'")
    expect(seed).toContain("'Surface Slope'")
    expect(seed).toContain("'roughness'")
    expect(seed).toContain("'Surface Roughness'")
    expect(seed).toContain("'illumination'")
    expect(seed).toContain("'Solar Illumination'")
    expect(seed).toContain("'resource'")
    expect(seed).toContain("'Resource Potential'")
    expect(seed).toContain("'communication'")
    expect(seed).toContain("'science'")

    // 4 Mission archetypes
    expect(seed).toContain("'mission-science'")
    expect(seed).toContain("'mission-resource'")
    expect(seed).toContain("'mission-crewed'")
    expect(seed).toContain("'mission-communication'")

    // 16 Candidate Sites
    const siteIds = [
      'artemis-faustini-rim-a',
      'artemis-peak-near-shackleton',
      'artemis-connecting-ridge',
      'artemis-connecting-ridge-ext',
      'artemis-de-gerlache-rim-1',
      'artemis-de-gerlache-rim-2',
      'artemis-de-gerlache-kocher-massif',
      'artemis-haworth',
      'artemis-malapert-massif',
      'artemis-leibnitz-beta-plateau',
      'artemis-nobile-rim-1',
      'artemis-nobile-rim-2',
      'artemis-amundsen-rim',
      'cal-cabeus-lcross',
      'shackleton-rim',
      'amundsen-crater-floor',
    ]

    for (const siteId of siteIds) {
      expect(seed).toContain(`'${siteId}'`)
    }
  })

  it('10-table RLS policy file exists and secures all 10 foundational tables', () => {
    const rlsFile = path.join(currentDir, '../supabase/rls_10_tables.sql')
    expect(fs.existsSync(rlsFile)).toBe(true)

    const rlsContent = fs.readFileSync(rlsFile, 'utf-8')

    const tenTables = [
      'data_sources',
      'dataset_versions',
      'lunar_sites',
      'criteria',
      'site_measurements',
      'mission_profiles',
      'mission_criteria_weights',
      'analysis_runs',
      'analysis_results',
      'simulation_runs',
    ]

    for (const tbl of tenTables) {
      expect(rlsContent).toContain(`ALTER TABLE IF EXISTS public.${tbl} ENABLE ROW LEVEL SECURITY`)
      expect(rlsContent).toContain(`ON public.${tbl}`)
    }

    // Immutable audit logs
    expect(rlsContent).toContain('CREATE POLICY "Disallow update on analysis_runs"')
    expect(rlsContent).toContain('CREATE POLICY "Disallow delete on analysis_runs"')
    expect(rlsContent).toContain('CREATE POLICY "Disallow update on analysis_results"')
    expect(rlsContent).toContain('CREATE POLICY "Disallow delete on analysis_results"')
    expect(rlsContent).toContain('CREATE POLICY "Disallow update on simulation_runs"')
    expect(rlsContent).toContain('CREATE POLICY "Disallow delete on simulation_runs"')
  })

  it('10-table seed file exists, contains ON CONFLICT DO NOTHING, and seeds all 10 tables', () => {
    const seed10File = path.join(currentDir, '../supabase/seed_10_tables.sql')
    expect(fs.existsSync(seed10File)).toBe(true)

    const seedContent = fs.readFileSync(seed10File, 'utf-8')

    expect(seedContent).toContain('INSERT INTO public.data_sources')
    expect(seedContent).toContain('INSERT INTO public.dataset_versions')
    expect(seedContent).toContain('INSERT INTO public.criteria')
    expect(seedContent).toContain('INSERT INTO public.mission_profiles')
    expect(seedContent).toContain('INSERT INTO public.mission_criteria_weights')
    expect(seedContent).toContain('INSERT INTO public.lunar_sites')
    expect(seedContent).toContain('INSERT INTO public.site_measurements')

    // Uses non-destructive ON CONFLICT DO NOTHING
    expect(seedContent).toContain('ON CONFLICT (id) DO NOTHING')

    // Contains all 16 candidate site identifiers
    const siteIds = [
      'artemis-faustini-rim-a',
      'artemis-peak-near-shackleton',
      'artemis-connecting-ridge',
      'artemis-connecting-ridge-ext',
      'artemis-de-gerlache-rim-1',
      'artemis-de-gerlache-rim-2',
      'artemis-de-gerlache-kocher-massif',
      'artemis-haworth',
      'artemis-malapert-massif',
      'artemis-leibnitz-beta-plateau',
      'artemis-nobile-rim-1',
      'artemis-nobile-rim-2',
      'artemis-amundsen-rim',
      'cal-cabeus-lcross',
      'cal-shoemaker-unassessed',
      'cal-slater-radar-shadow',
      'shackleton-rim',
      'amundsen-crater-floor',
    ]

    for (const siteId of siteIds) {
      expect(seedContent).toContain(`'${siteId}'`)
    }
  })
})

