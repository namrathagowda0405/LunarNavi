# LunarNavi Scientific Data Catalog

This catalog documents all authentic lunar datasets acquired, processed, and integrated into LunarNavi from NASA, the Planetary Data System (PDS), the Planetary Geospatial Data Archive (PGDA), and peer-reviewed lunar cartography publications.

---

## Central Dataset Inventory

| Dataset Name | Mission / Instrument | Official Repository & Citation | Downloaded File & Size | Native Resolution & Coverage | Coordinate System | Supported Criterion | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LOLA South Pole DEM** | LRO / LOLA | NASA PDS Node at MIT / GSFC<br>*(Smith et al., 2017)* | `LDEM_80S_80M.JP2`<br>(28.5 MB) + `.LBL` | $80\text{ m/pixel}$<br>($80^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$, Pole at Center | **Topography & Elevation** | **Verified & Operational** |
| **LOLA Surface Slope** | LRO / LOLA | NASA PGDA Product 90<br>*(Barker et al., 2023)* | `LDRM_80S_1000MPP_ADJ_SLP_100M.TIF`<br>(1.46 MB) | $100\text{ m}$ baseline, $1000\text{ m/pix}$<br>($80^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$ | **Criterion 1: Slope** | **Verified & Operational** |
| **LOLA Surface Roughness** | LRO / LOLA | NASA PGDA Product 90<br>*(Barker et al., 2023)* | `LDRM_80S_1000MPP_ADJ_ROUGH_RGB.TIF`<br>(2.20 MB) | $50\text{ m}, 200\text{ m}, 1000\text{ m}$<br>($80^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$ | **Criterion 2: Roughness** | **Verified & Operational** |
| **LOLA Solar Illumination** | LRO / LOLA | NASA PGDA Product 69<br>*(Mazarico et al., 2011)* | `AVGVISIB_65S_240M_201608.JP2`<br>(48.6 MB) + `.LBL` | $240\text{ m/pixel}$<br>($65^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$ | **Criterion 3: Illumination** | **Verified & Operational** |
| **LOLA Permanent Shadow (PSR)** | LRO / LOLA | NASA PGDA Product 69<br>*(Mazarico et al., 2011)* | `LPSR_65S_240M_201608.JP2`<br>(2.63 MB) + `.LBL` | $240\text{ m/pixel}$<br>($65^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$ | **Criterion 4: Resource Proxy** | **Verified & Operational** |
| **LOLA Earth Visibility** | LRO / LOLA | NASA PGDA Product 69<br>*(Mazarico et al., 2011)* | `AVGVISIB_65S_240M_201608_EARTH.JP2`<br>(21.8 MB) + `.LBL` | $240\text{ m/pixel}$<br>($65^\circ\text{S} - 90^\circ\text{S}$) | Polar Stereographic<br>$R = 1737.4\text{ km}$ | **Criterion 5: Communication** | **Verified & Operational** |
| **Artemis III Candidate Regions** | NASA Exploration Systems Development | NASA Official Release & USGS Cartography | `src/data/candidateLocations.ts`<br>(14 verified targets) | Topocentric coordinates<br>($< 6^\circ$ from Pole) | DE421 Mean Earth / Polar Axis (ME) | **Site Evaluation Baseline** | **Verified & Operational** |

---

## Detailed Dataset Specifications

### 1. LOLA South Pole Digital Elevation Model (LDEM_80S_80M)
- **Official Source:** NASA Planetary Data System (PDS) Geosciences / MIT Imbrium Node
- **Direct Download Link:** `http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/JP2/LDEM_80S_80M.JP2`
- **Label File Link:** `http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/JP2/LDEM_80S_80M_JP2.LBL`
- **Instrument / Mission:** Lunar Orbiter Laser Altimeter (LOLA), Lunar Reconnaissance Orbiter (LRO)
- **Native Dimensions:** $7,600 \times 7,600$ pixels ($57,760,000$ altimetry soundings)
- **Resolution:** $80.0\text{ m/pixel}$
- **Coverage:** $80^\circ\text{S}$ to $90^\circ\text{S}$
- **Coordinate Convention:** Polar Stereographic (Spherical), Mean Earth / Polar Axis of DE421, Reference Radius $R = 1,737,400\text{ m}$, East positive.
- **Elevation Formula:** $\text{Elevation (m)} = (\text{Raw DN} - 32768) \times 0.5$
- **Units:** Meters relative to $1737.4\text{ km}$ reference sphere
- **Observed Range:** $-7,288\text{ m}$ (Amundsen floor) to $+7,023\text{ m}$ (Highland massif)
- **Processing:** Downsampled by $4\times$ to $1900 \times 1900$ ($320\text{ m/pixel}$) for web delivery (`elevation_relief.webp` and `hillshade.webp`). Exported $380 \times 380$ telemetry grid (`elevation_grid.json`).
- **Limitations:** Spatial gaps between orbital ground tracks near $80^\circ\text{S}$ interpolated in the PDS product using spherical splines.

---

### 2. LOLA Multi-Scale Surface Slope
- **Official Source:** NASA Planetary Geodynamics Data Archive (PGDA Product 90)
- **Direct Download Link:** `https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDRM_80S_1000MPP_ADJ_SLP_100M.TIF`
- **Citation:** Barker, M. K., et al. (2023), *A New View of the Lunar South Pole from LOLA*, Planet. Sci. J., 4, 183.
- **Instrument / Mission:** LOLA / LRO
- **Native Dimensions:** $608 \times 608$ pixels
- **Baseline:** $100\text{ m}$ baseline slope derived from LOLA DEM
- **Coverage:** $80^\circ\text{S}$ to $90^\circ\text{S}$
- **Units:** Degrees of incline ($0^\circ$ to $35^\circ+$)
- **Format:** GeoTIFF (Cloud-Optimized)
- **Processing:** Converted to color ramp ($0^\circ - 5^\circ$ green, $5^\circ - 15^\circ$ yellow, $15^\circ - 25^\circ$ orange, $> 25^\circ$ red) and exported as `slope_relief.webp`.
- **Criterion Supported:** **Criterion 1: Slope** (flatter terrain preferred for lander stability and rover traverses).

---

### 3. LOLA Multi-Baseline Surface Roughness
- **Official Source:** NASA PGDA Product 90
- **Direct Download Link:** `https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDRM_80S_1000MPP_ADJ_ROUGH_RGB.TIF`
- **Citation:** Barker, M. K., et al. (2023)
- **Instrument / Mission:** LOLA / LRO
- **Native Dimensions:** $608 \times 608 \times 3$ channels (Float32)
- **Baselines:** Red = $50\text{ m}$ baseline RMS roughness, Green = $200\text{ m}$ baseline, Blue = $1,000\text{ m}$ baseline.
- **Coverage:** $80^\circ\text{S}$ to $90^\circ\text{S}$
- **Units:** Dimensionless RMS surface deviation
- **Format:** GeoTIFF
- **Processing:** Normalized to uint8 and exported as WebP composite (`roughness_composite.webp`).
- **Criterion Supported:** **Criterion 2: Roughness** (identifies micro-topographical hazards, boulder fields, and crater ejecta blockiness).

---

### 4. LOLA Solar Illumination (18.6-Year Average Visibility)
- **Official Source:** NASA PGDA Product 69 & MIT LOLA Node
- **Direct Download Link:** `http://imbrium.mit.edu/EXTRAS/ILLUMINATION/JP2/AVGVISIB_65S_240M_201608.JP2`
- **Citation:** Mazarico, E., et al. (2011), *Illumination conditions of the lunar polar regions using LOLA topography*, Icarus, 211, 1066–1081.
- **Instrument / Mission:** LOLA / LRO
- **Native Dimensions:** $6,420 \times 6,420$ pixels
- **Resolution:** $240\text{ m/pixel}$
- **Coverage:** $65^\circ\text{S}$ to $90^\circ\text{S}$
- **Units:** Percentage of time solar disc is visible ($0\%$ to $100\%$)
- **Scaling Formula:** $\text{Visibility (\%)} = (\text{DN} - 32768) \times 0.00004 \times 100$
- **Observed Range:** $0.0\%$ (deep PSRs) to $93.5\%$ (Connecting Ridge peak)
- **Processing:** Cropped to $80^\circ\text{S}-90^\circ\text{S}$ polar radius, rotated $180^\circ$ to match $0^\circ\text{E}$ orientation, color-mapped with solar gold ramp, exported as `illumination_relief.webp`.
- **Criterion Supported:** **Criterion 3: Illumination** (evaluates solar power availability and thermal survivability).

---

### 5. LOLA Permanently Shadowed Regions (PSR)
- **Official Source:** NASA PGDA Product 69
- **Direct Download Link:** `http://imbrium.mit.edu/EXTRAS/ILLUMINATION/JP2/LPSR_65S_240M_201608.JP2`
- **Citation:** Mazarico et al. (2011)
- **Instrument / Mission:** LOLA / LRO
- **Native Dimensions:** $6,420 \times 6,420$ pixels
- **Resolution:** $240\text{ m/pixel}$
- **Units:** Binary mask ($\text{DN} = 52768 \implies \text{True PSR}$, $\text{DN} = 12768 \implies \text{Sunlit}$)
- **Total South Pole PSR Area:** $28,642\text{ km}^2$
- **Processing:** Cropped to $80^\circ\text{S}-90^\circ\text{S}$, rotated $180^\circ$, rendered as a transparent overlay (`psr_overlay.webp`) with glowing cyan/indigo cold traps.
- **Criterion Supported:** **Criterion 4: Resource Potential Proxy** (PSR presence and distance serve as the physical prerequisite for cryogenic volatile preservation).

---

### 6. LOLA Direct-to-Earth Line-of-Sight Visibility
- **Official Source:** NASA PGDA Product 69
- **Direct Download Link:** `http://imbrium.mit.edu/EXTRAS/ILLUMINATION/JP2/AVGVISIB_65S_240M_201608_EARTH.JP2`
- **Citation:** Mazarico et al. (2011)
- **Instrument / Mission:** LOLA / LRO
- **Native Dimensions:** $6,420 \times 6,420$ pixels
- **Resolution:** $240\text{ m/pixel}$
- **Coverage:** $65^\circ\text{S}$ to $90^\circ\text{S}$
- **Units:** Percentage of time Earth's disc is unobscured by topography ($0\%$ to $100\%$)
- **Scaling Formula:** $\text{Visibility (\%)} = (\text{DN} - 32768) \times 0.00004 \times 100$
- **Observed Range:** $0.0\%$ (farside shadow) to $100.0\%$ (Malapert Massif peak)
- **Processing:** Cropped to $80^\circ\text{S}-90^\circ\text{S}$, rotated $180^\circ$, rendered as reachability map (`earth_visibility.webp`).
- **Criterion Supported:** **Criterion 5: Communication Visibility** (direct radio contact with NASA Deep Space Network).

---

### 7. Scientific Value Evaluation Methodology
- **Scientific Foundation:** NASA Artemis Science Definition Team (SDT) Report (NASA SP-20205009602) and Planetary Science Decadal Survey (*Origins, Worlds, and Life 2023–2032*).
- **Evaluation Dimensions:**
  1. **Geological Diversity & South Pole-Aitken (SPA) Basin Sampling (Weight: 35%):** Access to pre-Nectarian impact melt, lower crust, and mantle materials excavated by the ancient SPA impact event.
  2. **Volatile Science & PSR Access (Weight: 30%):** Proximity to cryogenic cold traps ($< 100\text{ K}$) for sampling water ice, hydrogen, carbon monoxide, and methane delivery history.
  3. **Chronology & Crater Age Calibration (Weight: 20%):** Outcrops displaying clear stratigraphic relationships (e.g. Shackleton ejecta over Faustini/Shoemaker).
  4. **Traverse & Sortie Feasibility (Weight: 15%):** Terrain trafficability allowing uncrewed rovers and crewed EVAs to access diverse geological units.
- **Transparency Disclosure:** Scientific value scores are derived from expert synthesis of NASA SDT criteria rather than a single instrument sensor.

---

## Reproducing the Pipeline

To regenerate all web-optimized assets from the raw NASA datasets:
```powershell
python scripts/process_lola_dem.py
```
This script reads the downloaded PDS/PGDA files in `data/raw/` and outputs optimized WebP rasters and telemetry grids to `public/lunar_map/`.
