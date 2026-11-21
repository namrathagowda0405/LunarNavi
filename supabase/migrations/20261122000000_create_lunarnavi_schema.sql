-- ==============================================================================
-- LunarNavi Relational Database Schema Migration
-- Migration: 20261122000000_create_lunarnavi_schema.sql
-- Description: Establishes normalized tables, constraints, indexes, and RLS policies
--              for lunar candidate sites, missions, criteria, sources, and analysis runs.
-- Target DB: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- Enable UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. SOURCES TABLE (Authoritative Data Repositories & Missions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    url TEXT NOT NULL,
    version TEXT,
    retrieval_date DATE DEFAULT CURRENT_DATE,
    processing_method TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.sources IS 'Authoritative datasets, orbiter instruments, and planetary mission documentation.';

-- ------------------------------------------------------------------------------
-- 2. CRITERIA DEFINITIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.criteria_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('benefit', 'cost')),
    unit TEXT NOT NULL,
    default_weight NUMERIC(5, 4) NOT NULL CHECK (default_weight >= 0 AND default_weight <= 1),
    description TEXT NOT NULL,
    rationale TEXT,
    source_id TEXT REFERENCES public.sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.criteria_definitions IS 'Evaluation criteria specifications defining preference direction (benefit vs. cost) and units.';

-- ------------------------------------------------------------------------------
-- 3. MISSIONS TABLE (Operational Profiles & Scientific Presets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.missions (
    id TEXT PRIMARY KEY,
    mission_type TEXT NOT NULL CHECK (mission_type IN ('science', 'resource', 'crewed', 'communication')),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    default_weights JSONB NOT NULL,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_official_preset BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.missions IS 'Sourced mission exploration profiles with priority weights and physical engineering constraint limits.';

-- ------------------------------------------------------------------------------
-- 4. LUNAR SITES TABLE (Centralized Candidate Landing Locations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lunar_sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 360.0),
    elevation_m DOUBLE PRECISION NOT NULL,
    slope_deg DOUBLE PRECISION NOT NULL CHECK (slope_deg >= 0.0 AND slope_deg <= 90.0),
    slope_low DOUBLE PRECISION,
    slope_high DOUBLE PRECISION,
    roughness_m DOUBLE PRECISION NOT NULL CHECK (roughness_m >= 0.0),
    roughness_low DOUBLE PRECISION,
    roughness_high DOUBLE PRECISION,
    illumination_pct DOUBLE PRECISION NOT NULL CHECK (illumination_pct >= 0.0 AND illumination_pct <= 100.0),
    illumination_low DOUBLE PRECISION,
    illumination_high DOUBLE PRECISION,
    resource_score DOUBLE PRECISION NOT NULL CHECK (resource_score >= 0.0 AND resource_score <= 100.0),
    resource_low DOUBLE PRECISION,
    resource_high DOUBLE PRECISION,
    resource_evidence_kind TEXT NOT NULL CHECK (resource_evidence_kind IN ('direct-observation', 'scientific-evidence', 'proxy', 'unknown')),
    communication_pct DOUBLE PRECISION NOT NULL CHECK (communication_pct >= 0.0 AND communication_pct <= 100.0),
    communication_low DOUBLE PRECISION,
    communication_high DOUBLE PRECISION,
    scientific_value DOUBLE PRECISION CHECK (scientific_value IS NULL OR (scientific_value >= 0.0 AND scientific_value <= 100.0)),
    scientific_value_low DOUBLE PRECISION,
    scientific_value_high DOUBLE PRECISION,
    designation TEXT NOT NULL CHECK (designation IN ('official-artemis-candidate', 'scientific-research-location')),
    source_organization TEXT NOT NULL,
    source_url TEXT NOT NULL,
    coordinate_frame TEXT NOT NULL DEFAULT 'DE421',
    coordinate_status TEXT NOT NULL DEFAULT 'verified',
    is_psr BOOLEAN NOT NULL DEFAULT false,
    psr_distance_km DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.lunar_sites IS 'Curated lunar south pole candidate landing sites with authentic NASA/LOLA topography and uncertainty bounds.';

-- Indexes for spatial querying and region filtering
CREATE INDEX IF NOT EXISTS idx_lunar_sites_region ON public.lunar_sites(region);
CREATE INDEX IF NOT EXISTS idx_lunar_sites_lat_lon ON public.lunar_sites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_lunar_sites_designation ON public.lunar_sites(designation);

-- ------------------------------------------------------------------------------
-- 5. ANALYSIS RUNS TABLE (Decision Audit Trail & Monte Carlo Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id TEXT REFERENCES public.missions(id) ON UPDATE CASCADE ON DELETE SET NULL,
    mission_type TEXT NOT NULL,
    weights JSONB NOT NULL,
    constraints JSONB NOT NULL,
    total_sites_evaluated INTEGER NOT NULL,
    feasible_sites_count INTEGER NOT NULL,
    primary_site_id TEXT REFERENCES public.lunar_sites(id) ON UPDATE CASCADE ON DELETE SET NULL,
    primary_score DOUBLE PRECISION,
    backup_site_id TEXT REFERENCES public.lunar_sites(id) ON UPDATE CASCADE ON DELETE SET NULL,
    rankings JSONB NOT NULL,
    simulation_parameters JSONB,
    monte_carlo_summary JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.analysis_runs IS 'Historical ledger of multi-criteria TOPSIS rankings and Monte Carlo sensitivity simulations.';

CREATE INDEX IF NOT EXISTS idx_analysis_runs_mission_type ON public.analysis_runs(mission_type);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON public.analysis_runs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lunar_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

-- Sources: Public Read-Only
CREATE POLICY "Allow public read on sources"
    ON public.sources FOR SELECT
    USING (true);

-- Criteria Definitions: Public Read-Only
CREATE POLICY "Allow public read on criteria_definitions"
    ON public.criteria_definitions FOR SELECT
    USING (true);

-- Missions: Public Read-Only
CREATE POLICY "Allow public read on missions"
    ON public.missions FOR SELECT
    USING (true);

-- Lunar Sites: Public Read-Only
CREATE POLICY "Allow public read on lunar_sites"
    ON public.lunar_sites FOR SELECT
    USING (true);

-- Analysis Runs: Public Read and Anonymous Insert (Permits saving decision sessions without requiring login)
CREATE POLICY "Allow public read on analysis_runs"
    ON public.analysis_runs FOR SELECT
    USING (true);

CREATE POLICY "Allow anonymous insert on analysis_runs"
    ON public.analysis_runs FOR INSERT
    WITH CHECK (true);

-- Restrict Updates and Deletions on Historical Runs
-- (Analysis history is an immutable decision audit log)
CREATE POLICY "Disallow update on analysis_runs"
    ON public.analysis_runs FOR UPDATE
    USING (false);

CREATE POLICY "Disallow delete on analysis_runs"
    ON public.analysis_runs FOR DELETE
    USING (false);
