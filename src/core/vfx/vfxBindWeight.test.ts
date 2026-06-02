import { describe, expect, it } from 'vitest'

import { blendPositionWithBindWeight, resolveBindWeight } from './vfxBindWeight'

describe('vfxBindWeight', () => {
  it('resolveBindWeight limita 0–1', () => {
    expect(resolveBindWeight({ kind: 'f32', constant: 1.5, dynamics: null })).toBe(1)
    expect(resolveBindWeight({ kind: 'f32', constant: -0.2, dynamics: null })).toBe(0)
  })

  it('blendPositionWithBindWeight interpola', () => {
    const free: [number, number, number] = [10, 0, 0]
    const attached: [number, number, number] = [0, 0, 0]
    expect(blendPositionWithBindWeight(free, attached, 1)).toEqual(attached)
    expect(blendPositionWithBindWeight(free, attached, 0)).toEqual(free)
    expect(blendPositionWithBindWeight(free, attached, 0.5)[0]).toBeCloseTo(5, 5)
  })
})
