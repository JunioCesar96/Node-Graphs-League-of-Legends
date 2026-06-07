import { describe, expect, it } from 'vitest'

import { timelineLayerSyntaxAccentVar } from './vfxTimelineSyntaxAccent'

describe('timelineLayerSyntaxAccentVar', () => {
  it('maps glow-like names to vector4 syntax', () => {
    expect(timelineLayerSyntaxAccentVar('Fire_Glow_Core')).toBe('var(--syntax-vector4)')
  })

  it('maps texture-like names to string syntax', () => {
    expect(timelineLayerSyntaxAccentVar('Spark_Orange_tex')).toBe('var(--syntax-string)')
  })

  it('returns stable hashed syntax for generic names', () => {
    const first = timelineLayerSyntaxAccentVar('Emitter_A')
    const second = timelineLayerSyntaxAccentVar('Emitter_A')
    expect(first).toBe(second)
    expect(first.startsWith('var(--syntax-')).toBe(true)
  })
})
