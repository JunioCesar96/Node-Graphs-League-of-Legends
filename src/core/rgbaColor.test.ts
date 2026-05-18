import { describe, expect, it } from 'vitest'

import { formatRgbaString, normalizeRgbaString, parseRgbaString, rgbaToCss } from '@/core/rgbaColor'

describe('rgbaColor', () => {
  it('parse e format mantém canal 0..1', () => {
    const c = parseRgbaString('1, 0.58, 0.1, 1')
    expect(formatRgbaString(c)).toBe('1, 0.58, 0.1, 1')
  })

  it('aceita bytes 0..255 e normaliza', () => {
    const c = parseRgbaString('255, 128, 0, 255')
    expect(c.r).toBeCloseTo(1, 3)
    expect(c.g).toBeCloseTo(128 / 255, 3)
    expect(normalizeRgbaString('255, 128, 0, 255')).toMatch(/1, 0\.5/)
  })

  it('rgbaToCss', () => {
    expect(rgbaToCss(parseRgbaString('1, 0, 0, 0.5'))).toBe('rgba(255, 0, 0, 0.5)')
  })
})
