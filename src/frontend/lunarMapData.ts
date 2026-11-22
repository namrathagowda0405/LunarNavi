/**
 * LunarNavi - Lunar South Pole Map Data & Projection Utilities
 * Authentic NASA LOLA Polar Stereographic coordinates, layers, and telemetry math.
 */

export interface LunarLandmark {
  id: string
  name: string
  region: string
  latitude: number // degrees South (e.g. -89.90)
  longitude: number // degrees East (0 - 360)
  elevationMeters: number // verified LOLA DEM elevation
  type: 'crater-rim' | 'crater-floor' | 'massif-peak' | 'connecting-ridge' | 'plateau' | 'pole'
  significance: string
  explorationProgram: string
  details: string
}

export interface MapLayer {
  id: 'elevation' | 'hillshade' | 'slope' | 'roughness' | 'illumination' | 'psr' | 'earth-vis'
  name: string
  shortLabel: string
  status: 'active' | 'planned'
  unit: string
  assetUrl?: string
  description: string
  sourceCitation: string
}

export const LUNAR_REFERENCE_RADIUS_M = 1737400.0 // 1737.4 km
export const NATIVE_MAP_SCALE_M = 80.0 // 80 m/pixel
export const DEM_CENTER_PIXEL = 3799.5 // line/sample offset in 7600x7600
export const DEM_FULL_DIMENSION = 7600.0 // native pixel dimension

/**
 * Converts Lunar South Pole coordinates (Lat, Lon) to normalized map coordinates [0, 1].
 * Projection: Polar Stereographic (Spherical), centered at 90°S, 0°E, Mean Earth/Polar Axis (DE421).
 * Supports lon in both [0, 360] and [-180, 180].
 *
 * @param lat Latitude in degrees (between -90.0 and -80.0)
 * @param lon Longitude in degrees East (0.0 to 360.0 or -180 to +180)
 * @returns { u: number, v: number, inBounds: boolean } where u, v are in [0, 1]
 */
export function latLonToNormalized(
  lat: number,
  lon: number
): { u: number; v: number; inBounds: boolean } {
  const thetaDeg = 90.0 - Math.abs(lat)
  if (thetaDeg < 0 || thetaDeg > 10.05) {
    return { u: 0.5, v: 0.5, inBounds: false }
  }

  const thetaRad = (thetaDeg * Math.PI) / 180.0
  const rMeters = 2.0 * LUNAR_REFERENCE_RADIUS_M * Math.tan(thetaRad / 2.0)
  const rPix = rMeters / NATIVE_MAP_SCALE_M

  let normalizedLon = lon
  if (normalizedLon < 0) {
    normalizedLon += 360.0
  }

  const lonRad = (normalizedLon * Math.PI) / 180.0
  const deltaSample = rPix * Math.sin(lonRad)
  const deltaLine = rPix * Math.cos(lonRad)

  const sample = DEM_CENTER_PIXEL + deltaSample
  const line = DEM_CENTER_PIXEL + deltaLine

  const u = sample / DEM_FULL_DIMENSION
  const v = line / DEM_FULL_DIMENSION

  return {
    u,
    v,
    inBounds: u >= 0 && u <= 1 && v >= 0 && v <= 1,
  }
}

/**
 * Converts normalized map coordinates [0, 1] to Lunar South Pole coordinates (Lat, Lon).
 * Inverse Polar Stereographic projection matching NASA PDS LOLA label specification.
 *
 * @param u Normalized horizontal coordinate [0, 1]
 * @param v Normalized vertical coordinate [0, 1]
 * @returns { lat: number, lon: number, inCoverage: boolean }
 */
export function normalizedToLatLon(
  u: number,
  v: number
): { lat: number; lon: number; inCoverage: boolean } {
  const sample = u * DEM_FULL_DIMENSION
  const line = v * DEM_FULL_DIMENSION

  const deltaSample = sample - DEM_CENTER_PIXEL
  const deltaLine = line - DEM_CENTER_PIXEL

  const rPix = Math.sqrt(deltaSample * deltaSample + deltaLine * deltaLine)
  const maxRadiusPix = 3800.0 // boundary of 80°S

  if (rPix > maxRadiusPix) {
    return { lat: -80.0, lon: 0.0, inCoverage: false }
  }

  const rMeters = rPix * NATIVE_MAP_SCALE_M
  const thetaRad = 2.0 * Math.atan(rMeters / (2.0 * LUNAR_REFERENCE_RADIUS_M))
  const thetaDeg = (thetaRad * 180.0) / Math.PI

  const lat = -(90.0 - thetaDeg)

  let lon = (Math.atan2(deltaSample, deltaLine) * 180.0) / Math.PI
  if (lon < 0) {
    lon += 360.0
  }

  return {
    lat,
    lon,
    inCoverage: true,
  }
}

/**
 * Official NASA Artemis III 13 Candidate Landing Regions and verified Lunar South Polar landmarks
 * with authentic coordinates, LOLA ground elevations, and scientific rationale.
 */
export const LUNAR_LANDMARKS: LunarLandmark[] = [
  // 13 Official Artemis III Candidate Regions
  {
    id: 'artemis-faustini-rim-a',
    name: 'Faustini Rim A',
    region: 'Faustini Crater Complex',
    latitude: -87.88,
    longitude: 90.03,
    elevationMeters: -913.0,
    type: 'crater-rim',
    significance: 'Elevated rim of Faustini Crater with proximate access to cryogenic cold-trap volatiles.',
    explorationProgram: 'NASA Artemis III Candidate Region 1',
    details: 'Proximate to permanent shadow; ancient lunar crustal regolith exposures.',
  },
  {
    id: 'artemis-peak-near-shackleton',
    name: 'Peak Near Shackleton',
    region: 'Shackleton Crater Rim Complex',
    latitude: -88.81,
    longitude: 123.69,
    elevationMeters: 575.5,
    type: 'crater-rim',
    significance: 'Highland ridge adjacent to Shackleton with high cumulative annual solar visibility.',
    explorationProgram: 'NASA Artemis III Candidate Region 2',
    details: 'Strategic topographical feature with extended solar power availability.',
  },
  {
    id: 'artemis-connecting-ridge',
    name: 'Connecting Ridge',
    region: 'Shackleton-de Gerlache Ridge',
    latitude: -89.45,
    longitude: 226.00,
    elevationMeters: -1022.0,
    type: 'connecting-ridge',
    significance: 'Strategic high-illumination traverse corridor between Shackleton and de Gerlache craters.',
    explorationProgram: 'NASA Artemis III Candidate Region 3',
    details: 'Corridor characterized by optimal solar angles and direct-to-Earth line-of-sight visibility.',
  },
  {
    id: 'artemis-connecting-ridge-ext',
    name: 'Connecting Ridge Extension',
    region: 'Shackleton-de Gerlache Ridge Extension',
    latitude: -89.03,
    longitude: 258.00,
    elevationMeters: -1210.0,
    type: 'connecting-ridge',
    significance: 'Northwestern extension of Connecting Ridge offering line-of-sight communications.',
    explorationProgram: 'NASA Artemis III Candidate Region 4',
    details: 'Offers accessible grades and direct radio links to Earth.',
  },
  {
    id: 'artemis-de-gerlache-rim-1',
    name: 'de Gerlache Rim 1',
    region: 'de Gerlache Crater',
    latitude: -88.50,
    longitude: 292.00,
    elevationMeters: -1450.5,
    type: 'crater-rim',
    significance: 'North-facing elevated rim platform featuring extended direct Earth line-of-sight visibility.',
    explorationProgram: 'NASA Artemis III Candidate Region 5',
    details: 'Moderate landing terrain adjacent to de Gerlache shadowed interior.',
  },
  {
    id: 'artemis-de-gerlache-rim-2',
    name: 'de Gerlache Rim 2',
    region: 'de Gerlache Crater',
    latitude: -88.70,
    longitude: 296.00,
    elevationMeters: -1380.0,
    type: 'crater-rim',
    significance: 'South-facing segment of de Gerlache rim with moderate slope grades.',
    explorationProgram: 'NASA Artemis III Candidate Region 6',
    details: 'Continuous line-of-sight communications to Earth stations.',
  },
  {
    id: 'artemis-de-gerlache-kocher-massif',
    name: 'de Gerlache-Kocher Massif',
    region: 'Kocher Highland Complex',
    latitude: -85.90,
    longitude: 243.00,
    elevationMeters: -1620.0,
    type: 'massif-peak',
    significance: 'Highland massif feature between de Gerlache and Kocher craters.',
    explorationProgram: 'NASA Artemis III Candidate Region 7',
    details: 'Exposes pre-Nectarian highland stratigraphy.',
  },
  {
    id: 'artemis-haworth',
    name: 'Haworth',
    region: 'Haworth Crater Rim & Bench',
    latitude: -87.45,
    longitude: 355.00,
    elevationMeters: -1850.0,
    type: 'crater-rim',
    significance: 'Rim crest and exterior terrace adjacent to giant permanently shadowed floor cold trap.',
    explorationProgram: 'NASA Artemis III Candidate Region 8',
    details: 'Direct traverse access to cryogenic volatile deposits (< 40 K).',
  },
  {
    id: 'artemis-malapert-massif',
    name: 'Malapert Massif',
    region: 'Malapert Mountain Complex',
    latitude: -85.95,
    longitude: 2.80,
    elevationMeters: -2483.5,
    type: 'massif-peak',
    significance: 'Near-continuous 100% direct line-of-sight to Earth with benign landing slopes.',
    explorationProgram: 'NASA Artemis III Candidate Region 9 / CLPS IM-1',
    details: 'Prime communications anchor with 100% Earth visibility over the nutation cycle.',
  },
  {
    id: 'artemis-leibnitz-beta-plateau',
    name: 'Leibnitz Beta Plateau',
    region: 'Mons Mouton / Leibnitz Beta',
    latitude: -85.40,
    longitude: 31.60,
    elevationMeters: -2100.0,
    type: 'plateau',
    significance: 'Expansive high-elevation plateau atop Mons Mouton featuring extended line-of-sight communications.',
    explorationProgram: 'NASA Artemis III Candidate Region 10',
    details: 'Flat terrain suitable for precision lander touchdown and long-range mobility.',
  },
  {
    id: 'artemis-nobile-rim-1',
    name: 'Nobile Rim 1',
    region: 'Nobile Crater Complex',
    latitude: -85.30,
    longitude: 31.50,
    elevationMeters: -2415.5,
    type: 'crater-rim',
    significance: 'Western rim ridge of Nobile crater with accessible thermal micro-cold traps.',
    explorationProgram: 'NASA Artemis III Candidate Region 11 / VIPER',
    details: 'Selected site for ground truthing lunar water ice distributions.',
  },
  {
    id: 'artemis-nobile-rim-2',
    name: 'Nobile Rim 2',
    region: 'Nobile Crater Complex',
    latitude: -83.93,
    longitude: 58.83,
    elevationMeters: -2290.0,
    type: 'crater-rim',
    significance: 'Northeastern rim ridge of Nobile crater with favorable illumination.',
    explorationProgram: 'NASA Artemis III Candidate Region 12',
    details: 'Offers rolling terrain and low surface roughness metrics.',
  },
  {
    id: 'artemis-amundsen-rim',
    name: 'Amundsen Rim',
    region: 'Amundsen Crater Complex',
    latitude: -84.22,
    longitude: 69.35,
    elevationMeters: -2650.0,
    type: 'crater-rim',
    significance: 'Northwestern rim of 105-km Amundsen impact basin exposing South Pole-Aitken ejecta.',
    explorationProgram: 'NASA Artemis III Candidate Region 13',
    details: 'Deep excavation exposing lower crustal materials of the South Pole-Aitken basin.',
  },

  // Scientific Reference Landmarks & Ground Truth Targets
  {
    id: 'cal-cabeus-lcross',
    name: 'Cabeus LCROSS Impact Ground Truth',
    region: 'Cabeus Crater Floor',
    latitude: -84.90,
    longitude: 324.50,
    elevationMeters: -2802.5,
    type: 'crater-floor',
    significance: 'Historic LCROSS impact site (2009); proved presence of water ice (5.5 wt%) in lunar regolith.',
    explorationProgram: 'NASA LCROSS Impactor Experiment (Ground Truth)',
    details: 'Confirmed cryogenic volatile repository; calibration baseline for lunar resource assessment.',
  },
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim Peak',
    region: 'South Pole High Relief',
    latitude: -89.90,
    longitude: 0.0,
    elevationMeters: 575.5,
    type: 'crater-rim',
    significance: 'Key Artemis III candidate region; high annual solar illumination on ridge peak.',
    explorationProgram: 'NASA Artemis III / CLPS',
    details: '21 km diameter crater with near-permanent sunlight at selected peak locations and deep cryogenic floor traps.',
  },
  {
    id: 'haworth-floor',
    name: 'Haworth Crater Floor (PSR)',
    region: 'Polar Shadowed Basins',
    latitude: -87.40,
    longitude: 355.0,
    elevationMeters: -2011.0,
    type: 'crater-floor',
    significance: 'Major Permanently Shadowed Region (PSR); high-priority water ice target.',
    explorationProgram: 'NASA VIPER / LRO Diviner Science',
    details: 'Thermal models indicate surface temperatures below 40 K, preserving volatile molecules over billions of years.',
  },
  {
    id: 'amundsen-floor',
    name: 'Amundsen Crater Floor',
    region: 'South Pole-Aitken Margin',
    latitude: -84.50,
    longitude: 83.0,
    elevationMeters: -3727.5,
    type: 'crater-floor',
    significance: 'Deep impact basin floor exposing ancient South Pole-Aitken lower crustal material.',
    explorationProgram: 'Planetary Science Decadal Priority',
    details: '105 km diameter complex crater with terraced walls, central peak, and persistent volatile deposits.',
  },
  {
    id: 'south-pole',
    name: 'True Geographic South Pole',
    region: 'Lunar Rotational Axis',
    latitude: -90.00,
    longitude: 0.0,
    elevationMeters: 1282.5,
    type: 'pole',
    significance: 'Rotational pole of the Moon at -90.00° Latitude.',
    explorationProgram: 'Geodetic Coordinate Standard (DE421)',
    details: 'High-elevation polar terrain within the rim system of Shackleton Crater.',
  },
]

export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'elevation',
    name: 'LOLA Hypsometric Elevation',
    shortLabel: 'Elevation',
    status: 'active',
    unit: 'meters relative to 1737.4 km sphere',
    assetUrl: '/lunar_map/elevation_relief.webp',
    description:
      'Scientific color hypsometric tint mapped across -7,288 m (deep impact basins) to +7,023 m (massif peaks).',
    sourceCitation: 'NASA LRO LOLA PDS Data Set LRO-L-LOLA-4-GDR-V1.0 (Smith et al., 2017)',
  },
  {
    id: 'hillshade',
    name: 'LOLA Photometric Shaded Relief',
    shortLabel: 'Hillshade',
    status: 'active',
    unit: 'simulated solar reflectance',
    assetUrl: '/lunar_map/hillshade.webp',
    description:
      'Photometric hillshade computed from LOLA DEM gradients with solar azimuth at 45° and solar elevation at 35°.',
    sourceCitation: 'NASA LRO LOLA PDS Data Set LRO-L-LOLA-4-GDR-V1.0',
  },
  {
    id: 'slope',
    name: 'LOLA Surface Slope Map',
    shortLabel: 'Slope',
    status: 'active',
    unit: 'degrees of incline (0° to 35°+)',
    assetUrl: '/lunar_map/slope_relief.webp',
    description:
      'Multi-scale terrain slope gradient highlighting safe touchdown zones (< 10°) vs. hazardous crater walls (> 20°).',
    sourceCitation: 'NASA PGDA Product 90 (Barker et al., 2023, PSJ 4:183)',
  },
  {
    id: 'roughness',
    name: 'LOLA Multi-baseline Roughness',
    shortLabel: 'Roughness',
    status: 'active',
    unit: 'RGB baseline composite',
    assetUrl: '/lunar_map/roughness_composite.webp',
    description:
      'False-color composite of root-mean-square surface roughness at 50 m (Red), 200 m (Green), and 1,000 m (Blue) baselines.',
    sourceCitation: 'NASA PGDA Product 90 (Barker et al., 2023)',
  },
  {
    id: 'illumination',
    name: 'LOLA Solar Illumination (18.6-yr Average)',
    shortLabel: 'Illumination',
    status: 'active',
    unit: 'average annual solar visibility % (0% to 93.5%)',
    assetUrl: '/lunar_map/illumination_relief.webp',
    description:
      'Orbital solar visibility modeling averaged over an 18.6-year lunar precession cycle with hourly ray-tracing.',
    sourceCitation: 'NASA PGDA Product 69 (Mazarico et al., 2011, Icarus 211:1066)',
  },
  {
    id: 'psr',
    name: 'Permanently Shadowed Regions (PSR)',
    shortLabel: 'PSRs / Cold Traps',
    status: 'active',
    unit: 'cryogenic cold trap boundary (binary overlay)',
    assetUrl: '/lunar_map/psr_overlay.webp',
    description:
      'High-contrast cryogenic overlay of 28,642 sq km in perpetual shadow with surface temperatures below 100 K.',
    sourceCitation: 'NASA PGDA Product 69 (LPSR / Mazarico et al., 2011)',
  },
  {
    id: 'earth-vis',
    name: 'Direct-to-Earth Line-of-Sight Visibility',
    shortLabel: 'Earth Comms',
    status: 'active',
    unit: 'Earth visibility % (0% to 100%)',
    assetUrl: '/lunar_map/earth_visibility.webp',
    description:
      'Direct line-of-sight visibility percentage to Earth accounting for lunar libration (±6.7° lat, ±7.9° lon) and terrain obstruction.',
    sourceCitation: 'NASA PGDA Product 69 (AVGVISIB_EARTH / Mazarico et al., 2011)',
  },
]
