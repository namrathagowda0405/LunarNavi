// Interface for a deterministic pseudo-random number generator.
export interface Rng {
  next(): number
}

/**
 * Creates a deterministic 32-bit pseudo-random number generator using the Mulberry32 algorithm.
 * Seeded randomness guarantees identical, reproducible sequences across runs for audit-ready trade studies.
 *
 * @param seed - Finite integer seed.
 * @returns Rng object with a next() method producing numbers in [0, 1).
 */
export function createRng(seed: number): Rng {
  if (typeof seed !== 'number' || !Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error(`Invalid seed: seed must be a finite integer, got ${seed}.`)
  }

  // Ensure 32-bit unsigned integer initialization
  let state = seed >>> 0

  return {
    next(): number {
      state = (state + 0x6d2b79f5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

/**
 * Samples a value from a triangular distribution defined by low, mode, and high.
 * Uses the inverse cumulative distribution function (CDF) method.
 * Always consumes exactly ONE rng.next() call, even when low === high, to preserve
 * sequence alignment across simulation runs.
 *
 * @param rng - Pseudo-random number generator.
 * @param low - Minimum boundary.
 * @param mode - Most likely value (peak).
 * @param high - Maximum boundary.
 * @returns A sampled number in [low, high].
 */
export function sampleTriangular(
  rng: Rng,
  low: number,
  mode: number,
  high: number
): number {
  if (
    typeof low !== 'number' ||
    typeof mode !== 'number' ||
    typeof high !== 'number' ||
    !Number.isFinite(low) ||
    !Number.isFinite(mode) ||
    !Number.isFinite(high)
  ) {
    throw new Error(
      `Non-finite parameter for sampleTriangular: low=${low}, mode=${mode}, high=${high}.`
    )
  }

  if (low > mode || mode > high) {
    throw new Error(
      `Invalid range for sampleTriangular: require low <= mode <= high, got low=${low}, mode=${mode}, high=${high}.`
    )
  }

  // Always consume exactly ONE random draw
  const u = rng.next()

  // If low === high, return the fixed value
  if (low === high) {
    return low
  }

  const range = high - low
  const modeFraction = (mode - low) / range

  if (u < modeFraction) {
    return low + Math.sqrt(u * range * (mode - low))
  } else {
    return high - Math.sqrt((1 - u) * range * (high - mode))
  }
}
