import type { CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import { hasMapU64PointerStructure } from '@/core/mapU64PointerValue'
import {
  MAP_U64_POINTER_NEW_KEY_DEFAULT,
  parseMapU64PointerString,
  type MapU64PointerEntry,
} from '@/core/mapU64PointerValue'
import {
  MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT,
  MAP_HASH_POINTER_ENTRY_GAP,
  MAP_HASH_POINTER_ENTRY_PADDING,
  MAP_HASH_POINTER_HASH_ROW_HEIGHT,
  MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT,
} from '@/core/mapHashPointerSlots'

export const MAP_U64_POINTER_SLOT_INFIX = '__map_u64__'

export function mapU64PointerSlotId(parameterId: string, key: string): string {
  const normalizedKey = key.trim().replace(/\s+/g, '_')
  return `${parameterId}${MAP_U64_POINTER_SLOT_INFIX}${normalizedKey}`
}

export function isMapU64PointerSlotId(slotId: string): boolean {
  return slotId.includes(MAP_U64_POINTER_SLOT_INFIX)
}

export function parseMapU64PointerSlotId(
  slotId: string,
): { parameterId: string; key: string } | null {
  const index = slotId.indexOf(MAP_U64_POINTER_SLOT_INFIX)
  if (index < 0) {
    return null
  }
  return {
    parameterId: slotId.slice(0, index),
    key: slotId.slice(index + MAP_U64_POINTER_SLOT_INFIX.length),
  }
}

export function mapU64PointerSlotsForParameter(
  parameter: NodeParameterDefinition,
  value: string,
): InternalStructureDefinition[] {
  if (parameter.type !== 'mapU64Pointer') {
    return []
  }
  return parseMapU64PointerString(value)
    .filter((entry) => hasMapU64PointerStructure(entry))
    .map((entry) => ({
      id: mapU64PointerSlotId(parameter.id, entry.key),
      name: entry.typeName || entry.schemaId,
      schemaId: entry.schemaId,
    }))
}

export function findMapU64PointerEntryBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
  valuesByParameterId: Readonly<Record<string, string>>,
): { parameter: NodeParameterDefinition; entry: MapU64PointerEntry; slot: InternalStructureDefinition } | null {
  const parsed = parseMapU64PointerSlotId(slotId)
  if (!parsed) {
    return null
  }
  const parameter = schema.parameters.find((p) => p.id === parsed.parameterId)
  if (!parameter || parameter.type !== 'mapU64Pointer') {
    return null
  }
  const value = valuesByParameterId[parameter.id] ?? parameter.defaultValue
  const entries = parseMapU64PointerString(value)
  const entry = entries.find(
    (e) =>
      hasMapU64PointerStructure(e) && mapU64PointerSlotId(parameter.id, e.key) === slotId,
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

export function resolveCollectionTypeForMapU64PointerSlot(
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

export function estimateMapU64PointerParameterHeight(
  parameter: NodeParameterDefinition,
  value: string,
): number {
  if (parameter.type !== 'mapU64Pointer') {
    return 128
  }
  const entries = parseMapU64PointerString(value)
  if (entries.length === 0) {
    return MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT + MAP_HASH_POINTER_HASH_ROW_HEIGHT
  }
  let height = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    height += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapU64PointerStructure(entry)) {
      height += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
    }
    height += MAP_HASH_POINTER_ENTRY_PADDING
    if (i < entries.length - 1) {
      height += MAP_HASH_POINTER_ENTRY_GAP
    }
  }
  return height
}

export function getMapU64PointerStructurePortYOffset(
  parameterId: string,
  entries: readonly MapU64PointerEntry[],
  structureId: string,
): number | null {
  let y = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    y += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapU64PointerStructure(entry)) {
      const slotId = mapU64PointerSlotId(parameterId, entry.key)
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

export function defaultMapU64PointerEntryFromCatalog(
  entries: readonly MapU64PointerEntry[],
): MapU64PointerEntry {
  const first = entries[0]
  if (first) {
    return {
      key: MAP_U64_POINTER_NEW_KEY_DEFAULT,
      schemaId: first.schemaId,
      typeName: first.typeName,
    }
  }
  return {
    key: MAP_U64_POINTER_NEW_KEY_DEFAULT,
    schemaId: '',
    typeName: 'Unknown',
  }
}
