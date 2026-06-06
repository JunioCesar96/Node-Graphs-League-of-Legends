import {
  mimeTypeForSave,
  normalizeCodeDockFileName,
  needsBinConversionOnSave,
} from '@/core/codeDockFileTypes'
import {
  downloadBytesAsFile,
  saveBinContentForCodeDock,
} from '@/core/codeDock/codeDockBinPipeline'
import {
  codeDockSavePickerTypesForName,
  downloadBytesFallback,
  downloadTextFallback,
  mimeForCodeDockSave,
  supportsFileSystemAccess,
  writeBytesToHandle,
  writeTextToHandle,
} from '@/core/codeDock/codeDockFileSystem'
import {
  getCodeDockTabFileHandle,
  rememberRecentFileHandle,
  setCodeDockTabFileHandle,
} from '@/core/codeDock/codeDockFileHandleStore'

export type CodeDockSaveResult =
  | { cancelled: true }
  | { cancelled: false; fileName: string; handle: FileSystemFileHandle | null }

async function pickSaveHandle(
  suggestedName: string,
  forcePicker: boolean,
  existingHandle: FileSystemFileHandle | null,
): Promise<FileSystemFileHandle | null> {
  if (!forcePicker && existingHandle) {
    return existingHandle
  }

  if (!supportsFileSystemAccess()) {
    return null
  }

  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: codeDockSavePickerTypesForName(suggestedName),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    return null
  }
}

/** Grava conteúdo textual ou binário (via ponte) no disco ou download. */
export async function saveCodeDockFileContent(options: {
  tabId: string
  content: string
  suggestedName: string
  saveAs?: boolean
}): Promise<CodeDockSaveResult> {
  const fileName = normalizeCodeDockFileName(options.suggestedName)
  const forcePicker = options.saveAs === true
  const existingHandle = forcePicker ? null : getCodeDockTabFileHandle(options.tabId)

  if (needsBinConversionOnSave(fileName)) {
    const bin = await saveBinContentForCodeDock(options.content, fileName)
    if (bin.branch === 'error') {
      window.alert(`Não foi possível converter para .bin: ${bin.message}`)
      return { cancelled: true }
    }
    if (bin.branch === 'cancelled') {
      return { cancelled: true }
    }

    const handle = await pickSaveHandle(bin.fileName, forcePicker, existingHandle)
    if (handle) {
      const ok = await writeBytesToHandle(handle, bin.bytes)
      if (ok) {
        const savedName = handle.name || bin.fileName
        setCodeDockTabFileHandle(options.tabId, handle)
        rememberRecentFileHandle(savedName, handle)
        return { cancelled: false, fileName: savedName, handle }
      }
    }

    downloadBytesAsFile(bin.bytes, bin.fileName)
    return { cancelled: false, fileName: bin.fileName, handle: null }
  }

  const mimeType = mimeForCodeDockSave(fileName)
  const handle = await pickSaveHandle(fileName, forcePicker, existingHandle)

  if (handle) {
    const ok = await writeTextToHandle(handle, options.content, mimeType)
    if (ok) {
      const savedName = handle.name || fileName
      setCodeDockTabFileHandle(options.tabId, handle)
      rememberRecentFileHandle(savedName, handle)
      return { cancelled: false, fileName: savedName, handle }
    }
  }

  if (handle === null && forcePicker) {
    return { cancelled: true }
  }

  downloadTextFallback(options.content, fileName, mimeType)
  return { cancelled: false, fileName, handle: null }
}

/** Grava com diálogo «Guardar como» (tabs sem handle associado). */
export async function saveCodeDockTextManual(
  content: string,
  suggestedName: string,
): Promise<{ cancelled: true } | { cancelled: false; fileName: string }> {
  const result = await saveCodeDockFileContent({
    tabId: '',
    content,
    suggestedName,
    saveAs: true,
  })

  if (result.cancelled) {
    return { cancelled: true }
  }

  return { cancelled: false, fileName: result.fileName }
}

export { downloadBytesFallback }
