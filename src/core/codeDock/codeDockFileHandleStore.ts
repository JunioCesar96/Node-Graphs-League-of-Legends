/** Handles em memória (File System Access API) — não persistem entre reloads. */
const tabHandles = new Map<string, FileSystemFileHandle>()
const recentHandles = new Map<string, FileSystemFileHandle>()

function normalizeKey(fileName: string): string {
  return fileName.trim().toLowerCase()
}

export function setCodeDockTabFileHandle(tabId: string, handle: FileSystemFileHandle | null): void {
  if (!handle) {
    tabHandles.delete(tabId)
    return
  }
  tabHandles.set(tabId, handle)
  recentHandles.set(normalizeKey(handle.name || ''), handle)
}

export function getCodeDockTabFileHandle(tabId: string): FileSystemFileHandle | null {
  return tabHandles.get(tabId) ?? null
}

export function clearCodeDockTabFileHandle(tabId: string): void {
  tabHandles.delete(tabId)
}

export function rememberRecentFileHandle(fileName: string, handle: FileSystemFileHandle): void {
  recentHandles.set(normalizeKey(fileName), handle)
}

export function getRecentFileHandle(fileName: string): FileSystemFileHandle | null {
  return recentHandles.get(normalizeKey(fileName)) ?? null
}

export function clearRecentFileHandle(fileName: string): void {
  recentHandles.delete(normalizeKey(fileName))
}
