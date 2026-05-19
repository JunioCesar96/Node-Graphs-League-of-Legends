import type { NodeDataType } from '@/core/nodeSchema'
import {
  catalogStructuresFromEntries,
  emptyMapHashStructureEntry,
  entryWithStructure,
  formatMapHashStructureEntryPreview,
  formatMapHashStructurePreview,
  formatMapHashStructureString,
  hasMapHashStructure,
  isValidPartialMapHashStructureValue,
  normalizeMapHashStructureString,
  parseMapHashStructureString,
  structureCatalogChoiceKey,
  type MapHashStructureCatalogItem,
  type MapHashStructureEntry,
} from '@/core/mapHashStructureValue'

export type MapHashPointerEntry = MapHashStructureEntry
export type MapHashPointerStructureCatalogItem = MapHashStructureCatalogItem

export const MAP_HASH_POINTER_NEW_KEY_DEFAULT = '0x00000000'

export const hasMapHashPointerStructure = hasMapHashStructure
export { catalogStructuresFromEntries, entryWithStructure, structureCatalogChoiceKey }

export function emptyMapHashPointerEntry(key = MAP_HASH_POINTER_NEW_KEY_DEFAULT): MapHashPointerEntry {
  return emptyMapHashStructureEntry(key)
}

export function parseMapHashPointerString(raw: string): MapHashPointerEntry[] {
  return parseMapHashStructureString(raw)
}

export function formatMapHashPointerString(entries: readonly MapHashPointerEntry[]): string {
  return formatMapHashStructureString(entries)
}

export function normalizeMapHashPointerString(raw: string): string {
  return normalizeMapHashStructureString(raw)
}

export function formatMapHashPointerEntryPreview(entry: MapHashPointerEntry): string {
  return formatMapHashStructureEntryPreview(entry)
}

export function formatMapHashPointerPreview(entries: readonly MapHashPointerEntry[], maxItems = 2): string {
  return formatMapHashStructurePreview(entries, maxItems)
}

export function isValidPartialMapHashPointerValue(value: string): boolean {
  return isValidPartialMapHashStructureValue(value)
}

export function isMapHashPointerRitType(ritType: string): boolean {
  return /^map\[hash,pointer\]/i.test(ritType.trim())
}

export function resolveMapHashPointerParameterType(ritType: string): NodeDataType | null {
  return isMapHashPointerRitType(ritType) ? 'mapHashPointer' : null
}

export function catalogTypeNamesFromEntries(entries: readonly MapHashPointerEntry[]): string[] {
  return catalogStructuresFromEntries(entries).map((item) => item.typeName)
}
