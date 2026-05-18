import { describe, expect, it } from 'vitest'

import { normalizeListF32RitualBody, parseListF32String } from '@/core/listF32Value'

describe('listF32Value', () => {
  it('parse linhas ritual e legado com espaços', () => {
    expect(normalizeListF32RitualBody('0\n0.5\n1')).toBe('0\n0.5\n1')
    expect(parseListF32String('0 0.5 1')).toEqual(['0', '0.5', '1'])
  })
})
