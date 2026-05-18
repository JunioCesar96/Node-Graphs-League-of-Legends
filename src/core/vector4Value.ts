import {
  clampScalarBetween,
  scalarFromSliderFraction,
  sliderFractionFromScalar,
} from '@/core/vector3Value'

export type Vector4 = {
  x: number
  y: number
  z: number
  w: number
}

const DEFAULT_VECTOR4: Vector4 = { x: 0, y: 0, z: 0, w: 0 }

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

export function parseVector4String(raw: string): Vector4 {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ...DEFAULT_VECTOR4 }
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  const x = Number.parseFloat(parts[0] ?? '0')
  const y = Number.parseFloat(parts[1] ?? '0')
  const z = Number.parseFloat(parts[2] ?? '0')
  const w = Number.parseFloat(parts[3] ?? '0')

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0,
    w: Number.isFinite(w) ? w : 0,
  }
}

export function formatVector4String(vector: Vector4): string {
  return `${trimFloat(vector.x)}, ${trimFloat(vector.y)}, ${trimFloat(vector.z)}, ${trimFloat(vector.w)}`
}

export function normalizeVector4String(raw: string): string {
  return formatVector4String(parseVector4String(raw))
}

export function isValidPartialVector4Value(value: string): boolean {
  return /^[0-9,.\s\-]*$/.test(value)
}

export function deriveSliderRange(vector: Vector4): { min: number; max: number } {
  const values = [vector.x, vector.y, vector.z, vector.w]
  const min = Math.floor(Math.min(0, ...values))
  const max = Math.ceil(Math.max(1, ...values))
  return max <= min ? { min, max: min + 1 } : { min, max }
}

export { clampScalarBetween, scalarFromSliderFraction, sliderFractionFromScalar }
