import { describe, expect, it } from 'vitest'

import {
  buildCompositorTimelineLayers,
  clampClipOffset,
  computeCompositorLifetime,
  localTimeForClip,
} from './vfxCompositor'

describe('localTimeForClip', () => {
  it('nunca retorna negativo', () => {
    expect(localTimeForClip(0.5, 1)).toBe(0)
    expect(localTimeForClip(2, 1)).toBe(1)
  })
})

describe('computeCompositorLifetime', () => {
  it('usa offset + lifetime de cada clip', () => {
    expect(
      computeCompositorLifetime([
        { lifetime: 3, offset: 0 },
        { lifetime: 2, offset: 1.5 },
      ]),
    ).toBeCloseTo(3.5, 5)
  })

  it('mínimo 1 quando vazio', () => {
    expect(computeCompositorLifetime([])).toBe(1)
  })
})

describe('buildCompositorTimelineLayers', () => {
  it('marca activeAtPlayhead dentro do intervalo do clip', () => {
    const layers = buildCompositorTimelineLayers(
      [
        { effectId: 'a', label: 'A', lifetime: 2, offset: 0 },
        { effectId: 'b', label: 'B', lifetime: 2, offset: 1 },
      ],
      1.5,
    )

    expect(layers[0]?.activeAtPlayhead).toBe(true)
    expect(layers[1]?.activeAtPlayhead).toBe(true)
  })

  it('fora do clip não está ativo', () => {
    const layers = buildCompositorTimelineLayers(
      [{ effectId: 'a', label: 'A', lifetime: 1, offset: 2 }],
      0.5,
    )
    expect(layers[0]?.activeAtPlayhead).toBe(false)
  })
})

describe('clampClipOffset', () => {
  it('limita offset para o clip caber na timeline', () => {
    expect(clampClipOffset(10, 2, 5)).toBe(3)
    expect(clampClipOffset(-1, 2, 5)).toBe(0)
  })
})
