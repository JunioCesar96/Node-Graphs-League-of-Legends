import { describe, expect, it } from 'vitest'

import {
  formatListVector4String,
  isListVec4RitType,
  normalizeListVec4RitualBody,
  normalizeListVector4String,
  parseListVector4String,
  parseListVec4BlocksFromRitualBody,
} from '@/core/listVector4Value'

describe('listVector4Value', () => {
  it('detecta list[vec4] no ritual', () => {
    expect(isListVec4RitType('list[vec4]')).toBe(true)
    expect(isListVec4RitType('list[string]')).toBe(false)
  })

  it('parse blocos { } do corpo ritual', () => {
    const inner = `
      { 1, 1, 1, 1 }
      { 1, 1, 1, 0 }
    `
    expect(parseListVec4BlocksFromRitualBody(inner)).toEqual([
      { x: 1, y: 1, z: 1, w: 1 },
      { x: 1, y: 1, z: 1, w: 0 },
    ])
    expect(normalizeListVec4RitualBody(inner)).toBe('1, 1, 1, 1\n1, 1, 1, 0')
  })

  it('round-trip por linhas', () => {
    const raw = '1, 1, 1, 1\n1, 1, 1, 0'
    expect(formatListVector4String(parseListVector4String(raw))).toBe(raw)
    expect(normalizeListVector4String(raw)).toBe(raw)
  })
})
