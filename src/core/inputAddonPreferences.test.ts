import { afterEach, describe, expect, it } from 'vitest'

import {
  buildInputAddonPreferenceKey,
  clearInputAddonPreference,
  readInputAddonPreference,
  resolveActiveInputAddonId,
  writeInputAddonPreference,
} from '@/core/inputAddonPreferences'

describe('inputAddonPreferences', () => {
  const key = buildInputAddonPreferenceKey('ValueColor', 'constantValue', 'vec4')

  afterEach(() => {
    clearInputAddonPreference(key)
  })

  it('grava e lê preferência', () => {
    writeInputAddonPreference(key, 'input-addon-color-vec4')
    expect(readInputAddonPreference(key)).toBe('input-addon-color-vec4')
  })

  it('resolve addon activo com fallback ao primeiro match', () => {
    expect(resolveActiveInputAddonId(key, ['a', 'b'])).toBe('a')
    writeInputAddonPreference(key, 'b')
    expect(resolveActiveInputAddonId(key, ['a', 'b'])).toBe('b')
    expect(resolveActiveInputAddonId(key, ['a'])).toBe('a')
  })
})
