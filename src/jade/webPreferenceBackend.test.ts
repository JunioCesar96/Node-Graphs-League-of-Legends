import { afterEach, describe, expect, it } from 'vitest'

import { registerWebPreferenceBackend, webPreferenceBackend } from './webPreferenceBackend'
import { getPreference, setPreference, setPreferenceBackend } from '@jade/lib/preferenceStore'

const PREFIX = 'node-graphs-lol:jade:'

afterEach(() => {
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(PREFIX)) {
      window.localStorage.removeItem(k)
    }
  }
})

describe('webPreferenceBackend', () => {
  it('round-trip get/set via preferenceStore', async () => {
    registerWebPreferenceBackend()
    await setPreference('TestKey', 'hello')
    expect(await getPreference('TestKey', 'default')).toBe('hello')
    expect(await getPreference('Missing', 'fallback')).toBe('fallback')
  })

  it('stores under prefixed localStorage key', async () => {
    setPreferenceBackend(webPreferenceBackend)
    await setPreference('Perf_Minimap', 'off')
    expect(window.localStorage.getItem(`${PREFIX}Perf_Minimap`)).toBe('off')
  })
})
