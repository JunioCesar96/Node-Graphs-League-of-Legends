export const STORAGE_NODE_LIGHT_MODE_KEY = 'node-graphs-lol:node-light-mode'

/** Modo leve activo por omissão (ausência da chave = activo). */
export function getNodeLightModeEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_NODE_LIGHT_MODE_KEY)
    if (raw === null) {
      return true
    }
    return raw === '1'
  } catch {
    return true
  }
}

export function setNodeLightModeEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(STORAGE_NODE_LIGHT_MODE_KEY, '1')
    } else {
      window.localStorage.setItem(STORAGE_NODE_LIGHT_MODE_KEY, '0')
    }
  } catch {
    /** quota / modo privado */
  }
}
