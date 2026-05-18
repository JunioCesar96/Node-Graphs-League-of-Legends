/** Par vector2 persistido como `x, y` (separador vírgula). */
export type Vector2 = {
  x: number
  y: number
}

const DEFAULT_VECTOR2: Vector2 = { x: 0, y: 0 }

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

export function parseVector2String(raw: string): Vector2 {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ...DEFAULT_VECTOR2 }
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  const x = Number.parseFloat(parts[0] ?? '0')
  const y = Number.parseFloat(parts[1] ?? '0')

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  }
}

export function formatVector2String(vector: Vector2): string {
  return `${trimFloat(vector.x)}, ${trimFloat(vector.y)}`
}

export function normalizeVector2String(raw: string): string {
  return formatVector2String(parseVector2String(raw))
}

/** Validação parcial durante edição manual do texto. */
export function isValidPartialVector2Value(value: string): boolean {
  return /^[0-9,.\s\-]*$/.test(value)
}

export function clampGridDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return fallback
  }
  return Math.min(256, Math.round(value))
}

export function vector2FromPlotFraction(
  nx: number,
  ny: number,
  gridMaxX: number,
  gridMaxY: number,
  allowNegative: boolean,
): Vector2 {
  const xNorm = Math.min(1, Math.max(0, nx))
  const yNorm = Math.min(1, Math.max(0, ny))

  if (!allowNegative) {
    return {
      x: xNorm * gridMaxX,
      y: (1 - yNorm) * gridMaxY,
    }
  }

  return {
    x: (xNorm * 2 - 1) * gridMaxX,
    y: (1 - yNorm) * 2 * gridMaxY - gridMaxY,
  }
}

export function plotFractionFromVector2(
  vector: Vector2,
  gridMaxX: number,
  gridMaxY: number,
  allowNegative: boolean,
): { nx: number; ny: number } {
  const safeMaxX = Math.max(1, gridMaxX)
  const safeMaxY = Math.max(1, gridMaxY)

  if (!allowNegative) {
    return {
      nx: Math.min(1, Math.max(0, vector.x / safeMaxX)),
      ny: 1 - Math.min(1, Math.max(0, vector.y / safeMaxY)),
    }
  }

  return {
    nx: Math.min(1, Math.max(0, (vector.x / safeMaxX + 1) / 2)),
    ny: 1 - Math.min(1, Math.max(0, (vector.y / safeMaxY + 1) / 2)),
  }
}
