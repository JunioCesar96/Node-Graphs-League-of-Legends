/**
 * Dev (Vite + Windows): Root Folder e leitura de pastas por caminho absoluto.
 */

/** @type {boolean | null} */
let nativePickerAvailableCache = null

/**
 * @returns {Promise<boolean>}
 */
export async function isGalleryNativePickerAvailable() {
  if (nativePickerAvailableCache === true) {
    return true
  }
  try {
    const response = await fetch('/api/gallery-native-available')
    if (!response.ok) {
      return false
    }
    const payload = await response.json()
    const available = Boolean(payload?.available)
    if (available) {
      nativePickerAvailableCache = true
    }
    return available
  } catch {
    return false
  }
}

/**
 * Root Folder (Raiz) — só o caminho, sem listar ficheiros.
 * @returns {Promise<string | null>}
 */
export async function pickGalleryRootFolder() {
  try {
    const response = await fetch('/api/gallery-pick-folder-base', { method: 'POST' })
    if (response.status === 204 || response.status === 501 || !response.ok) {
      return null
    }
    const payload = await response.json()
    const base = String(payload?.base || '').trim()
    return base || null
  } catch {
    return null
  }
}

/**
 * Lista texturas numa pasta (ou um único ficheiro) sob a Raiz.
 * @param {string} directory
 * @returns {Promise<{ base: string, entries: { file: File | null, relativePath: string, absolutePath: string }[] } | null>}
 */
export async function scanGalleryDirectory(directory) {
  const target = String(directory || '').trim()
  if (!target) return null

  try {
    const response = await fetch('/api/gallery-scan-directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: target }),
    })
    if (!response.ok) {
      return null
    }
    const payload = await response.json()
    if (!payload?.ok || !Array.isArray(payload.files)) {
      return null
    }

    const entries = []
    for (const item of payload.files) {
      const absolutePath = String(item.absolutePath || '').trim()
      const relativePath = String(item.relativePath || '').replace(/\\/g, '/')
      if (!absolutePath || !relativePath) continue
      entries.push({ file: null, relativePath, absolutePath })
    }

    if (!entries.length) {
      return null
    }

    return {
      base: String(payload.base || target).trim(),
      entries,
    }
  } catch {
    return null
  }
}

/**
 * @param {{ file?: File | null, relativePath?: string, absolutePath?: string }} entry
 * @returns {Promise<File | null>}
 */
export async function fetchGalleryEntryFile(entry) {
  if (!entry) return null
  if (entry.file instanceof File) {
    return entry.file
  }

  const absolutePath = String(entry.absolutePath || '').trim()
  if (!absolutePath) {
    return null
  }

  const fileResponse = await fetch(
    `/api/gallery-file?path=${encodeURIComponent(absolutePath)}`,
  )
  if (!fileResponse.ok) {
    return null
  }

  const blob = await fileResponse.blob()
  const relativePath = String(entry.relativePath || '').replace(/\\/g, '/')
  const name = relativePath.split('/').pop() || 'texture'
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  entry.file = file
  return file
}
