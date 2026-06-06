import { codeDockSavePickerTypes, mimeTypeForSave } from '@/core/codeDockFileTypes'

export function supportsFileSystemAccess(): boolean {
  return typeof window.showOpenFilePicker === 'function' && typeof window.showSaveFilePicker === 'function'
}

export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
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

  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

export async function ensureReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  if (!handle.queryPermission) {
    return true
  }

  const current = await handle.queryPermission({ mode: 'read' })
  if (current === 'granted') {
    return true
  }

  if (!handle.requestPermission) {
    return false
  }

  return (await handle.requestPermission({ mode: 'read' })) === 'granted'
}

export async function writeTextToHandle(
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

export async function writeBytesToHandle(
  handle: FileSystemFileHandle,
  bytes: Uint8Array,
): Promise<boolean> {
  const allowed = await ensureWritePermission(handle)
  if (!allowed) {
    return false
  }

  const writable = await handle.createWritable()
  await writable.write(new Blob([bytes], { type: 'application/octet-stream' }))
  await writable.close()
  return true
}

export function downloadTextFallback(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadBytesFallback(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readFileFromHandle(handle: FileSystemFileHandle): Promise<File | null> {
  const allowed = await ensureReadPermission(handle)
  if (!allowed) {
    return null
  }

  return handle.getFile()
}

export function codeDockOpenPickerTypes() {
  return [
    { description: 'Binário ritual', accept: { 'application/octet-stream': ['.bin'] } },
    { description: 'Ritobin (texto)', accept: { 'text/plain': ['.py'] } },
    { description: 'Texto', accept: { 'text/plain': ['.txt', '.md', '.json', '.xml', '.yaml', '.yml'] } },
  ]
}

export function codeDockSavePickerTypesForName(suggestedName: string) {
  return codeDockSavePickerTypes(suggestedName)
}

export function mimeForCodeDockSave(fileName: string): string {
  return mimeTypeForSave(fileName)
}
