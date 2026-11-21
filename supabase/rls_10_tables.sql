-- ==============================================================================
-- LunarNavi - Non-Destructive Row Level Security (RLS) Configuration
-- File: supabase/rls_10_tables.sql
-- Description: Establishes secure, non-destructive RLS policies for all 10
--              foundational tables in the LunarNavi Supabase project.
--
-- Security Model:
-- 1. Reference Data (Sites, Measurements, Criteria, Sources, Presets):
--    - Public Read (SELECT) enabled for anonymous and authenticated users.
--    - Writes reserved or permitted for custom mission presets.
-- 2. Analysis Runs & Simulation Records (Audit Trail):
--    - Public Read (SELECT) and Anonymous Write (INSERT) permitted so users can
--      save decision sessions without requiring mandatory user registration.
--    - UPDATE and DELETE disallowed to guarantee an immutable decision history.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL 10 TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lunar_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_criteria_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. REFERENCE TABLES: PUBLIC READ-ONLY POLICIES
-- ------------------------------------------------------------------------------

-- data_sources
DROP POLICY IF EXISTS "Allow public read on data_sources" ON public.data_sources;
CREATE POLICY "Allow public read on data_sources"
    ON public.data_sources FOR SELECT
    USING (true);

-- dataset_versions
DROP POLICY IF EXISTS "Allow public read on dataset_versions" ON public.dataset_versions;
CREATE POLICY "Allow public read on dataset_versions"
    ON public.dataset_versions FOR SELECT
    USING (true);

-- lunar_sites
DROP POLICY IF EXISTS "Allow public read on lunar_sites" ON public.lunar_sites;
CREATE POLICY "Allow public read on lunar_sites"
    ON public.lunar_sites FOR SELECT
    USING (true);

-- criteria
DROP POLICY IF EXISTS "Allow public read on criteria" ON public.criteria;
CREATE POLICY "Allow public read on criteria"
    ON public.criteria FOR SELECT
    USING (true);

-- site_measurements
DROP POLICY IF EXISTS "Allow public read on site_measurements" ON public.site_measurements;
CREATE POLICY "Allow public read on site_measurements"
    ON public.site_measurements FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 3. MISSION PROFILES & CRITERIA WEIGHTS POLICIES
-- ------------------------------------------------------------------------------

-- mission_profiles: Public read + Anonymous insert/update for customized profiles
DROP POLICY IF EXISTS "Allow public read on mission_profiles" ON public.mission_profiles;
CREATE POLICY "Allow public read on mission_profiles"
    ON public.mission_profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert on mission_profiles" ON public.mission_profiles;
CREATE POLICY "Allow anonymous insert on mission_profiles"
    ON public.mission_profiles FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update on custom mission_profiles" ON public.mission_profiles;
CREATE POLICY "Allow anonymous update on custom mission_profiles"
    ON public.mission_profiles FOR UPDATE
    USING (is_official_preset = false);

-- mission_criteria_weights: Public read + Anonymous insert
DROP POLICY IF EXISTS "Allow public read on mission_criteria_weights" ON public.mission_criteria_weights;
CREATE POLICY "Allow public read on mission_criteria_weights"
    ON public.mission_criteria_weights FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert on mission_criteria_weights" ON public.mission_criteria_weights;
CREATE POLICY "Allow anonymous insert on mission_criteria_weights"
    ON public.mission_criteria_weights FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. ANALYSIS RUNS, RESULTS & SIMULATION POLICIES (IMMUTABLE AUDIT LOG)
-- ------------------------------------------------------------------------------

-- analysis_runs
DROP POLICY IF EXISTS "Allow public read on analysis_runs" ON public.analysis_runs;
CREATE POLICY "Allow public read on analysis_runs"
    ON public.analysis_runs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert on analysis_runs" ON public.analysis_runs;
CREATE POLICY "Allow anonymous insert on analysis_runs"
    ON public.analysis_runs FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Disallow update on analysis_runs" ON public.analysis_runs;
CREATE POLICY "Disallow update on analysis_runs"
    ON public.analysis_runs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Disallow delete on analysis_runs" ON public.analysis_runs;
CREATE POLICY "Disallow delete on analysis_runs"
    ON public.analysis_runs FOR DELETE
    USING (false);

-- analysis_results
DROP POLICY IF EXISTS "Allow public read on analysis_results" ON public.analysis_results;
CREATE POLICY "Allow public read on analysis_results"
    ON public.analysis_results FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert on analysis_results" ON public.analysis_results;
CREATE POLICY "Allow anonymous insert on analysis_results"
    ON public.analysis_results FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Disallow update on analysis_results" ON public.analysis_results;
CREATE POLICY "Disallow update on analysis_results"
    ON public.analysis_results FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Disallow delete on analysis_results" ON public.analysis_results;
CREATE POLICY "Disallow delete on analysis_results"
    ON public.analysis_results FOR DELETE
    USING (false);

-- simulation_runs
DROP POLICY IF EXISTS "Allow public read on simulation_runs" ON public.simulation_runs;
CREATE POLICY "Allow public read on simulation_runs"
    ON public.simulation_runs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert on simulation_runs" ON public.simulation_runs;
CREATE POLICY "Allow anonymous insert on simulation_runs"
    ON public.simulation_runs FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Disallow update on simulation_runs" ON public.simulation_runs;
CREATE POLICY "Disallow update on simulation_runs"
    ON public.simulation_runs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Disallow delete on simulation_runs" ON public.simulation_runs;
CREATE POLICY "Disallow delete on simulation_runs"
    ON public.simulation_runs FOR DELETE
    USING (false);
