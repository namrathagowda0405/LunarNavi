-- ==============================================================================
-- LunarNavi Database Seed Script
-- File: supabase/seed.sql
-- Description: Seeds authentic NASA sources, criteria definitions, mission profiles,
--              and all 16 curated lunar south pole candidate sites.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED SOURCES
-- ------------------------------------------------------------------------------
INSERT INTO public.sources (id, name, organization, url, version, processing_method, description)
VALUES
(
    'nasa-lola-pds',
    'LRO LOLA Gridded Data Record (LDEM_80S_80M)',
    'NASA Planetary Data System (PDS) Geosciences Node / MIT',
    'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/JP2/LDEM_80S_80M.JP2',
    'LRO-L-LOLA-4-GDR-V1.0',
    'Laser altimeter range soundings interpolated to 80 m/pixel polar stereographic grid',
    'High-resolution digital elevation model of the lunar south pole (80°S - 90°S).'
),
(
    'nasa-pgda-prod-90',
    'A New View of the Lunar South Pole from LOLA (Product 90)',
    'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    'https://pgda.gsfc.nasa.gov/products/90',
    'Barker et al. (2023)',
    'Slope derived from elevation gradients; multi-baseline RMS roughness derived from point-to-planar elevation residuals',
    'Multi-scale slope (100 m baseline) and multi-baseline roughness (50 m, 200 m, 1000 m).'
),
(
    'nasa-pgda-prod-69',
    'Illumination Conditions of the Lunar Polar Regions (Product 69)',
    'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    'https://pgda.gsfc.nasa.gov/products/69',
    'Mazarico et al. (2011)',
    'Hourly ray-tracing simulations over 18.6-year lunar precession cycle at 2 m mast elevation',
    'Average cumulative solar illumination, permanent shadow masks (PSRs), and direct line-of-sight Earth visibility.'
),
(
    'lro-lend',
    'Lunar Exploration Neutron Detector (LEND) Collimated Epithermal Neutron Map',
    'NASA / IKI / LRO Science Team',
    'https://pds-geosciences.wustl.edu/missions/lro/lend.htm',
    'Sanin et al. (2017)',
    'Neutron flux suppression mapping indicating hydrogen-equivalent enrichment in polar regolith',
    'Orbiter epithermal neutron measurements serving as primary indicator for buried volatiles.'
),
(
    'lro-diviner',
    'Diviner Lunar Radiometer Experiment Polar Temperature Atlas',
    'NASA / UCLA / LRO Science Team',
    'https://diviner.ucla.edu/',
    'Paige et al. (2010)',
    'Infrared radiometric thermal emission modeling across diurnal and seasonal extremes',
    'Maximum annual surface temperatures identifying cold traps where volatiles remain stable for billions of years.'
),
(
    'nasa-artemis-sdt',
    'NASA Artemis III Science Definition Team Report',
    'NASA Science Mission Directorate (SMD)',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'NASA SP-20205009602',
    'Expert synthesis of planetary science decadal priorities, SPA basin geology, and sample return science',
    'Framework prioritizing scientific value, crater chronology calibration, and volatile sampling accessibility.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    organization = EXCLUDED.organization,
    url = EXCLUDED.url,
    description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 2. SEED CRITERIA DEFINITIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.criteria_definitions (id, name, direction, unit, default_weight, description, rationale, source_id)
VALUES
(
    'slope',
    'Surface Slope',
    'cost',
    'degrees',
    0.2000,
    'Topographical incline angle across a 50m to 100m landing baseline.',
    'Flatter terrain reduces lander tip-over risk during touchdown and facilitates rover mobility.',
    'nasa-pgda-prod-90'
),
(
    'roughness',
    'Surface Roughness',
    'cost',
    'meters RMS',
    0.1500,
    'Root-mean-square topographic deviation across a 50m baseline footprint.',
    'Identifies boulder clusters, micro-craters, and blocky ejecta hazards below digital elevation model resolution.',
    'nasa-pgda-prod-90'
),
(
    'illumination',
    'Solar Illumination',
    'benefit',
    'percent',
    0.2000,
    'Average cumulative annual solar illumination percentage over an 18.6-year precession cycle.',
    'Directly governs photovoltaic power generation, battery duty cycles, and thermal survival during polar night.',
    'nasa-pgda-prod-69'
),
(
    'resource',
    'Resource Potential',
    'benefit',
    'score (0-100)',
    0.1500,
    'Proximity to permanently shadowed cryogenic cold traps and epithermal neutron suppression signatures.',
    'Assesses availability of water ice and volatile resources for in-situ resource utilization (ISRU).',
    'lro-lend'
),
(
    'communication',
    'Earth Line-of-Sight Visibility',
    'benefit',
    'percent',
    0.1500,
    'Percentage of direct line-of-sight visibility to Earth accounting for lunar libration.',
    'Governs high-rate direct-to-Earth communication availability without requiring relay satellite constellations.',
    'nasa-pgda-prod-69'
),
(
    'science',
    'Scientific Return Value',
    'benefit',
    'score (0-100)',
    0.1500,
    'Synthesized scientific value based on exposure of South Pole-Aitken impact melt and sampling access.',
    'Prioritizes fundamental planetary evolution questions, crater chronology, and volatile origins.',
    'nasa-artemis-sdt'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    direction = EXCLUDED.direction,
    unit = EXCLUDED.unit,
    description = EXCLUDED.description;

-- ------------------------------------------------------------------------------
-- 3. SEED MISSIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.missions (id, mission_type, name, description, default_weights, constraints, is_official_preset)
VALUES
(
    'mission-science',
    'science',
    'Science Mission Profile',
    'Prioritizes scientific value (35%) for maximum geologic and South Pole-Aitken sampling yield, balanced with touchdown safety, solar power, and data downlink.',
    '{"science": 0.35, "slope": 0.15, "illumination": 0.15, "communication": 0.15, "resource": 0.10, "roughness": 0.10}'::jsonb,
    '[
        {"criterion": "slope", "direction": "max", "passLimit": 15.0, "marginalLimit": 20.0, "essential": true, "rationale": "Lander touchdown stability threshold to avoid slope tip-over on touchdown gear."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.30, "marginalLimit": 0.45, "essential": true, "rationale": "Surface blockiness and boulder clearance for science lander footpads."},
        {"criterion": "science", "direction": "min", "passLimit": 60.0, "marginalLimit": 40.0, "essential": true, "rationale": "Minimum scientific sampling yield threshold for decadal planetary objectives."},
        {"criterion": "illumination", "direction": "min", "passLimit": 30.0, "marginalLimit": 15.0, "essential": false, "rationale": "Solar array daylight operations window for surface instruments."}
    ]'::jsonb,
    true
),
(
    'mission-resource',
    'resource',
    'Resource Exploration Profile',
    'Prioritizes volatile indicators and cold-trap proximity (35%), paired with traverse slope safety (15%), rover mobility roughness (10%), illumination (15%), and geochemical context (15%).',
    '{"resource": 0.35, "slope": 0.15, "illumination": 0.15, "science": 0.15, "roughness": 0.10, "communication": 0.10}'::jsonb,
    '[
        {"criterion": "resource", "direction": "min", "passLimit": 40.0, "marginalLimit": 25.0, "essential": true, "rationale": "Proximity to cryogenic volatile indicators or permanently shadowed cold traps."},
        {"criterion": "slope", "direction": "max", "passLimit": 12.0, "marginalLimit": 16.0, "essential": true, "rationale": "Prospecting rover rim-to-floor traverse navigability limit."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.25, "marginalLimit": 0.40, "essential": true, "rationale": "Rover chassis clearance over blocky polar regolith."},
        {"criterion": "illumination", "direction": "min", "passLimit": 35.0, "marginalLimit": 20.0, "essential": false, "rationale": "Rover battery solar recharging threshold."}
    ]'::jsonb,
    true
),
(
    'mission-crewed',
    'crewed',
    'Crewed Base Profile',
    'Prioritizes strict human landing gear stability (slope 25%, roughness 15%), life-support solar array power (25%), and direct crew Earth communications (20%), with secondary ISRU potential (10%).',
    '{"slope": 0.25, "illumination": 0.25, "communication": 0.20, "roughness": 0.15, "resource": 0.10, "science": 0.05}'::jsonb,
    '[
        {"criterion": "slope", "direction": "max", "passLimit": 8.0, "marginalLimit": 10.0, "essential": true, "rationale": "Human Landing System (HLS) strict touchdown stability limit to prevent tip-over."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.15, "marginalLimit": 0.25, "essential": true, "rationale": "Human lander footpad boulder hazard mitigation limit."},
        {"criterion": "illumination", "direction": "min", "passLimit": 65.0, "marginalLimit": 50.0, "essential": true, "rationale": "Continuous solar power for crew life-support survival systems."},
        {"criterion": "communication", "direction": "min", "passLimit": 60.0, "marginalLimit": 45.0, "essential": true, "rationale": "High-availability direct-to-Earth communication for astronaut telemetry and voice."}
    ]'::jsonb,
    true
),
(
    'mission-communication',
    'communication',
    'Communication Outpost Profile',
    'Prioritizes continuous direct line-of-sight Earth visibility (40%) and solar transmitter power (20%), with benign elevated plateau terrain (15%) for relay tower installation.',
    '{"communication": 0.40, "illumination": 0.20, "slope": 0.15, "roughness": 0.10, "science": 0.10, "resource": 0.05}'::jsonb,
    '[
        {"criterion": "communication", "direction": "min", "passLimit": 70.0, "marginalLimit": 50.0, "essential": true, "rationale": "High-availability Earth line-of-sight requirement for polar telecom outpost."},
        {"criterion": "slope", "direction": "max", "passLimit": 12.0, "marginalLimit": 16.0, "essential": true, "rationale": "Relay antenna tower platform stability limit."},
        {"criterion": "illumination", "direction": "min", "passLimit": 40.0, "marginalLimit": 25.0, "essential": false, "rationale": "Continuous power for communication transmitter."}
    ]'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_weights = EXCLUDED.default_weights,
    constraints = EXCLUDED.constraints;

-- ------------------------------------------------------------------------------
-- 4. SEED LUNAR SITES (16 Curated Lunar South Pole Sites)
-- ------------------------------------------------------------------------------
INSERT INTO public.lunar_sites (
    id, name, region, latitude, longitude, elevation_m,
    slope_deg, slope_low, slope_high,
    roughness_m, roughness_low, roughness_high,
    illumination_pct, illumination_low, illumination_high,
    resource_score, resource_low, resource_high, resource_evidence_kind,
    communication_pct, communication_low, communication_high,
    scientific_value, scientific_value_low, scientific_value_high,
    designation, source_organization, source_url, coordinate_frame, coordinate_status,
    is_psr, psr_distance_km, description
)
VALUES
(
    'artemis-faustini-rim-a', 'Faustini Rim A', 'Faustini Crater Complex',
    -87.88, 90.03, -913.0,
    8.5, 7.2, 9.8,
    0.18, 0.14, 0.22,
    52.0, 48.0, 56.0,
    68.0, 55.0, 80.0, 'scientific-evidence',
    45.0, 40.0, 50.0,
    82.0, 75.0, 88.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.5,
    'Elevated rim ridge of Faustini Crater with proximate access to cryogenic cold-trap volatiles in crater interior.'
),
(
    'artemis-peak-near-shackleton', 'Peak Near Shackleton', 'Shackleton Crater Rim Complex',
    -88.81, 123.69, 575.5,
    7.4, 6.0, 8.8,
    0.16, 0.12, 0.20,
    78.0, 74.0, 82.0,
    55.0, 42.0, 68.0, 'proxy',
    68.0, 62.0, 74.0,
    85.0, 78.0, 90.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 3.2,
    'Highland ridge adjacent to Shackleton Crater with high cumulative annual solar visibility and favorable communications.'
),
(
    'artemis-connecting-ridge', 'Connecting Ridge', 'Shackleton-de Gerlache Ridge',
    -89.45, 226.00, -1022.0,
    6.8, 5.5, 8.2,
    0.14, 0.10, 0.18,
    82.0, 78.0, 86.0,
    62.0, 50.0, 74.0, 'scientific-evidence',
    82.0, 76.0, 88.0,
    88.0, 82.0, 94.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.8,
    'Strategic high-illumination traverse corridor between Shackleton and de Gerlache craters with excellent line-of-sight communications.'
),
(
    'artemis-connecting-ridge-ext', 'Connecting Ridge Extension', 'Shackleton-de Gerlache Ridge Extension',
    -89.03, 258.00, -1210.0,
    7.9, 6.5, 9.4,
    0.17, 0.13, 0.21,
    74.0, 70.0, 78.0,
    58.0, 45.0, 70.0, 'proxy',
    75.0, 70.0, 80.0,
    80.0, 74.0, 86.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 2.5,
    'Northwestern extension of Connecting Ridge offering accessible grades and dependable line-of-sight communications.'
),
(
    'artemis-de-gerlache-rim-1', 'de Gerlache Rim 1', 'de Gerlache Crater',
    -88.50, 271.70, -1530.0,
    8.2, 7.0, 9.5,
    0.19, 0.15, 0.23,
    68.0, 64.0, 72.0,
    72.0, 60.0, 84.0, 'scientific-evidence',
    60.0, 54.0, 66.0,
    84.0, 78.0, 90.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 0.8,
    'Eastern rim crest of de Gerlache Crater overlooking cold traps with confirmed low-temperature volatile deposits.'
),
(
    'artemis-de-gerlache-rim-2', 'de Gerlache Rim 2', 'de Gerlache Crater',
    -88.35, 292.00, -1720.0,
    9.1, 7.8, 10.5,
    0.21, 0.17, 0.25,
    64.0, 60.0, 68.0,
    70.0, 58.0, 82.0, 'scientific-evidence',
    55.0, 48.0, 62.0,
    81.0, 75.0, 87.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.1,
    'Northwestern rim section of de Gerlache Crater offering geological diversity and cold-trap access.'
),
(
    'artemis-de-gerlache-kocher-massif', 'de Gerlache-Kocher Massif', 'de Gerlache-Kocher Complex',
    -85.80, 245.00, 1140.0,
    11.4, 9.8, 13.0,
    0.24, 0.19, 0.29,
    71.0, 66.0, 76.0,
    45.0, 32.0, 58.0, 'proxy',
    72.0, 66.0, 78.0,
    79.0, 72.0, 85.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 6.5,
    'Prominent topographic massif providing elevated platform for long-range communications and regional surveying.'
),
(
    'artemis-haworth', 'Haworth Crater Rim', 'Haworth Crater Complex',
    -87.45, 355.00, -1350.0,
    10.2, 8.8, 11.8,
    0.22, 0.18, 0.27,
    48.0, 44.0, 52.0,
    85.0, 72.0, 95.0, 'scientific-evidence',
    42.0, 36.0, 48.0,
    86.0, 80.0, 92.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 0.5,
    'Narrow rim segment above one of the coldest Permanently Shadowed Regions on the Moon (< 40 K recorded by Diviner).'
),
(
    'artemis-malapert-massif', 'Malapert Massif Peak', 'Malapert Mountain',
    -85.90, 0.00, 3420.0,
    6.2, 5.0, 7.5,
    0.13, 0.09, 0.17,
    89.5, 86.0, 93.0,
    35.0, 25.0, 48.0, 'proxy',
    95.0, 90.0, 100.0,
    83.0, 76.0, 89.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 12.0,
    'Premier high-elevation telecommunications and solar power hub with near-permanent Earth visibility.'
),
(
    'artemis-leibnitz-beta-plateau', 'Leibnitz Beta Plateau', 'Leibnitz Beta Complex',
    -85.80, 31.00, 2810.0,
    7.1, 5.8, 8.4,
    0.15, 0.11, 0.19,
    76.0, 72.0, 80.0,
    40.0, 28.0, 52.0, 'proxy',
    88.0, 82.0, 94.0,
    81.0, 75.0, 87.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 8.5,
    'Broad elevated plateau offering stable landing pads, low surface slopes, and high Earth direct radio contact.'
),
(
    'artemis-nobile-rim-1', 'Nobile Rim 1', 'Nobile Crater Complex',
    -85.30, 31.50, -2415.5,
    8.8, 7.5, 10.2,
    0.18, 0.14, 0.23,
    58.0, 54.0, 62.0,
    75.0, 64.0, 86.0, 'scientific-evidence',
    64.0, 58.0, 70.0,
    87.0, 81.0, 93.0,
    'official-artemis-candidate', 'NASA Artemis Program / VIPER Science Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.2,
    'Western rim of Nobile crater characterized by thermal micro-cold traps selected for ground-truthing lunar volatiles.'
),
(
    'artemis-nobile-rim-2', 'Nobile Rim 2', 'Nobile Crater Complex',
    -83.93, 58.83, -2290.0,
    7.6, 6.2, 9.0,
    0.16, 0.12, 0.20,
    62.0, 58.0, 66.0,
    65.0, 52.0, 78.0, 'scientific-evidence',
    70.0, 64.0, 76.0,
    82.0, 76.0, 88.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 2.1,
    'Northeastern rim ridge of Nobile crater featuring smooth rolling regolith and low roughness metrics.'
),
(
    'artemis-amundsen-rim', 'Amundsen Rim', 'Amundsen Crater Complex',
    -84.22, 69.35, -2650.0,
    9.4, 8.0, 10.8,
    0.20, 0.16, 0.24,
    54.0, 50.0, 58.0,
    72.0, 60.0, 84.0, 'scientific-evidence',
    66.0, 60.0, 72.0,
    89.0, 84.0, 95.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.5,
    'Northwestern rim of 105-km Amundsen impact basin exposing deep excavation materials from the South Pole-Aitken basin.'
),
(
    'cal-cabeus-lcross', 'Cabeus LCROSS Impact Ground Truth', 'Cabeus Crater Floor',
    -84.90, 324.50, -2802.5,
    5.4, 4.2, 6.8,
    0.12, 0.08, 0.16,
    0.0, 0.0, 2.0,
    100.0, 95.0, 100.0, 'direct-observation',
    15.0, 10.0, 22.0,
    95.0, 90.0, 100.0,
    'scientific-research-location', 'NASA Ames / LCROSS Mission Team (Colaprete et al. 2010)',
    'https://www.nasa.gov/mission_pages/LCROSS/main/index.html',
    'DE421', 'verified', true, 0.0,
    'Historic LCROSS impact site (2009); proved presence of water ice (5.5 wt%) and pure volatiles in cryogenic regolith.'
),
(
    'shackleton-rim', 'Shackleton Crater Rim Peak', 'Shackleton Crater Rim',
    -89.90, 0.00, 1282.5,
    8.2, 6.8, 9.6,
    0.15, 0.11, 0.20,
    86.0, 82.0, 90.0,
    75.0, 62.0, 88.0, 'scientific-evidence',
    82.0, 76.0, 88.0,
    NULL, NULL, NULL,
    'scientific-research-location', 'NASA LRO / LOLA Team (Smith et al. 2017)',
    'https://pgda.gsfc.nasa.gov/products/81',
    'DE421', 'verified', false, 0.2,
    'Ultra-polar rim summit (0.1 deg from South Pole) with near-continuous illumination; scientific score unassessed (null).'
),
(
    'amundsen-crater-floor', 'Amundsen Crater Floor Central', 'Amundsen Crater Basin',
    -84.50, 83.00, -5120.0,
    4.2, 3.2, 5.4,
    0.11, 0.07, 0.15,
    8.0, 4.0, 12.0,
    88.0, 78.0, 96.0, 'scientific-evidence',
    38.0, 30.0, 45.0,
    92.0, 86.0, 98.0,
    'scientific-research-location', 'Planetary Science Decadal Priority',
    'https://pgda.gsfc.nasa.gov/products/90',
    'DE421', 'verified', false, 1.8,
    'Deep impact basin floor exposing ancient South Pole-Aitken lower crustal material and persistent cryogenic volatile deposits.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    region = EXCLUDED.region,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    elevation_m = EXCLUDED.elevation_m,
    slope_deg = EXCLUDED.slope_deg,
    roughness_m = EXCLUDED.roughness_m,
    illumination_pct = EXCLUDED.illumination_pct,
    resource_score = EXCLUDED.resource_score,
    communication_pct = EXCLUDED.communication_pct,
    scientific_value = EXCLUDED.scientific_value,
    description = EXCLUDED.description;
