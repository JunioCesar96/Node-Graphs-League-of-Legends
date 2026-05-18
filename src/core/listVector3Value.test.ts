import { describe, expect, it } from 'vitest'

import {
  isListVec3RitType,
  normalizeListVec3RitualBody,
  parseListVector3String,
} from '@/core/listVector3Value'

describe('listVector3Value', () => {
  it('detecta list[vec3] e parse blocos', () => {
    expect(isListVec3RitType('list[vec3]')).toBe(true)
    expect(normalizeListVec3RitualBody(`{ 1, 2, 3 } { 0, 0, 0 }`)).toBe('1, 2, 3\n0, 0, 0')
    expect(parseListVector3String('1, 2, 3\n0, 0, 0')).toEqual([
      { x: 1, y: 2, z: 3 },
      { x: 0, y: 0, z: 0 },
    ])
  })
})
