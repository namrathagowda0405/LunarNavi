# LunarNavi — Scientific Data Catalog & Provenance Reference

This document provides the authoritative scientific reference, data lineage, and validation ledger for all datasets, orbital measurements, and candidate sites utilized in the **LunarNavi** lunar south pole landing site decision-support system.

---

## 1. Authoritative Lunar Repositories & Raw Products

| Dataset ID | Instrument / Source | Operating Agency | Product Identification | Native Resolution | Coordinate Frame | Primary Scientific Citation |
|---|---|---|---|---|---|---|
| `nasa-lola-pds` | Lunar Orbiter Laser Altimeter (**LOLA**) | NASA / GSFC / MIT | `LRO-L-LOLA-4-GDR-V1.0` (`LDEM_80S_80M.JP2`) | 80 m/pixel | Polar Stereographic, ME DE421 | Smith, D. E., et al. (2017), *Icarus*, 283, 70–91. |
| `nasa-pgda-prod-90-slope` | LOLA 50m/100m Baseline Slope | NASA Planetary Geodynamics Data Archive (PGDA) | PGDA Product 90 (`LDRM_80S_1000MPP_ADJ_SLP_100M.TIF`) | 1000 m/pix display, 50m baseline grid | Polar Stereographic, ME DE421 | Barker, M. K., et al. (2023), *Planetary Science Journal*, 4, 183. |
| `nasa-pgda-prod-90-rough` | LOLA Multi-baseline Surface Roughness | NASA PGDA (GSFC) | PGDA Product 90 (`LDRM_80S_1000MPP_ADJ_ROUGH_RGB.TIF`) | Composite 50m, 200m, 1000m | Polar Stereographic, ME DE421 | Barker, M. K., et al. (2023), *Planetary Science Journal*, 4, 183. |
| `nasa-pgda-prod-69-illum` | Polar Illumination Ray-Tracing Model | NASA PGDA (GSFC) | PGDA Product 69 (`AVGVISIB_65S_240M_201608.JP2`) | 240 m/pixel | Polar Stereographic, ME DE421 | Mazarico, E., et al. (2011), *Icarus*, 211, 1066–1081. |
| `nasa-pgda-prod-69-earth` | Earth Line-of-Sight Visibility Model | NASA PGDA (GSFC) | PGDA Product 69 (`AVGVISIB_65S_240M_201608_EARTH.JP2`) | 240 m/pixel | Polar Stereographic, ME DE421 | Mazarico, E., et al. (2011), *Icarus*, 211, 1066–1081. |
| `nasa-pgda-prod-69-psr` | Permanently Shadowed Regions (PSR) Mask | NASA PGDA (GSFC) | PGDA Product 69 (`LPSR_65S_240M_201608.JP2`) | 240 m/pixel | Polar Stereographic, ME DE421 | Mazarico, E., et al. (2011), *Icarus*, 211, 1066–1081. |
| `lro-lend-neutron` | Lunar Exploration Neutron Detector (**LEND**) | NASA / IKI / LRO Science Team | Collimated Epithermal Neutron Maps (CEN) | ~5 km footprint | Body-Fixed Rotating | Sanin, A. B., et al. (2017), *Icarus*, 283, 20–31. |
| `lro-diviner-thermal` | Diviner Lunar Radiometer Experiment (**DLRE**) | NASA / UCLA / LRO Science Team | Polar Thermal Maximum Temperature Atlas | 250 m/pixel | Body-Fixed Rotating | Paige, D. A., et al. (2010), *Science*, 330, 479–482. |
| `lcross-ground-truth` | Lunar Crater Observation & Sensing Satellite | NASA Ames Research Center | Impact Plume Spectrometric Analysis | Point Ground Truth | In-situ Impact Plume | Colaprete, A., et al. (2010), *Science*, 330, 463–468. |
| `nasa-artemis-sdt` | Artemis III Science Definition Team | NASA Science Mission Directorate | NASA SP-20205009602 | Regional synthesized | Regional Planetary Synthesis | NASA Artemis III Science Definition Report (2020). |

---

## 2. Measurement Provenance & Classification Matrix

Each criterion evaluated within LunarNavi is assigned a strict **Provenance Kind**:
- **Measured**: Directly acquired from physical instrument pulse or sensor reception.
- **Derived**: Numerically generated via validated physical gradients, geometric detrending, or ray-tracing.
- **Estimated**: Synthesized from decadal planetary priorities or geomorphic proxies.
- **Unassessed / Data Gap**: Declared when sensor obstruction, shadow, or missing data prevents measurement. Missing values are stored strictly as `NULL` with quality `'low'`.

| Criterion | Physical Unit | Provenance | Nominal Uncertainty | Physical Meaning & Scientific Role |
|---|---|---|---|---|
| **Elevation** | meters (m) | **Measured** | $\pm 0.5\text{ m}$ vertical | Topographic altitude relative to the $1737.4\text{ km}$ spherical lunar reference datum. |
| **Slope** | degrees (°) | **Derived** | $\pm 1.2^\circ \text{ to } \pm 1.5^\circ$ | Topographical incline across a 50m baseline. Governs lander touchdown tip-over margin. |
| **Roughness** | meters RMS | **Derived** | $\pm 0.04\text{ m RMS}$ | Point-to-planar elevation residuals across a 50m baseline. Indicates boulder hazard frequency. |
| **Solar Illumination** | percent (%) | **Simulated** | $\pm 4.0\%$ annual | Average cumulative solar visibility percentage at 2m mast elevation over 18.6-year nutation cycle. |
| **Resource Potential** | score (0–100) | **Measured / Derived** | $\pm 10 \text{ to } \pm 14\text{ pts}$ | Proximity to cryogenic cold traps ($T < 110\text{ K}$) and epithermal neutron suppression signatures. |
| **Earth Visibility** | percent (%) | **Simulated** | $\pm 6.0\%$ libration | Line-of-sight visibility to Earth disc center accounting for 18.6-year lunar libration. |
| **Scientific Return** | score (0–100) | **Estimated** | $\pm 6 \text{ to } \pm 8\text{ pts}$ | Prioritization index based on exposure of deep South Pole-Aitken (SPA) basin ejecta. |

---

## 3. Candidate Landing Sites & Provenance Audit

All coordinates reside in the Mean Earth/Polar Axis (ME) frame of DE421, with East Longitude positive.

| Site Identifier | Candidate Region Name | Latitude | Longitude | Elevation (m) | Designation | Resource Evidence Kind | Primary Citation |
|---|---|---|---|---|---|---|---|
| `artemis-faustini-rim-a` | Faustini Rim A | -87.88° | 90.03° | -913.0 | Official Artemis III | `scientific-evidence` | NASA SMD Announcement (2022) |
| `artemis-peak-near-shackleton` | Peak Near Shackleton | -88.81° | 123.69° | +575.5 | Official Artemis III | `proxy` | NASA SMD / LROC Team (2022) |
| `artemis-connecting-ridge` | Connecting Ridge | -89.45° | 226.00° (-134°) | -1022.0 | Official Artemis III | `scientific-evidence` | NASA SMD / LROC Team (2022) |
| `artemis-connecting-ridge-ext`| Connecting Ridge Extension | -89.03° | 258.00° (-102°) | -1210.0 | Official Artemis III | `proxy` | NASA SMD / LROC Team (2022) |
| `artemis-de-gerlache-rim-1` | de Gerlache Rim 1 | -88.50° | 292.00° (-68°) | -1530.0 | Official Artemis III | `scientific-evidence` | NASA SMD / LROC Team (2022) |
| `artemis-de-gerlache-rim-2` | de Gerlache Rim 2 | -88.70° | 296.00° (-64°) | -1720.0 | Official Artemis III | `scientific-evidence` | NASA SMD / LROC Team (2022) |
| `artemis-de-gerlache-kocher-massif` | de Gerlache-Kocher Massif | -85.90° | 243.00° (-117°) | +1140.0 | Official Artemis III | `proxy` | NASA SMD / LROC Team (2022) |
| `artemis-haworth` | Haworth Crater Rim | -87.45° | 355.00° (-5°) | -1350.0 | Official Artemis III | `scientific-evidence` | Diviner Team (Paige et al. 2010) |
| `artemis-malapert-massif` | Malapert Massif Peak | -85.95° | 2.80° | +3420.0 | Official Artemis III | `proxy` | NASA PGDA Product 90 (2023) |
| `artemis-leibnitz-beta-plateau` | Leibnitz Beta Plateau | -85.40° | 31.60° | +2810.0 | Official Artemis III | `proxy` | NASA SMD / LROC Team (2022) |
| `artemis-nobile-rim-1` | Nobile Rim 1 (VIPER Target) | -85.30° | 31.50° | -2415.5 | Official Artemis III | `scientific-evidence` | VIPER Site Selection Team (2021) |
| `artemis-nobile-rim-2` | Nobile Rim 2 | -83.93° | 58.83° | -2290.0 | Official Artemis III | `scientific-evidence` | NASA SMD / LROC Team (2022) |
| `artemis-amundsen-rim` | Amundsen Rim | -84.22° | 69.35° | -2650.0 | Official Artemis III | `scientific-evidence` | NASA SMD / LROC Team (2022) |
| `cal-cabeus-lcross` | Cabeus LCROSS Impact Site | -84.90° | 324.50° (-35.5°) | -2802.5 | Research Landmark | `direct-observation` | Colaprete et al. (2010, Science) |
| `cal-shoemaker-unassessed` | Shoemaker Crater Cold Trap | -88.10° | 45.00° | -2150.0 | Research Landmark | `unknown` (NULL resource) | LEND Sensor Shadow Data Gap |
| `cal-slater-radar-shadow` | Slater Crater Unsurveyed Ridge | -86.30° | 348.00° (-12°) | -1950.0 | Research Landmark | `scientific-evidence` (NULL roughness) | Lidar/Radar Shadow Data Gap |

---

## 4. Data Gap Disclosures & Honest Limitations

LunarNavi guarantees scientific integrity by openly disclosing where observational data is missing:

1. **Shoemaker Crater Floor Resource Data Gap**:
   - In Shoemaker Crater, steep crater rim geometry produced an orbital shadow in the collimated LEND epithermal neutron map.
   - Resource potential is explicitly set to `NULL` (quality: `'low'`).
   - The feasibility engine automatically flags this missing value, preventing the system from recommending an uncharacterized cold trap.

2. **Slater Crater Ridge Roughness Inversion Void**:
   - Extreme grazing angles at Slater Crater ridge prevented point-to-planar RMS detrending over a 50m baseline.
   - Roughness is recorded as `NULL` (quality: `'low'`).

3. **Macro-Level Screening vs Terminal Hazard Certification**:
   - The 20m–80m LOLA DEM and 50m slope baselines serve as regional landing zone screening tools.
   - They identify macro-topographic stability, but do not replace meter-scale terminal Hazard Detection and Avoidance (HDA) LIDAR required during final descent.

---

## 5. Automated Pipeline Validation Command

To execute the automated scientific validation script:
```bash
npm run validate:data
```
Or directly via Python:
```bash
python scripts/validate_scientific_pipeline.py
```
Outputs a machine-readable audit ledger to `data/processed/pipeline_validation_report.json`.
