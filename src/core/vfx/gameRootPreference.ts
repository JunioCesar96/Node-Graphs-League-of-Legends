export const STORAGE_VFX_GAME_ROOT_KEY = 'node-graphs-lol:vfxGameRoot'

export function getStoredVfxGameRoot(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_VFX_GAME_ROOT_KEY)
    return value != null && value.trim().length > 0 ? value.trim() : null
  } catch {
    return null
  }
}

export function setStoredVfxGameRoot(candidate: string) {
  try {
    const trimmed = candidate.trim()
    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_VFX_GAME_ROOT_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_VFX_GAME_ROOT_KEY, trimmed)
  } catch {
    /** quota / privado */
  }
}
