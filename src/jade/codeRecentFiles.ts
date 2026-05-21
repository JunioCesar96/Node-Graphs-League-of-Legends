const STORAGE_KEY = 'node-graphs-lol:code-recent'
const MAX_RECENT = 10

export function readCodeRecentFiles(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function pushCodeRecentFile(fileName: string): void {
  const name = fileName.trim()
  if (!name) return
  const prev = readCodeRecentFiles().filter((f) => f !== name)
  const next = [name, ...prev].slice(0, MAX_RECENT)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
