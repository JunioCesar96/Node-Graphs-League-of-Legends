import {
  CODE_DOCK_FILE_INPUT_ACCEPT,
  getFileExtension,
  needsBinConversionOnOpen,
} from '@/core/codeDockFileTypes'
import { openBinFileForCodeDock } from '@/core/codeDock/codeDockBinPipeline'
import {
  codeDockOpenPickerTypes,
  readFileFromHandle,
  supportsFileSystemAccess,
} from '@/core/codeDock/codeDockFileSystem'
import {
  getRecentFileHandle,
  rememberRecentFileHandle,
  setCodeDockTabFileHandle,
} from '@/core/codeDock/codeDockFileHandleStore'

export type CodeDockOpenedFile = {
  file: File
  handle: FileSystemFileHandle | null
}

export type CodeDockOpenPickResult =
  | { branch: 'cancelled' }
  | { branch: 'success'; opened: CodeDockOpenedFile }
  | { branch: 'error'; message: string }

function plainTextViaLabel(fileName: string): string {
  const ext = getFileExtension(fileName)
  if (ext === 'py') return 'ritobin (.py)'
  if (ext === 'json') return 'JSON'
  if (ext === 'md' || ext === 'markdown') return 'Markdown'
  return 'texto'
}

/** Abre diálogo nativo (File System Access) ou input oculto como fallback. */
export async function pickCodeDockFileFromDisk(): Promise<CodeDockOpenPickResult> {
  if (supportsFileSystemAccess()) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: codeDockOpenPickerTypes(),
      })
      const handle = handles[0]
      if (!handle) {
        return { branch: 'cancelled' }
      }
      const file = await readFileFromHandle(handle)
      if (!file) {
        return { branch: 'error', message: 'Permissão de leitura negada.' }
      }
      rememberRecentFileHandle(file.name, handle)
      return { branch: 'success', opened: { file, handle } }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { branch: 'cancelled' }
      }
    }
  }

  return { branch: 'cancelled' }
}

/** Reabre ficheiro recente via handle em memória (se existir). */
export async function reopenRecentCodeDockFile(fileName: string): Promise<CodeDockOpenPickResult> {
  const handle = getRecentFileHandle(fileName)
  if (!handle) {
    return {
      branch: 'error',
      message: `«${fileName}»: reabre com Arquivo → Abrir… (caminho completo não disponível no browser).`,
    }
  }

  const file = await readFileFromHandle(handle)
  if (!file) {
    return { branch: 'error', message: 'Permissão de leitura negada para ficheiro recente.' }
  }

  return { branch: 'success', opened: { file, handle } }
}

export type CodeDockImportPayload =
  | { branch: 'bin'; text: string; fileName: string; via: string }
  | { branch: 'text'; text: string; fileName: string; via: string }
  | { branch: 'error'; message: string }

/** Lê ficheiro escolhido e prepara conteúdo para o editor. */
export async function importCodeDockFile(opened: CodeDockOpenedFile): Promise<CodeDockImportPayload> {
  const { file } = opened

  if (needsBinConversionOnOpen(file.name)) {
    const bin = await openBinFileForCodeDock(file)
    if (bin.branch === 'success') {
      return { branch: 'bin', text: bin.text, fileName: file.name, via: bin.via }
    }
    return { branch: 'error', message: bin.message }
  }

  const text = await file.text()
  return {
    branch: 'text',
    text,
    fileName: file.name,
    via: plainTextViaLabel(file.name),
  }
}

export function bindCodeDockFileHandleToTab(tabId: string, handle: FileSystemFileHandle | null): void {
  setCodeDockTabFileHandle(tabId, handle)
}

export { CODE_DOCK_FILE_INPUT_ACCEPT }
