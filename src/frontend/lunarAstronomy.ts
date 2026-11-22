import * as Astronomy from 'astronomy-engine'

export interface Vector3D {
  x: number
  y: number
  z: number
}

export interface LunarPhaseTelemetry {
  phaseName: string
  illuminationPct: number
  waxingStatus: 'Waxing' | 'Waning'
  cycleProgressPct: number
  ageInDays: number
  phaseDeg: number
  sunDirection: Vector3D
  calculationModel: string
  timestampIso: string
}

/**
 * Maps the lunar phase angle (in degrees [0, 360)) to standard astronomical nomenclature.
 * 0° = New Moon, 90° = First Quarter, 180° = Full Moon, 270° = Third Quarter.
 */
export function getLunarPhaseName(phaseDeg: number): string {
  const norm = ((phaseDeg % 360) + 360) % 360
  if (norm >= 354 || norm < 6) return 'New Moon'
  if (norm < 84) return 'Waxing Crescent'
  if (norm < 96) return 'First Quarter'
  if (norm < 174) return 'Waxing Gibbous'
  if (norm < 186) return 'Full Moon'
  if (norm < 264) return 'Waning Gibbous'
  if (norm < 276) return 'Third Quarter'
  return 'Waning Crescent'
}

/**
 * Calculates the unit vector pointing toward the Sun in the Moon's Earth-facing observer coordinate system:
 * - +Z points directly from the Moon center toward the Earth / Camera (illuminating near side)
 * - -Z points toward the far side (away from Earth / Camera)
 * - +X points to celestial West / screen Right (illuminating the right half, as seen in First Quarter)
 * - -X points to celestial East / screen Left (illuminating the left half, as seen in Third Quarter)
 * - +Y points toward Lunar/Ecliptic North (screen Up)
 *
 * Uses Astronomy.GeoVector for both bodies in J2000 equatorial space, then projects
 * the Sun-from-Moon directional vector onto the observer's orthonormal reference frame.
 */
export function calculateAstronomicalSunDirection(date: Date = new Date()): Vector3D {
  const mGeo = Astronomy.GeoVector(Astronomy.Body.Moon, date, false)
  const sGeo = Astronomy.GeoVector(Astronomy.Body.Sun, date, false)

  // Direction vector from Moon to Sun
  const dx = sGeo.x - mGeo.x
  const dy = sGeo.y - mGeo.y
  const dz = sGeo.z - mGeo.z
  const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
  const unitD = { x: dx / dLen, y: dy / dLen, z: dz / dLen }

  // Direction vector from Moon to Earth (Observer Z axis: pointing directly at Earth)
  const mLen = Math.sqrt(mGeo.x * mGeo.x + mGeo.y * mGeo.y + mGeo.z * mGeo.z) || 1
  const zObs = { x: -mGeo.x / mLen, y: -mGeo.y / mLen, z: -mGeo.z / mLen }

  // Ecliptic North unit vector in J2000 equatorial coordinates (epsilon ~ 23.4392911°)
  const eps = (23.4392911 * Math.PI) / 180
  const ecNorth = { x: 0, y: -Math.sin(eps), z: Math.cos(eps) }

  // Observer Y axis: Orthogonalize ecliptic north against Z_obs
  const dotN = ecNorth.x * zObs.x + ecNorth.y * zObs.y + ecNorth.z * zObs.z
  let yObs = {
    x: ecNorth.x - dotN * zObs.x,
    y: ecNorth.y - dotN * zObs.y,
    z: ecNorth.z - dotN * zObs.z,
  }
  const yLen = Math.sqrt(yObs.x * yObs.x + yObs.y * yObs.y + yObs.z * yObs.z) || 1
  yObs = { x: yObs.x / yLen, y: yObs.y / yLen, z: yObs.z / yLen }

  // Observer X axis: Right-handed cross product Y_obs x Z_obs
  const xObs = {
    x: yObs.y * zObs.z - yObs.z * zObs.y,
    y: yObs.z * zObs.x - yObs.x * zObs.z,
    z: yObs.x * zObs.y - yObs.y * zObs.x,
  }

  // Project unitD onto observer basis (X, Y, Z)
  const px = unitD.x * xObs.x + unitD.y * xObs.y + unitD.z * xObs.z
  const py = unitD.x * yObs.x + unitD.y * yObs.y + unitD.z * yObs.z
  const pz = unitD.x * zObs.x + unitD.y * zObs.y + unitD.z * zObs.z

  const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1
  return {
    x: Number((px / pLen).toFixed(6)),
    y: Number((py / pLen).toFixed(6)),
    z: Number((pz / pLen).toFixed(6)),
  }
}

/**
 * Computes high-precision astronomical lunar telemetry using Astronomy Engine (VSOP87 / ELP2000-82B).
 *
 * Adheres to astronomical requirements:
 * - Uses MoonPhase(date) for phase angle [0, 360) and waxing/waning status.
 * - Uses Illumination(Body.Moon, date).phase_fraction for displayed illumination percentage.
 * - Uses GeoVector geometry for 3D Sun direction transformed into Three.js observer space.
 */
export function calculateAstronomicalLunarPhase(date: Date = new Date()): LunarPhaseTelemetry {
  const phaseDeg = Astronomy.MoonPhase(date)
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date)
  const sunDirection = calculateAstronomicalSunDirection(date)

  const phaseName = getLunarPhaseName(phaseDeg)
  const illuminationPct = Math.round(illum.phase_fraction * 1000) / 10
  const waxingStatus: 'Waxing' | 'Waning' = phaseDeg < 180 ? 'Waxing' : 'Waning'
  const cycleProgressPct = Math.round((phaseDeg / 360) * 1000) / 10
  const ageInDays = Math.round((phaseDeg / 360) * 29.53058867 * 10) / 10

  return {
    phaseName,
    illuminationPct,
    waxingStatus,
    cycleProgressPct,
    ageInDays,
    phaseDeg: Math.round(phaseDeg * 100) / 100,
    sunDirection,
    calculationModel:
      'Astronomical ephemeris model (Astronomy Engine - VSOP87/ELP2000-82B). High-precision topocentric Sun-Moon-Earth geometry.',
    timestampIso: date.toISOString(),
  }
}
