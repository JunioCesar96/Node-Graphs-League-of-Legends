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

export type MapHashEmbedEntry = MapHashStructureEntry
export type MapHashEmbedStructureCatalogItem = MapHashStructureCatalogItem

export const MAP_HASH_EMBED_NEW_KEY_DEFAULT = '0x00000000'

export const hasMapHashEmbedStructure = hasMapHashStructure
export { catalogStructuresFromEntries, entryWithStructure, structureCatalogChoiceKey }

export function emptyMapHashEmbedEntry(key = MAP_HASH_EMBED_NEW_KEY_DEFAULT): MapHashEmbedEntry {
  return emptyMapHashStructureEntry(key)
}

export function parseMapHashEmbedString(raw: string): MapHashEmbedEntry[] {
  return parseMapHashStructureString(raw)
}

export function formatMapHashEmbedString(entries: readonly MapHashEmbedEntry[]): string {
  return formatMapHashStructureString(entries)
}

export function normalizeMapHashEmbedString(raw: string): string {
  return normalizeMapHashStructureString(raw)
}

export function formatMapHashEmbedEntryPreview(entry: MapHashEmbedEntry): string {
  return formatMapHashStructureEntryPreview(entry)
}

export function formatMapHashEmbedPreview(entries: readonly MapHashEmbedEntry[], maxItems = 2): string {
  return formatMapHashStructurePreview(entries, maxItems)
}

export function isValidPartialMapHashEmbedValue(value: string): boolean {
  return isValidPartialMapHashStructureValue(value)
}

export function isMapHashEmbedRitType(ritType: string): boolean {
  return /^map\[hash,embed\]/i.test(ritType.trim())
}

export function resolveMapHashEmbedParameterType(ritType: string): NodeDataType | null {
  return isMapHashEmbedRitType(ritType) ? 'mapHashEmbed' : null
}
