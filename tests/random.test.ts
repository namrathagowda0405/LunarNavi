// FIXTURE: made-up numbers for testing only. NOT real lunar data.

import { describe, it, expect } from 'vitest'
import { createRng, sampleTriangular } from '../src/engine/random'

describe('createRng (Mulberry32)', () => {
  it('gives the exact same sequence for the same seed, and a different sequence for a different seed', () => {
    const rng1 = createRng(12345)
    const rng2 = createRng(12345)
    const rng3 = createRng(54321)

    const seq1 = Array.from({ length: 50 }, () => rng1.next())
    const seq2 = Array.from({ length: 50 }, () => rng2.next())
    const seq3 = Array.from({ length: 50 }, () => rng3.next())

    expect(seq1).toEqual(seq2)
    expect(seq1).not.toEqual(seq3)
  })

  it('generates 100000 draws all within [0, 1) with mean within 0.01 of 0.5', () => {
    const rng = createRng(42)
    const count = 100000
    let sum = 0

    for (let i = 0; i < count; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
      sum += val
    }

    const mean = sum / count
    expect(mean).toBeGreaterThanOrEqual(0.49)
    expect(mean).toBeLessThanOrEqual(0.51)
  })

  it('throws an Error when seed is not a finite integer', () => {
    expect(() => createRng(NaN)).toThrow(/finite integer/i)
    expect(() => createRng(Infinity)).toThrow(/finite integer/i)
    expect(() => createRng(-Infinity)).toThrow(/finite integer/i)
    expect(() => createRng(3.14159)).toThrow(/finite integer/i)
    expect(() => createRng('42' as any)).toThrow(/finite integer/i)
  })
})

describe('sampleTriangular', () => {
  it('samples within [0, 6] with mean within 0.05 of 8/3 for low=0, mode=2, high=6', () => {
    const rng = createRng(999)
    const count = 20000
    let sum = 0

    const low = 0
    const mode = 2
    const high = 6
    const expectedMean = (low + mode + high) / 3 // 8 / 3 = 2.666666...

    for (let i = 0; i < count; i++) {
      const val = sampleTriangular(rng, low, mode, high)
      expect(val).toBeGreaterThanOrEqual(low)
      expect(val).toBeLessThanOrEqual(high)
      sum += val
    }

    const mean = sum / count
    expect(Math.abs(mean - expectedMean)).toBeLessThanOrEqual(0.05)
  })

  it('returns exact value and still consumes one draw when low === mode === high', () => {
    const rngA = createRng(777)
    const rngB = createRng(777)

    // rngA draws once via sampleTriangular
    const sampled = sampleTriangular(rngA, 10, 10, 10)
    expect(sampled).toBe(10)

    // rngB draws once directly
    rngB.next()

    // Next draw from both should be identical, confirming exactly one draw was consumed
    expect(rngA.next()).toBe(rngB.next())
  })

  it('throws an Error on invalid arguments', () => {
    const rng = createRng(1)

    // low > mode
    expect(() => sampleTriangular(rng, 10, 5, 12)).toThrow(/low <= mode <= high/i)

    // mode > high
    expect(() => sampleTriangular(rng, 5, 15, 12)).toThrow(/low <= mode <= high/i)

    // non-finite values
    expect(() => sampleTriangular(rng, NaN, 5, 10)).toThrow(/non-finite/i)
    expect(() => sampleTriangular(rng, 0, Infinity, 10)).toThrow(/non-finite/i)
    expect(() => sampleTriangular(rng, 0, 5, -Infinity)).toThrow(/non-finite/i)
  })
})
