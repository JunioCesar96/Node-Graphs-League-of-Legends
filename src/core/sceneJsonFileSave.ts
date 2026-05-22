import type { CanvasScene } from '@/core/canvasScene'
import { serializeScene } from '@/core/leagueBinScene'
import { triggerJsonDownload } from '@/core/workspaceStorage'

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
 * Salvar manual: escolhe local (picker) ou download; o nome sugerido vem da aba.
 */
export async function saveSceneJsonManual(
  scene: CanvasScene,
  suggestedName: string,
): Promise<SceneJsonManualSaveResult> {
  const fileName = normalizeSceneJsonFileName(suggestedName)

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
