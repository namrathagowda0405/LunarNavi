# LunarNavi — System Architecture & Design Specification

## 1. System Overview

**LunarNavi** is an advanced, mission-aware decision-support platform designed for lunar south pole landing site evaluation. Built to support NASA Artemis and commercial lunar exploration missions, LunarNavi evaluates candidate landing locations against multiple physical, scientific, and operational criteria using authentic NASA planetary geospatial data.

The system combines:
1. **Interactive Cartographic Visualization**: Canvas 2D raster rendering of authentic NASA LOLA elevation, slope, and surface roughness models.
2. **Multi-Criteria Decision Analysis (MCDA)**: Mathematical vector-space evaluation utilizing the Technique for Order of Preference by Similarity to Ideal Solution (**TOPSIS**).
3. **Stochastic Uncertainty Quantification**: Deterministic **Monte Carlo simulation** across hundreds of perturbed criteria states to assess site ranking robustness.
4. **Cloud Persistence & Historical Audit Layer**: **Supabase** (PostgreSQL) backend providing relational storage for candidate sites, mission profiles, and decision run audit logs, paired with an instant zero-latency local fallback mechanism.

```
+-----------------------------------------------------------------------------------+
|                                 LUNARNAVI CLIENT                                  |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |     Mission UI     |   |   Canvas 2D Map       |   | Candidate Explorer     |  |
|  | (Profiles/Weights) |   | (LOLA DEM/Slope/PDS)  |   | (16 Authentic Sites)   |  |
|  +---------+----------+   +-----------+-----------+   +-----------+------------+  |
|            |                          |                           |               |
|            +--------------------------+---------------------------+               |
|                                       |                                           |
|                     +-----------------v-----------------+                         |
|                     |    Scientific Decision Engine     |                         |
|                     |  - Feasibility Filter (Hard Gate) |                         |
|                     |  - TOPSIS Vector Closeness        |                         |
|                     |  - Monte Carlo (Mulberry32 PRNG)  |                         |
|                     +-----------------+-----------------+                         |
|                                       |                                           |
|                     +-----------------v-----------------+                         |
|                     |    Unified Service Layer (API)    |                         |
|                     |   (Supabase / Local Data Hybrid)  |                         |
|                     +--------+------------------+-------+                         |
+------------------------------|------------------|---------------------------------+
                               | (Online)         | (Offline / Unconfigured)
                               v                  v
                 +-----------------------+  +-------------------------------+
                 |  Supabase Cloud (PG)  |  | In-Memory & Local TS Datasets |
                 |  - RLS Policies       |  | - CENTRALIZED_CANDIDATE_SITES |
                 |  - Relational Schema  |  | - DEFAULT_MISSION_PROFILES    |
                 |  - analysis_runs log  |  | - Local Session History       |
                 +-----------------------+  +-------------------------------+
```

---

## 2. Frontend Architecture

The frontend is implemented in **React 19** with **TypeScript** and bundled via **Vite**.

### Core Frontend Subsystems

1. **Mission Setup View (`MissionSetup.tsx`)**:
   - Normalized mission-control interface focused on 3 required inputs: Mission Purpose (`science`, `resource`, `crewed`, `communication`), Planned Lunar Arrival Date, and Surface Stay Duration.
   - Predefined criteria weights, thresholds, and operational rationales are mapped internally.
   - Displays a transparent, read-only engineering standard summary for the active purpose.
   - Transparently discloses ephemeris and 18.6-year precession-averaged dataset boundaries.

2. **Cartographic Lunar Map (`LunarMap.tsx`)**:
   - HTML5 Canvas 2D hardware-accelerated rendering engine.
   - Dual-layer geospatial rendering:
     - High-resolution NASA LOLA Digital Elevation Model (DEM) and slope rasters.
     - Dynamic color palettes (Viridis, Inferno, Coolwarm, Monochromatic Grayscale) computed client-side.
     - Interactive viewport controls: smooth pan, multi-level zoom, and coordinate crosshair inspection.
   - Overlay layer displaying all 16 candidate landing sites with status indicators (feasible vs marginal vs failed).

3. **Candidate Sites Explorer (`CandidateSites.tsx`)**:
   - Comprehensive tabular and card inspection of all 16 curated lunar sites.
   - Detailed scientific provenance for every metric: dataset ID, resolution, instrument, and NASA source URL.
   - Deep inspection modal detailing volatile proxies, PSR proximity, and Direct-to-Earth communication availability.

4. **Results & Sensitivity Dashboard (`Results.tsx`)**:
   - Primary landing site recommendation with closeness coefficient ($C_i^*$).
   - Decorrelated backup site recommendation maximizing geographical and topographical risk diversity.
   - Complete ranked leaderboard with distance-to-ideal ($S_i^+$) and distance-to-anti-ideal ($S_i^-$).
   - Monte Carlo stability metrics: win frequency %, Top-3 placement %, and empirical rank distribution.

---

## 3. Scientific Computation Engine (Client-Side Rationale)

A fundamental architectural decision of LunarNavi is executing **100% of mathematical evaluations client-side** in TypeScript.

### Rationale for Client-Side Computation

1. **Zero Network Latency**: User interactions with weight sliders or mission presets re-rank candidate sites and execute 500 Monte Carlo iterations in under 150 milliseconds.
2. **Deterministic Reproducibility**: Uses a seeded pseudo-random number generator (**Mulberry32**, seed 42) ensuring identical, reproducible results across any browser or environment without network variance.
3. **Air-Gap & Offline Capability**: Mission operations environments frequently operate in air-gapped networks or disconnected remote terminals; client-side execution ensures uninterrupted functionality without cloud dependencies.
4. **Computational Efficiency**: Evaluates $N=16$ candidate sites across 6 criteria through 500 stochastic trials using vectorized arithmetic in $\approx 130$ ms, well below standard 60 fps rendering thresholds.

### Algorithmic Pipeline

1. **Hard Feasibility Gate**:
   Evaluates each candidate site against profile constraints:
   $$\text{Site Status} = \begin{cases} 
   \text{Pass} & \text{if all criteria satisfy pass thresholds} \\
   \text{Marginal} & \text{if within engineering tolerance margin} \\
   \text{Fail} & \text{if any essential criterion breaches safety threshold}
   \end{cases}$$

2. **Vector Normalization & TOPSIS**:
   - Normalizes decision matrix: $r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}$
   - Weights normalized matrix: $v_{ij} = w_j \cdot r_{ij}$
   - Computes Euclidean distance to ideal ($A^+$) and anti-ideal ($A^-$):
     $$S_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^+)^2}, \quad S_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^-)^2}$$
   - Calculates relative closeness: $C_i^* = \frac{S_i^-}{S_i^+ + S_i^-} \in [0, 1]$

3. **Monte Carlo Robustness Simulation**:
   - Evaluates sensitivity by adding Gaussian noise $\mathcal{N}(0, \sigma^2)$ to criteria weights across 500 iterations.
   - Quantifies empirical win rate $P(\text{Rank} = 1)$ and confidence interval of top recommendations.

---

## 4. Backend & Supabase Service Layer

The application incorporates a decoupled **Supabase** backend layer designed around resilient service contracts.

### Service Boundaries

| Service File | Purpose | Supabase Table | Local Fallback Source |
|---|---|---|---|
| `supabaseClient.ts` | Client initialization & credential validation | N/A | Safe null client |
| `siteService.ts` | Candidate site retrieval & row mapping | `lunar_sites` | `CENTRALIZED_CANDIDATE_SITES` |
| `missionService.ts` | Preset & custom mission profile storage | `missions` | `DEFAULT_MISSION_PROFILES` |
| `analysisService.ts` | Decision session logging & audit trail | `analysis_runs` | `localSessionHistory` |
| `sourceService.ts` | Scientific instrument & source metadata | `sources` | `LOCAL_SOURCES` |

### Hybrid Online/Offline Architecture

When environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided:
- The app syncs candidate site updates and custom mission configurations from Supabase.
- Completed multi-criteria analysis runs and Monte Carlo results are persisted to `analysis_runs` for historical audits.

When credentials are omitted (e.g. initial setup, offline testing, CI/CD):
- `isSupabaseConfigured()` returns `false`.
- All service methods transparently fall back to bundled, verified datasets.
- Zero crashes, zero network error popups, and 100% feature availability.

---

## 5. Security & Access Control Model

1. **Row Level Security (RLS)**:
   - Enabled on all tables (`sources`, `criteria_definitions`, `missions`, `lunar_sites`, `analysis_runs`).
   - Reference data (`sources`, `criteria_definitions`, `lunar_sites`, `missions`) is strictly **read-only** for anonymous users.
   - The `analysis_runs` table permits **anonymous insert** and **read of historical sessions**, but strictly forbids modifications or deletions.
2. **Zero Secret Leakage**:
   - The Supabase Service Role Key is never bundled, exported, or accepted into the client bundle.
   - Only the public `anon` key is configured via `.env.local`.
   - All environment files containing secrets are git-ignored.
