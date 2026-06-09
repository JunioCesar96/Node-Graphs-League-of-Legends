import { clamp01 } from '@/core/rgbaColor'

export type ColorVec4DisplayFormat = 'hex' | 'rgb' | 'hsl' | 'vec4'

export const COLOR_VEC4_DISPLAY_FORMATS: readonly ColorVec4DisplayFormat[] = [
  'hex',
  'rgb',
  'hsl',
  'vec4',
]

export function formatColorVec4Component(value: number): string {
  if (!Number.isFinite(value)) {
    return '0'
  }
  const rounded = Math.round(value * 10000) / 10000
  return String(rounded)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

function toByte(channel: number): number {
  return Math.round(clamp01(channel) * 255)
}

export function formatColorVec4Display(
  format: ColorVec4DisplayFormat,
  r: number,
  g: number,
  b: number,
  a: number,
): string {
  const red = clamp01(r)
  const green = clamp01(g)
  const blue = clamp01(b)
  const alpha = clamp01(a)

  if (format === 'vec4') {
    return [red, green, blue, alpha].map((part) => formatColorVec4Component(part)).join(', ')
  }

  if (format === 'hex') {
    const rr = toByte(red).toString(16).padStart(2, '0')
    const gg = toByte(green).toString(16).padStart(2, '0')
    const bb = toByte(blue).toString(16).padStart(2, '0')
    if (alpha < 1) {
      const aa = toByte(alpha).toString(16).padStart(2, '0')
      return `#${rr}${gg}${bb}${aa}`.toUpperCase()
    }
    return `#${rr}${gg}${bb}`.toUpperCase()
  }

  if (format === 'rgb') {
    const rr = toByte(red)
    const gg = toByte(green)
    const bb = toByte(blue)
    if (alpha < 1) {
      const aa = Number.parseFloat(alpha.toFixed(3))
      return `rgba(${rr}, ${gg}, ${bb}, ${aa})`
    }
    return `rgb(${rr}, ${gg}, ${bb})`
  }

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6
    } else if (max === green) {
      h = (blue - red) / delta + 2
    } else {
      h = (red - green) / delta + 4
    }
    h = Math.round(h * 60)
    if (h < 0) {
      h += 360
    }
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  if (alpha < 1) {
    const aa = Number.parseFloat(alpha.toFixed(3))
    return `hsla(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${aa})`
  }
  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

export function nextColorVec4DisplayFormat(format: ColorVec4DisplayFormat): ColorVec4DisplayFormat {
  const index = COLOR_VEC4_DISPLAY_FORMATS.indexOf(format)
  if (index < 0) {
    return 'hex'
  }
  return COLOR_VEC4_DISPLAY_FORMATS[(index + 1) % COLOR_VEC4_DISPLAY_FORMATS.length]!
}

export function colorVec4DisplayFormatLabel(format: ColorVec4DisplayFormat): string {
  return format.toUpperCase()
}

export function readColorVec4DisplayFormat(panel: HTMLElement): ColorVec4DisplayFormat {
  const select = panel.querySelector('[data-color-vec4-format]')
  if (select instanceof HTMLSelectElement) {
    const value = select.value.trim().toLowerCase()
    if (COLOR_VEC4_DISPLAY_FORMATS.includes(value as ColorVec4DisplayFormat)) {
      return value as ColorVec4DisplayFormat
    }
  }
  return 'vec4'
}
