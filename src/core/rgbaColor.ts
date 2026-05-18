/** Canal RGBA normalizado 0..1 (formato persistido: `r, g, b, a`). */
export type RgbaColor = {
  r: number
  g: number
  b: number
  a: number
}

export type HsvColor = {
  h: number
  s: number
  v: number
}

const DEFAULT_RGBA: RgbaColor = { r: 1, g: 1, b: 1, a: 1 }

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(1, Math.max(0, value))
}

export function parseRgbaString(raw: string): RgbaColor {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ...DEFAULT_RGBA }
  }

  const parts = trimmed.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 4) {
    return { ...DEFAULT_RGBA }
  }

  const values = parts.slice(0, 4).map((part) => Number.parseFloat(part))
  if (values.some((v) => !Number.isFinite(v))) {
    return { ...DEFAULT_RGBA }
  }

  const max = Math.max(...values)
  const normalized = max > 1 ? values.map((v) => v / 255) : values

  return {
    r: clamp01(normalized[0]!),
    g: clamp01(normalized[1]!),
    b: clamp01(normalized[2]!),
    a: clamp01(normalized[3]!),
  }
}

export function formatRgbaString(color: RgbaColor): string {
  const r = clamp01(color.r)
  const g = clamp01(color.g)
  const b = clamp01(color.b)
  const a = clamp01(color.a)
  return `${trimFloat(r)}, ${trimFloat(g)}, ${trimFloat(b)}, ${trimFloat(a)}`
}

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

export function rgbaToCss(color: RgbaColor): string {
  const r = Math.round(clamp01(color.r) * 255)
  const g = Math.round(clamp01(color.g) * 255)
  const b = Math.round(clamp01(color.b) * 255)
  const a = clamp01(color.a)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = clamp01(r)
  const gn = clamp01(g)
  const bn = clamp01(b)
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta > 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6
    } else if (max === gn) {
      h = (bn - rn) / delta + 2
    } else {
      h = (rn - gn) / delta + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }

  const s = max === 0 ? 0 : delta / max
  return { h, s, v: max }
}

export function hsvToRgb(h: number, s: number, v: number): Pick<RgbaColor, 'r' | 'g' | 'b'> {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp01(s)
  const val = clamp01(v)

  const c = val * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = val - c

  let rp = 0
  let gp = 0
  let bp = 0

  if (hue < 60) {
    rp = c
    gp = x
  } else if (hue < 120) {
    rp = x
    gp = c
  } else if (hue < 180) {
    gp = c
    bp = x
  } else if (hue < 240) {
    gp = x
    bp = c
  } else if (hue < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }

  return {
    r: clamp01(rp + m),
    g: clamp01(gp + m),
    b: clamp01(bp + m),
  }
}

export function rgbaToByteChannels(color: RgbaColor): {
  r: number
  g: number
  b: number
  a: number
} {
  return {
    r: Math.round(clamp01(color.r) * 255),
    g: Math.round(clamp01(color.g) * 255),
    b: Math.round(clamp01(color.b) * 255),
    a: Math.round(clamp01(color.a) * 255),
  }
}

export function rgbaFromByteChannels(r: number, g: number, b: number, a: number): RgbaColor {
  return {
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
    a: clamp01(a / 255),
  }
}

export function isValidPartialRgbaValue(value: string): boolean {
  return /^[0-9,.\s\-]*$/.test(value)
}

export function normalizeRgbaString(raw: string): string {
  return formatRgbaString(parseRgbaString(raw))
}
