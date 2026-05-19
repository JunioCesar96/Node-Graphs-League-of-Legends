import type { NodeDataType } from '@/core/nodeSchema'
import { formatPrimitiveListPreview } from '@/core/listPrimitiveValue'
import { formatHashListDisplay, normalizeHashItem } from '@/core/listHashValue'
import { formatLinkPathPreview } from '@/core/linkValue'

export type MapHashLinkEntry = {
  key: string
  value: string
}

const ENTRY_SEPARATOR = '\n'
const FIELD_SEPARATOR = '\t'

const MAP_HASH_LINK_RITUAL_LINE_REGEX =
  /^\s*(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*=\s*(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*$/

export function isMapHashLinkRitType(ritType: string): boolean {
  return /^map\[hash,link\]/i.test(ritType.trim())
}

export function resolveMapHashLinkParameterType(ritType: string): NodeDataType | null {
  return isMapHashLinkRitType(ritType) ? 'mapHashLink' : null
}

/** Valor comporta-se como link ritual quando contém `/`. */
export function isMapHashLinkValue(value: string): boolean {
  return value.includes('/')
}

function normalizeMapValue(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed) as string
    } catch {
      return trimmed.slice(1, -1)
    }
  }
  if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
    return normalizeHashItem(trimmed)
  }
  return trimmed
}

function normalizeEntry(entry: MapHashLinkEntry): MapHashLinkEntry {
  return {
    key: normalizeHashItem(entry.key),
    value: normalizeMapValue(entry.value),
  }
}

export function parseMapHashLinkString(raw: string): MapHashLinkEntry[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  return trimmed
    .split(ENTRY_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const tabIndex = line.indexOf(FIELD_SEPARATOR)
      if (tabIndex < 0) {
        return normalizeEntry({ key: line, value: '' })
      }
      return normalizeEntry({
        key: line.slice(0, tabIndex),
        value: line.slice(tabIndex + 1),
      })
    })
    .filter((entry) => entry.key.length > 0)
}

export function formatMapHashLinkString(entries: readonly MapHashLinkEntry[]): string {
  if (entries.length === 0) {
    return ''
  }
  return entries
    .map((entry) => {
      const normalized = normalizeEntry(entry)
      return `${normalized.key}${FIELD_SEPARATOR}${normalized.value}`
    })
    .join(ENTRY_SEPARATOR)
}

export function normalizeMapHashLinkString(raw: string): string {
  return formatMapHashLinkString(parseMapHashLinkString(raw))
}

function parseMapHashLinkRitualLine(line: string): MapHashLinkEntry | null {
  const match = MAP_HASH_LINK_RITUAL_LINE_REGEX.exec(line.trim())
  if (!match) {
    return null
  }
  const key = match[1] ?? match[2]
  const value = match[3] ?? match[4]
  if (!key || value === undefined) {
    return null
  }
  return normalizeEntry({ key, value })
}

export function parseMapHashLinkRitualBody(inner: string): MapHashLinkEntry[] {
  const entries: MapHashLinkEntry[] = []
  for (const line of inner.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const entry = parseMapHashLinkRitualLine(trimmed)
    if (entry) {
      entries.push(entry)
    }
  }
  return entries
}

export function normalizeMapHashLinkRitualBody(inner: string): string {
  return formatMapHashLinkString(parseMapHashLinkRitualBody(inner))
}

export function formatMapHashLinkRitualLine(entry: MapHashLinkEntry): string {
  const normalized = normalizeEntry(entry)
  const keyPart = formatHashListDisplay(normalized.key)
  const valuePart = isMapHashLinkValue(normalized.value)
    ? `"${normalized.value.replace(/"/g, '\\"')}"`
    : formatHashListDisplay(normalized.value)
  return `${keyPart} = ${valuePart}`
}

export function isValidPartialMapHashLinkValue(value: string): boolean {
  return /^[\w\s"'\-0-9xX./\\\n\r\t]*$/.test(value)
}

export function formatMapHashLinkEntryPreview(entry: MapHashLinkEntry): string {
  const normalized = normalizeEntry(entry)
  const keyLabel = formatHashListDisplay(normalized.key)
  const valueLabel = isMapHashLinkValue(normalized.value)
    ? formatLinkPathPreview(normalized.value, 32)
    : formatHashListDisplay(normalized.value)
  return `${keyLabel} → ${valueLabel}`
}

export function formatMapHashLinkPreview(
  entries: readonly MapHashLinkEntry[],
  maxItems = 2,
): string {
  if (entries.length === 0) {
    return '∅'
  }
  return formatPrimitiveListPreview(entries.map(formatMapHashLinkEntryPreview), maxItems)
}

export const MAP_HASH_LINK_NEW_KEY_DEFAULT = 'NewKey'
