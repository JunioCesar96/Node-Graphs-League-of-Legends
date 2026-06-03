import { afterEach, describe, expect, it } from 'vitest'

import {
  STORAGE_NODE_LIGHT_MODE_KEY,
  getNodeLightModeEnabled,
  setNodeLightModeEnabled,
} from '@/core/nodeLightModePreference'

describe('nodeLightModePreference', () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_NODE_LIGHT_MODE_KEY)
  })

  it('defaults to enabled when storage key is missing', () => {
    expect(getNodeLightModeEnabled()).toBe(true)
  })

  it('persists disabled state', () => {
    setNodeLightModeEnabled(false)
    expect(getNodeLightModeEnabled()).toBe(false)
  })

  it('persists enabled state', () => {
    setNodeLightModeEnabled(false)
    setNodeLightModeEnabled(true)
    expect(getNodeLightModeEnabled()).toBe(true)
  })
})
