import {
  codeDockSavePickerTypes,
  mimeTypeForSave,
  normalizeCodeDockFileName,
} from '@/core/codeDockFileTypes'

export type CodeDockTextSaveResult =
  | { cancelled: true }
  | { cancelled: false; fileName: string }

function supportsFileSystemAccess(): boolean {
  return typeof window.showSaveFilePicker === 'function'
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

async function writeTextToHandle(
  handle: FileSystemFileHandle,
  content: string,
  mimeType: string,
): Promise<boolean> {
  const allowed = await ensureWritePermission(handle)

  if (!allowed) {
    return false
  }

  const writable = await handle.createWritable()
  await writable.write(new Blob([content], { type: mimeType }))
  await writable.close()

  return true
}

function downloadTextFallback(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Salvar texto do CodeDock: escolhe local (picker) ou download. */
export async function saveCodeDockTextManual(
  content: string,
  suggestedName: string,
): Promise<CodeDockTextSaveResult> {
  const fileName = normalizeCodeDockFileName(suggestedName)
  const mimeType = mimeTypeForSave(fileName)

  if (supportsFileSystemAccess()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: codeDockSavePickerTypes(fileName),
      })

      const ok = await writeTextToHandle(handle, content, mimeType)

      if (ok) {
        return { cancelled: false, fileName: handle.name || fileName }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { cancelled: true }
      }
    }
  }

  downloadTextFallback(content, fileName, mimeType)

  return { cancelled: false, fileName }
}
