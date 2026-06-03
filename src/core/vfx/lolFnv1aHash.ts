/** FNV-1a 32-bit sobre o identificador em minúsculas (hashes de campos PROP do LoL). */
export function lolFnv1aHash(name: string): number {
  const lower = name.toLowerCase()
  let hash = 0x811c9dc5
  for (let i = 0; i < lower.length; i++) {
    hash ^= lower.charCodeAt(i)!
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function lolFnv1aHashHex(name: string): string {
  return `0x${lolFnv1aHash(name).toString(16).padStart(8, '0')}`
}

export function normalizeRitualHashKey(key: string): string {
  const trimmed = key.trim()
  if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
    const numeric = Number.parseInt(trimmed.slice(2), 16)
    if (!Number.isFinite(numeric)) {
      return `0x${trimmed.slice(2).toLowerCase()}`
    }
    return `0x${(numeric >>> 0).toString(16)}`
  }
  return trimmed
}

export function ritualHashEquals(a: string, b: string): boolean {
  return normalizeRitualHashKey(a) === normalizeRitualHashKey(b)
}
