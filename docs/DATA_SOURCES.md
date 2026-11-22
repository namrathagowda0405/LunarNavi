# LunarNavi — Authoritative Scientific Data Sources

> **Complete Provenance, Product Identifiers, Processing Workflows, and Archive References for Lunar Planetary Datasets.**

---

## 1. Overview

LunarNavi strictly uses published, peer-reviewed planetary datasets from NASA lunar exploration missions, primarily the **Lunar Reconnaissance Orbiter (LRO)** instruments and the **Planetary Geodynamics Data Archive (PGDA)** hosted at NASA Goddard Space Flight Center (GSFC).

---

## 2. Dataset Catalog

### 2.1. Lunar Orbiter Laser Altimeter (LOLA) Digital Elevation Model
- **Instrument**: Lunar Orbiter Laser Altimeter (LOLA), Lunar Reconnaissance Orbiter (LRO)
- **Host Institution**: NASA Goddard Space Flight Center (GSFC) / Planetary Data System (PDS) Geosciences Node
- **Product ID / Archive**: `LOLA Polar DEM 20m/pixel (LDEM_85S_20M)`
- **Spatial Coverage**: South Pole ($80^\circ\text{S} - 90^\circ\text{S}$), polar stereographic projection
- **Horizontal Resolution**: 20 meters per pixel
- **Vertical Precision**: $\approx 0.1 - 1.0\text{ m}$
- **LunarNavi Usage**: Provides absolute surface elevation and topographic profiles for candidate landing sites.
- **Direct Archive Link**: [NASA PDS LOLA Archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm)

---

### 2.2. LOLA Slope Gradient & RMS Roughness (PGDA Product 90)
- **Instrument**: LOLA Science Team / NASA GSFC
- **Archive**: Planetary Geodynamics Data Archive (PGDA) Product 90
- **Spatial Coverage**: South polar region ($80^\circ\text{S} - 90^\circ\text{S}$)
- **Baseline Resolution**: 50 meters
- **Physical Quantities**:
  - Surface Slope ($\theta$, in degrees): Local tilt gradient across 50-meter baseline.
  - Root-Mean-Square (RMS) Roughness ($\xi$, in meters): Micro-topographic height variance.
- **LunarNavi Usage**: Key landing safety and touchdown feasibility metrics. Sites with $\theta > 15^\circ$ are disqualified by the feasibility hard-gate filter.
- **Direct Archive Link**: [NASA PGDA Product 90](https://pgda.gsfc.nasa.gov/products/90)

---

### 2.3. Polar Illumination & Earth Line-of-Sight Visibility (PGDA Product 69)
- **Citation**: Mazarico, E., et al. (2011), *Illumination conditions of the lunar polar regions using LOLA topography*, Icarus, 211(2), 1066–1081.
- **Host Archive**: NASA PGDA Product 69 (GSFC)
- **Temporal Baseline**: 18.6-year lunar nodal precession cycle (simulated at 2-hour intervals)
- **Physical Quantities**:
  - Cumulative Solar Illumination (%): Percentage of time sun elevation is above local topography.
  - Earth Visibility (%): Direct line-of-sight communication availability to Earth ground stations (Goldstone, Madrid, Canberra).
- **LunarNavi Usage**: Primary benefit criteria for power generation (solar array sizing) and direct-to-Earth (DTE) communication availability.
- **Direct Archive Link**: [NASA PGDA Product 69](https://pgda.gsfc.nasa.gov/products/69)

---

### 2.4. Diviner Lunar Radiometer Experiment (Thermal Cold Traps & PSRs)
- **Instrument**: Diviner Lunar Radiometer Experiment, LRO
- **Host Institution**: NASA / UCLA Diviner Science Team
- **Physical Quantities**:
  - Maximum annual surface temperature ($T_{\max}$ in Kelvin).
  - Minimum surface temperature ($T_{\min}$ in Kelvin).
  - Permanently Shadowed Region (PSR) cold-trap boundaries ($T < 110\text{ K}$ for water-ice stability; $T < 40\text{ K}$ for super-volatiles like $\text{CO}_2, \text{CH}_4$).
- **LunarNavi Usage**: Distance to nearest accessible PSR and volatile preservation assessment.
- **Direct Archive Link**: [UCLA Diviner Science Team](https://diviner.ucla.edu/)

---

### 2.5. Lunar Exploration Neutron Detector (LEND) Epithermal Neutron Flux
- **Instrument**: Lunar Exploration Neutron Detector (LEND), LRO
- **Host Institution**: Space Research Institute (IKI) / NASA PDS Geosciences
- **Physical Quantities**: Epithermal neutron suppression flux (counts per second), acting as a physical proxy for bulk hydrogen enrichment (water equivalent hydrogen, WEH).
- **LunarNavi Usage**: Volatile prospecting score and resource accessibility criteria.
- **Direct Archive Link**: [NASA PDS LEND Archive](https://pds-geosciences.wustl.edu/missions/lro/lend.htm)

---

### 2.6. NASA Artemis III Candidate Landing Regions
- **Source**: NASA Science Mission Directorate & Exploration Systems Development Directorate (2022/2024)
- **Product**: Artemis III Candidate Regions Assessment
- **Spatial Coverage**: 13 candidate regions within $6^\circ$ of the South Pole.
- **LunarNavi Usage**: Baseline candidate landing sites coordinates, regional boundaries, and scientific decadal survey priorities.
- **Direct Archive Link**: [NASA Artemis III Candidate Regions](https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/)

---

## 3. Data Ingestion & Transformation Pipeline

```
Raw NASA PDS / PGDA Grids
       │
       ▼ GDAL & Python Projection Scripts (scripts/validate_scientific_pipeline.py)
South Pole Stereographic Projection (EPSG:3031 equivalent, Lunar Ellipsoid R=1737.4 km)
       │
       ▼ Spatial Querying at Candidate Coordinates
Extracted Physical Site Attributes (Slope, Elevation, Illumination, Coms, Roughness)
       │
       ▼ Validation against Ground Truth Bounds
Normalized Database Seeds (supabase/seed_10_tables.sql) & Local Catalog (CENTRALIZED_CANDIDATE_SITES)
```
