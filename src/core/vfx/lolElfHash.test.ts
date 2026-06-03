import { describe, expect, it } from 'vitest'

import { lolElfHash } from './lolElfHash'

describe('lolElfHash', () => {
  it('é determinístico e case-insensitive', () => {
    expect(lolElfHash('Root')).toBe(lolElfHash('root'))
    expect(lolElfHash('Spine')).toBeGreaterThan(0)
  })
})
