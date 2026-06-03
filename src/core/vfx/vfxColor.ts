/** Operações RGBA (vec4) para o pipeline VFX — ValueColor, birthColor, mistura de texturas. */

import { clamp01, type RgbaColor } from '@/core/rgbaColor'

import type { VfxEmbedValue } from './vfxModel'
import { sampleDynamicsVec4 } from './vfxEmbedSample'

export type VfxRgbaTuple = [number, number, number, number]

export const VFX_RGBA_IDENTITY: VfxRgbaTuple = [1, 1, 1, 1]

export function normalizeVec4Tuple(raw: VfxRgbaTuple | number[]): VfxRgbaTuple {
  const values = raw.map((v) => Number(v))
  if (values.some((v) => !Number.isFinite(v))) {
    return [...VFX_RGBA_IDENTITY]
  }

  const max = Math.max(...values)
  const scale = max > 1 ? 1 / 255 : 1

  return [
    clamp01(values[0]! * scale),
    clamp01(values[1]! * scale),
    clamp01(values[2]! * scale),
    clamp01(values[3]! * scale),
  ]
}

export function multiplyRgba(a: VfxRgbaTuple, b: VfxRgbaTuple): VfxRgbaTuple {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]]
}

export function lerpRgba(a: VfxRgbaTuple, b: VfxRgbaTuple, t: number): VfxRgbaTuple {
  const factor = clamp01(t)
  return [
    a[0] + (b[0] - a[0]) * factor,
    a[1] + (b[1] - a[1]) * factor,
    a[2] + (b[2] - a[2]) * factor,
    a[3] + (b[3] - a[3]) * factor,
  ]
}

export function vfxRgbaToRgbaColor(tuple: VfxRgbaTuple): RgbaColor {
  const normalized = normalizeVec4Tuple(tuple)
  return { r: normalized[0], g: normalized[1], b: normalized[2], a: normalized[3] }
}

export function rgbaColorToVfxTuple(color: RgbaColor): VfxRgbaTuple {
  return [color.r, color.g, color.b, color.a]
}

export function vfxRgbaToCss(tuple: VfxRgbaTuple): string {
  const { r, g, b, a } = vfxRgbaToRgbaColor(tuple)
  const ri = Math.round(r * 255)
  const gi = Math.round(g * 255)
  const bi = Math.round(b * 255)
  return `rgba(${ri}, ${gi}, ${bi}, ${a})`
}

export function formatVec4NormalizedString(tuple: VfxRgbaTuple): string {
  const n = normalizeVec4Tuple(tuple)
  const trim = (v: number) => String(Math.round(v * 1000) / 1000)
  return `${trim(n[0])}, ${trim(n[1])}, ${trim(n[2])}, ${trim(n[3])}`
}

export function formatVec4ByteString(tuple: VfxRgbaTuple): string {
  const { r, g, b, a } = vfxRgbaToRgbaColor(tuple)
  return `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Math.round(a * 255)}`
}

/** Color × birthColor no tempo normalizado da partícula. */
export function resolveEmitterEmbedRgba(
  color: VfxEmbedValue | null,
  birthColor: VfxEmbedValue | null,
  particleNormalized: number,
): VfxRgbaTuple {
  const colorRgba = normalizeVec4Tuple(
    sampleDynamicsVec4(color, particleNormalized, VFX_RGBA_IDENTITY),
  )
  const birthRgba = normalizeVec4Tuple(
    sampleDynamicsVec4(birthColor, particleNormalized, VFX_RGBA_IDENTITY),
  )
  return multiplyRgba(colorRgba, birthRgba)
}

/** Composição CPU simplificada (inspector) — espelha ordem do shader. */
export function composeEmitterDisplayRgba(input: {
  embedRgba: VfxRgbaTuple
  mainTexRgba?: VfxRgbaTuple | null
  colorTexRgba?: VfxRgbaTuple | null
  paletteRgba?: VfxRgbaTuple | null
  multRgba?: VfxRgbaTuple | null
  isAdditive?: boolean
}): VfxRgbaTuple {
  let rgba: VfxRgbaTuple = input.mainTexRgba
    ? normalizeVec4Tuple(input.mainTexRgba)
    : [...VFX_RGBA_IDENTITY]

  if (input.colorTexRgba) {
    const colorTex = normalizeVec4Tuple(input.colorTexRgba)
    if (input.isAdditive) {
      rgba = [
        rgba[0] + colorTex[0] * colorTex[3] * 0.65,
        rgba[1] + colorTex[1] * colorTex[3] * 0.65,
        rgba[2] + colorTex[2] * colorTex[3] * 0.65,
        Math.max(rgba[3], colorTex[3] * 0.5),
      ]
    } else {
      rgba = multiplyRgba(rgba, colorTex)
    }
  }

  if (input.paletteRgba) {
    const grad = normalizeVec4Tuple(input.paletteRgba)
    if (input.isAdditive) {
      rgba = [
        grad[0] * Math.max(rgba[3], grad[3]),
        grad[1] * Math.max(rgba[3], grad[3]),
        grad[2] * Math.max(rgba[3], grad[3]),
        Math.max(rgba[3], grad[3]),
      ]
    } else {
      const mixA = grad[3] * rgba[3]
      rgba = [
        rgba[0] * (1 - mixA) + grad[0] * mixA,
        rgba[1] * (1 - mixA) + grad[1] * mixA,
        rgba[2] * (1 - mixA) + grad[2] * mixA,
        Math.max(rgba[3], mixA),
      ]
    }
  }

  if (input.multRgba) {
    const mult = normalizeVec4Tuple(input.multRgba)
    if (input.isAdditive) {
      rgba = [
        rgba[0] + mult[0] * mult[3],
        rgba[1] + mult[1] * mult[3],
        rgba[2] + mult[2] * mult[3],
        rgba[3],
      ]
    } else {
      rgba = multiplyRgba(rgba, mult)
    }
  }

  return multiplyRgba(rgba, normalizeVec4Tuple(input.embedRgba))
}
