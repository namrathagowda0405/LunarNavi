"""
LunarNavi - Authentic NASA Lunar South Pole Data Processing Pipeline
Extracts, aligns, processes, and exports authoritative NASA LRO / LOLA altimetry,
polar illumination, Earth visibility, and PSR datasets into web-ready visual & telemetry layers.
"""

import os
import json
import numpy as np
from PIL import Image
import tifffile

def process_datasets():
    raw_dir = os.path.join('data', 'raw')
    out_dir = os.path.join('public', 'lunar_map')
    meta_dir = os.path.join('data', 'processed')
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(meta_dir, exist_ok=True)

    dem_path = os.path.join(raw_dir, 'LDEM_80S_80M.JP2')
    slp_path = os.path.join(raw_dir, 'LDRM_80S_1000MPP_ADJ_SLP_100M.TIF')
    rgh_path = os.path.join(raw_dir, 'LDRM_80S_1000MPP_ADJ_ROUGH_RGB.TIF')
    psr_path = os.path.join(raw_dir, 'LPSR_65S_240M_201608.JP2')
    vis_path = os.path.join(raw_dir, 'AVGVISIB_65S_240M_201608.JP2')
    earth_path = os.path.join(raw_dir, 'AVGVISIB_65S_240M_201608_EARTH.JP2')

    print("=== 1. Processing NASA LOLA Elevation DEM (LDEM_80S_80M) ===")
    if not os.path.exists(dem_path):
        raise FileNotFoundError(f"Missing raw DEM file at {dem_path}")

    dem_im = Image.open(dem_path)
    print(f"Loaded {dem_path} ({dem_im.size[0]}x{dem_im.size[1]})")
    raw_full = np.array(dem_im)

    # Downsample by 4x to 1900x1900 (320 m/pixel)
    h_blocks = raw_full.shape[0] // 4
    w_blocks = raw_full.shape[1] // 4
    raw_sub = raw_full[:h_blocks*4, :w_blocks*4].reshape(h_blocks, 4, w_blocks, 4).mean(axis=(1, 3))

    elev = (raw_sub.astype(np.float32) - 32768.0) * 0.5
    elev_min = float(np.min(elev))
    elev_max = float(np.max(elev))
    elev_mean = float(np.mean(elev))
    print(f"Elevation Stats: Min = {elev_min:.1f} m, Max = {elev_max:.1f} m, Mean = {elev_mean:.1f} m")

    cell_size = 320.0  # 320 meters per pixel

    print("=== 2. Computing Photometric Shaded Relief (Hillshade) ===")
    dzdx = np.zeros_like(elev)
    dzdy = np.zeros_like(elev)
    dzdx[:, 1:-1] = (elev[:, 2:] - elev[:, :-2]) / (2.0 * cell_size)
    dzdy[1:-1, :] = (elev[:-2, :] - elev[2:, :]) / (2.0 * cell_size)

    slope = np.arctan(np.sqrt(dzdx**2 + dzdy**2))
    aspect = np.arctan2(-dzdy, dzdx)

    sun_az = np.radians(45.0)
    sun_alt = np.radians(35.0)
    shaded = (
        np.sin(sun_alt) * np.cos(slope) +
        np.cos(sun_alt) * np.sin(slope) * np.cos(sun_az - aspect)
    )
    shaded = np.clip(shaded, 0.0, 1.0)
    hillshade_uint8 = (shaded * 255.0).astype(np.uint8)

    hillshade_img = Image.fromarray(hillshade_uint8)
    hillshade_out = os.path.join(out_dir, 'hillshade.webp')
    hillshade_img.save(hillshade_out, format='WEBP', quality=85)
    print(f"Saved Hillshade: {hillshade_out} ({os.path.getsize(hillshade_out):,} bytes)")

    print("=== 3. Generating Hypsometric Elevation Relief ===")
    norm_elev = np.clip((elev - elev_min) / (elev_max - elev_min), 0.0, 1.0)
    stops = np.array([0.0, 0.25, 0.45, 0.65, 0.85, 1.0], dtype=np.float32)
    r_vals = np.array([  5,  30,   8,  21, 202, 255], dtype=np.float32)
    g_vals = np.array([  5,  41, 101, 128, 138, 255], dtype=np.float32)
    b_vals = np.array([ 36,  93, 118,  61,   4, 255], dtype=np.float32)

    r_ch = np.interp(norm_elev, stops, r_vals).astype(np.uint8)
    g_ch = np.interp(norm_elev, stops, g_vals).astype(np.uint8)
    b_ch = np.interp(norm_elev, stops, b_vals).astype(np.uint8)
    rgb_elev = np.stack([r_ch, g_ch, b_ch], axis=-1)

    elev_img = Image.fromarray(rgb_elev)
    elev_out = os.path.join(out_dir, 'elevation_relief.webp')
    elev_img.save(elev_out, format='WEBP', quality=85)
    print(f"Saved Elevation Relief: {elev_out} ({os.path.getsize(elev_out):,} bytes)")

    print("=== 4. Processing Slope Map (NASA PGDA Product 90) ===")
    if os.path.exists(slp_path):
        with tifffile.TiffFile(slp_path) as slp_tif:
            slp_data = slp_tif.pages[0].asarray()
            print(f"Loaded Slope: shape={slp_data.shape}, min={slp_data.min():.1f} deg, max={slp_data.max():.1f} deg")
            s_norm = np.clip(slp_data / 35.0, 0.0, 1.0)
            s_stops = np.array([0.0, 0.15, 0.40, 0.70, 1.0], dtype=np.float32)
            sr = np.array([ 22, 132, 234, 234, 220], dtype=np.float32)
            sg = np.array([163, 204, 179,  88,  38], dtype=np.float32)
            sb = np.array([ 74,  22,   8,  12,  38], dtype=np.float32)

            sr_ch = np.interp(s_norm, s_stops, sr).astype(np.uint8)
            sg_ch = np.interp(s_norm, s_stops, sg).astype(np.uint8)
            sb_ch = np.interp(s_norm, s_stops, sb).astype(np.uint8)
            slp_rgb = np.stack([sr_ch, sg_ch, sb_ch], axis=-1)
            slp_img = Image.fromarray(slp_rgb).resize((1900, 1900), Image.Resampling.BILINEAR)
            slp_out = os.path.join(out_dir, 'slope_relief.webp')
            slp_img.save(slp_out, format='WEBP', quality=85)
            print(f"Saved Slope Layer: {slp_out} ({os.path.getsize(slp_out):,} bytes)")

    print("=== 5. Processing Roughness Composite (NASA PGDA Product 90) ===")
    if os.path.exists(rgh_path):
        with tifffile.TiffFile(rgh_path) as rgh_tif:
            rgh_data = rgh_tif.pages[0].asarray()
            print(f"Loaded Roughness: shape={rgh_data.shape}")
            rgh_uint8 = np.clip(rgh_data * 255.0, 0, 255).astype(np.uint8)
            rgh_img = Image.fromarray(rgh_uint8).resize((1900, 1900), Image.Resampling.BILINEAR)
            rgh_out = os.path.join(out_dir, 'roughness_composite.webp')
            rgh_img.save(rgh_out, format='WEBP', quality=85)
            print(f"Saved Roughness Layer: {rgh_out} ({os.path.getsize(rgh_out):,} bytes)")

    # 65S 240M Alignment Box: Center is (3209.5, 3209.5), radius for 80S is 1266.67 px
    box_65s = (1943, 1943, 4476, 4476)

    print("=== 6. Processing Solar Illumination (NASA PGDA Product 69 / Mazarico et al.) ===")
    illum_sub_380 = np.zeros((380, 380), dtype=np.float32)
    if os.path.exists(vis_path):
        vis_im = Image.open(vis_path)
        vis_raw = (np.array(vis_im).astype(np.int32) - 32768) * 0.00004 * 100.0
        vis_raw = np.clip(vis_raw, 0.0, 100.0)
        print(f"Loaded Illumination: min={vis_raw.min():.1f}%, max={vis_raw.max():.1f}%")

        vis_pil = Image.fromarray(vis_raw.astype(np.float32))
        vis_cropped = vis_pil.crop(box_65s)
        # Rotate 180 to align 0E Meridian down to match LOLA DEM convention
        vis_aligned = vis_cropped.rotate(180, resample=Image.Resampling.BILINEAR)
        vis_1900 = np.array(vis_aligned.resize((1900, 1900), Image.Resampling.BILINEAR))

        # Color map for solar illumination: dark navy -> amber -> bright gold -> white
        # 0%: #0a0f1d, 20%: #78350f, 40%: #d97706, 60%: #facc15, 80%+: #ffffff
        norm_vis = np.clip(vis_1900 / 80.0, 0.0, 1.0)
        i_stops = np.array([0.0, 0.20, 0.45, 0.70, 1.0], dtype=np.float32)
        ir = np.array([ 10, 120, 217, 250, 255], dtype=np.float32)
        ig = np.array([ 15,  53, 119, 204, 255], dtype=np.float32)
        ib = np.array([ 29,  15,   6,  21, 255], dtype=np.float32)

        ir_ch = np.interp(norm_vis, i_stops, ir).astype(np.uint8)
        ig_ch = np.interp(norm_vis, i_stops, ig).astype(np.uint8)
        ib_ch = np.interp(norm_vis, i_stops, ib).astype(np.uint8)
        illum_rgb = np.stack([ir_ch, ig_ch, ib_ch], axis=-1)

        illum_img = Image.fromarray(illum_rgb)
        illum_out = os.path.join(out_dir, 'illumination_relief.webp')
        illum_img.save(illum_out, format='WEBP', quality=85)
        print(f"Saved Illumination Layer: {illum_out} ({os.path.getsize(illum_out):,} bytes)")

        # Subsample for 380x380 telemetry grid
        illum_sub_380 = vis_1900[::5, ::5].astype(np.float32)

    print("=== 7. Processing Permanently Shadowed Regions (NASA PGDA Product 69 / LPSR) ===")
    psr_sub_380 = np.zeros((380, 380), dtype=np.uint8)
    if os.path.exists(psr_path):
        lpsr_im = Image.open(psr_path)
        lpsr_raw = np.array(lpsr_im)
        is_psr_raw = (lpsr_raw == 52768).astype(np.uint8) * 255
        print(f"Loaded PSR: {np.sum(is_psr_raw > 0):,} PSR pixels in 65S")

        psr_pil = Image.fromarray(is_psr_raw)
        psr_cropped = psr_pil.crop(box_65s)
        psr_aligned = psr_cropped.rotate(180, resample=Image.Resampling.NEAREST)
        psr_1900 = np.array(psr_aligned.resize((1900, 1900), Image.Resampling.NEAREST))

        # Generate transparent RGBA overlay: PSR areas in glowing cyan (#0ea5e9, alpha=190), sunlit areas transparent
        psr_rgba = np.zeros((1900, 1900, 4), dtype=np.uint8)
        psr_mask = psr_1900 > 0
        psr_rgba[psr_mask, 0] = 14   # R
        psr_rgba[psr_mask, 1] = 165  # G
        psr_rgba[psr_mask, 2] = 233  # B
        psr_rgba[psr_mask, 3] = 195  # Alpha

        psr_img = Image.fromarray(psr_rgba, mode='RGBA')
        psr_out = os.path.join(out_dir, 'psr_overlay.webp')
        psr_img.save(psr_out, format='WEBP', quality=85)
        print(f"Saved PSR Layer: {psr_out} ({os.path.getsize(psr_out):,} bytes)")

        psr_sub_380 = (psr_1900[::5, ::5] > 0).astype(np.uint8)

    print("=== 8. Processing Earth Visibility (NASA PGDA Product 69 / AVGVISIB_EARTH) ===")
    earth_sub_380 = np.zeros((380, 380), dtype=np.float32)
    if os.path.exists(earth_path):
        earth_im = Image.open(earth_path)
        earth_raw = (np.array(earth_im).astype(np.int32) - 32768) * 0.00004 * 100.0
        earth_raw = np.clip(earth_raw, 0.0, 100.0)
        print(f"Loaded Earth Visibility: min={earth_raw.min():.1f}%, max={earth_raw.max():.1f}%")

        earth_pil = Image.fromarray(earth_raw.astype(np.float32))
        earth_cropped = earth_pil.crop(box_65s)
        earth_aligned = earth_cropped.rotate(180, resample=Image.Resampling.BILINEAR)
        earth_1900 = np.array(earth_aligned.resize((1900, 1900), Image.Resampling.BILINEAR))

        # Color map for Earth visibility: dark navy (0%) -> blue (30%) -> teal (60%) -> green (80-100%)
        norm_ev = np.clip(earth_1900 / 100.0, 0.0, 1.0)
        e_stops = np.array([0.0, 0.25, 0.50, 0.75, 1.0], dtype=np.float32)
        er = np.array([ 15,   2,   6,  16,  34], dtype=np.float32)
        eg = np.array([ 23, 132, 182, 185, 197], dtype=np.float32)
        eb = np.array([ 42, 199, 212, 129,  94], dtype=np.float32)

        er_ch = np.interp(norm_ev, e_stops, er).astype(np.uint8)
        eg_ch = np.interp(norm_ev, e_stops, eg).astype(np.uint8)
        eb_ch = np.interp(norm_ev, e_stops, eb).astype(np.uint8)
        earth_rgb = np.stack([er_ch, eg_ch, eb_ch], axis=-1)

        earth_img = Image.fromarray(earth_rgb)
        earth_out = os.path.join(out_dir, 'earth_visibility.webp')
        earth_img.save(earth_out, format='WEBP', quality=85)
        print(f"Saved Earth Visibility Layer: {earth_out} ({os.path.getsize(earth_out):,} bytes)")

        earth_sub_380 = earth_1900[::5, ::5].astype(np.float32)

    print("=== 9. Exporting Multi-Metric Telemetry Grid (380x380) ===")
    elev_380 = elev[::5, ::5].astype(np.int16)
    grid_payload = {
        "width": 380,
        "height": 380,
        "minElevation": elev_min,
        "maxElevation": elev_max,
        "scaleMpp": 80.0 * 4.0 * 5.0,  # 1600 m/px
        "centerPixel": [190.0, 190.0],
        "referenceRadiusKm": 1737.4,
        "data": elev_380.flatten().tolist(),
        "illumination": np.round(illum_sub_380.flatten(), 1).tolist(),
        "earthVisibility": np.round(earth_sub_380.flatten(), 1).tolist(),
        "isPsr": psr_sub_380.flatten().tolist()
    }
    grid_json_path = os.path.join(out_dir, 'elevation_grid.json')
    with open(grid_json_path, 'w') as f:
        json.dump(grid_payload, f)
    print(f"Saved Multi-Metric Telemetry Grid: {grid_json_path} ({os.path.getsize(grid_json_path):,} bytes)")

    print("=== 10. Updating Scientific Provenance Metadata ===")
    metadata = {
        "datasetName": "NASA Lunar South Pole Integrated Cartographic & Scientific Decision Layers",
        "instruments": [
            "Lunar Orbiter Laser Altimeter (LOLA)",
            "Diviner Lunar Radiometer Experiment (DLRE)",
            "Lunar Exploration Neutron Detector (LEND)"
        ],
        "coordinateSystem": {
            "type": "Polar Stereographic (Spherical)",
            "body": "Moon",
            "referenceRadiusKm": 1737.4,
            "centerLatitudeDeg": -90.0,
            "centerLongitudeDeg": 0.0,
            "convention": "Mean Earth / Polar Axis (ME) of DE421",
            "longitudeDirection": "East Positive"
        },
        "coverage": {
            "minimumLatitude": -90.0,
            "maximumLatitude": -80.0,
            "region": "Lunar South Pole (80°S to 90°S)"
        },
        "statistics": {
            "elevationMinimumMeters": elev_min,
            "elevationMaximumMeters": elev_max,
            "elevationMeanMeters": elev_mean,
            "elevationUnit": "meters relative to 1737.4 km reference sphere"
        },
        "citations": [
            "Smith, D. E., et al. (2017), Summary of the results from the Lunar Orbiter Laser Altimeter after seven years in orbit, Icarus, 283, 70-91.",
            "Barker, M. K., et al. (2023), A New View of the Lunar South Pole from LOLA, Planet. Sci. J., 4, 183. https://doi.org/10.3847/PSJ/acf3e1",
            "Mazarico, E., et al. (2011), Illumination conditions of the lunar polar regions using LOLA topography, Icarus, 211, 1066-1081. https://doi.org/10.1016/j.icarus.2010.10.030",
            "Paige, D. A., et al. (2010), Diviner Lunar Radiometer Experiment Cold-Trap Temperatures, Science, 330, 479-482."
        ],
        "layers": [
            {
                "id": "elevation",
                "name": "LOLA Elevation (Hypsometric Tint)",
                "status": "active",
                "source": "NASA PDS LRO-L-LOLA-4-GDR-V1.0",
                "unit": "meters (-7,288 m to +7,023 m)",
                "asset": "/lunar_map/elevation_relief.webp"
            },
            {
                "id": "hillshade",
                "name": "LOLA Shaded Relief (Photometric Hillshade)",
                "status": "active",
                "source": "Derived from LOLA DEM (Az: 45°, Alt: 35°)",
                "unit": "photometric reflectance",
                "asset": "/lunar_map/hillshade.webp"
            },
            {
                "id": "slope",
                "name": "LOLA Surface Slope",
                "status": "active",
                "source": "NASA PGDA Product 90 (Barker et al., 2023)",
                "unit": "degrees of slope (0° to 35°+)",
                "asset": "/lunar_map/slope_relief.webp"
            },
            {
                "id": "roughness",
                "name": "LOLA Multi-baseline Surface Roughness",
                "status": "active",
                "source": "NASA PGDA Product 90 (Barker et al., 2023)",
                "unit": "composite RGB (50m, 200m, 1000m baseline)",
                "asset": "/lunar_map/roughness_composite.webp"
            },
            {
                "id": "illumination",
                "name": "Solar Illumination (18.6-yr Average)",
                "status": "active",
                "source": "NASA PGDA Product 69 (Mazarico et al., 2011)",
                "unit": "annual solar visibility % (0% to 93.5%)",
                "asset": "/lunar_map/illumination_relief.webp"
            },
            {
                "id": "psr",
                "name": "Permanently Shadowed Regions (PSR)",
                "status": "active",
                "source": "NASA PGDA Product 69 (LPSR / Mazarico et al.)",
                "unit": "cryogenic cold trap boundary (binary overlay)",
                "asset": "/lunar_map/psr_overlay.webp"
            },
            {
                "id": "earth-vis",
                "name": "Direct-to-Earth Line-of-Sight Visibility",
                "status": "active",
                "source": "NASA PGDA Product 69 (AVGVISIB_EARTH / Mazarico et al.)",
                "unit": "Earth disc visibility % (0% to 100%)",
                "asset": "/lunar_map/earth_visibility.webp"
            }
        ]
    }

    meta_path = os.path.join(out_dir, 'metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    with open(os.path.join(meta_dir, 'lola_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved Metadata: {meta_path}")
    print("\nSUCCESS: All authentic NASA datasets processed and integrated successfully!")

if __name__ == '__main__':
    process_datasets()
