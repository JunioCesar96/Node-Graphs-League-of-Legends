import type { CanvasScene } from '@/core/canvasScene'
import { serializeScene } from '@/core/leagueBinScene'
import { triggerJsonDownload } from '@/core/workspaceStorage'

export const JSON_AUTO_SAVE_DEBOUNCE_MS = 500

export type SceneJsonFileContext = {
  fileName: string
  handle: FileSystemFileHandle | null
}

export type SceneJsonManualSaveResult =
  | { cancelled: true }
  | { cancelled: false; fileName: string; handle: FileSystemFileHandle | null; usedDownload: boolean }

function supportsFileSystemAccess(): boolean {
  return typeof window.showSaveFilePicker === 'function'
}

/** Nome seguro com sufixo `.json`. */
export function normalizeSceneJsonFileName(raw: string): string {
  const trimmed = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')

  if (!trimmed) {
    return 'cena.json'
  }

  const withoutExt = trimmed.toLowerCase().endsWith('.json') ? trimmed.slice(0, -5) : trimmed
  const stem = withoutExt.trim() || 'cena'

  return `${stem}.json`
}

function sceneToJsonBlob(scene: CanvasScene): Blob {
  const documentPayload = serializeScene(scene)

  return new Blob([JSON.stringify(documentPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
}

async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  if (!handle.queryPermission) {
    return true
  }

  const current = await handle.queryPermission({ mode: 'readwrite' })

  if (current === 'granted') {
    return true
  }

  if (!handle.requestPermission) {
    return false
  }

  const requested = await handle.requestPermission({ mode: 'readwrite' })

  return requested === 'granted'
}

async function writeSceneToHandle(handle: FileSystemFileHandle, scene: CanvasScene): Promise<boolean> {
  const allowed = await ensureWritePermission(handle)

  if (!allowed) {
    return false
  }

  const writable = await handle.createWritable()
  await writable.write(sceneToJsonBlob(scene))
  await writable.close()

  return true
}

/**
 * Salvar manual: prompt do nome → picker FS API ou download.
 */
export async function saveSceneJsonManual(
  scene: CanvasScene,
  suggestedName: string,
): Promise<SceneJsonManualSaveResult> {
  const defaultName = normalizeSceneJsonFileName(suggestedName)
  const raw = window.prompt('Nome do ficheiro:', defaultName)

  if (raw === null) {
    return { cancelled: true }
  }

  const fileName = normalizeSceneJsonFileName(raw)

  if (supportsFileSystemAccess()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Cena node-graphs-lol (JSON)',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })

      const ok = await writeSceneToHandle(handle, scene)

      if (ok) {
        return { cancelled: false, fileName: handle.name || fileName, handle, usedDownload: false }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { cancelled: true }
      }
    }
  }

  const documentPayload = serializeScene(scene)
  triggerJsonDownload(documentPayload, fileName)

  return { cancelled: false, fileName, handle: null, usedDownload: true }
}

/**
 * Auto-save: grava no handle da aba se existir; sem download automático.
 */
export async function saveSceneJsonAuto(
  scene: CanvasScene,
  context: SceneJsonFileContext | null,
): Promise<{ ok: boolean; reason?: 'no_handle' | 'permission_denied' | 'write_failed' }> {
  if (!context?.handle) {
    return { ok: false, reason: 'no_handle' }
  }

  try {
    const ok = await writeSceneToHandle(context.handle, scene)

    return ok ? { ok: true } : { ok: false, reason: 'permission_denied' }
  } catch {
    return { ok: false, reason: 'write_failed' }
  }
}
