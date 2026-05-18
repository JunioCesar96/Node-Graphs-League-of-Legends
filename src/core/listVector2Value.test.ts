import { describe, expect, it } from 'vitest'

import {
  isListVec2RitType,
  normalizeListVec2RitualBody,
  parseListVector2String,
} from '@/core/listVector2Value'

describe('listVector2Value', () => {
  it('detecta list[vec2] e parse blocos', () => {
    expect(isListVec2RitType('list[vec2]')).toBe(true)
    const inner = `{ 1, 0 }\n{ 0, 1 }`
    expect(normalizeListVec2RitualBody(`{ 1, 0 } { 0, 1 }`)).toBe('1, 0\n0, 1')
    expect(parseListVector2String('1, 0\n0, 1')).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ])
  })
})
