import type { NodeDataType } from '@/core/nodeSchema'
import { formatPrimitiveListPreview } from '@/core/listPrimitiveValue'
import {
  catalogStructuresFromEntries,
  emptyMapHashStructureEntry,
  entryWithStructure,
  hasMapHashStructure,
  isValidPartialMapHashStructureValue,
  structureCatalogChoiceKey,
  type MapHashStructureCatalogItem,
  type MapHashStructureEntry,
} from '@/core/mapHashStructureValue'

export type MapU64PointerEntry = MapHashStructureEntry
export type MapU64PointerStructureCatalogItem = MapHashStructureCatalogItem

export const MAP_U64_POINTER_NEW_KEY_DEFAULT = '0'

export const hasMapU64PointerStructure = hasMapHashStructure
export { catalogStructuresFromEntries, entryWithStructure, structureCatalogChoiceKey }

export function normalizeU64Key(raw: string): string {
  const digits = raw.trim().replace(/\D/g, '')
  return digits || MAP_U64_POINTER_NEW_KEY_DEFAULT
}

function normalizeEntry(entry: MapU64PointerEntry): MapU64PointerEntry {
  return {
    key: normalizeU64Key(entry.key),
    schemaId: entry.schemaId.trim(),
    typeName: entry.typeName.trim(),
  }
}

export function emptyMapU64PointerEntry(key = MAP_U64_POINTER_NEW_KEY_DEFAULT): MapU64PointerEntry {
  return emptyMapHashStructureEntry(normalizeU64Key(key))
}

export function parseMapU64PointerString(raw: string): MapU64PointerEntry[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t')
      if (parts.length < 3) {
        const key = parts[0] ?? line
        return normalizeEntry({ key, schemaId: '', typeName: '' })
      }
      return normalizeEntry({
        key: parts[0]!,
        schemaId: parts[1]!,
        typeName: parts.slice(2).join('\t'),
      })
    })
    .filter((entry) => entry.key.length > 0)
}

export function formatMapU64PointerString(entries: readonly MapU64PointerEntry[]): string {
  if (entries.length === 0) {
    return ''
  }
  return entries
    .map((entry) => {
      const normalized = normalizeEntry(entry)
      return `${normalized.key}\t${normalized.schemaId}\t${normalized.typeName}`
    })
    .join('\n')
}

export function normalizeMapU64PointerString(raw: string): string {
  return formatMapU64PointerString(parseMapU64PointerString(raw))
}

export function formatMapU64PointerEntryPreview(entry: MapU64PointerEntry): string {
  const normalized = normalizeEntry(entry)
  const typeLabel = normalized.typeName || normalized.schemaId
  return `${normalized.key} → ${typeLabel}`
}

export function formatMapU64PointerPreview(
  entries: readonly MapU64PointerEntry[],
  maxItems = 2,
): string {
  if (entries.length === 0) {
    return '∅'
  }
  return formatPrimitiveListPreview(entries.map(formatMapU64PointerEntryPreview), maxItems)
}

export function isValidPartialMapU64PointerValue(value: string): boolean {
  return isValidPartialMapHashStructureValue(value)
}

export function isMapU64PointerRitType(ritType: string): boolean {
  return /^map\[u64,pointer\]/i.test(ritType.trim())
}

export function resolveMapU64PointerParameterType(ritType: string): NodeDataType | null {
  return isMapU64PointerRitType(ritType) ? 'mapU64Pointer' : null
}

export function catalogTypeNamesFromEntries(entries: readonly MapU64PointerEntry[]): string[] {
  return catalogStructuresFromEntries(entries).map((item) => item.typeName)
}
