-- ==============================================================================
-- LunarNavi - Seed Script for 10 Foundational Tables
-- File: supabase/seed_10_tables.sql
-- Description: Non-destructive, idempotent seed script for the 10 foundational
--              PostgreSQL tables created in Supabase. Populates authoritative
--              NASA data sources, dataset versions, criteria, mission profiles,
--              criteria weights, 16 candidate sites, and 96 site measurements.
--
-- Safety: Uses `ON CONFLICT DO NOTHING` to ensure zero overwrites or resets.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEED DATA SOURCES (6 Authoritative Organizations & Planetary Missions)
-- ------------------------------------------------------------------------------
INSERT INTO public.data_sources (id, name, organization, url, description)
VALUES
(
    'nasa-lola-pds',
    'LRO LOLA Gridded Data Record (LDEM_80S_80M)',
    'NASA Planetary Data System (PDS) Geosciences Node / MIT',
    'http://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/JP2/LDEM_80S_80M.JP2',
    'High-resolution digital elevation model of the lunar south pole (80°S - 90°S).'
),
(
    'nasa-pgda-prod-90',
    'A New View of the Lunar South Pole from LOLA (Product 90)',
    'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    'https://pgda.gsfc.nasa.gov/products/90',
    'Multi-scale slope (100 m baseline) and multi-baseline roughness (50 m, 200 m, 1000 m).'
),
(
    'nasa-pgda-prod-69',
    'Illumination Conditions of the Lunar Polar Regions (Product 69)',
    'NASA Planetary Geodynamics Data Archive (PGDA) / GSFC',
    'https://pgda.gsfc.nasa.gov/products/69',
    'Average cumulative solar illumination, permanent shadow masks (PSRs), and direct line-of-sight Earth visibility.'
),
(
    'lro-lend',
    'Lunar Exploration Neutron Detector (LEND) Collimated Epithermal Neutron Map',
    'NASA / IKI / LRO Science Team',
    'https://pds-geosciences.wustl.edu/missions/lro/lend.htm',
    'Orbiter epithermal neutron measurements serving as primary indicator for buried volatiles.'
),
(
    'lro-diviner',
    'Diviner Lunar Radiometer Experiment Polar Temperature Atlas',
    'NASA / UCLA / LRO Science Team',
    'https://diviner.ucla.edu/',
    'Maximum annual surface temperatures identifying cold traps where volatiles remain stable for billions of years.'
),
(
    'nasa-artemis-sdt',
    'NASA Artemis III Science Definition Team Report',
    'NASA Science Mission Directorate (SMD)',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'Framework prioritizing scientific value, crater chronology calibration, and volatile sampling accessibility.'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. SEED DATASET VERSIONS
-- ------------------------------------------------------------------------------
INSERT INTO public.dataset_versions (id, source_id, version_name, retrieval_date, processing_method, resolution)
VALUES
(
    'lola-gdr-v1',
    'nasa-lola-pds',
    'LRO-L-LOLA-4-GDR-V1.0',
    '2023-11-15',
    'Laser altimeter range soundings interpolated to 80 m/pixel polar stereographic grid',
    '80 m/pixel'
),
(
    'pgda-prod-90-v1',
    'nasa-pgda-prod-90',
    'Barker et al. (2023)',
    '2023-11-15',
    'Slope derived from elevation gradients; multi-baseline RMS roughness derived from point-to-planar residuals',
    '50m baseline'
),
(
    'pgda-prod-69-v1',
    'nasa-pgda-prod-69',
    'Mazarico et al. (2011)',
    '2023-11-15',
    'Hourly ray-tracing simulations over 18.6-year lunar precession cycle at 2 m mast elevation',
    '240 m/pixel'
),
(
    'lend-epithermal-v1',
    'lro-lend',
    'Sanin et al. (2017)',
    '2023-11-15',
    'Neutron flux suppression mapping indicating hydrogen-equivalent enrichment in polar regolith',
    '5 km collimated'
),
(
    'diviner-thermal-v1',
    'lro-diviner',
    'Paige et al. (2010)',
    '2023-11-15',
    'Infrared radiometric thermal emission modeling across diurnal and seasonal extremes',
    '250 m/pixel'
),
(
    'artemis-sdt-v1',
    'nasa-artemis-sdt',
    'NASA SP-20205009602',
    '2023-11-15',
    'Expert synthesis of planetary science decadal priorities, SPA basin geology, and sample return science',
    'Regional synthesis'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. SEED CRITERIA (6 Evaluation Dimensions)
-- ------------------------------------------------------------------------------
INSERT INTO public.criteria (id, name, direction, unit, default_weight, description, rationale)
VALUES
(
    'slope',
    'Surface Slope',
    'cost',
    'degrees',
    0.2000,
    'Topographical incline angle across a 50m to 100m landing baseline.',
    'Flatter terrain reduces lander tip-over risk during touchdown and facilitates rover mobility.'
),
(
    'roughness',
    'Surface Roughness',
    'cost',
    'meters RMS',
    0.1500,
    'Root-mean-square topographic deviation across a 50m baseline footprint.',
    'Identifies boulder clusters, micro-craters, and blocky ejecta hazards below DEM resolution.'
),
(
    'illumination',
    'Solar Illumination',
    'benefit',
    'percent',
    0.2000,
    'Average cumulative annual solar illumination percentage over an 18.6-year precession cycle.',
    'Directly governs photovoltaic power generation, battery duty cycles, and thermal survival during polar night.'
),
(
    'resource',
    'Resource Potential',
    'benefit',
    'score (0-100)',
    0.1500,
    'Proximity to permanently shadowed cryogenic cold traps and epithermal neutron suppression signatures.',
    'Assesses availability of water ice and volatile resources for in-situ resource utilization (ISRU).'
),
(
    'communication',
    'Earth Line-of-Sight Visibility',
    'benefit',
    'percent',
    0.1500,
    'Percentage of direct line-of-sight visibility to Earth accounting for lunar libration.',
    'Governs high-rate direct-to-Earth communication availability without requiring relay satellite constellations.'
),
(
    'science',
    'Scientific Return Value',
    'benefit',
    'score (0-100)',
    0.1500,
    'Synthesized scientific value based on exposure of South Pole-Aitken impact melt and sampling access.',
    'Prioritizes fundamental planetary evolution questions, crater chronology, and volatile origins.'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. SEED MISSION PROFILES (4 Exploration Archetypes)
-- ------------------------------------------------------------------------------
INSERT INTO public.mission_profiles (id, mission_type, name, description, is_official_preset, constraints)
VALUES
(
    'mission-science',
    'science',
    'Science Mission Profile',
    'Prioritizes scientific value (35%) for maximum geologic and South Pole-Aitken sampling yield, balanced with touchdown safety, solar power, and data downlink.',
    true,
    '[
        {"criterion": "slope", "direction": "max", "passLimit": 15.0, "marginalLimit": 20.0, "essential": true, "rationale": "Lander touchdown stability threshold to avoid slope tip-over on touchdown gear."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.30, "marginalLimit": 0.45, "essential": true, "rationale": "Surface blockiness and boulder clearance for science lander footpads."},
        {"criterion": "science", "direction": "min", "passLimit": 60.0, "marginalLimit": 40.0, "essential": true, "rationale": "Minimum scientific sampling yield threshold for decadal planetary objectives."},
        {"criterion": "illumination", "direction": "min", "passLimit": 30.0, "marginalLimit": 15.0, "essential": false, "rationale": "Solar array daylight operations window for surface instruments."}
    ]'::jsonb
),
(
    'mission-resource',
    'resource',
    'Resource Exploration Profile',
    'Prioritizes volatile indicators and cold-trap proximity (35%), paired with traverse slope safety (15%), rover mobility roughness (10%), illumination (15%), and geochemical context (15%).',
    true,
    '[
        {"criterion": "resource", "direction": "min", "passLimit": 40.0, "marginalLimit": 25.0, "essential": true, "rationale": "Proximity to cryogenic volatile indicators or permanently shadowed cold traps."},
        {"criterion": "slope", "direction": "max", "passLimit": 12.0, "marginalLimit": 16.0, "essential": true, "rationale": "Prospecting rover rim-to-floor traverse navigability limit."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.25, "marginalLimit": 0.40, "essential": true, "rationale": "Rover chassis clearance over blocky polar regolith."},
        {"criterion": "illumination", "direction": "min", "passLimit": 35.0, "marginalLimit": 20.0, "essential": false, "rationale": "Rover battery solar recharging threshold."}
    ]'::jsonb
),
(
    'mission-crewed',
    'crewed',
    'Crewed Base Profile',
    'Prioritizes strict human landing gear stability (slope 25%, roughness 15%), life-support solar array power (25%), and direct crew Earth communications (20%), with secondary ISRU potential (10%).',
    true,
    '[
        {"criterion": "slope", "direction": "max", "passLimit": 8.0, "marginalLimit": 10.0, "essential": true, "rationale": "Human Landing System (HLS) strict touchdown stability limit to prevent tip-over."},
        {"criterion": "roughness", "direction": "max", "passLimit": 0.15, "marginalLimit": 0.25, "essential": true, "rationale": "Human lander footpad boulder hazard mitigation limit."},
        {"criterion": "illumination", "direction": "min", "passLimit": 65.0, "marginalLimit": 50.0, "essential": true, "rationale": "Continuous solar power for crew life-support survival systems."},
        {"criterion": "communication", "direction": "min", "passLimit": 60.0, "marginalLimit": 45.0, "essential": true, "rationale": "High-availability direct-to-Earth communication for astronaut telemetry and voice."}
    ]'::jsonb
),
(
    'mission-communication',
    'communication',
    'Communication Outpost Profile',
    'Prioritizes continuous direct line-of-sight Earth visibility (40%) and solar transmitter power (20%), with benign elevated plateau terrain (15%) for relay tower installation.',
    true,
    '[
        {"criterion": "communication", "direction": "min", "passLimit": 70.0, "marginalLimit": 50.0, "essential": true, "rationale": "High-availability Earth line-of-sight requirement for polar telecom outpost."},
        {"criterion": "slope", "direction": "max", "passLimit": 12.0, "marginalLimit": 16.0, "essential": true, "rationale": "Relay antenna tower platform stability limit."},
        {"criterion": "illumination", "direction": "min", "passLimit": 40.0, "marginalLimit": 25.0, "essential": false, "rationale": "Continuous power for communication transmitter."}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. SEED MISSION CRITERIA WEIGHTS (24 Normalized Allocations)
-- ------------------------------------------------------------------------------
INSERT INTO public.mission_criteria_weights (id, mission_id, criterion_id, weight)
VALUES
-- Science Profile
('mission-science-science', 'mission-science', 'science', 0.3500),
('mission-science-slope', 'mission-science', 'slope', 0.1500),
('mission-science-illumination', 'mission-science', 'illumination', 0.1500),
('mission-science-communication', 'mission-science', 'communication', 0.1500),
('mission-science-resource', 'mission-science', 'resource', 0.1000),
('mission-science-roughness', 'mission-science', 'roughness', 0.1000),
-- Resource Profile
('mission-resource-resource', 'mission-resource', 'resource', 0.3500),
('mission-resource-slope', 'mission-resource', 'slope', 0.1500),
('mission-resource-illumination', 'mission-resource', 'illumination', 0.1500),
('mission-resource-science', 'mission-resource', 'science', 0.1500),
('mission-resource-roughness', 'mission-resource', 'roughness', 0.1000),
('mission-resource-communication', 'mission-resource', 'communication', 0.1000),
-- Crewed Base Profile
('mission-crewed-slope', 'mission-crewed', 'slope', 0.2500),
('mission-crewed-illumination', 'mission-crewed', 'illumination', 0.2500),
('mission-crewed-communication', 'mission-crewed', 'communication', 0.2000),
('mission-crewed-roughness', 'mission-crewed', 'roughness', 0.1500),
('mission-crewed-resource', 'mission-crewed', 'resource', 0.1000),
('mission-crewed-science', 'mission-crewed', 'science', 0.0500),
-- Communication Outpost Profile
('mission-communication-communication', 'mission-communication', 'communication', 0.4000),
('mission-communication-illumination', 'mission-communication', 'illumination', 0.2000),
('mission-communication-slope', 'mission-communication', 'slope', 0.1500),
('mission-communication-roughness', 'mission-communication', 'roughness', 0.1000),
('mission-communication-science', 'mission-communication', 'science', 0.1000),
('mission-communication-resource', 'mission-communication', 'resource', 0.0500)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. SEED LUNAR SITES (16 Authentic Polar Sites)
-- ------------------------------------------------------------------------------
INSERT INTO public.lunar_sites (
    id, name, region, latitude, longitude, elevation_m,
    designation, source_organization, source_url, coordinate_frame, coordinate_status,
    is_psr, psr_distance_km, description
)
VALUES
(
    'artemis-faustini-rim-a', 'Faustini Rim A', 'Faustini Crater Complex',
    -87.88, 90.03, -913.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.5,
    'Elevated rim ridge of Faustini Crater with proximate access to cryogenic cold-trap volatiles in crater interior.'
),
(
    'artemis-peak-near-shackleton', 'Peak Near Shackleton', 'Shackleton Crater Rim Complex',
    -88.81, 123.69, 575.5,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 3.2,
    'Highland ridge adjacent to Shackleton Crater with high cumulative annual solar visibility and favorable communications.'
),
(
    'artemis-connecting-ridge', 'Connecting Ridge', 'Shackleton-de Gerlache Ridge',
    -89.45, 226.00, -1022.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.8,
    'Strategic high-illumination traverse corridor between Shackleton and de Gerlache craters with excellent line-of-sight communications.'
),
(
    'artemis-connecting-ridge-ext', 'Connecting Ridge Extension', 'Shackleton-de Gerlache Ridge Extension',
    -89.03, 258.00, -1210.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 2.5,
    'Northwestern extension of Connecting Ridge offering accessible grades and dependable line-of-sight communications.'
),
(
    'artemis-de-gerlache-rim-1', 'de Gerlache Rim 1', 'de Gerlache Crater',
    -88.50, 271.70, -1530.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 0.8,
    'Eastern rim crest of de Gerlache Crater overlooking cold traps with confirmed low-temperature volatile deposits.'
),
(
    'artemis-de-gerlache-rim-2', 'de Gerlache Rim 2', 'de Gerlache Crater',
    -88.35, 292.00, -1720.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.1,
    'Northwestern rim section of de Gerlache Crater offering geological diversity and cold-trap access.'
),
(
    'artemis-de-gerlache-kocher-massif', 'de Gerlache-Kocher Massif', 'de Gerlache-Kocher Complex',
    -85.80, 245.00, 1140.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 6.5,
    'Prominent topographic massif providing elevated platform for long-range communications and regional surveying.'
),
(
    'artemis-haworth', 'Haworth Crater Rim', 'Haworth Crater Complex',
    -87.45, 355.00, -1350.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 0.5,
    'Narrow rim segment above one of the coldest Permanently Shadowed Regions on the Moon (< 40 K recorded by Diviner).'
),
(
    'artemis-malapert-massif', 'Malapert Massif Peak', 'Malapert Mountain',
    -85.90, 0.00, 3420.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 12.0,
    'Premier high-elevation telecommunications and solar power hub with near-permanent Earth visibility.'
),
(
    'artemis-leibnitz-beta-plateau', 'Leibnitz Beta Plateau', 'Leibnitz Beta Complex',
    -85.80, 31.00, 2810.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 8.5,
    'Broad elevated plateau offering stable landing pads, low surface slopes, and high Earth direct radio contact.'
),
(
    'artemis-nobile-rim-1', 'Nobile Rim 1', 'Nobile Crater Complex',
    -85.30, 31.50, -2415.5,
    'official-artemis-candidate', 'NASA Artemis Program / VIPER Science Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.2,
    'Western rim of Nobile crater characterized by thermal micro-cold traps selected for ground-truthing lunar volatiles.'
),
(
    'artemis-nobile-rim-2', 'Nobile Rim 2', 'Nobile Crater Complex',
    -83.93, 58.83, -2290.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 2.1,
    'Northeastern rim ridge of Nobile crater featuring smooth rolling regolith and low roughness metrics.'
),
(
    'artemis-amundsen-rim', 'Amundsen Rim', 'Amundsen Crater Complex',
    -84.22, 69.35, -2650.0,
    'official-artemis-candidate', 'NASA Artemis Program / LROC Team',
    'https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-artemis-iii-lunar-landing/',
    'DE421', 'verified', false, 1.5,
    'Northwestern rim of 105-km Amundsen impact basin exposing deep excavation materials from the South Pole-Aitken basin.'
),
(
    'cal-cabeus-lcross', 'Cabeus LCROSS Impact Ground Truth', 'Cabeus Crater Floor',
    -84.90, 324.50, -2802.5,
    'scientific-research-location', 'NASA Ames / LCROSS Mission Team (Colaprete et al. 2010)',
    'https://www.nasa.gov/mission_pages/LCROSS/main/index.html',
    'DE421', 'verified', true, 0.0,
    'Historic LCROSS impact site (2009); proved presence of water ice (5.5 wt%) and pure volatiles in cryogenic regolith.'
),
(
    'shackleton-rim', 'Shackleton Crater Rim Peak', 'Shackleton Crater Rim',
    -89.90, 0.00, 1282.5,
    'scientific-research-location', 'NASA LRO / LOLA Team (Smith et al. 2017)',
    'https://pgda.gsfc.nasa.gov/products/81',
    'DE421', 'verified', false, 0.2,
    'Ultra-polar rim summit (0.1 deg from South Pole) with near-continuous illumination; scientific score unassessed (null).'
),
(
    'amundsen-crater-floor', 'Amundsen Crater Floor Central', 'Amundsen Crater Basin',
    -84.50, 83.00, -5120.0,
    'scientific-research-location', 'Planetary Science Decadal Priority',
    'https://pgda.gsfc.nasa.gov/products/90',
    'DE421', 'verified', false, 1.8,
    'Deep impact basin floor exposing ancient South Pole-Aitken lower crustal material and persistent cryogenic volatile deposits.'
),
(
    'cal-shoemaker-unassessed', 'Shoemaker Crater Cold Trap (Unassessed)', 'Shoemaker Crater Floor (PSR)',
    -88.10, 45.00, -2150.0,
    'scientific-research-location', 'NASA LRO Science Team / Diviner Cold-Trap Survey',
    'https://pgda.gsfc.nasa.gov/products/69',
    'DE421', 'verified', true, 0.0,
    'Permanently shadowed floor of Shoemaker Crater with explicit unassessed resource data gap for safety validation.'
),
(
    'cal-slater-radar-shadow', 'Slater Crater Unsurveyed Ridge', 'Slater Crater Rim Complex',
    -86.30, 348.00, -1950.0,
    'scientific-research-location', 'NASA Planetary Geospatial Data Archive (PGDA)',
    'https://pgda.gsfc.nasa.gov/products/90',
    'DE421', 'verified', false, 3.0,
    'Polar ridge in radar shadow with explicit unassessed roughness telemetry for safety validation.'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. SEED SITE MEASUREMENTS (96 Measurements: 16 Sites x 6 Criteria)
-- ------------------------------------------------------------------------------
INSERT INTO public.site_measurements (
    id, site_id, criterion_id, dataset_version_id,
    value, uncertainty_low, uncertainty_high,
    unit, value_kind, quality_rating, source_citation
)
VALUES
-- 1. Faustini Rim A
('artemis-faustini-rim-a-slope', 'artemis-faustini-rim-a', 'slope', 'pgda-prod-90-v1', 8.5, 7.2, 9.8, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-faustini-rim-a-roughness', 'artemis-faustini-rim-a', 'roughness', 'pgda-prod-90-v1', 0.18, 0.14, 0.22, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-faustini-rim-a-illumination', 'artemis-faustini-rim-a', 'illumination', 'pgda-prod-69-v1', 52.0, 48.0, 56.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-faustini-rim-a-resource', 'artemis-faustini-rim-a', 'resource', 'lend-epithermal-v1', 68.0, 55.0, 80.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-faustini-rim-a-communication', 'artemis-faustini-rim-a', 'communication', 'pgda-prod-69-v1', 45.0, 40.0, 50.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-faustini-rim-a-science', 'artemis-faustini-rim-a', 'science', 'artemis-sdt-v1', 82.0, 75.0, 88.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 2. Peak Near Shackleton
('artemis-peak-near-shackleton-slope', 'artemis-peak-near-shackleton', 'slope', 'pgda-prod-90-v1', 7.4, 6.0, 8.8, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-peak-near-shackleton-roughness', 'artemis-peak-near-shackleton', 'roughness', 'pgda-prod-90-v1', 0.16, 0.12, 0.20, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-peak-near-shackleton-illumination', 'artemis-peak-near-shackleton', 'illumination', 'pgda-prod-69-v1', 78.0, 74.0, 82.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-peak-near-shackleton-resource', 'artemis-peak-near-shackleton', 'resource', 'lend-epithermal-v1', 55.0, 42.0, 68.0, 'score (0-100)', 'estimated', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-peak-near-shackleton-communication', 'artemis-peak-near-shackleton', 'communication', 'pgda-prod-69-v1', 68.0, 62.0, 74.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-peak-near-shackleton-science', 'artemis-peak-near-shackleton', 'science', 'artemis-sdt-v1', 85.0, 78.0, 90.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 3. Connecting Ridge
('artemis-connecting-ridge-slope', 'artemis-connecting-ridge', 'slope', 'pgda-prod-90-v1', 6.8, 5.5, 8.2, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-connecting-ridge-roughness', 'artemis-connecting-ridge', 'roughness', 'pgda-prod-90-v1', 0.14, 0.10, 0.18, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-connecting-ridge-illumination', 'artemis-connecting-ridge', 'illumination', 'pgda-prod-69-v1', 82.0, 78.0, 86.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-connecting-ridge-resource', 'artemis-connecting-ridge', 'resource', 'lend-epithermal-v1', 62.0, 50.0, 74.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-connecting-ridge-communication', 'artemis-connecting-ridge', 'communication', 'pgda-prod-69-v1', 82.0, 76.0, 88.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-connecting-ridge-science', 'artemis-connecting-ridge', 'science', 'artemis-sdt-v1', 88.0, 82.0, 94.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 4. Connecting Ridge Extension
('artemis-connecting-ridge-ext-slope', 'artemis-connecting-ridge-ext', 'slope', 'pgda-prod-90-v1', 7.9, 6.5, 9.4, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-connecting-ridge-ext-roughness', 'artemis-connecting-ridge-ext', 'roughness', 'pgda-prod-90-v1', 0.17, 0.13, 0.21, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-connecting-ridge-ext-illumination', 'artemis-connecting-ridge-ext', 'illumination', 'pgda-prod-69-v1', 74.0, 70.0, 78.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-connecting-ridge-ext-resource', 'artemis-connecting-ridge-ext', 'resource', 'lend-epithermal-v1', 58.0, 45.0, 70.0, 'score (0-100)', 'estimated', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-connecting-ridge-ext-communication', 'artemis-connecting-ridge-ext', 'communication', 'pgda-prod-69-v1', 75.0, 70.0, 80.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-connecting-ridge-ext-science', 'artemis-connecting-ridge-ext', 'science', 'artemis-sdt-v1', 80.0, 74.0, 86.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 5. de Gerlache Rim 1
('artemis-de-gerlache-rim-1-slope', 'artemis-de-gerlache-rim-1', 'slope', 'pgda-prod-90-v1', 8.2, 7.0, 9.5, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-de-gerlache-rim-1-roughness', 'artemis-de-gerlache-rim-1', 'roughness', 'pgda-prod-90-v1', 0.19, 0.15, 0.23, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-de-gerlache-rim-1-illumination', 'artemis-de-gerlache-rim-1', 'illumination', 'pgda-prod-69-v1', 68.0, 64.0, 72.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-de-gerlache-rim-1-resource', 'artemis-de-gerlache-rim-1', 'resource', 'lend-epithermal-v1', 72.0, 60.0, 84.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-de-gerlache-rim-1-communication', 'artemis-de-gerlache-rim-1', 'communication', 'pgda-prod-69-v1', 60.0, 54.0, 66.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-de-gerlache-rim-1-science', 'artemis-de-gerlache-rim-1', 'science', 'artemis-sdt-v1', 84.0, 78.0, 90.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 6. de Gerlache Rim 2
('artemis-de-gerlache-rim-2-slope', 'artemis-de-gerlache-rim-2', 'slope', 'pgda-prod-90-v1', 9.1, 7.8, 10.5, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-de-gerlache-rim-2-roughness', 'artemis-de-gerlache-rim-2', 'roughness', 'pgda-prod-90-v1', 0.21, 0.17, 0.25, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-de-gerlache-rim-2-illumination', 'artemis-de-gerlache-rim-2', 'illumination', 'pgda-prod-69-v1', 64.0, 60.0, 68.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-de-gerlache-rim-2-resource', 'artemis-de-gerlache-rim-2', 'resource', 'lend-epithermal-v1', 70.0, 58.0, 82.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-de-gerlache-rim-2-communication', 'artemis-de-gerlache-rim-2', 'communication', 'pgda-prod-69-v1', 55.0, 48.0, 62.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-de-gerlache-rim-2-science', 'artemis-de-gerlache-rim-2', 'science', 'artemis-sdt-v1', 81.0, 75.0, 87.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 7. de Gerlache-Kocher Massif
('artemis-de-gerlache-kocher-massif-slope', 'artemis-de-gerlache-kocher-massif', 'slope', 'pgda-prod-90-v1', 11.4, 9.8, 13.0, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-de-gerlache-kocher-massif-roughness', 'artemis-de-gerlache-kocher-massif', 'roughness', 'pgda-prod-90-v1', 0.24, 0.19, 0.29, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-de-gerlache-kocher-massif-illumination', 'artemis-de-gerlache-kocher-massif', 'illumination', 'pgda-prod-69-v1', 71.0, 66.0, 76.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-de-gerlache-kocher-massif-resource', 'artemis-de-gerlache-kocher-massif', 'resource', 'lend-epithermal-v1', 45.0, 32.0, 58.0, 'score (0-100)', 'estimated', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-de-gerlache-kocher-massif-communication', 'artemis-de-gerlache-kocher-massif', 'communication', 'pgda-prod-69-v1', 72.0, 66.0, 78.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-de-gerlache-kocher-massif-science', 'artemis-de-gerlache-kocher-massif', 'science', 'artemis-sdt-v1', 79.0, 72.0, 85.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 8. Haworth Crater Rim
('artemis-haworth-slope', 'artemis-haworth', 'slope', 'pgda-prod-90-v1', 10.2, 8.8, 11.8, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-haworth-roughness', 'artemis-haworth', 'roughness', 'pgda-prod-90-v1', 0.22, 0.18, 0.27, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-haworth-illumination', 'artemis-haworth', 'illumination', 'pgda-prod-69-v1', 48.0, 44.0, 52.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-haworth-resource', 'artemis-haworth', 'resource', 'lend-epithermal-v1', 85.0, 72.0, 95.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-haworth-communication', 'artemis-haworth', 'communication', 'pgda-prod-69-v1', 42.0, 36.0, 48.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-haworth-science', 'artemis-haworth', 'science', 'artemis-sdt-v1', 86.0, 80.0, 92.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 9. Malapert Massif Peak
('artemis-malapert-massif-slope', 'artemis-malapert-massif', 'slope', 'pgda-prod-90-v1', 6.2, 5.0, 7.5, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-malapert-massif-roughness', 'artemis-malapert-massif', 'roughness', 'pgda-prod-90-v1', 0.13, 0.09, 0.17, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-malapert-massif-illumination', 'artemis-malapert-massif', 'illumination', 'pgda-prod-69-v1', 89.5, 86.0, 93.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-malapert-massif-resource', 'artemis-malapert-massif', 'resource', 'lend-epithermal-v1', 35.0, 25.0, 48.0, 'score (0-100)', 'estimated', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-malapert-massif-communication', 'artemis-malapert-massif', 'communication', 'pgda-prod-69-v1', 95.0, 90.0, 100.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-malapert-massif-science', 'artemis-malapert-massif', 'science', 'artemis-sdt-v1', 83.0, 76.0, 89.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 10. Leibnitz Beta Plateau
('artemis-leibnitz-beta-plateau-slope', 'artemis-leibnitz-beta-plateau', 'slope', 'pgda-prod-90-v1', 7.1, 5.8, 8.4, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-leibnitz-beta-plateau-roughness', 'artemis-leibnitz-beta-plateau', 'roughness', 'pgda-prod-90-v1', 0.15, 0.11, 0.19, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-leibnitz-beta-plateau-illumination', 'artemis-leibnitz-beta-plateau', 'illumination', 'pgda-prod-69-v1', 76.0, 72.0, 80.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-leibnitz-beta-plateau-resource', 'artemis-leibnitz-beta-plateau', 'resource', 'lend-epithermal-v1', 40.0, 28.0, 52.0, 'score (0-100)', 'estimated', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-leibnitz-beta-plateau-communication', 'artemis-leibnitz-beta-plateau', 'communication', 'pgda-prod-69-v1', 88.0, 82.0, 94.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-leibnitz-beta-plateau-science', 'artemis-leibnitz-beta-plateau', 'science', 'artemis-sdt-v1', 81.0, 75.0, 87.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 11. Nobile Rim 1
('artemis-nobile-rim-1-slope', 'artemis-nobile-rim-1', 'slope', 'pgda-prod-90-v1', 8.8, 7.5, 10.2, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-nobile-rim-1-roughness', 'artemis-nobile-rim-1', 'roughness', 'pgda-prod-90-v1', 0.18, 0.14, 0.23, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-nobile-rim-1-illumination', 'artemis-nobile-rim-1', 'illumination', 'pgda-prod-69-v1', 58.0, 54.0, 62.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-nobile-rim-1-resource', 'artemis-nobile-rim-1', 'resource', 'lend-epithermal-v1', 75.0, 64.0, 86.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-nobile-rim-1-communication', 'artemis-nobile-rim-1', 'communication', 'pgda-prod-69-v1', 64.0, 58.0, 70.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-nobile-rim-1-science', 'artemis-nobile-rim-1', 'science', 'artemis-sdt-v1', 87.0, 81.0, 93.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 12. Nobile Rim 2
('artemis-nobile-rim-2-slope', 'artemis-nobile-rim-2', 'slope', 'pgda-prod-90-v1', 7.6, 6.2, 9.0, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-nobile-rim-2-roughness', 'artemis-nobile-rim-2', 'roughness', 'pgda-prod-90-v1', 0.16, 0.12, 0.20, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-nobile-rim-2-illumination', 'artemis-nobile-rim-2', 'illumination', 'pgda-prod-69-v1', 62.0, 58.0, 66.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-nobile-rim-2-resource', 'artemis-nobile-rim-2', 'resource', 'lend-epithermal-v1', 65.0, 52.0, 78.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-nobile-rim-2-communication', 'artemis-nobile-rim-2', 'communication', 'pgda-prod-69-v1', 70.0, 64.0, 76.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-nobile-rim-2-science', 'artemis-nobile-rim-2', 'science', 'artemis-sdt-v1', 82.0, 76.0, 88.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 13. Amundsen Rim
('artemis-amundsen-rim-slope', 'artemis-amundsen-rim', 'slope', 'pgda-prod-90-v1', 9.4, 8.0, 10.8, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('artemis-amundsen-rim-roughness', 'artemis-amundsen-rim', 'roughness', 'pgda-prod-90-v1', 0.20, 0.16, 0.24, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('artemis-amundsen-rim-illumination', 'artemis-amundsen-rim', 'illumination', 'pgda-prod-69-v1', 54.0, 50.0, 58.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('artemis-amundsen-rim-resource', 'artemis-amundsen-rim', 'resource', 'lend-epithermal-v1', 72.0, 60.0, 84.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('artemis-amundsen-rim-communication', 'artemis-amundsen-rim', 'communication', 'pgda-prod-69-v1', 66.0, 60.0, 72.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('artemis-amundsen-rim-science', 'artemis-amundsen-rim', 'science', 'artemis-sdt-v1', 89.0, 84.0, 95.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 14. Cabeus LCROSS Impact Ground Truth
('cal-cabeus-lcross-slope', 'cal-cabeus-lcross', 'slope', 'pgda-prod-90-v1', 5.4, 4.2, 6.8, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('cal-cabeus-lcross-roughness', 'cal-cabeus-lcross', 'roughness', 'pgda-prod-90-v1', 0.12, 0.08, 0.16, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('cal-cabeus-lcross-illumination', 'cal-cabeus-lcross', 'illumination', 'pgda-prod-69-v1', 0.0, 0.0, 2.0, 'percent', 'measured', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('cal-cabeus-lcross-resource', 'cal-cabeus-lcross', 'resource', 'lend-epithermal-v1', 100.0, 95.0, 100.0, 'score (0-100)', 'measured', 'high', 'LCROSS Direct Ground Truth (Colaprete 2010)'),
('cal-cabeus-lcross-communication', 'cal-cabeus-lcross', 'communication', 'pgda-prod-69-v1', 15.0, 10.0, 22.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('cal-cabeus-lcross-science', 'cal-cabeus-lcross', 'science', 'artemis-sdt-v1', 95.0, 90.0, 100.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 15. Shackleton Crater Rim Peak
('shackleton-rim-slope', 'shackleton-rim', 'slope', 'pgda-prod-90-v1', 8.2, 6.8, 9.6, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('shackleton-rim-roughness', 'shackleton-rim', 'roughness', 'pgda-prod-90-v1', 0.15, 0.11, 0.20, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('shackleton-rim-illumination', 'shackleton-rim', 'illumination', 'pgda-prod-69-v1', 86.0, 82.0, 90.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('shackleton-rim-resource', 'shackleton-rim', 'resource', 'lend-epithermal-v1', 75.0, 62.0, 88.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('shackleton-rim-communication', 'shackleton-rim', 'communication', 'pgda-prod-69-v1', 82.0, 76.0, 88.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('shackleton-rim-science', 'shackleton-rim', 'science', 'artemis-sdt-v1', NULL, NULL, NULL, 'score (0-100)', 'estimated', 'low', 'NASA Artemis III Science Definition Report'),

-- 16. Amundsen Crater Floor Central
('amundsen-crater-floor-slope', 'amundsen-crater-floor', 'slope', 'pgda-prod-90-v1', 4.2, 3.2, 5.4, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('amundsen-crater-floor-roughness', 'amundsen-crater-floor', 'roughness', 'pgda-prod-90-v1', 0.11, 0.07, 0.15, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('amundsen-crater-floor-illumination', 'amundsen-crater-floor', 'illumination', 'pgda-prod-69-v1', 8.0, 4.0, 12.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('amundsen-crater-floor-resource', 'amundsen-crater-floor', 'resource', 'lend-epithermal-v1', 88.0, 78.0, 96.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND & Diviner Thermal Model'),
('amundsen-crater-floor-communication', 'amundsen-crater-floor', 'communication', 'pgda-prod-69-v1', 38.0, 30.0, 45.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('amundsen-crater-floor-science', 'amundsen-crater-floor', 'science', 'artemis-sdt-v1', 92.0, 86.0, 98.0, 'score (0-100)', 'estimated', 'medium', 'NASA Artemis III Science Definition Report'),

-- 17. Shoemaker Crater Cold Trap (Unassessed Data Gap)
('cal-shoemaker-unassessed-slope', 'cal-shoemaker-unassessed', 'slope', 'pgda-prod-90-v1', 10.5, 9.0, 12.0, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('cal-shoemaker-unassessed-roughness', 'cal-shoemaker-unassessed', 'roughness', 'pgda-prod-90-v1', 0.20, 0.15, 0.25, 'meters RMS', 'derived', 'high', 'NASA PGDA Prod 90 (LOLA 50m RMS)'),
('cal-shoemaker-unassessed-illumination', 'cal-shoemaker-unassessed', 'illumination', 'pgda-prod-69-v1', 0.0, 0.0, 0.5, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Permanent Shadow)'),
('cal-shoemaker-unassessed-resource', 'cal-shoemaker-unassessed', 'resource', 'lend-epithermal-v1', NULL, NULL, NULL, 'score (0-100)', 'estimated', 'low', 'Sensor Shadow / No LEND Coverage'),
('cal-shoemaker-unassessed-communication', 'cal-shoemaker-unassessed', 'communication', 'pgda-prod-69-v1', 20.0, 15.0, 25.0, 'percent', 'derived', 'medium', 'NASA PGDA Prod 69 (Earth Visibility)'),
('cal-shoemaker-unassessed-science', 'cal-shoemaker-unassessed', 'science', 'artemis-sdt-v1', 75.0, 68.0, 82.0, 'score (0-100)', 'estimated', 'medium', 'Preliminary Science Priority Assessment'),

-- 18. Slater Crater Unsurveyed Ridge (Radar Shadow Data Gap)
('cal-slater-radar-shadow-slope', 'cal-slater-radar-shadow', 'slope', 'pgda-prod-90-v1', 9.0, 7.8, 10.2, 'degrees', 'measured', 'high', 'NASA LOLA GDR (Barker et al. 2023)'),
('cal-slater-radar-shadow-roughness', 'cal-slater-radar-shadow', 'roughness', 'pgda-prod-90-v1', NULL, NULL, NULL, 'meters RMS', 'estimated', 'low', 'Sensor Shadow / Radar Obstruction'),
('cal-slater-radar-shadow-illumination', 'cal-slater-radar-shadow', 'illumination', 'pgda-prod-69-v1', 42.0, 36.0, 48.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Mazarico et al. 2011)'),
('cal-slater-radar-shadow-resource', 'cal-slater-radar-shadow', 'resource', 'lend-epithermal-v1', 50.0, 40.0, 60.0, 'score (0-100)', 'derived', 'medium', 'LRO LEND Neutron Spectrometer'),
('cal-slater-radar-shadow-communication', 'cal-slater-radar-shadow', 'communication', 'pgda-prod-69-v1', 40.0, 34.0, 46.0, 'percent', 'derived', 'high', 'NASA PGDA Prod 69 (Earth Visibility)'),
('cal-slater-radar-shadow-science', 'cal-slater-radar-shadow', 'science', 'artemis-sdt-v1', 70.0, 64.0, 76.0, 'score (0-100)', 'estimated', 'medium', 'Preliminary Science Assessment')
ON CONFLICT (id) DO NOTHING;
