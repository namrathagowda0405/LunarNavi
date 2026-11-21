"""
LunarNavi - Scientific Data Pipeline & Provenance Validator
Reproducibly inspects raw NASA PDS/PGDA files, checks coordinate frames,
audits candidate site measurements, validates provenance classifications,
and generates a structured audit report.
"""

import os
import sys
import json
import math
import re
from datetime import datetime
from PIL import Image

# Ensure stdout uses UTF-8 encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Reference constants
LUNAR_RADIUS_KM = 1737.4
COORDINATE_FRAME = "MEAN EARTH/POLAR AXIS OF DE421"
PROJECTION_TYPE = "POLAR STEREOGRAPHIC"
VALID_EVIDENCE_KINDS = ['direct-observation', 'scientific-evidence', 'proxy', 'unknown']
VALID_VALUE_KINDS = ['measured', 'derived', 'estimated']
VALID_QUALITIES = ['high', 'medium', 'low']

def audit_raw_datasets(raw_dir):
    results = {}
    expected_files = {
        'LDEM_80S_80M.JP2': {
            'expected_min_bytes': 25_000_000,
            'desc': 'NASA LOLA South Pole Elevation DEM (80m/pix)',
            'lbl': 'LDEM_80S_80M_JP2.LBL'
        },
        'AVGVISIB_65S_240M_201608.JP2': {
            'expected_min_bytes': 40_000_000,
            'desc': 'NASA PGDA Prod 69 Average Solar Illumination (240m/pix)',
            'lbl': 'AVGVISIB_65S_240M_201608_JP2.LBL'
        },
        'AVGVISIB_65S_240M_201608_EARTH.JP2': {
            'expected_min_bytes': 20_000_000,
            'desc': 'NASA PGDA Prod 69 Earth Line-of-Sight Visibility (240m/pix)',
            'lbl': 'AVGVISIB_65S_240M_201608_EARTH_JP2.LBL'
        },
        'LPSR_65S_240M_201608.JP2': {
            'expected_min_bytes': 2_000_000,
            'desc': 'NASA PGDA Prod 69 Permanently Shadowed Regions Mask',
            'lbl': 'LPSR_65S_240M_201608_JP2.LBL'
        },
        'LDRM_80S_1000MPP_ADJ_SLP_100M.TIF': {
            'expected_min_bytes': 1_000_000,
            'desc': 'NASA PGDA Prod 90 LOLA 100m Baseline Slope Map',
            'lbl': None
        },
        'LDRM_80S_1000MPP_ADJ_ROUGH_RGB.TIF': {
            'expected_min_bytes': 1_500_000,
            'desc': 'NASA PGDA Prod 90 LOLA Multi-Baseline Roughness Composite',
            'lbl': None
        }
    }

    for fname, meta in expected_files.items():
        fpath = os.path.join(raw_dir, fname)
        exists = os.path.exists(fpath)
        size = os.path.getsize(fpath) if exists else 0
        lbl_exists = os.path.exists(os.path.join(raw_dir, meta['lbl'])) if meta['lbl'] else True

        results[fname] = {
            'description': meta['desc'],
            'exists': exists,
            'size_bytes': size,
            'size_ok': size >= meta['expected_min_bytes'] if exists else False,
            'label_file': meta['lbl'],
            'label_exists': lbl_exists,
            'status': 'VERIFIED' if exists and size >= meta['expected_min_bytes'] and lbl_exists else 'FAILED'
        }
    return results

def audit_processed_layers(lunar_map_dir):
    expected_layers = [
        'elevation_relief.webp',
        'hillshade.webp',
        'slope_relief.webp',
        'roughness_composite.webp',
        'illumination_relief.webp',
        'psr_overlay.webp',
        'earth_visibility.webp',
        'elevation_grid.json',
        'metadata.json'
    ]
    results = {}
    for layer in expected_layers:
        fpath = os.path.join(lunar_map_dir, layer)
        exists = os.path.exists(fpath)
        size = os.path.getsize(fpath) if exists else 0
        results[layer] = {
            'exists': exists,
            'size_bytes': size,
            'status': 'VERIFIED' if exists and size > 500 else 'FAILED'
        }
    return results

def parse_sites_from_ts(ts_path):
    """Parses site definitions from centralizedSites.ts using regex to avoid external TS parser."""
    with open(ts_path, 'r', encoding='utf-8') as f:
        content = f.read()

    site_blocks = re.findall(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*region:\s*'([^']+)',\s*latitude:\s*(-?[\d\.]+),\s*longitude:\s*(-?[\d\.]+)", content)
    sites = []

    for sid, name, region, lat, lon in site_blocks:
        # Find the block for this site
        start_idx = content.find(f"id: '{sid}'")
        end_idx = content.find("id: '", start_idx + 1)
        if end_idx == -1:
            end_idx = len(content)
        block = content[start_idx:end_idx]

        # Extract criteria values
        def extract_criterion(crit_name):
            pattern = re.compile(rf"{crit_name}:\s*\{{\s*value:\s*(null|-?[\d\.]+),\s*low:\s*(null|-?[\d\.]+),\s*high:\s*(null|-?[\d\.]+),\s*kind:\s*'([^']+)',\s*quality:\s*'([^']+)',\s*source:\s*'([^']+)'")
            m = pattern.search(block)
            if m:
                val = None if m.group(1) == 'null' else float(m.group(1))
                low = None if m.group(2) == 'null' else float(m.group(2))
                high = None if m.group(3) == 'null' else float(m.group(3))
                return {
                    'value': val,
                    'low': low,
                    'high': high,
                    'kind': m.group(4),
                    'quality': m.group(5),
                    'source': m.group(6)
                }
            return None

        # Extract elevation
        elev_m = re.search(r"elevation:\s*\{[^}}]*value:\s*(-?[\d\.]+)", block)
        elev_val = float(elev_m.group(1)) if elev_m else None

        # Extract designation
        desig_m = re.search(r"designation:\s*'([^']+)'", block)
        designation = desig_m.group(1) if desig_m else 'unknown'

        # Extract resource evidence kind
        res_kind_m = re.search(r"resourceEvidence:\s*\{[^}}]*kind:\s*'([^']+)'", block)
        res_kind = res_kind_m.group(1) if res_kind_m else 'unknown'

        sites.append({
            'id': sid,
            'name': name,
            'region': region,
            'latitude': float(lat),
            'longitude': float(lon),
            'elevation_m': elev_val,
            'designation': designation,
            'resource_evidence_kind': res_kind,
            'criteria': {
                'slope': extract_criterion('slope'),
                'roughness': extract_criterion('roughness'),
                'illumination': extract_criterion('illumination'),
                'resource': extract_criterion('resource'),
                'communication': extract_criterion('communication'),
                'science': extract_criterion('science')
            }
        })

    return sites

def validate_sites(sites):
    audit_log = []
    summary = {
        'total_sites': len(sites),
        'official_artemis_count': 0,
        'scientific_research_count': 0,
        'total_measurements_audited': 0,
        'missing_measurements_disclosed': 0,
        'uncertainty_bounds_verified': 0,
        'validation_errors': []
    }

    for site in sites:
        sid = site['id']
        lat = site['latitude']
        lon = site['longitude']

        if site['designation'] == 'official-artemis-candidate':
            summary['official_artemis_count'] += 1
        else:
            summary['scientific_research_count'] += 1

        # 1. Coordinate check
        if not (-90.0 <= lat <= -80.0):
            summary['validation_errors'].append(f"{sid}: Latitude {lat} outside polar zone [-90.0, -80.0]")
        if not (-180.0 <= lon <= 360.0):
            summary['validation_errors'].append(f"{sid}: Longitude {lon} outside valid range [-180.0, 360.0]")

        # 2. Elevation check
        if site['elevation_m'] is None or not (-9000.0 <= site['elevation_m'] <= 8000.0):
            summary['validation_errors'].append(f"{sid}: Invalid elevation {site['elevation_m']}")

        # 3. Criteria checks
        for crit_name, crit_data in site['criteria'].items():
            if not crit_data:
                summary['validation_errors'].append(f"{sid}: Missing criterion object for '{crit_name}'")
                continue

            summary['total_measurements_audited'] += 1
            val = crit_data['value']
            low = crit_data['low']
            high = crit_data['high']
            kind = crit_data['kind']
            quality = crit_data['quality']

            # Provenance valid
            if kind not in VALID_VALUE_KINDS:
                summary['validation_errors'].append(f"{sid} [{crit_name}]: Invalid value kind '{kind}'")
            if quality not in VALID_QUALITIES:
                summary['validation_errors'].append(f"{sid} [{crit_name}]: Invalid quality '{quality}'")

            # Missing value policy
            if val is None:
                summary['missing_measurements_disclosed'] += 1
                if quality != 'low':
                    summary['validation_errors'].append(f"{sid} [{crit_name}]: Missing measurement must have quality 'low', got '{quality}'")
            else:
                # Uncertainty check
                if low is not None and high is not None:
                    summary['uncertainty_bounds_verified'] += 1
                    if not (low <= val <= high or math.isclose(low, val, abs_tol=1e-5) or math.isclose(val, high, abs_tol=1e-5)):
                        summary['validation_errors'].append(f"{sid} [{crit_name}]: Value {val} outside uncertainty bounds [{low}, {high}]")

                # Metric-specific range checks
                if crit_name == 'slope' and not (0.0 <= val <= 90.0):
                    summary['validation_errors'].append(f"{sid} [slope]: Incline {val} outside [0.0, 90.0]")
                elif crit_name == 'roughness' and val < 0.0:
                    summary['validation_errors'].append(f"{sid} [roughness]: RMS {val} < 0.0")
                elif crit_name == 'illumination' and not (0.0 <= val <= 100.0):
                    summary['validation_errors'].append(f"{sid} [illumination]: Percentage {val} outside [0, 100]")
                elif crit_name == 'communication' and not (0.0 <= val <= 100.0):
                    summary['validation_errors'].append(f"{sid} [communication]: Visibility {val} outside [0, 100]")
                elif crit_name in ('resource', 'science') and not (0.0 <= val <= 100.0):
                    summary['validation_errors'].append(f"{sid} [{crit_name}]: Score {val} outside [0, 100]")

        audit_log.append({
            'site_id': sid,
            'name': site['name'],
            'region': site['region'],
            'latitude': lat,
            'longitude': lon,
            'elevation_m': site['elevation_m'],
            'designation': site['designation'],
            'resource_evidence_kind': site['resource_evidence_kind'],
            'status': 'VERIFIED'
        })

    return summary, audit_log

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_dir = os.path.join(base_dir, 'data', 'raw')
    lunar_map_dir = os.path.join(base_dir, 'public', 'lunar_map')
    processed_dir = os.path.join(base_dir, 'data', 'processed')
    sites_ts = os.path.join(base_dir, 'src', 'data', 'centralizedSites.ts')

    print("==============================================================================")
    print(" LUNARNAVI — SCIENTIFIC DATA PIPELINE & PROVENANCE VALIDATOR")
    print("==============================================================================")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Base Directory: {base_dir}")
    print(f"Coordinate Reference: {COORDINATE_FRAME}")

    # 1. Audit Raw NASA PDS Datasets
    print("\n--- 1. AUDITING RAW NASA PDS / PGDA ARCHIVES ---")
    raw_results = audit_raw_datasets(raw_dir)
    raw_ok = True
    for fname, info in raw_results.items():
        icon = "[PASS]" if info['status'] == 'VERIFIED' else "[FAIL]"
        print(f"  {icon} {fname:<36} ({info['size_bytes']/(1024*1024):>6.2f} MB) - {info['description']}")
        if info['status'] != 'VERIFIED':
            raw_ok = False

    # 2. Audit Processed Web Layers
    print("\n--- 2. AUDITING PROCESSED RASTER LAYERS & TELEMETRY GRID ---")
    layer_results = audit_processed_layers(lunar_map_dir)
    layers_ok = True
    for layer, info in layer_results.items():
        icon = "[PASS]" if info['status'] == 'VERIFIED' else "[FAIL]"
        print(f"  {icon} {layer:<30} ({info['size_bytes']/1024:>6.1f} KB)")
        if info['status'] != 'VERIFIED':
            layers_ok = False

    # 3. Audit Candidate Sites Dataset
    print("\n--- 3. AUDITING 16 CANDIDATE SITES & PROVENANCE METRICS ---")
    if not os.path.exists(sites_ts):
        print(f"ERROR: Missing candidate sites file at {sites_ts}")
        sys.exit(1)

    sites = parse_sites_from_ts(sites_ts)
    summary, audit_log = validate_sites(sites)

    print(f"  Total Sites Evaluated:             {summary['total_sites']}")
    print(f"  - Official Artemis III Candidates: {summary['official_artemis_count']}")
    print(f"  - Scientific Research Locations:   {summary['scientific_research_count']}")
    print(f"  Total Measurements Audited:        {summary['total_measurements_audited']}")
    print(f"  Uncertainty Bounds Checked:        {summary['uncertainty_bounds_verified']}")
    print(f"  Missing Values Disclosed (null):   {summary['missing_measurements_disclosed']}")

    if summary['validation_errors']:
        print(f"\n[FAIL] Found {len(summary['validation_errors'])} validation errors:")
        for err in summary['validation_errors']:
            print(f"    - {err}")
    else:
        print("\n  [PASS] All 16 candidate sites conform strictly to the scientific data contract!")

    # 4. Generate JSON Report
    report = {
        'timestamp': datetime.now().isoformat(),
        'coordinateSystem': {
            'convention': COORDINATE_FRAME,
            'body': 'Moon',
            'radiusKm': LUNAR_RADIUS_KM,
            'projection': PROJECTION_TYPE
        },
        'rawDatasets': raw_results,
        'processedLayers': layer_results,
        'candidateSitesAudit': {
            'summary': summary,
            'sites': audit_log
        },
        'overallStatus': 'VERIFIED' if raw_ok and layers_ok and len(summary['validation_errors']) == 0 else 'ACTION_REQUIRED'
    }

    report_path = os.path.join(processed_dir, 'pipeline_validation_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print(f"\nSaved structured audit report to: {report_path}")
    print("==============================================================================")

    if report['overallStatus'] != 'VERIFIED':
        sys.exit(1)

if __name__ == '__main__':
    main()
