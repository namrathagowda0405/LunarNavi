# Lunar Mission Requirements & Site-Selection Priorities

**Status:** Initial research draft  
**Scope:** Lunar South Pole candidate landing-site decision support  
**Purpose:** Establish evidence-backed mission priorities for LunarNavi's four mission profiles while rigorously distinguishing between published NASA scientific and architectural evidence, vehicle-specific engineering requirements, and proposed LunarNavi decision-modeling choices.

---

## 1. Science Mission

**Mission objective:** Identify landing locations that provide operational access to scientifically valuable lunar terrain, geological features and materials for observation, sampling and investigation.

### Relevant mission considerations
- **Scientific value:** Candidate locations should provide access to geological features or environmental conditions relevant to prioritized planetary science questions.
- **Terrain suitability:** Landing areas must satisfy landing gear stability and hazard clearance tolerances for the selected lander architecture.
- **Illumination:** Solar lighting conditions govern solar power availability, surface thermal cycles, optical navigation, and surface operations.
- **Resource and geological context:** Proximity to permanently shadowed regions, ancient highland crust, impact melt sheets, and diverse stratigraphic units supports broader lunar history investigations.
- **Data availability:** Orbital observations (imagery, laser altimetry, spectral reflectance) must be sufficient to characterize surface morphology and assess operational feasibility.

### Published evidence:
- NASA's Artemis Science strategy and science priorities emphasize investigating fundamental lunar processes, planetary evolution, impact history, and understanding the risks and potential resources of the lunar South Pole.
- NASA's lunar site-selection white paper identifies access to geologically diverse terrain types as a primary factor in studying the Moon's geological timeline.

### Sources:
- [NASA: Artemis Science Overview](https://www.nasa.gov/humans-in-space/artemis-science/)
- [NASA: Science Priorities for the First Crewed Artemis Landing](https://www.nasa.gov/news-release/nasa-defines-science-priorities-for-first-crewed-artemis-landing-on-moon/)
- [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf)

### Proposed LunarNavi criteria relevance (Design recommendation, not NASA requirement):
*(Note: NASA publishes overarching science themes and landing-region considerations, but does not assign formal mathematical criteria weights or numerical priority ranks. The following qualitative classifications represent proposed LunarNavi modeling choices for decision support).*
- **Scientific Value:** High *(Proposed primary priority in LunarNavi's multi-criteria scoring)*
- **Slope:** Operational feasibility *(Evaluated as a lander stability constraint; limits depend on landing system design)*
- **Terrain Roughness:** Operational feasibility *(Evaluated as a hazard clearance threshold; scale depends on sensor resolution and landing gear footprint)*
- **Illumination:** Mission-dependent *(Evaluated against specific mission duration, solar array configurations, and thermal requirements)*
- **Resource Potential:** Mission-dependent *(Secondary context unless the science mission explicitly targets volatile geochemical sampling)*
- **Communication Visibility:** Operational feasibility *(Evaluated as a baseline telemetry link and ground communication requirement)*

---

## 2. Resource Exploration Mission

**Mission objective:** Identify locations that offer scientifically supported opportunities to investigate lunar resources, particularly volatile compounds and water ice associated with permanently shadowed regions (PSRs).

### Relevant mission considerations
- **Resource potential indicators:** Prioritize locations exhibiting indirect evidence of hydrogen enrichment, volatile deposits, or stable thermal cold traps.
- **Access to permanently shadowed regions:** PSRs provide cryogenic conditions that can support the long-term preservation of water ice (Paige et al., 2010).
- **Landing feasibility:** The landing location must satisfy the operational and stability constraints of the delivery vehicle.
- **Illumination architecture:** Surface illumination must be analyzed relative to the landing site, power system, and surface transit. Elevated, well-illuminated plateaus or ridges adjacent to shadowed depressions may enable solar-powered operations with short-range access to cold traps.
- **Scientific confidence and data pedigree:** Resource indicators must be distinguished by observation technique, spatial resolution, sensing depth, and measurement uncertainty.

### Published evidence:
- NASA planetary data and scientific literature describe permanently shadowed regions as environments where volatile compounds, including water ice, may be preserved. NASA's lunar site-selection material identifies access to lunar volatiles as a location-specific exploration objective.

### Sources:
- [NASA: LRO Mission and Instrument Overview](https://science.nasa.gov/wp-content/uploads/2024/01/lro-space-science-paper.pdf)
- [NASA PDS: LRO LOLA Active Surface Reflectance (RADR)](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=LRO-L-LOLA-3-RADR-V1.0)
- [Paige et al. (2010): Diviner lunar radiometer observations of cold traps in the Moon's south polar region](https://doi.org/10.1126/science.1187726)
- [Byron et al. (2020): Far-UV Observations of Lunar Rayed Craters with LRO-LAMP](https://doi.org/10.1029/2019JE006269)
- [Clark et al. (2024): The Global Distribution of Water and Hydroxyl on the Moon as Seen by the Moon Mineralogy Mapper (M³)](https://doi.org/10.3847/PSJ/ad5837)
- [Li & Milliken (2017): Water on the surface of the Moon as seen by the Moon Mineralogy Mapper: Distribution, abundance, and origins](https://doi.org/10.1126/sciadv.1701471)
- [Mitrofanov et al. (2012): Testing polar spots of water-rich permafrost on the Moon: LEND observations onboard LRO](https://doi.org/10.1029/2011JE003956)
- [Spudis et al. (2013): Evidence for water ice on the Moon: Results for anomalous polar craters from the LRO Mini-RF imaging radar](https://doi.org/10.1002/jgre.20156)
- [NASA: Ice on the Moon](https://nssdc.gsfc.nasa.gov/planetary/ice/ice_moon.html)
- [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf)
- [NASA: Artemis III Landing Region Update](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/)

### Proposed LunarNavi criteria relevance (Design recommendation, not NASA requirement):
*(Note: NASA identifies volatile investigation as an exploration objective, but does not prescribe universal numerical criteria weights. The following classifications are proposed LunarNavi decision-modeling assignments).*
- **Resource Potential:** High *(Proposed primary priority for volatile prospecting missions)*
- **Slope:** Operational feasibility *(Evaluated for lander touchdown stability and surface mobility into or near depressions)*
- **Terrain Roughness:** Operational feasibility *(Evaluated to minimize hazard risk during landing and surface traverses)*
- **Illumination:** Architectural trade-off *(Evaluated to ensure power and thermal survival while accessing nearby shadow targets)*
- **Scientific Value:** Supporting priority *(Provides geological and stratigraphic context for volatile accumulation mechanisms)*
- **Communication Visibility:** Operational feasibility *(Supports mission telemetry, real-time command, and scientific data downlink)*

**Important distinction:** A permanently shadowed region constitutes a cryogenic thermal and physical environment where volatiles may potentially be preserved, not interchangeable proof or confirmed presence of water ice. Orbital detection techniques are indirect proxies that probe different physical regimes and depths:
- *Neutron spectrometry:* Orbital neutron spectrometers (e.g., Lunar Prospector LPNS, LRO LEND) sense bulk hydrogen abundance through epithermal and fast neutron suppression in the shallow subsurface. Notably, LRO LEND observations revealed that localized neutron-suppression regions occur in both sunlit and permanently shadowed terrain and are not simply coincident with permanently shadowed craters [Mitrofanov et al., 2012]. Crucially, orbital neutron measurements sense elemental hydrogen rather than molecular water; neutron suppression does not uniquely identify water ice, cannot distinguish molecular H₂O from hydroxyl, trapped solar-wind protons, or hydrated minerals, and regional spatial footprint averaging limits lateral resolution.
- *Optical, UV, and IR measurements:* Interrogate only exposed surface materials or optical skin depths using distinct observation techniques:
  - *Far-ultraviolet observations (e.g., LRO LAMP):* Measure nightside and shadowed surface albedo illuminated by interplanetary Lyman-alpha emissions and UV starlight. LAMP observations are sensitive to the uppermost surface and outermost regolith grains [Byron et al., 2020].
  - *Laser altimetry active reflectance (e.g., LRO LOLA):* Measures 1064 nm normal surface reflectance of outgoing laser pulses within localized altimeter footprints, independent of solar illumination.
  - *Imaging spectroscopy (e.g., Moon Mineralogy Mapper, M³):* Identifies surface-exposed OH- and H₂O-bearing materials through near-infrared absorption features. Li & Milliken (2017) demonstrate that M³ maps the optical surface (characterized as approximately the upper millimetre in Milliken's comments in Brown University's 2017 release). M³ does not image PSRs by direct sunlight. Spectral analyses focus on the broad ~2.6–3 µm absorption region containing overlapping water and hydroxyl features, as well as a weaker feature near 1.9 µm attributed to water [Clark et al., 2024]. While optical observations can reveal surficial hydration and water-bearing materials exposed at the surface (including indigenous or impact-excavated materials), they do not directly map or confirm subsurface volatile ice deposits within permanently shadowed cold traps, nor do they determine subsurface extent or extractable reserves.
  These optical techniques primarily characterize exposed materials within the optical surface layer and do not directly map subsurface volatiles buried beneath an overlying dry regolith mantle (though impact cratering events can excavate subsurface material and expose it at the surface). Each technique is also subject to viewing geometry, illumination phase angle, and space-weathering variations.
- *Radar observations & Circular Polarization Ratio (CPR):* Subsurface radar penetration is governed by carrier wavelength, dielectric properties, regolith bulk density, loss tangent, and incidence geometry. CPR (e.g., Mini-RF, Earth-based radar) is a polarimetric scattering metric—the ratio of same-sense to opposite-sense circular backscatter—not a direct measurement of subsurface penetration depth or ice abundance. While elevated CPR in cold traps can indicate coherent backscatter from volumetric ice, high CPR equally arises from surface roughness, blocky fresh crater ejecta, and multiple-scattering rock/boulder populations without water ice.
- *Thermal and illumination models:* (e.g., derived from Diviner infrared radiometry and topographic horizon modeling; Paige et al., 2010) estimate surface and subsurface equilibrium temperatures and volatile-retention lifetimes against sublimation. They evaluate whether thermodynamic conditions permit volatile stability over geological timescales, but do not directly detect the physical presence, concentration, or mass of water ice.

These proxy datasets are not interchangeable; they evaluate distinct physical properties and require careful contextual interpretation and corroboration across independent observations. Furthermore, LunarNavi distinguishes between:
1. *Indirect orbital proxy indicators* (unconfirmed volatile signatures requiring corroboration).
2. *Direct in situ ground-truth measurements* (e.g., surface drill sampling, pyrolysis, mass spectrometry).
3. *Physical accessibility* (regolith overburden thickness, geotechnical matrix, stratigraphic depth distribution).
4. *Operational and economic recoverability* (concentration, energy extraction expenditure, logistical feasibility).  
Indirect orbital signatures must never be characterized as verified resource reserves without direct in situ corroboration and explicit uncertainty disclosure.

---

## 3. Crewed Base Mission

**Mission objective:** Identify locations that offer favorable environmental and topographic characteristics to support sustained human surface presence and evolving lunar surface infrastructure.

### Relevant mission considerations
- **Topographic and terrain suitability:** Landing zones, infrastructure sites, and surface operational corridors require compatible slope and roughness profiles. Quantitative limits are governed by specific lander mass, leg span, touchdown dynamics, and surface civil engineering concepts.
- **Illumination continuity:** Extended sunlight access reduces dependency on supplemental energy storage, provides consistent solar power generation, and directly influences surface temperatures—reducing duration in deep cryogenic shadows and easing surface system thermal-management requirements.
- **Proximity to resource targets:** Strategic proximity to potential volatile deposits or diverse regolith can support long-term in situ resource utilization (ISRU) feasibility testing.
- **Communication accessibility:** Reliable communication connectivity is required for surface crew operations, telemetry, and coordination with Earth ground stations or lunar orbital relays. Architecture trades dictate whether direct line-of-sight or orbital relays are leveraged.
- **Zonal and operational layout:** Siting must account for the spatial relationship and trafficability between designated landing zones, lander rocket plume-affected zones (surface blast ejecta, gas impingement, and debris stand-off distances), habitable volumes, surface power generation assets, and exploration targets.

### Published evidence:
- NASA discusses sunlight access, water ice proximity, and topographic elevation as prominent considerations for the Artemis Base Camp concept.
- NASA's lunar site-selection documentation highlights the operational utility of sustained solar illumination for power generation, thermal moderation, and prolonged surface missions.

### Sources:
- [NASA: Artemis Base Camp Will Need Light, Water and Elevation](https://www.nasa.gov/humans-in-space/nasas-artemis-base-camp-on-the-moon-will-need-light-water-elevation/)
- [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf)
- [NASA: The Lunar South Pole Region](https://www.nasa.gov/reference/moonbase-environment/)

### Proposed LunarNavi criteria relevance (Design recommendation, not NASA requirement):
*(Note: NASA has outlined architectural goals for Artemis Base Camp, but has not published formal numerical site-selection weights. The following assignments represent proposed LunarNavi decision recommendations).*
- **Illumination:** High *(Proposed critical priority for continuous solar power availability and thermal moderation)*
- **Slope:** High operational relevance *(Proposed screening factor for lander touchdown, surface mobility, and modular layout; precise slope tolerance is vehicle- and habitat-specific)*
- **Terrain Roughness:** High operational relevance *(Proposed factor for surface trafficability and crew EVA traversal safety)*
- **Resource Potential:** High *(Proposed long-term strategic factor for future ISRU consumables and propellant production)*
- **Communication Visibility:** High *(Proposed operational priority; continuous Earth direct-to-Earth contact is advantageous, though mission architectures may utilize orbital relay links)*
- **Scientific Value:** Supporting priority *(Enables ongoing scientific exploration during extended crew stay intervals)*

**Scope limitation:** This profile evaluates environmental, topographic, and surface operational suitability at the site level. Detailed crew physiological life-support requirements, radiation shielding design, structural foundation engineering, and spacesuit dust mitigation are outside the current decision-support scope.

---

## 4. Communication Mission

**Mission objective:** Identify lunar surface locations suitable for deploying or accessing communication infrastructure—encompassing direct-to-Earth (DTE) links, orbital relay connectivity (such as LunaNet), and surface-to-surface line-of-sight networks to support rovers, distributed instruments, crew assets, and base habitats.

### Relevant mission considerations
- **Direct-to-Earth (DTE) geometric visibility:** Candidate sites should be evaluated for the duration and continuity of direct line-of-sight to Earth, accounting for very low Earth elevation angles along the polar horizon and cyclic lunar libration.
- **Surface-to-surface link geometry:** Communication suitability is not determined by topographic elevation alone; sites must be evaluated for clear line-of-sight, minimal horizon masking, and connectivity to operational surface assets situated in adjacent basins, crater floors, or traverse routes.
- **Topographic obstruction and propagation effects:** High-relief crater rims, massifs, and local boulders can obstruct line-of-sight propagation paths, create radio-frequency shadowing, and cause multipath scattering or diffraction losses.
- **Orbital relay architecture integration:** Where direct-to-Earth line-of-sight is intermittent or permanently obstructed, compatibility with lunar relay satellite constellations (orbital coverage windows, tracking elevation masks) is an essential architectural factor.
- **Temporal availability analysis:** Communication availability must be modeled across the full mission timeline rather than static single-epoch snapshots, integrating libration motions and orbital relay trajectories.
- **Deployment terrain suitability:** Surface communication terminals, high-gain antenna masts, or relay nodes require physically stable, low-hazard placement terrain.

### Published evidence:
- NASA's Lunar Surface Propagation project analyzes radio-frequency propagation at the lunar South Pole, noting that Earth appears very low along the polar horizon, resulting in acute susceptibility to terrain shadowing, multipath scattering from regolith, and signal disruption.
- NASA's lunar landing-site selection documentation lists communication availability with Earth as a significant factor in regional evaluation.

### Sources:
- [NASA: Lunar Surface Propagation](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/)
- [NASA: Artemis III Landing Region Update](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/)
- [NASA: HLS Sustaining Phase RF Communications Concept of Operations](https://ntrs.nasa.gov/api/citations/20250003508/downloads/HLS-CONOP-008_Sustained_Phase_HLS_RF_ConOps_Rev_A.pdf)

### Proposed LunarNavi criteria relevance (Design recommendation, not NASA requirement):
*(Note: Communication engineering involves detailed link-budget analyses and network topologies. The following assignments reflect proposed LunarNavi site-scoring choices).*
- **Communication Visibility:** High *(Proposed primary priority assessing line-of-sight availability to Earth, orbital relays, and surface operational assets)*
- **Slope:** Deployment feasibility *(Evaluated to ensure terminal deployment stability and structural anchoring)*
- **Terrain Roughness:** Deployment feasibility *(Evaluated to minimize local horizon clutter and signal obstruction)*
- **Illumination:** Mission-dependent *(Evaluated to ensure local solar power generation for standalone surface transceivers)*
- **Resource Potential:** Generally secondary *(Non-critical factor for communications infrastructure siting)*
- **Scientific Value:** Generally secondary *(Non-critical factor for primary communications infrastructure siting)*

**Scope limitation:** Geometric line-of-sight visibility is a necessary proxy but does not equate to full communication system performance. Antenna aperture gain, transmitter power, receiver noise temperature, modulation coding, atmospheric loss, and orbital relay schedules must be evaluated in detailed link-budget analyses.

---

## 5. Design Assumptions

The following statements describe proposed design choices and target implementation requirements for LunarNavi. They represent planned architectural specifications for comparative decision support, rather than features already fully deployed in the current prototype or mandated by published NASA engineering standards:
- **Proposed Prioritization Mechanism:** Mission-specific weighting is an intended target implementation requirement designed to adjust relative criterion weights according to operational objectives, rather than serving merely as descriptive labels.
- **Proposed Two-Stage Feasibility Architecture:** Siting evaluation is designed as a two-stage process where hard operational feasibility constraints (e.g. vehicle-specific slope limits) filter non-viable candidate sites before multi-criteria ranking (TOPSIS) is executed.
- **Scale-Neutral Decoupled Terrain Metrics:** Slope and terrain roughness remain independent criteria. Regional slope characterizes broad topographic inclination, whereas roughness captures spatial height variance and obstacle dispersion. Roughness is scale-dependent and defined by the measurement baseline and sensor resolution (e.g., LOLA along-track point spacing or optical DEM grid resolution) rather than an arbitrary single length scale.
- **Configurable Multi-Criteria Weighting:** All criterion weights are proposed as user-adjustable and transparently reported; LunarNavi does not impose fixed, non-modifiable numerical weights as universal truths.
- **Graduated Volatile Evidence Framework:** Resource evaluations distinguish between indirect orbital proxies (e.g., neutron moderation, spectral albedo, thermal equilibrium), direct in situ detection, physical accessibility (depth within regolith), and operational extractability.
- **Scientific Value Engine Contract:** A numerical Scientific Value may be included only when generated using a documented, defensible scoring rubric. Any such rubric-derived value must be explicitly labelled as `Estimated`, never `Measured`. Where no defensible rubric or adequate observational evidence exists, the value must remain missing rather than being populated with arbitrary numbers. LunarNavi strictly prohibits fabricating or implying direct physical measurement of a composite scientific-value score.
- **Geometric Proxy Representation:** Communication Visibility and Illumination serve as spatial and temporal geometric proxies; they do not replace dedicated RF link budgets or dynamic thermal-fluid models.
- **Defined Temporal Windows:** Illumination and Earth line-of-sight metrics must be evaluated over explicit time series that reflect seasonal and libration cycles.
- **Scope Demarcation:** Detailed crew physiological limits, space radiation shielding, life-support consumables, and civil engineering foundation specifications are outside LunarNavi's macro-siting scope.
- **Decision Support vs. Certification:** Candidate-site rankings are comparative decision-support analyses; they do not constitute official landing certifications or hazard clearances.

---

## 6. Requirements and Evidence Summary

The table below summarizes the environmental factors and mission considerations evaluated in LunarNavi, classifying each entry by the nature of its supporting evidence:

| Environmental Factor / Mission Consideration | Contextual Mission Profiles | Evidence Classification | Published Reference & Extent of Support |
| :--- | :--- | :--- | :--- |
| **Geological diversity & ancient terrain access** | Science | Published Scientific Literature | [NASA: Artemis Science Overview](https://www.nasa.gov/humans-in-space/artemis-science/); [NASA: Science Priorities for Artemis Landing](https://www.nasa.gov/news-release/nasa-defines-science-priorities-for-first-crewed-artemis-landing-on-moon/); [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf) *(Identifies varied stratigraphic units and crater formations as primary targets for planetary evolution science)* |
| **Proximity to cold traps & volatile indicators** | Resource Exploration, Science, Crewed Base | Published Scientific Literature | [NASA: Ice on the Moon (NSSDC)](https://nssdc.gsfc.nasa.gov/planetary/ice/ice_moon.html); [Paige et al. (2010)](https://doi.org/10.1126/science.1187726); [NASA: Artemis III Landing Region Update](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/); [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf); [Mitrofanov et al. (2012)](https://doi.org/10.1029/2011JE003956); [Spudis et al. (2013)](https://doi.org/10.1002/jgre.20156); [Clark et al. (2024)](https://doi.org/10.3847/PSJ/ad5837); [Li & Milliken (2017)](https://doi.org/10.1126/sciadv.1701471); [Byron et al. (2020)](https://doi.org/10.1029/2019JE006269) *(Documents cryogenic PSR thermal conditions supporting volatile retention; characterizes orbital neutron suppression across both illuminated and shadowed terrain, optical surface hydration versus buried ice, and radar scattering constraints)* |
| **Topographic slope & surface stability** | All four | Published Architecture Considerations | [NASA: Lunar Site Selection White Paper](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf) *(Considers regional slope for lander stability and rover mobility; specific quantitative thresholds are vehicle-specific)* |
| **Illumination availability for surface operations** | Science, Resource Exploration, Crewed Base | Published Architecture Considerations | [NASA: Artemis Base Camp Will Need Light, Water and Elevation](https://www.nasa.gov/humans-in-space/nasas-artemis-base-camp-on-the-moon-will-need-light-water-elevation/); [NASA: Lunar Site Selection](https://www.nasa.gov/wp-content/uploads/2024/02/15-2024-architecture-workshop-white-paper-lunar-site-selection.pdf) *(Considers sunlight availability for solar power generation and thermal moderation during surface stays)* |
| **Elevated topography for prolonged sunlight** | Crewed Base | Published Architecture Considerations | [NASA: Artemis Base Camp](https://www.nasa.gov/humans-in-space/nasas-artemis-base-camp-on-the-moon-will-need-light-water-elevation/); [NASA: The Lunar South Pole Region](https://www.nasa.gov/reference/moonbase-environment/) *(Identifies high-elevation topographical ridges and rims as offering extended illumination periods for sustained infrastructure)* |
| **Direct-to-Earth (DTE) visibility, orbital relay access & surface link geometry** | Communication, Crewed Base | Published Engineering & Architecture Reports | [NASA: Lunar Surface Propagation](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/); [NASA: HLS Sustaining Phase RF ConOps](https://ntrs.nasa.gov/api/citations/20250003508/downloads/HLS-CONOP-008_Sustained_Phase_HLS_RF_ConOps_Rev_A.pdf); [NASA: Artemis III Landing Region Update](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/) *(Analyzes low-elevation line-of-sight visibility, surface propagation constraints, and orbital relay interfaces)* |
| **Topographic blockage and RF multipath interference** | Communication | Published Engineering Research | [NASA: Lunar Surface Propagation](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/scan/lunar-surface-propagation/) *(Documents radio-frequency signal shadowing and scattering caused by prominent terrain relief)* |
| **Mission-specific criterion weighting** | All four | Proposed Target Implementation Requirement | *Proposed LunarNavi modeling choice (NASA literature describes trade-offs and priorities qualitatively without prescribing numerical multi-criteria weights)* |
| **Scientific Value scoring engine contract** | Science | Proposed Target Implementation Requirement | *Governed by engine contract: numerical scores are permitted only when derived from a documented, defensible scoring rubric and must be labelled `Estimated` (never `Measured`); if unvalidated, values remain missing* |
| **Graduated resource confidence classification** | Resource Exploration | Proposed Target Implementation Requirement | *Proposed LunarNavi modeling choice (systematic distinction between indirect orbital indicators, in situ ground truth, and accessibility)* |
| **Six-criteria TOPSIS evaluation framework** | All four | Proposed Target Implementation Requirement | *Proposed LunarNavi decision engine architecture (Technique for Order of Preference by Similarity to Ideal Solution)* |

---

## 7. Important Interpretation Notes

- **Environmental Evidence vs. Prescriptive Requirements:** A published environmental factor (such as measured peak illumination or low-elevation Earth visibility) represents an operational condition to be analyzed, not a universal requirement that applies identically to every mission architecture.
- **Vehicle-Dependent Engineering Constraints:** Quantitative thresholds (such as maximum permissible slope, obstacle clearance heights, or landing area diameters) cannot be generalized universally; they are strictly determined by specific lander mass properties, landing gear footprint, dynamic landing tolerances, and mission payloads.
- **Scientific Merit vs. Landing Safety:** A location possessing exceptional scientific or volatile interest (such as a deep crater floor) may be hazardous or inaccessible for direct landing. Siting decisions must evaluate traverse accessibility between benign landing terrain and scientific targets.
- **Decoupled Landing and Exploration Coordinates:** Landing sites and science/resource interest targets need not be co-located; surface mobility assets (rovers, extravehicular traverses) frequently bridge landing plateaus and adjacent shadowed features.
- **Spatial Separation from Plume Hazards:** Designated landing zones and lander rocket plume-affected areas require distinct boundary definitions to protect downstream habitat structures, optical sensors, and scientific experiments from high-velocity regolith ejecta.
- **Multi-Proxy Corroboration:** Indirect orbital indicators (neutron, reflectance, radar, thermal) probe different depths and surface characteristics. No single proxy constitutes interchangeable proof of water ice; robust evaluation requires cross-dataset corroboration.
- **Transparency in Data Limitations:** Where orbital datasets are of low resolution, characterized by high measurement uncertainty, or absent, LunarNavi must explicitly surface the data gap rather than substituting fabricated values or unwarranted numerical precision.

---

**Document status:** Initial research draft for team review. Mission-specific weights, quantitative thresholds and implementation mappings require further validation before being used as application defaults.
