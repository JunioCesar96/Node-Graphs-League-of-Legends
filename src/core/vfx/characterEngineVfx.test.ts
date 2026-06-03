import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG,
  resolveCharacterEngineRotationXDeg,
  resolveCharacterEngineScale,
} from './characterEngineVfx'

describe('characterEngineVfx', () => {
  it('resolveCharacterEngineScale uses vfxScale when enabled', () => {
    expect(resolveCharacterEngineScale(true, 0.01)).toBe(0.01)
    expect(resolveCharacterEngineScale(false, 0.01)).toBe(1)
  })

  it('resolveCharacterEngineRotationXDeg defaults to 90 when enabled', () => {
    expect(DEFAULT_CHARACTER_ENGINE_ROTATION_X_LOL_DEG).toBe(90)
    expect(resolveCharacterEngineRotationXDeg(true)).toBe(90)
    expect(resolveCharacterEngineRotationXDeg(false)).toBe(0)
  })
})
