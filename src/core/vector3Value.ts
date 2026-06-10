import {
  clampGridDimension,
  plotFractionFromVector2,
  type Vector2,
  vector2FromPlotFraction,
} from '@/core/vector2Value'

export type Vector3 = Vector2 & {
  z: number
}

const DEFAULT_VECTOR3: Vector3 = { x: 0, y: 0, z: 0 }

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

/** Remove chaves ritual `{ x, y, z }` antes de parsear componentes. */
export function parseVector3RitualInput(raw: string): Vector3 {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ...DEFAULT_VECTOR3 }
  }

  const braced = /^\{\s*([^}]*)\s*\}$/.exec(trimmed)
  const inner = braced?.[1]?.trim() ?? trimmed
  return parseVector3String(inner)
}

export function parseVector3String(raw: string): Vector3 {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ...DEFAULT_VECTOR3 }
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  const x = Number.parseFloat(parts[0] ?? '0')
  const y = Number.parseFloat(parts[1] ?? '0')
  const z = Number.parseFloat(parts[2] ?? '0')

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0,
  }
}

export function formatVector3String(vector: Vector3): string {
  return `${trimFloat(vector.x)}, ${trimFloat(vector.y)}, ${trimFloat(vector.z)}`
}

export function normalizeVector3String(raw: string): string {
  return formatVector3String(parseVector3RitualInput(raw))
}

export function isValidPartialVector3Value(value: string): boolean {
  return /^[0-9,.\s\-]*$/.test(value)
}

export { clampGridDimension }

export function axisValueFromFraction(
  fraction: number,
  gridMax: number,
  allowNegative: boolean,
): number {
  const n = Math.min(1, Math.max(0, fraction))
  if (!allowNegative) {
    return (1 - n) * gridMax
  }
  return (1 - n) * 2 * gridMax - gridMax
}

export function axisFractionFromValue(
  value: number,
  gridMax: number,
  allowNegative: boolean,
): number {
  const safeMax = Math.max(1, gridMax)
  if (!allowNegative) {
    return 1 - Math.min(1, Math.max(0, value / safeMax))
  }
  return 1 - Math.min(1, Math.max(0, (value / safeMax + 1) / 2))
}

export function vector3FromPlotFraction(
  nx: number,
  ny: number,
  nz: number,
  gridMaxX: number,
  gridMaxY: number,
  gridMaxZ: number,
  allowNegative: boolean,
): Vector3 {
  const xy = vector2FromPlotFraction(nx, ny, gridMaxX, gridMaxY, allowNegative)
  return {
    ...xy,
    z: axisValueFromFraction(nz, gridMaxZ, allowNegative),
  }
}

/** Tamanho visual do ponto no plano XY: `baseSize * (1 + z / 10)`. */
export function vec3CursorSizePx(z: number, baseSize = 14): number {
  if (!Number.isFinite(z)) {
    return baseSize
  }
  const scaled = baseSize * (1 + z / 10)
  return Math.max(4, scaled)
}

export function plotFractionFromVector3(
  vector: Vector3,
  gridMaxX: number,
  gridMaxY: number,
  gridMaxZ: number,
  allowNegative: boolean,
): { nx: number; ny: number; nz: number } {
  const { nx, ny } = plotFractionFromVector2(vector, gridMaxX, gridMaxY, allowNegative)
  return {
    nx,
    ny,
    nz: axisFractionFromValue(vector.z, gridMaxZ, allowNegative),
  }
}

export function clampScalarBetween(value: number, min: number, max: number): number {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.min(high, Math.max(low, value))
}

/** 0 = base do slider (min), 1 = topo (max). */
export function sliderFractionFromScalar(value: number, min: number, max: number): number {
  const span = max - min
  if (!Number.isFinite(span) || Math.abs(span) < 1e-9) {
    return 0
  }
  return clampScalarBetween((value - min) / span, 0, 1)
}

export function scalarFromSliderFraction(fraction: number, min: number, max: number): number {
  const t = clampScalarBetween(fraction, 0, 1)
  return min + t * (max - min)
}

/** Slider size = menor e maior componente do vetor (ex.: { 800, 680, -300 } → min -300, max 800). */
export function deriveSliderRange(vector: Vector3): { min: number; max: number } {
  const values = [vector.x, vector.y, vector.z]
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)

  if (dataMin === dataMax) {
    return dataMin === 0 ? { min: 0, max: 1 } : { min: dataMin, max: dataMin }
  }

  return { min: dataMin, max: dataMax }
}

/** Expande min/max do slider para caber todos os componentes do vetor. */
export function expandSliderRangeToFitVector(
  current: { min: number; max: number },
  vector: Vector3,
): { min: number; max: number } {
  const values = [vector.x, vector.y, vector.z]
  return {
    min: Math.min(current.min, ...values),
    max: Math.max(current.max, ...values),
  }
}
