import { clampScalarBetween } from '@/core/vector3Value'

export type Mtx44Semantic = {
  scaleX: number
  scaleY: number
  scaleZ: number
  positionX: number
  positionY: number
  positionZ: number
}

export type Mtx44SliderRanges = {
  scaleMin: number
  scaleMax: number
  positionMin: number
  positionMax: number
}

const IDENTITY_VALUES: readonly number[] = [
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
] as const

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function identityMtx44Values(): number[] {
  return [...IDENTITY_VALUES]
}

export function parseMtx44String(raw: string): number[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return identityMtx44Values()
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  const values = identityMtx44Values()

  for (let i = 0; i < 16; i += 1) {
    const n = Number.parseFloat(parts[i] ?? '')
    if (Number.isFinite(n)) {
      values[i] = n
    }
  }

  return values
}

export function semanticFromMtx44(values: number[]): Mtx44Semantic {
  const v = values.length >= 16 ? values : parseMtx44String('')
  return {
    scaleX: finiteOr(v[0]!, 1),
    scaleY: finiteOr(v[5]!, 1),
    scaleZ: finiteOr(v[10]!, 1),
    positionX: finiteOr(v[12]!, 0),
    positionY: finiteOr(v[13]!, 0),
    positionZ: finiteOr(v[14]!, 0),
  }
}

/** Reconstrói matriz afim (escala diagonal + translação); impõe zeros estruturais e w=1. */
export function buildMtx44FromSemantic(semantic: Mtx44Semantic): number[] {
  const {
    scaleX,
    scaleY,
    scaleZ,
    positionX,
    positionY,
    positionZ,
  } = semantic

  return [
    scaleX,
    0,
    0,
    0,
    0,
    scaleY,
    0,
    0,
    0,
    0,
    scaleZ,
    0,
    positionX,
    positionY,
    positionZ,
    1,
  ]
}

export function formatMtx44StringAsText(values: number[]): string {
  const rows: string[] = []
  for (let row = 0; row < 4; row += 1) {
    const start = row * 4
    const chunk = values
      .slice(start, start + 4)
      .map((n) => trimFloat(n))
      .join(', ')
    rows.push(chunk)
  }
  return rows.join(' ')
}

export function normalizeMtx44String(raw: string): string {
  const parsed = parseMtx44String(raw)
  const semantic = semanticFromMtx44(parsed)
  return formatMtx44StringAsText(buildMtx44FromSemantic(semantic))
}

export function isValidPartialMtx44Value(value: string): boolean {
  return /^[0-9,.\s\-]*$/.test(value)
}

function expandRange(min: number, max: number, values: number[]): { min: number; max: number } {
  let nextMin = min
  let nextMax = max
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue
    }
    if (value < nextMin) {
      nextMin = Math.floor(value)
    }
    if (value > nextMax) {
      nextMax = Math.ceil(value)
    }
  }
  if (nextMax <= nextMin) {
    nextMax = nextMin + 1
  }
  return { min: nextMin, max: nextMax }
}

export function deriveMtx44SliderRanges(semantic: Mtx44Semantic): Mtx44SliderRanges {
  const scale = expandRange(-2, 2, [semantic.scaleX, semantic.scaleY, semantic.scaleZ])
  const position = expandRange(-500, 500, [
    semantic.positionX,
    semantic.positionY,
    semantic.positionZ,
  ])
  return {
    scaleMin: scale.min,
    scaleMax: scale.max,
    positionMin: position.min,
    positionMax: position.max,
  }
}

export function formatMtx44Preview(semantic: Mtx44Semantic): string {
  const uniform =
    semantic.scaleX === semantic.scaleY && semantic.scaleY === semantic.scaleZ
  const scalePart = uniform
    ? `S:${trimFloat(semantic.scaleX)}`
    : `S:(${trimFloat(semantic.scaleX)}, ${trimFloat(semantic.scaleY)}, ${trimFloat(semantic.scaleZ)})`
  const posPart = `T:(${trimFloat(semantic.positionX)}, ${trimFloat(semantic.positionY)}, ${trimFloat(semantic.positionZ)})`
  return `${scalePart} · ${posPart}`
}

export { clampScalarBetween }
