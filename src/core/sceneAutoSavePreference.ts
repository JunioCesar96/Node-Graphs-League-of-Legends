export const STORAGE_SCENE_AUTO_SAVE_KEY = 'node-graphs-lol:auto-save'

export function getSceneAutoSaveEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_SCENE_AUTO_SAVE_KEY) === '1'
  } catch {
    return false
  }
}

export function setSceneAutoSaveEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_SCENE_AUTO_SAVE_KEY, '1')
    } else {
      window.localStorage.removeItem(STORAGE_SCENE_AUTO_SAVE_KEY)
    }
  } catch {
    /** quota / modo privado */
  }
}
