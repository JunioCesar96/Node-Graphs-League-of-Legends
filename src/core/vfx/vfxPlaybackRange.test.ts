import { describe, expect, it } from 'vitest'

import {
  clampPlaybackRange,
  clampTimeToPlaybackRange,
  defaultPlaybackRange,
  isFullPlaybackRange,
  isPlaybackRangeActive,
} from './vfxPlaybackRange'

describe('vfxPlaybackRange', () => {
  it('detecta trecho completo', () => {
    const range = defaultPlaybackRange(10)
    expect(isFullPlaybackRange(range, 10)).toBe(true)
    expect(isPlaybackRangeActive(range, 10)).toBe(false)
  })

  it('detecta trecho parcial', () => {
    const range = { start: 1, end: 5 }
    expect(isPlaybackRangeActive(range, 10)).toBe(true)
  })

  it('limita tempo ao trecho', () => {
    expect(clampTimeToPlaybackRange(8, { start: 2, end: 6 }, 10)).toBe(6)
    expect(clampTimeToPlaybackRange(0.5, { start: 2, end: 6 }, 10)).toBe(2)
  })

  it('mantém tempo quando trecho é completo', () => {
    expect(clampTimeToPlaybackRange(7.5, defaultPlaybackRange(10), 10)).toBe(7.5)
  })

  it('garante end >= start', () => {
    expect(clampPlaybackRange({ start: 8, end: 2 }, 10)).toEqual({ start: 8, end: 8 })
  })
})
