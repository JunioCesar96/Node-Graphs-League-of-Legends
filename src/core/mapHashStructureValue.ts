import { formatPrimitiveListPreview } from '@/core/listPrimitiveValue'
import { formatHashListDisplay, normalizeHashItem } from '@/core/listHashValue'

export type MapHashStructureEntry = {
  key: string
  schemaId: string
  typeName: string
}

export type MapHashStructureCatalogItem = {
  typeName: string
  schemaId: string
}

export const MAP_HASH_STRUCTURE_NEW_KEY_DEFAULT = '0x00000000'

const ENTRY_SEPARATOR = '\n'
const FIELD_SEPARATOR = '\t'

function normalizeEntry(entry: MapHashStructureEntry): MapHashStructureEntry {
  return {
    key: normalizeHashItem(entry.key),
    schemaId: entry.schemaId.trim(),
    typeName: entry.typeName.trim(),
  }
}

export function hasMapHashStructure(entry: MapHashStructureEntry): boolean {
  return entry.schemaId.trim().length > 0
}

export function catalogStructuresFromEntries(
  entries: readonly MapHashStructureEntry[],
): MapHashStructureCatalogItem[] {
  const seen = new Set<string>()
  const out: MapHashStructureCatalogItem[] = []
  for (const entry of entries) {
    const schemaId = entry.schemaId.trim()
    const typeName = entry.typeName.trim()
    if (!schemaId || !typeName) {
      continue
    }
    const key = `${schemaId}:${typeName}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push({ typeName, schemaId })
  }
  return out
}

export function emptyMapHashStructureEntry(
  key = MAP_HASH_STRUCTURE_NEW_KEY_DEFAULT,
): MapHashStructureEntry {
  return { key: normalizeHashItem(key), schemaId: '', typeName: '' }
}

export function entryWithStructure(
  key: string,
  typeName: string,
  schemaId: string,
): MapHashStructureEntry {
  return {
    key: normalizeHashItem(key),
    schemaId: schemaId.trim(),
    typeName: typeName.trim(),
  }
}

export function parseMapHashStructureString(raw: string): MapHashStructureEntry[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  return trimmed
    .split(ENTRY_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(FIELD_SEPARATOR)
      if (parts.length < 3) {
        const key = parts[0] ?? line
        return normalizeEntry({ key, schemaId: '', typeName: '' })
      }
      return normalizeEntry({
        key: parts[0]!,
        schemaId: parts[1]!,
        typeName: parts.slice(2).join(FIELD_SEPARATOR),
      })
    })
    .filter((entry) => entry.key.length > 0)
}

export function formatMapHashStructureString(entries: readonly MapHashStructureEntry[]): string {
  if (entries.length === 0) {
    return ''
  }
  return entries
    .map((entry) => {
      const normalized = normalizeEntry(entry)
      return `${normalized.key}${FIELD_SEPARATOR}${normalized.schemaId}${FIELD_SEPARATOR}${normalized.typeName}`
    })
    .join(ENTRY_SEPARATOR)
}

export function normalizeMapHashStructureString(raw: string): string {
  return formatMapHashStructureString(parseMapHashStructureString(raw))
}

export function formatMapHashStructureEntryPreview(entry: MapHashStructureEntry): string {
  const normalized = normalizeEntry(entry)
  const keyLabel = formatHashListDisplay(normalized.key)
  const typeLabel = normalized.typeName || normalized.schemaId
  return `${keyLabel} → ${typeLabel}`
}

export function formatMapHashStructurePreview(
  entries: readonly MapHashStructureEntry[],
  maxItems = 2,
): string {
  if (entries.length === 0) {
    return '∅'
  }
  return formatPrimitiveListPreview(entries.map(formatMapHashStructureEntryPreview), maxItems)
}

export function isValidPartialMapHashStructureValue(value: string): boolean {
  return /^[\w\s"'\-0-9xX.\t\n\r]*$/.test(value)
}

export function structureCatalogChoiceKey(item: MapHashStructureCatalogItem): string {
  return `${item.schemaId}:${item.typeName}`
}
