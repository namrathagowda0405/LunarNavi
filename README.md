# LunarNavi 🌔

> **Mission-Aware Lunar South-Pole Landing Site Multi-Criteria Decision Support Platform**

LunarNavi is an advanced decision-support application built for NASA Artemis and lunar exploration missions. It evaluates candidate landing sites across the lunar south pole using authentic NASA planetary datasets, multi-criteria decision analysis (TOPSIS), and stochastic Monte Carlo robustness simulations.

> [!NOTE]
> **Prototype for decision support.** This platform provides analytical decision-support and sensitivity analysis. It is not a flight safety certification tool.

---

## 🚀 Key Features

- **Authentic NASA Lunar Data**: Real LOLA 20m DEM, 50m baseline slope, 50m RMS roughness, 18.6-year illumination simulations, and Diviner PSR thermal models.
- **Interactive Lunar Map**: Hardware-accelerated Canvas 2D raster cartography supporting pan, zoom, coordinate crosshair readouts, and candidate site overlays.
- **Four Mission Profiles**:
  1. *Science Mission*: Prioritizes South Pole-Aitken geologic sampling, rover mobility, and science return.
  2. *Resource Exploration*: Prioritizes volatile presence, PSR access, and illumination.
  3. *Crewed Base*: Prioritizes landing safety (low slope/roughness), high illumination, and Direct-to-Earth communication.
  4. *Communication Mission*: Prioritizes Direct-to-Earth line-of-sight and relay visibility.
- **TOPSIS Ranking Engine**: Vector-normalized multi-criteria decision analysis computing Euclidean distances to ideal ($A^+$) and anti-ideal ($A^-$) solutions.
- **Monte Carlo Robustness Analysis**: Deterministic 500-trial stochastic perturbation (Mulberry32 PRNG seed 42) assessing rank confidence and win rates.
- **Hybrid Cloud / Offline Backend**: **Supabase** (PostgreSQL) integration with Row Level Security (RLS) for cloud persistence, paired with a transparent offline local fallback.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Cartography**: HTML5 Canvas 2D with dynamic false-color shaders (Viridis, Inferno, Coolwarm)
- **Scientific Engine**: Pure TypeScript client-side MCDA engine (zero network latency, air-gap compatible)
- **Backend / Database**: Supabase (PostgreSQL 15), Row Level Security (RLS), `@supabase/supabase-js` v2
- **Testing**: Vitest (17 test suites, 182 unit & end-to-end integration tests)

---

## 📚 Project Documentation

Detailed technical documentation is available in the [`docs/`](file:///docs/) directory:

- [**System Architecture & Design**](file:///docs/architecture.md): Complete system overview, client-side execution rationale, and service boundaries.
- [**Database Schema Specification**](file:///docs/database-schema.md): PostgreSQL relational tables, types, relationships, indexes, and RLS policies.
- [**NASA Scientific Data Pipeline**](file:///docs/data-pipeline.md): Raw NASA PDS/PGDA archives, coordinate projections, and data extraction workflows.
- [**Scientific Validation & Engine Verification**](file:///docs/data-validation.md): Coordinate verification, uncertainty models, TOPSIS, and Monte Carlo mathematics.
- [**Supabase Database Setup Guide**](file:///docs/supabase-setup.md): Step-by-step instructions for provisioning, migrations, and environment configuration.
- [**Mission Requirements**](file:///docs/mission-requirements.md): Engineering thresholds and constraints across all mission categories.

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
git clone https://github.com/your-org/LunarNavi.git
cd LunarNavi
npm install
```

### Local Development Server
```bash
npm run dev
```
The application will open at `http://localhost:5173/`.

### Run Tests
```bash
npm test -- --run
```

### Production Build
```bash
npm run build
```

---

## 🗄️ Supabase Configuration (Optional)

LunarNavi runs **100% out-of-the-box in offline mode** using compiled NASA datasets. To enable cloud persistence:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set your Supabase project credentials in `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Run migrations and seeds found in [`supabase/`](file:///supabase/): [`supabase/seed_10_tables.sql`](file:///supabase/seed_10_tables.sql) and [`supabase/rls_10_tables.sql`](file:///supabase/rls_10_tables.sql).
4. See [`docs/supabase-setup.md`](file:///docs/supabase-setup.md) for full instructions.

---

## 🛰️ Authoritative Scientific Sources

| Instrument / Dataset | Agency / Source | Identifier / Link |
|---|---|---|
| LOLA DEM Mosaic (20m/pix) | NASA Goddard Space Flight Center | [PGDA Product 90](https://pgda.gsfc.nasa.gov/products/90) |
| LOLA Slope & Roughness (50m) | NASA LOLA Science Team | [PGDA Product 90](https://pgda.gsfc.nasa.gov/products/90) |
| Polar Illumination Models | Mazarico et al. (2011) / NASA GSFC | [PGDA Product 69](https://pgda.gsfc.nasa.gov/products/69) |
| Artemis III Candidate Regions | NASA Exploration Systems Directorate | [NASA Artemis III](https://www.nasa.gov/press-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing) |
| Diviner PSR Thermal Atlas | LRO Diviner Science Team | [NASA PDS](https://pds-geosciences.wustl.edu/) |
| LEND Epithermal Neutron Flux | LRO LEND Science Team | [NASA PDS Geosciences](https://pds-geosciences.wustl.edu/) |
