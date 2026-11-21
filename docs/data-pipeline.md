# LunarNavi — NASA Scientific Data Pipeline

## 1. Pipeline Overview

The LunarNavi data pipeline transforms raw, authoritative planetary science data from NASA missions into production-ready web assets, typed multi-criteria datasets, and relational database records.

```
+-----------------------------------------------------------------------------------+
|                        AUTHORITATIVE NASA PDS / PGDA ARCHIVES                     |
|                                                                                   |
|  NASA PGDA Prod 90       NASA PGDA Prod 69       NASA Moon Trek / USGS            |
|  - LOLA South Pole DEM   - Illumination Model    - Orthorectified WAC/NAC Basemap |
|  - 50m Baseline Slope    - Direct Earth Comms    - Diviner PSR Thermal Mask       |
|  - 50m RMS Roughness     - Solar Visibility      - LEND Epithermal Neutron Flux   |
+-------------------------------------+---------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                     DATA INGESTION & PROCESSING PIPELINE                          |
|                     (`scripts/process_lunar_data.py`)                             |
|                                                                                   |
|  1. Coordinate Projection Alignment:                                              |
|     - Mean Earth/Polar Axis (ME) IAU2000 reference sphere (R = 1737.4 km).        |
|     - Polar stereographic projection: center lat -90°, standard parallel -90°.    |
|                                                                                   |
|  2. Topographic Sampling:                                                         |
|     - Bilinear interpolation from 20m/pixel LOLA south pole DEM mosaic.           |
|     - 50m baseline slope extraction with slope angle $\theta = \arctan(|\nabla z|)$ |
|     - RMS planar detrending for 50m surface roughness.                            |
|                                                                                   |
|  3. GeoTIFF / Raw Binary to Web-Optimized Image Pipeline:                         |
|     - Normalization & contrast stretching across [-90° to -80°] polar extent.     |
|     - Export to 8-bit grayscale PNG & WebP rasters with embedded spatial extents. |
+-------------------------------------+---------------------------------------------+
                                      |
                                      +--------------------------+
                                      |                          |
                                      v                          v
+-----------------------------------------------+ +---------------------------------+
|       COMPILED TYPESCRIPT ASSETS              | |       SUPABASE SEED PIPELINE    |
|                                               | |                                 |
|  - `src/data/centralizedSites.ts`             | |  - `supabase/seed.sql`          |
|    (Strictly typed, 16 sites, null safety)    | |    (Normalized relational rows  |
|  - `public/data/terrain/`                     | |     with foreign key integrity) |
|    (High-res elevation & slope web rasters)   | |  - Automated database migration |
+-----------------------------------------------+ +---------------------------------+
```

---

## 2. NASA Source Products & Data Provenance

| Parameter | Instrument / Mission | Source Repository | Product / DOI | Resolution / Baseline |
|---|---|---|---|---|
| **Elevation / Topography** | Lunar Orbiter Laser Altimeter (**LOLA**) | NASA PGDA (GSFC) | Product 90 / `LRO-L-LOLA-4-GDR-V1.0` | 20 m/pixel Polar Stereographic DEM |
| **Surface Slope** | LOLA Science Team | NASA PGDA (GSFC) | Product 90 Slope Map | 50 m baseline bidirectional gradient |
| **Surface Roughness** | LOLA Science Team | NASA PGDA (GSFC) | Product 90 RMS Roughness | 50 m baseline point-to-planar RMS |
| **Solar Illumination** | LOLA & Diviner Teams | NASA PGDA (GSFC) | Product 69 (Mazarico et al. 2011) | 18.6-year solar cycle simulation at 2m |
| **Earth Communication** | LOLA & LRO Trajectory Models | NASA PGDA (GSFC) | Product 69 Earth Line-of-Sight | Topocentric Earth visibility percentage |
| **PSR Boundaries** | Diviner Lunar Radiometer | NASA Planetary Data System | Diviner PSR Thermal Atlas | Annual maximum surface temperature < 110 K |
| **Hydrogen / Volatiles** | Lunar Exploration Neutron Detector (**LEND**) | NASA PDS Geosciences | LEND Epithermal Neutron Flux | Epithermal neutron suppression proxy |
| **Scientific Value** | NASA Artemis III Science Definition Team | NASA Technical Reports | NASA/SP-20205009602 | Geologic diversity & SPA sampling rank |

---

## 3. Coordinate System & Map Projection

All geospatial operations in LunarNavi adhere to IAU lunar cartographic standards:

1. **Reference Frame**: **Mean Earth/Polar Axis (ME)** frame (IAU/IAG working group standards).
2. **Reference Ellipsoid**: Lunar sphere with mean radius $R_M = 1737.400\text{ km}$.
3. **Map Projection**: **South Polar Stereographic**:
   - Center Latitude: $\phi_0 = -90.0^\circ$ (South Pole)
   - Standard Parallel: $\phi_1 = -90.0^\circ$
   - Central Meridian: $\lambda_0 = 0.0^\circ$
   - False Easting / False Northing: $0.0\text{ m}, 0.0\text{ m}$

### Coordinate Transformation Equations

Given a lunar point with latitude $\phi \le -80^\circ$ and East longitude $\lambda$:
$$k = \frac{2}{1 + \sin(-\phi)}$$
$$X = R_M \cdot k \cdot \cos(-\phi) \cdot \sin(\lambda)$$
$$Y = -R_M \cdot k \cdot \cos(-\phi) \cdot \cos(\lambda)$$

In the interactive HTML5 Canvas engine, these $(X, Y)$ stereographic metric coordinates are mapped to pixel coordinates $(p_x, p_y)$ using the viewport transformation:
$$p_x = \text{centerX} + X \cdot \text{scale} + \text{panX}$$
$$p_y = \text{centerY} + Y \cdot \text{scale} + \text{panY}$$

---

## 4. Processing Pipeline (`scripts/process_lunar_data.py`)

The pipeline script handles:

1. **Raster Ingestion**: Reads 16-bit or 32-bit floating-point raw imagery from NASA PGDA archives.
2. **Outlier Filtering & Void Handling**: Replaces nodata flags (`-32768`, `NaN`) with localized bicubic interpolation or explicit `null` disclosures.
3. **Feature Sampling**: For each candidate coordinate $(\phi_i, \lambda_i)$:
   - Computes local pixel index in the polar grid.
   - Extracts elevation, local slope, and surface roughness.
   - Computes geodesic distance to the nearest identified Permanently Shadowed Region (PSR).
4. **Export Targets**:
   - Generates production-ready grayscale and false-color raster tiles saved to `public/data/terrain/`.
   - Generates TypeScript dataset definitions in `src/data/centralizedSites.ts`.
   - Generates SQL seed script in `supabase/seed.sql`.

---

## 5. Scientific Limitations & Data Integrity Disclosures

To preserve strict scientific integrity:
- **No Interpolation Over Missing Volatiles**: Volatile presence scores are derived strictly from published peer-reviewed epithermal neutron suppression and thermal models. Where direct observations do not exist, values are marked with quality `'medium'` or `'low'`, and never fabricated.
- **Micro-Roughness Scale Limits**: The 50m baseline LOLA roughness cannot resolve decimeter-scale boulders. Operators are explicitly alerted in the UI that site certification requires ultra-high-resolution LROC NAC (0.5m/pixel) imaging.
- **Illumination Temporal Variability**: Illumination percentages represent multi-year averages; actual instantaneous illumination varies significantly due to lunar orbital precession and topographical cast shadows.
