# LunarNavi — Relational Database Schema Specification

## 1. Overview & Data Architecture

LunarNavi utilizes a normalized **PostgreSQL** schema provisioned through **Supabase**. The database acts as a reliable cloud persistence layer for scientific references, criteria parameters, mission profiles, candidate lunar landing sites, and historical analysis run audit logs.

### Schema Relationships Diagram

```
+------------------------------------+
|              sources               |
|------------------------------------|
| PK  id               TEXT          |
|     name             TEXT          |
|     organization     TEXT          |
|     url              TEXT          |
+-----------------+------------------+
                  | 1
                  |
                  | 0..*
+-----------------v------------------+       +------------------------------------+
|        criteria_definitions        |       |              missions              |
|------------------------------------|       |------------------------------------|
| PK  id               TEXT          |       | PK  id                  TEXT       |
|     name             TEXT          |       |     mission_type        TEXT       |
|     direction        TEXT          |       |     name                TEXT       |
|     default_weight   NUMERIC       |       |     default_weights     JSONB      |
| FK  source_id        TEXT          |       |     constraints         JSONB      |
+------------------------------------+       +-----------------+------------------+
                                                               | 0..1
                                                               |
+------------------------------------+                         | 0..*
|            lunar_sites             |       +-----------------v------------------+
|------------------------------------|       |           analysis_runs            |
| PK  id               TEXT          |       |------------------------------------|
|     name             TEXT          |       | PK  id                  UUID       |
|     latitude         NUMERIC       |       | FK  mission_id          TEXT       |
|     longitude        NUMERIC       |       |     mission_type        TEXT       |
|     elevation_m      NUMERIC       |       |     weights             JSONB      |
|     slope_deg        NUMERIC       |       |     total_sites_eval    INTEGER    |
|     illumination_pct NUMERIC       |       |     feasible_count      INTEGER    |
|     designation      TEXT          |       | FK  primary_site_id     TEXT       |
+-----------------+------------------+       |     primary_score       NUMERIC    |
                  | 0..1                     | FK  backup_site_id      TEXT       |
                  +------------------------->|     rankings            JSONB      |
                                             |     monte_carlo_summary JSONB      |
                                             +------------------------------------+
```

---

## 2. Table Specifications

### 2.1 `sources`
Maintains authoritative planetary science archives, instruments, and institutional origins.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Unique identifier (e.g., `nasa-pgda-90`, `nasa-artemis-iii-sdr`) |
| `name` | `TEXT` | `NOT NULL` | Publication / Dataset title |
| `organization` | `TEXT` | `NOT NULL` | Operating body (e.g., `NASA Goddard Space Flight Center`) |
| `url` | `TEXT` | `NOT NULL` | Authoritative archive or DOI link |
| `version` | `TEXT` | `NULL` | Product release version (e.g., `v1.0`) |
| `retrieval_date` | `DATE` | `NULL` | Data ingestion / verification date |
| `processing_method` | `TEXT` | `NULL` | Derivation method (e.g., `Bilinear interpolation from 20m DEM`) |
| `description` | `TEXT` | `NULL` | Comprehensive product documentation |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 2.2 `criteria_definitions`
Defines the 6 multi-criteria decision variables evaluated in TOPSIS.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Identifier (`slope`, `roughness`, `illumination`, `resource`, `communication`, `science`) |
| `name` | `TEXT` | `NOT NULL` | Display title |
| `direction` | `TEXT` | `CHECK (direction IN ('benefit', 'cost'))` | Benefit (higher is better) or Cost (lower is better) |
| `unit` | `TEXT` | `NOT NULL` | Engineering unit (`°`, `m`, `%`, `index [0-1]`) |
| `default_weight`| `NUMERIC(4,3)` | `NOT NULL, CHECK (0.0 <= w <= 1.0)` | Nominal baseline importance weight |
| `description` | `TEXT` | `NOT NULL` | Scientific explanation |
| `rationale` | `TEXT` | `NULL` | Spacecraft engineering justification |
| `source_id` | `TEXT` | `REFERENCES sources(id)` | Authoritative instrument citation |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |

### 2.3 `missions`
Stores baseline mission profiles and custom user configurations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Unique identifier (e.g. `mission-science`, `mission-resource`) |
| `mission_type` | `TEXT` | `CHECK (mission_type IN ('science', 'resource', 'crewed', 'communication'))` | Mission category |
| `name` | `TEXT` | `NOT NULL` | Profile name |
| `description` | `TEXT` | `NOT NULL` | Operational mission objectives |
| `default_weights`| `JSONB` | `NOT NULL` | Map of criterion weights summing to 1.0 |
| `constraints` | `JSONB` | `NOT NULL` | Array of threshold limit specifications |
| `is_official_preset`| `BOOLEAN` | `DEFAULT true` | True if NASA baseline preset, false if custom |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp |

### 2.4 `lunar_sites`
Curated candidate landing sites with verified lunar south pole coordinates and measurements.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | Site ID (e.g., `artemis-shackleton-connecting-ridge`) |
| `name` | `TEXT` | `NOT NULL` | Formal site name |
| `region` | `TEXT` | `NOT NULL` | Geographic south polar region |
| `latitude` | `NUMERIC(7,4)` | `NOT NULL, CHECK (-90.0 <= lat <= -80.0)` | Lunar latitude (South Pole: -90° to -80°) |
| `longitude`| `NUMERIC(7,4)` | `NOT NULL, CHECK (-180.0 <= lon <= 180.0)` | Lunar East longitude (-180° to +180°) |
| `elevation_m` | `NUMERIC(8,2)` | `NOT NULL` | Elevation relative to 1737.4 km reference sphere |
| `slope_deg` | `NUMERIC(5,2)` | `NOT NULL, CHECK (slope >= 0.0)` | Surface slope at 50m baseline grid |
| `roughness_m`| `NUMERIC(6,3)` | `NOT NULL, CHECK (roughness >= 0.0)` | Point-to-planar RMS surface roughness |
| `illumination_pct`| `NUMERIC(5,2)` | `NOT NULL, CHECK (0.0 <= pct <= 100.0)` | Annual average sunlight visibility % |
| `resource_score`| `NUMERIC(4,3)` | `NOT NULL, CHECK (0.0 <= score <= 1.0)` | Volatiles proxy score (LEND/Diviner) |
| `communication_pct`| `NUMERIC(5,2)` | `NOT NULL, CHECK (0.0 <= pct <= 100.0)` | Direct-to-Earth line-of-sight % |
| `scientific_value`| `NUMERIC(4,3)` | `NOT NULL, CHECK (0.0 <= val <= 1.0)` | Science return potential |
| `designation` | `TEXT` | `CHECK (designation IN ('official-artemis-candidate', 'scientific-research-location'))` | Artemis candidate vs research site |
| `coordinate_frame`| `TEXT` | `DEFAULT 'Mean Earth/Polar Axis (ME)'` | Lunar coordinate reference frame |
| `coordinate_status`| `TEXT` | `DEFAULT 'verified'` | Verification flag against NASA publications |
| `is_psr` | `BOOLEAN` | `DEFAULT false` | Whether location is inside a Permanent Shadow Region |
| `psr_distance_km`| `NUMERIC(6,2)`| `NOT NULL` | Distance to nearest accessible PSR rim in km |
| `source_url` | `TEXT` | `NOT NULL` | Primary literature / NASA data source |

### 2.5 `analysis_runs`
Audit ledger of completed decision evaluations and Monte Carlo runs.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique execution run identifier |
| `mission_id` | `TEXT` | `REFERENCES missions(id) ON DELETE SET NULL` | Linked mission profile if applicable |
| `mission_type` | `TEXT` | `NOT NULL` | Mission category (`science`, `resource`, etc.) |
| `weights` | `JSONB` | `NOT NULL` | Snapshot of criteria weights evaluated |
| `constraints` | `JSONB` | `NOT NULL` | Snapshot of physical constraints applied |
| `total_sites_evaluated`| `INTEGER` | `NOT NULL` | Total candidate sites in database |
| `feasible_sites_count`| `INTEGER` | `NOT NULL` | Sites passing physical feasibility filters |
| `primary_site_id` | `TEXT` | `REFERENCES lunar_sites(id) ON DELETE SET NULL` | Top-ranked TOPSIS landing site |
| `primary_score` | `NUMERIC(6,5)`| `NULL` | TOPSIS relative closeness coefficient ($C_1^*$) |
| `backup_site_id` | `TEXT` | `REFERENCES lunar_sites(id) ON DELETE SET NULL` | Decorrelated runner-up landing site |
| `rankings` | `JSONB` | `NOT NULL` | Complete ranked list with scores & distances |
| `simulation_parameters`| `JSONB` | `NULL` | Monte Carlo iteration count, spread, and seed |
| `monte_carlo_summary`| `JSONB` | `NULL` | Win frequency %, Top-3 %, empirical rankings |
| `notes` | `TEXT` | `NULL` | Operational context / operator notes |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Execution timestamp |

---

## 3. Database Indexes

To guarantee sub-millisecond query performance, the following indexes are applied:

```sql
CREATE INDEX idx_lunar_sites_region ON lunar_sites(region);
CREATE INDEX idx_lunar_sites_designation ON lunar_sites(designation);
CREATE INDEX idx_lunar_sites_slope ON lunar_sites(slope_deg);
CREATE INDEX idx_lunar_sites_illumination ON lunar_sites(illumination_pct);
CREATE INDEX idx_analysis_runs_created_at ON analysis_runs(created_at DESC);
CREATE INDEX idx_analysis_runs_mission_type ON analysis_runs(mission_type);
CREATE INDEX idx_analysis_runs_primary_site ON analysis_runs(primary_site_id);
```

---

## 4. Row Level Security (RLS) Policies

All tables have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).

```sql
-- Public Read Access on Scientific Reference Tables
CREATE POLICY "Public Read Sources" ON sources FOR SELECT USING (true);
CREATE POLICY "Public Read Criteria" ON criteria_definitions FOR SELECT USING (true);
CREATE POLICY "Public Read Missions" ON missions FOR SELECT USING (true);
CREATE POLICY "Public Read Lunar Sites" ON lunar_sites FOR SELECT USING (true);

-- Anonymous Insert & Read on Decision Audit Runs (Write-Once, No Mutation)
CREATE POLICY "Public Read Analysis Runs" ON analysis_runs FOR SELECT USING (true);
CREATE POLICY "Public Insert Analysis Runs" ON analysis_runs FOR INSERT WITH CHECK (true);
```

> [!NOTE]
> Modifying (`UPDATE`) or deleting (`DELETE`) rows in `analysis_runs` is disabled for anonymous clients, preserving immutable operational audit trails.
