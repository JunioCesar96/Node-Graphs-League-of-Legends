import type { CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import {
  MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT,
  MAP_HASH_POINTER_ENTRY_GAP,
  MAP_HASH_POINTER_ENTRY_PADDING,
  MAP_HASH_POINTER_HASH_ROW_HEIGHT,
  MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT,
} from '@/core/mapHashPointerSlots'
import { hasMapHashStructure } from '@/core/mapHashStructureValue'
import { parseMapHashEmbedString, type MapHashEmbedEntry } from '@/core/mapHashEmbedValue'

const hasMapHashEmbedStructure = hasMapHashStructure

export const MAP_HASH_EMBED_SLOT_INFIX = '__map_embed__'

export function mapHashEmbedSlotId(parameterId: string, key: string): string {
  const normalizedKey = key.trim().replace(/\s+/g, '_')
  return `${parameterId}${MAP_HASH_EMBED_SLOT_INFIX}${normalizedKey}`
}

export function isMapHashEmbedSlotId(slotId: string): boolean {
  return slotId.includes(MAP_HASH_EMBED_SLOT_INFIX)
}

export function parseMapHashEmbedSlotId(
  slotId: string,
): { parameterId: string; key: string } | null {
  const index = slotId.indexOf(MAP_HASH_EMBED_SLOT_INFIX)
  if (index < 0) {
    return null
  }
  return {
    parameterId: slotId.slice(0, index),
    key: slotId.slice(index + MAP_HASH_EMBED_SLOT_INFIX.length),
  }
}

export function mapHashEmbedSlotsForParameter(
  parameter: NodeParameterDefinition,
  value: string,
): InternalStructureDefinition[] {
  if (parameter.type !== 'mapHashEmbed') {
    return []
  }
  return parseMapHashEmbedString(value)
    .filter((entry) => hasMapHashEmbedStructure(entry))
    .map((entry) => ({
      id: mapHashEmbedSlotId(parameter.id, entry.key),
      name: entry.typeName || entry.schemaId,
      schemaId: entry.schemaId,
    }))
}

export function findMapHashEmbedEntryBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
  valuesByParameterId: Readonly<Record<string, string>>,
): { parameter: NodeParameterDefinition; entry: MapHashEmbedEntry; slot: InternalStructureDefinition } | null {
  const parsed = parseMapHashEmbedSlotId(slotId)
  if (!parsed) {
    return null
  }
  const parameter = schema.parameters.find((p) => p.id === parsed.parameterId)
  if (!parameter || parameter.type !== 'mapHashEmbed') {
    return null
  }
  const value = valuesByParameterId[parameter.id] ?? parameter.defaultValue
  const entries = parseMapHashEmbedString(value)
  const entry = entries.find(
    (e) => hasMapHashEmbedStructure(e) && mapHashEmbedSlotId(parameter.id, e.key) === slotId,
  )
  if (!entry) {
    return null
  }
  return {
    parameter,
    entry,
    slot: {
      id: slotId,
      name: entry.typeName || entry.schemaId,
      schemaId: entry.schemaId,
    },
  }
}

export function resolveCollectionTypeForMapHashEmbedSlot(
  slot: InternalStructureDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  connectedTarget?: CanvasNode | null,
): string | undefined {
  const fromSlot = resolveCollectionTypeForSlot(slot.schemaId, registry)
  if (fromSlot) {
    return fromSlot
  }
  if (connectedTarget) {
    return connectedTarget.node.schema.nomenclature?.collectionType?.trim() || undefined
  }
  return undefined
}

export function estimateMapHashEmbedParameterHeight(
  parameter: NodeParameterDefinition,
  value: string,
): number {
  if (parameter.type !== 'mapHashEmbed') {
    return 128
  }
  const entries = parseMapHashEmbedString(value)
  if (entries.length === 0) {
    return MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT + MAP_HASH_POINTER_HASH_ROW_HEIGHT
  }
  let height = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    height += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapHashEmbedStructure(entry)) {
      height += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
    }
    height += MAP_HASH_POINTER_ENTRY_PADDING
    if (i < entries.length - 1) {
      height += MAP_HASH_POINTER_ENTRY_GAP
    }
  }
  return height
}

export function getMapHashEmbedStructurePortYOffset(
  parameterId: string,
  entries: readonly MapHashEmbedEntry[],
  structureId: string,
): number | null {
  let y = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    y += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapHashEmbedStructure(entry)) {
      const slotId = mapHashEmbedSlotId(parameterId, entry.key)
      if (slotId === structureId) {
        return y + MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT * 0.5
      }
      y += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
    }
    y += MAP_HASH_POINTER_ENTRY_PADDING
    if (i < entries.length - 1) {
      y += MAP_HASH_POINTER_ENTRY_GAP
    }
  }
  return null
}
