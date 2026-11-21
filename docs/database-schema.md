# LunarNavi — Relational Database Schema Specification (10 Tables)

## 1. Overview & Data Architecture

LunarNavi utilizes a 10-table normalized relational schema provisioned through **PostgreSQL** on **Supabase**. The database acts as a reliable cloud persistence layer for scientific references, criteria parameters, mission profiles, candidate lunar landing sites, individual measurement provenance, decision results, and stochastic Monte Carlo simulation runs.

All 10 tables have **Row Level Security (RLS)** active. Public anonymous users have `SELECT` permissions across all reference and candidate data, and `INSERT` permissions to persist completed `analysis_runs`, `analysis_results`, and `simulation_runs`. Mutations (`UPDATE` / `DELETE`) on run records are restricted to prevent tampering with historical mission audit ledgers.

---

## 2. Relational Schema Entity-Relationship Diagram

```
+------------------------------------+       +------------------------------------+
|            data_sources            |       |              criteria              |
|------------------------------------|       |------------------------------------|
| PK  id               TEXT          |       | PK  id               TEXT          |
|     name             TEXT          |       |     name             TEXT          |
|     organization     TEXT          |       |     direction        TEXT          |
|     url              TEXT          |       |     unit             TEXT          |
|     description      TEXT          |       |     description      TEXT          |
+-----------------+------------------+       +-----------------+------------------+
                  | 1                                          | 1
                  | 0..*                                       | 0..*
+-----------------v------------------+       +-----------------v------------------+
|          dataset_versions          |       |      mission_criteria_weights      |
|------------------------------------|       |------------------------------------|
| PK  id               TEXT          |       | PK  id                  TEXT       |
| FK  data_source_id   TEXT          |       | FK  mission_profile_id  TEXT <-----+
|     version_tag      TEXT          |       | FK  criterion_id        TEXT       |
|     release_date     DATE          |       |     weight              NUMERIC    |
|     resolution_m     NUMERIC       |       +------------------------------------+
+------------------------------------+                                  |
                                                                        |
+------------------------------------+       +--------------------------+---------+
|            lunar_sites             |       |          mission_profiles          |
|------------------------------------|       |------------------------------------|
| PK  id               TEXT          |       | PK  id               TEXT          |
|     name             TEXT          |       |     mission_type     TEXT          |
|     region           TEXT          |       |     name             TEXT          |
|     latitude         NUMERIC       |       |     description      TEXT          |
|     longitude        NUMERIC       |       |     constraints      JSONB         |
|     elevation_m      NUMERIC       |       +-----------------+------------------+
|     designation      TEXT          |                         | 1
+-----------------+------------------+                         | 0..*
                  | 1                                          |
                  | 0..*                                       |
+-----------------v------------------+       +-----------------v------------------+
|         site_measurements          |       |           analysis_runs            |
|------------------------------------|       |------------------------------------|
| PK  id               TEXT          |       | PK  id                  UUID       |
| FK  site_id          TEXT          |       | FK  mission_profile_id  TEXT       |
| FK  criterion_id     TEXT          |       |     mission_type        TEXT       |
|     value            NUMERIC       |       |     weights             JSONB      |
|     uncertainty_low  NUMERIC       |       |     total_sites_eval    INTEGER    |
|     uncertainty_high NUMERIC       |       |     feasible_count      INTEGER    |
|     kind             TEXT          |       | FK  primary_site_id     TEXT       |
|     quality          TEXT          |       |     primary_score       NUMERIC    |
| FK  dataset_ver_id   TEXT          |       | FK  backup_site_id      TEXT       |
+------------------------------------+       +--------+------------------+--------+
                                                      | 1                | 1
                                                      | 0..*             | 0..*
                                     +----------------v---+    +---------v--------+
                                     |  analysis_results  |    | simulation_runs  |
                                     |--------------------|    |------------------|
                                     | PK id         TEXT |    | PK id       UUID |
                                     | FK run_id     UUID |    | FK run_id   UUID |
                                     | FK site_id    TEXT |    |    iterations INT|
                                     |    rank       INT  |    |    seed       INT|
                                     |    closeness  NUM  |    |    spread     NUM|
                                     |    dist_ideal NUM  |    |    win_rate   NUM|
                                     |    dist_anti  NUM  |    |    top3_rate  NUM|
                                     +--------------------+    +------------------+
```

---

## 3. The 10 Foundational Tables

### 3.1 `data_sources`
Catalog of authoritative lunar science archives, missions, and operating agencies (NASA PDS, PGDA, USGS, IKI, UCLA).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Identifier (e.g. `nasa-lola-pds`, `nasa-pgda-prod-90`) |
| `name` | `TEXT` | `NOT NULL` | Publication or instrument title |
| `organization` | `TEXT` | `NOT NULL` | Operating agency (e.g. `NASA / GSFC / MIT`) |
| `url` | `TEXT` | `NOT NULL` | Authoritative archive URL or persistent DOI |
| `description` | `TEXT` | `NULL` | Scientific documentation |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.2 `dataset_versions`
Specific data release versions, pixel resolutions, and coordinate projections.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Version identifier (e.g. `lola-dem-80m-v1`) |
| `data_source_id` | `TEXT` | `REFERENCES data_sources(id)` | Foreign key to parent data source |
| `version_tag` | `TEXT` | `NOT NULL` | Version string (e.g. `GDR-V1.0`, `Prod-90`) |
| `release_date` | `DATE` | `NULL` | Formal scientific release date |
| `resolution_m` | `NUMERIC` | `NULL` | Spatial resolution in meters per pixel |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.3 `lunar_sites`
Curated lunar south pole candidate landing sites ($80^\circ\text{S} - 90^\circ\text{S}$).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Site ID (e.g. `artemis-connecting-ridge`, `artemis-faustini-rim-a`) |
| `name` | `TEXT` | `NOT NULL` | Formal site name |
| `region` | `TEXT` | `NOT NULL` | Geological sector or crater complex |
| `latitude` | `NUMERIC(7,4)` | `NOT NULL, CHECK (-90.0 <= lat <= -80.0)` | IAU ME DE421 latitude |
| `longitude` | `NUMERIC(7,4)` | `NOT NULL, CHECK (-180.0 <= lon <= 180.0)` | IAU ME DE421 East longitude |
| `elevation_m` | `NUMERIC(8,2)` | `NOT NULL` | Elevation relative to 1737.4 km reference sphere |
| `designation` | `TEXT` | `CHECK (designation IN ('official-artemis-candidate', 'scientific-research-location'))` | Candidate category |
| `source_url` | `TEXT` | `NOT NULL` | Reference publication / targeting announcement |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.4 `site_measurements`
Individual criterion measurements for each candidate site, including uncertainty bounds and quality tiers.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Measurement ID (e.g. `msr-connecting-ridge-slope`) |
| `site_id` | `TEXT` | `REFERENCES lunar_sites(id) ON DELETE CASCADE` | Associated candidate site |
| `criterion_id` | `TEXT` | `REFERENCES criteria(id)` | Evaluated criterion (`slope`, `roughness`, etc.) |
| `value` | `NUMERIC` | `NULL` | Nominal value (`NULL` explicitly denotes data gap) |
| `uncertainty_low` | `NUMERIC` | `NULL` | Lower bound of confidence interval |
| `uncertainty_high`| `NUMERIC` | `NULL` | Upper bound of confidence interval |
| `kind` | `TEXT` | `CHECK (kind IN ('measured', 'derived', 'estimated', 'simulated'))` | Provenance classification |
| `quality` | `TEXT` | `CHECK (quality IN ('high', 'medium', 'low'))` | Confidence level |
| `dataset_version_id`| `TEXT` | `REFERENCES dataset_versions(id) NULL` | Linked dataset version |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.5 `mission_profiles`
Operational mission profiles specifying high-level objectives and physical constraints.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Profile ID (`mission-science`, `mission-resource`, etc.) |
| `mission_type` | `TEXT` | `CHECK (mission_type IN ('science', 'resource', 'crewed', 'communication'))` | Mission type |
| `name` | `TEXT` | `NOT NULL` | Profile title |
| `description` | `TEXT` | `NOT NULL` | Operational description and rationale |
| `constraints` | `JSONB` | `NOT NULL` | Threshold limits (passLimit, marginalLimit, essential) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.6 `criteria`
Master definition of decision variables evaluated in TOPSIS.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Criterion ID (`slope`, `roughness`, `illumination`, `resource`, `communication`, `science`) |
| `name` | `TEXT` | `NOT NULL` | Criterion display label |
| `direction` | `TEXT` | `CHECK (direction IN ('benefit', 'cost'))` | `benefit` (higher is better) or `cost` (lower is better) |
| `unit` | `TEXT` | `NOT NULL` | Physical unit (`°`, `m RMS`, `%`, `score`) |
| `description` | `TEXT` | `NOT NULL` | Scientific explanation |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.7 `mission_criteria_weights`
Defensible weight allocations mapping criteria importance to mission profiles ($\sum \text{weight} = 1.0$).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Assignment ID (e.g. `mcw-science-science`) |
| `mission_profile_id`| `TEXT` | `REFERENCES mission_profiles(id) ON DELETE CASCADE` | Target mission profile |
| `criterion_id` | `TEXT` | `REFERENCES criteria(id)` | Target criterion |
| `weight` | `NUMERIC(5,4)` | `NOT NULL, CHECK (weight >= 0.0 AND weight <= 1.0)` | Normalized weight share |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.8 `analysis_runs`
Audit ledger of completed multi-criteria decision runs and recommendations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Execution run identifier |
| `mission_profile_id`| `TEXT` | `REFERENCES mission_profiles(id) NULL` | Evaluated mission profile |
| `mission_type` | `TEXT` | `NOT NULL` | Evaluated mission type |
| `weights` | `JSONB` | `NOT NULL` | Snapshot of normalized criteria weights |
| `total_sites_evaluated`| `INTEGER` | `NOT NULL` | Total sites in dataset |
| `feasible_sites_count`| `INTEGER` | `NOT NULL` | Sites admitted through feasibility gate |
| `primary_site_id` | `TEXT` | `REFERENCES lunar_sites(id) NULL` | #1 TOPSIS winner |
| `primary_score` | `NUMERIC(6,5)` | `NULL` | Relative closeness $C_1^*$ |
| `backup_site_id` | `TEXT` | `REFERENCES lunar_sites(id) NULL` | Decorrelated runner-up site |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Execution timestamp |

### 3.9 `analysis_results`
Individual candidate site scores, ranks, and Euclidean distances per analysis run.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Result ID (`{run_id}_{site_id}`) |
| `analysis_run_id` | `UUID` | `REFERENCES analysis_runs(id) ON DELETE CASCADE` | Linked analysis run |
| `site_id` | `TEXT` | `REFERENCES lunar_sites(id)` | Candidate landing site |
| `rank` | `INTEGER` | `NOT NULL, CHECK (rank >= 1)` | Assigned ordinal rank (no ties) |
| `closeness` | `NUMERIC(7,6)` | `NOT NULL, CHECK (closeness >= 0.0 AND closeness <= 1.0)` | TOPSIS score $C_i^*$ |
| `distance_to_ideal` | `NUMERIC` | `NOT NULL` | Euclidean separation $S_i^+$ |
| `distance_to_anti_ideal`| `NUMERIC` | `NOT NULL` | Euclidean separation $S_i^-$ |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 3.10 `simulation_runs`
Stochastic Monte Carlo robustness trial summaries (Mulberry32 PRNG seed 42).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Simulation record ID |
| `analysis_run_id` | `UUID` | `REFERENCES analysis_runs(id) ON DELETE CASCADE` | Linked analysis run |
| `iterations` | `INTEGER` | `NOT NULL, CHECK (iterations > 0)` | Total iterations (e.g. 500 or 1,000) |
| `seed` | `INTEGER` | `NOT NULL` | PRNG seed for audit reproducibility |
| `weight_spread` | `NUMERIC` | `NOT NULL` | Relative weight perturbation ($\pm 15\%$) |
| `top_site_id` | `TEXT` | `REFERENCES lunar_sites(id) NULL` | Nominal top site |
| `top_site_win_rate` | `NUMERIC(5,4)` | `NULL` | Win frequency percentage ($0.0 \dots 1.0$) |
| `top_site_top3_rate` | `NUMERIC(5,4)` | `NULL` | Top-3 occurrence frequency |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

---

## 4. Row Level Security (RLS) Policies

All 10 tables have Row Level Security enabled. Policies are defined in [`supabase/rls_10_tables.sql`](file:///supabase/rls_10_tables.sql):

```sql
-- Public Read Access on Reference Tables
CREATE POLICY "Public Read Data Sources" ON data_sources FOR SELECT USING (true);
CREATE POLICY "Public Read Dataset Versions" ON dataset_versions FOR SELECT USING (true);
CREATE POLICY "Public Read Lunar Sites" ON lunar_sites FOR SELECT USING (true);
CREATE POLICY "Public Read Site Measurements" ON site_measurements FOR SELECT USING (true);
CREATE POLICY "Public Read Mission Profiles" ON mission_profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Criteria" ON criteria FOR SELECT USING (true);
CREATE POLICY "Public Read Mission Criteria Weights" ON mission_criteria_weights FOR SELECT USING (true);

-- Anonymous Insert & Read on Decision Audit Runs (Write-Once Audit Trails)
CREATE POLICY "Public Read Analysis Runs" ON analysis_runs FOR SELECT USING (true);
CREATE POLICY "Public Insert Analysis Runs" ON analysis_runs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Analysis Results" ON analysis_results FOR SELECT USING (true);
CREATE POLICY "Public Insert Analysis Results" ON analysis_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Simulation Runs" ON simulation_runs FOR SELECT USING (true);
CREATE POLICY "Public Insert Simulation Runs" ON simulation_runs FOR INSERT WITH CHECK (true);
```

---

## 5. Offline Fallback & Client Integration

If Supabase credentials are missing or network connectivity is unavailable:
1. `src/services/siteService.ts` transparently falls back to `CENTRALIZED_CANDIDATE_SITES`.
2. `src/services/missionService.ts` falls back to `DEFAULT_MISSION_PROFILES`.
3. `src/services/analysisService.ts` saves completed runs to in-memory/session storage.
4. The application continues running without UI disruption or runtime crashes.
