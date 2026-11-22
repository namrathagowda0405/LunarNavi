import { describe, it, expect } from 'vitest'
import { calculateAstronomicalLunarPhase } from '../src/frontend/views/LandingPage'
import {
  calculateAstronomicalSunDirection,
  getLunarPhaseName,
} from '../src/frontend/lunarAstronomy'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

describe('Landing Page & Astronomy Engine Ephemeris Model', () => {
  it('calculates valid lunar phase and illumination for the current date', () => {
    const telemetry = calculateAstronomicalLunarPhase(new Date())

    expect(telemetry.phaseName).toBeTruthy()
    expect(telemetry.illuminationPct).toBeGreaterThanOrEqual(0)
    expect(telemetry.illuminationPct).toBeLessThanOrEqual(100)
    expect(['Waxing', 'Waning']).toContain(telemetry.waxingStatus)
    expect(telemetry.cycleProgressPct).toBeGreaterThanOrEqual(0)
    expect(telemetry.cycleProgressPct).toBeLessThanOrEqual(100)
    expect(telemetry.ageInDays).toBeGreaterThanOrEqual(0)
    expect(telemetry.ageInDays).toBeLessThanOrEqual(30)
    expect(telemetry.calculationModel).toContain('Astronomy Engine')
  })

  it('accurately synchronizes New Moon: illumination ~0% and light oriented behind Moon (-Z)', () => {
    // 2026-12-09 00:52 UTC astronomical New Moon
    const newMoonDate = new Date('2026-12-09T00:52:31Z')
    const telemetry = calculateAstronomicalLunarPhase(newMoonDate)

    expect(telemetry.phaseName).toBe('New Moon')
    expect(telemetry.illuminationPct).toBeLessThan(1.0)
    // Sunlight should come from behind the Moon (-Z) so the Earth-facing near side is in dark shadow
    expect(telemetry.sunDirection.z).toBeLessThan(-0.9)
  })

  it('accurately synchronizes First Quarter: illumination ~50% and right side illuminated (+X)', () => {
    // 2026-12-17 05:43 UTC astronomical First Quarter
    const firstQuarterDate = new Date('2026-12-17T05:43:15Z')
    const telemetry = calculateAstronomicalLunarPhase(firstQuarterDate)

    expect(telemetry.phaseName).toBe('First Quarter')
    expect(telemetry.illuminationPct).toBeGreaterThanOrEqual(48)
    expect(telemetry.illuminationPct).toBeLessThanOrEqual(52)
    expect(telemetry.waxingStatus).toBe('Waxing')
    // Sunlight should come from celestial West / screen Right (+X)
    expect(telemetry.sunDirection.x).toBeGreaterThan(0.9)
    expect(Math.abs(telemetry.sunDirection.z)).toBeLessThan(0.2)
  })

  it('accurately synchronizes Full Moon: illumination ~100% and light oriented toward front (+Z)', () => {
    // 2026-11-24 14:54 UTC astronomical Full Moon
    const fullMoonDate = new Date('2026-11-24T14:54:04Z')
    const telemetry = calculateAstronomicalLunarPhase(fullMoonDate)

    expect(telemetry.phaseName).toBe('Full Moon')
    expect(telemetry.illuminationPct).toBeGreaterThan(99)
    // Sunlight should come from Earth/observer direction (+Z) illuminating the full near side
    expect(telemetry.sunDirection.z).toBeGreaterThan(0.9)
  })

  it('accurately synchronizes Third Quarter: illumination ~50% and left side illuminated (-X)', () => {
    // 2026-12-01 06:09 UTC astronomical Third Quarter
    const thirdQuarterDate = new Date('2026-12-01T06:09:15Z')
    const telemetry = calculateAstronomicalLunarPhase(thirdQuarterDate)

    expect(telemetry.phaseName).toBe('Third Quarter')
    expect(telemetry.illuminationPct).toBeGreaterThanOrEqual(48)
    expect(telemetry.illuminationPct).toBeLessThanOrEqual(52)
    expect(telemetry.waxingStatus).toBe('Waning')
    // Sunlight should come from celestial East / screen Left (-X)
    expect(telemetry.sunDirection.x).toBeLessThan(-0.9)
    expect(Math.abs(telemetry.sunDirection.z)).toBeLessThan(0.2)
  })

  it('validates Sun direction vector is well-formed, finite, and unit-normalized', () => {
    const dates = [
      new Date('2026-11-20T00:00:00Z'),
      new Date('2026-12-01T06:09:15Z'),
      new Date('2026-12-09T00:52:31Z'),
      new Date('2026-12-17T05:43:15Z'),
      new Date('2026-12-24T00:00:00Z'),
    ]

    for (const d of dates) {
      const vec = calculateAstronomicalSunDirection(d)
      expect(Number.isFinite(vec.x)).toBe(true)
      expect(Number.isFinite(vec.y)).toBe(true)
      expect(Number.isFinite(vec.z)).toBe(true)

      const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z)
      expect(magnitude).toBeCloseTo(1.0, 4)
    }
  })

  it('correctly classifies waxing vs waning across the full 360-degree cycle', () => {
    expect(calculateAstronomicalLunarPhase(new Date('2026-12-13T00:00:00Z')).waxingStatus).toBe('Waxing')
    expect(calculateAstronomicalLunarPhase(new Date('2026-12-28T00:00:00Z')).waxingStatus).toBe('Waning')
  })

  it('maps degrees to correct phase nomenclature using getLunarPhaseName', () => {
    expect(getLunarPhaseName(0)).toBe('New Moon')
    expect(getLunarPhaseName(45)).toBe('Waxing Crescent')
    expect(getLunarPhaseName(90)).toBe('First Quarter')
    expect(getLunarPhaseName(135)).toBe('Waxing Gibbous')
    expect(getLunarPhaseName(180)).toBe('Full Moon')
    expect(getLunarPhaseName(225)).toBe('Waning Gibbous')
    expect(getLunarPhaseName(270)).toBe('Third Quarter')
    expect(getLunarPhaseName(315)).toBe('Waning Crescent')
  })

  it('explicitly labels the computation model with Astronomy Engine ephemeris reference', () => {
    const telemetry = calculateAstronomicalLunarPhase()
    expect(telemetry.calculationModel).toBeTruthy()
    expect(telemetry.calculationModel).toContain('Astronomy Engine')
    expect(telemetry.timestampIso).toBeTruthy()
  })

  it('incorporates exact required Lunar Observatory hero copy', () => {
    const landingFile = path.join(currentDir, '../src/frontend/views/LandingPage.tsx')
    const content = fs.readFileSync(landingFile, 'utf-8')

    // Eyebrow
    expect(content).toContain('LUNAR LANDING-SITE DECISION SUPPORT')

    // Main headline
    expect(content).toContain('Find the right place to land.')

    // Supporting text
    expect(content).toContain('Compare lunar sites. Evaluate mission requirements. Understand the trade-offs.')

    // Primary CTA
    expect(content).toContain('Explore LunarNavi')

    // Tagline retained
    expect(content).toContain('From lunar data to informed landing decisions.')

    // Generic slogan removed
    expect(content).not.toContain('Beyond Earth.')
  })

  it('removes misleading Earth-observer telemetry strip from the landing page', () => {
    const landingFile = path.join(currentDir, '../src/frontend/views/LandingPage.tsx')
    const content = fs.readFileSync(landingFile, 'utf-8')

    // Telemetry strip completely removed so Earth phase is not confused with polar surface conditions
    expect(content).not.toContain('lunar-telemetry-strip')
    expect(content).not.toContain('ASTRONOMICAL REFERENCE')
  })

  it('keeps only genuinely implemented Direct Access shortcuts (Lunar Map, Results & Ranking, Data & Sources)', () => {
    const landingFile = path.join(currentDir, '../src/frontend/views/LandingPage.tsx')
    const content = fs.readFileSync(landingFile, 'utf-8')

    expect(content).toContain('Lunar Map')
    expect(content).toContain('Results & Ranking')
    expect(content).toContain('Data & Sources')

    // Mission Setup removed from landing shortcuts
    const quickAccessBlock = content.match(/observatory-quick-access[\s\S]*?<\/nav>/)?.[0] || ''
    expect(quickAccessBlock).not.toContain('Mission Setup')
  })

  it('honestly discloses dataset integration status and retains prototype disclaimer in footer', () => {
    const landingFile = path.join(currentDir, '../src/frontend/views/LandingPage.tsx')
    const content = fs.readFileSync(landingFile, 'utf-8')

    expect(content).toContain('Prototype for decision support. Not a landing safety certification tool.')
    expect(content).toContain('Live NASA PDS/API pipeline integration is in progress.')
  })
})
