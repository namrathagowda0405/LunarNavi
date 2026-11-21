import { describe, it, expect } from 'vitest'
import {
  latLonToNormalized,
  normalizedToLatLon,
  LUNAR_LANDMARKS,
  MAP_LAYERS,
  LUNAR_REFERENCE_RADIUS_M,
  NATIVE_MAP_SCALE_M,
} from '../src/frontend/lunarMapData'

describe('lunarMapData projection utilities', () => {
  it('defines correct Moon geodetic constants', () => {
    expect(LUNAR_REFERENCE_RADIUS_M).toBe(1737400.0)
    expect(NATIVE_MAP_SCALE_M).toBe(80.0)
  })

  it('projects South Pole (90S, 0E) exactly to normalized center', () => {
    const { u, v, inBounds } = latLonToNormalized(-90.0, 0.0)
    expect(inBounds).toBe(true)
    // DEM_CENTER_PIXEL is 3799.5 in 7600 -> 0.499934
    expect(u).toBeCloseTo(0.5, 2)
    expect(v).toBeCloseTo(0.5, 2)
  })

  it('inverts normalized center to South Pole (-90S)', () => {
    const { lat, inCoverage } = normalizedToLatLon(3799.5 / 7600.0, 3799.5 / 7600.0)
    expect(inCoverage).toBe(true)
    expect(lat).toBeCloseTo(-90.0, 2)
  })

  it('projects and inverts Shackleton Crater Rim (-89.90S, 0.0E) consistently', () => {
    const targetLat = -89.90
    const targetLon = 0.0
    const { u, v, inBounds } = latLonToNormalized(targetLat, targetLon)
    expect(inBounds).toBe(true)

    const inverted = normalizedToLatLon(u, v)
    expect(inverted.inCoverage).toBe(true)
    expect(inverted.lat).toBeCloseTo(targetLat, 2)
    expect(inverted.lon).toBeCloseTo(targetLon, 1)
  })

  it('projects and inverts Amundsen Crater (-84.50S, 83.0E) consistently', () => {
    const targetLat = -84.50
    const targetLon = 83.0
    const { u, v, inBounds } = latLonToNormalized(targetLat, targetLon)
    expect(inBounds).toBe(true)

    const inverted = normalizedToLatLon(u, v)
    expect(inverted.inCoverage).toBe(true)
    expect(inverted.lat).toBeCloseTo(targetLat, 2)
    expect(inverted.lon).toBeCloseTo(targetLon, 1)
  })

  it('accurately identifies points outside 80S coverage', () => {
    // 75S is outside 80S-90S coverage
    const res = latLonToNormalized(-75.0, 45.0)
    expect(res.inBounds).toBe(false)

    // normalized coordinate at top-left corner (0, 0) is outside the 80S circle
    const inv = normalizedToLatLon(0.02, 0.02)
    expect(inv.inCoverage).toBe(false)
  })

  it('verifies all landmarks have valid south polar coordinates and elevations', () => {
    expect(LUNAR_LANDMARKS.length).toBeGreaterThanOrEqual(10)

    for (const lm of LUNAR_LANDMARKS) {
      expect(lm.latitude).toBeLessThanOrEqual(-80.0)
      expect(lm.latitude).toBeGreaterThanOrEqual(-90.0)
      expect(lm.longitude).toBeGreaterThanOrEqual(0.0)
      expect(lm.longitude).toBeLessThanOrEqual(360.0)
      // Elevation in meters relative to reference sphere should be realistic (-8000m to +8000m)
      expect(lm.elevationMeters).toBeGreaterThan(-8000)
      expect(lm.elevationMeters).toBeLessThan(8000)
      expect(lm.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('verifies all 7 authentic NASA LOLA and PGDA layers are active with valid web assets', () => {
    const activeLayers = MAP_LAYERS.filter((l) => l.status === 'active')
    expect(activeLayers.length).toBe(7)

    const expectedLayerIds = ['elevation', 'hillshade', 'slope', 'roughness', 'illumination', 'psr', 'earth-vis']
    for (const id of expectedLayerIds) {
      const layer = MAP_LAYERS.find((l) => l.id === id)
      expect(layer).toBeDefined()
      expect(layer?.status).toBe('active')
      expect(layer?.assetUrl).toBeDefined()
      expect(layer?.assetUrl?.endsWith('.webp')).toBe(true)
    }
  })
})
