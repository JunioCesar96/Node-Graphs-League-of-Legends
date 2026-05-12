/** Caminho do executável ritobin opcional — `localStorage` (sem acesso ao FS no browser; para referência/copy e futuros wrappers nativos). */
export const STORAGE_RITOBIN_EXE_PATH_KEY = 'node-graphs-lol:ritobinExePath'

export function getStoredRitobinExePath(): string | null {
  try {
    const value = window.localStorage.getItem(STORAGE_RITOBIN_EXE_PATH_KEY)

    return value != null && value.trim().length > 0 ? value.trim() : null
  } catch {
    return null
  }
}

export function setStoredRitobinExePath(candidate: string) {
  try {
    const trimmed = candidate.trim()

    if (trimmed.length === 0) {
      window.localStorage.removeItem(STORAGE_RITOBIN_EXE_PATH_KEY)

      return
    }

    window.localStorage.setItem(STORAGE_RITOBIN_EXE_PATH_KEY, trimmed)
  } catch {
    /** Silêncio: quota / modo privado. */
  }
}

export function clearStoredRitobinExePath() {
  try {
    window.localStorage.removeItem(STORAGE_RITOBIN_EXE_PATH_KEY)
  } catch {
    /** ignore */
  }
}

/** Alguns embeddings (Electron) expõem `path` no `File`; no browser típico fica indefinido. */
export function readAbsolutePathFromDroppedOrPickedFile(file: File): string | undefined {
  const candidate = Reflect.get(file, 'path')

  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : undefined
}
