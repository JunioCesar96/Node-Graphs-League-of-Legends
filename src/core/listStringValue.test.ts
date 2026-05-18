import { describe, expect, it } from 'vitest'

import { normalizeListStringRitualBody, parseListStringString } from '@/core/listStringValue'

describe('listStringValue', () => {
  it('parse strings com aspas por linha', () => {
    expect(normalizeListStringRitualBody('"Zac"\n"Other"')).toBe('Zac\nOther')
    expect(parseListStringString('Zac\nOther')).toEqual(['Zac', 'Other'])
  })
})
