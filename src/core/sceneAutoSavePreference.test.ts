import { afterEach, describe, expect, it } from 'vitest'

import {
  getSceneAutoSaveEnabled,
  setSceneAutoSaveEnabled,
  STORAGE_SCENE_AUTO_SAVE_KEY,
} from '@/core/sceneAutoSavePreference'

describe('sceneAutoSavePreference', () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_SCENE_AUTO_SAVE_KEY)
  })

  it('vem desligado por defeito', () => {
    expect(getSceneAutoSaveEnabled()).toBe(false)
  })

  it('persiste activação e desactivação', () => {
    setSceneAutoSaveEnabled(true)
    expect(getSceneAutoSaveEnabled()).toBe(true)
    expect(window.localStorage.getItem(STORAGE_SCENE_AUTO_SAVE_KEY)).toBe('1')

    setSceneAutoSaveEnabled(false)
    expect(getSceneAutoSaveEnabled()).toBe(false)
    expect(window.localStorage.getItem(STORAGE_SCENE_AUTO_SAVE_KEY)).toBeNull()
  })
})
