import { describe, expect, it } from 'vitest'

import type { VfxEmbedValue } from './vfxModel'
import {
  composeEmitterDisplayRgba,
  formatVec4ByteString,
  formatVec4NormalizedString,
  multiplyRgba,
  normalizeVec4Tuple,
  resolveEmitterEmbedRgba,
  VFX_RGBA_IDENTITY,
} from './vfxColor'

describe('normalizeVec4Tuple', () => {
  it('mantém valores 0–1', () => {
    expect(normalizeVec4Tuple([0.847, 0.847, 0.847, 1])).toEqual([0.847, 0.847, 0.847, 1])
  })

  it('converte bytes 0–255', () => {
    const normalized = normalizeVec4Tuple([216, 216, 216, 255])
    expect(normalized[0]).toBeCloseTo(0.847, 3)
    expect(normalized[1]).toBeCloseTo(0.847, 3)
    expect(normalized[2]).toBeCloseTo(0.847, 3)
    expect(normalized[3]).toBe(1)
  })
})

describe('multiplyRgba', () => {
  it('identidade com branco', () => {
    const c: [number, number, number, number] = [0.5, 0.25, 0.75, 0.8]
    expect(multiplyRgba(c, VFX_RGBA_IDENTITY)).toEqual(c)
  })

  it('multiplica Color × birthColor', () => {
    expect(
      multiplyRgba(
        [0.28227666, 0.16317998, 0.15599298, 1],
        [0.6918898, 0.24284734, 0.076188296, 1],
      ),
    ).toEqual([
      0.28227666 * 0.6918898,
      0.16317998 * 0.24284734,
      0.15599298 * 0.076188296,
      1,
    ])
  })
})

describe('resolveEmitterEmbedRgba', () => {
  const animatedColor: VfxEmbedValue = {
    kind: 'ValueColor',
    constant: [0.28227666, 0.16317998, 0.15599298, 1],
    dynamics: {
      kind: 'VfxAnimatedColorVariableData',
      times: [0, 0.8, 1],
      values: [
        [0.28227666, 0.16317998, 0.15599298, 1],
        [0.12572908, 0, 0, 0.09803922],
        [0.023793334, 0, 0, 0],
      ],
      probabilityTables: [],
    },
  }

  it('fade de alpha no fim da vida (Brand)', () => {
    const atEnd = resolveEmitterEmbedRgba(animatedColor, null, 1)
    expect(atEnd[3]).toBeCloseTo(0, 4)
    expect(atEnd[0]).toBeCloseTo(0.023793334, 4)
  })

  it('birthColor constante × Color branco animado', () => {
    const birth: VfxEmbedValue = {
      kind: 'ValueColor',
      constant: [0.6918898, 0.24284734, 0.076188296, 1],
      dynamics: null,
    }
    const color: VfxEmbedValue = {
      kind: 'ValueColor',
      constant: [1, 1, 1, 0],
      dynamics: {
        kind: 'VfxAnimatedColorVariableData',
        times: [0, 0.2, 1],
        values: [
          [1, 1, 1, 0],
          [1, 1, 1, 1],
          [1, 1, 1, 0],
        ],
        probabilityTables: [],
      },
    }
    const mid = resolveEmitterEmbedRgba(color, birth, 0.5)
    expect(mid[0]).toBeCloseTo(0.6918898, 4)
    expect(mid[3]).toBeGreaterThan(0.4)
  })
})

describe('formatVec4 strings', () => {
  it('formata normalizado e bytes', () => {
    const tuple: [number, number, number, number] = [0.84705883, 0.84705883, 0.84705883, 1]
    expect(formatVec4NormalizedString(tuple)).toBe('0.847, 0.847, 0.847, 1')
    expect(formatVec4ByteString(tuple)).toBe('216, 216, 216, 255')
  })
})

describe('composeEmitterDisplayRgba', () => {
  it('aplica embed sobre textura de cor', () => {
    const result = composeEmitterDisplayRgba({
      embedRgba: [0.847, 0.847, 0.847, 1],
      mainTexRgba: [1, 1, 1, 1],
      colorTexRgba: [0.2, 0.4, 0.9, 1],
    })
    expect(result[0]).toBeCloseTo(0.2 * 0.847, 3)
    expect(result[1]).toBeCloseTo(0.4 * 0.847, 3)
    expect(result[2]).toBeCloseTo(0.9 * 0.847, 3)
  })
})
