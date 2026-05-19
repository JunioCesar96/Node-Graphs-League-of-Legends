import type { CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import { hasMapHashStructure } from '@/core/mapHashStructureValue'
import {
  MAP_HASH_POINTER_NEW_KEY_DEFAULT,
  parseMapHashPointerString,
  type MapHashPointerEntry,
} from '@/core/mapHashPointerValue'

const hasMapHashPointerStructure = hasMapHashStructure

export const MAP_HASH_POINTER_SLOT_INFIX = '__map__'

/** `ParametricClipData_parameter_mEventDataMap__map__0xb638e658` */
export function mapHashPointerSlotId(parameterId: string, key: string): string {
  const normalizedKey = key.trim().replace(/\s+/g, '_')
  return `${parameterId}${MAP_HASH_POINTER_SLOT_INFIX}${normalizedKey}`
}

export function isMapHashPointerSlotId(slotId: string): boolean {
  return slotId.includes(MAP_HASH_POINTER_SLOT_INFIX)
}

export function parseMapHashPointerSlotId(
  slotId: string,
): { parameterId: string; key: string } | null {
  const index = slotId.indexOf(MAP_HASH_POINTER_SLOT_INFIX)
  if (index < 0) {
    return null
  }
  return {
    parameterId: slotId.slice(0, index),
    key: slotId.slice(index + MAP_HASH_POINTER_SLOT_INFIX.length),
  }
}

export function mapHashPointerSlotsForParameter(
  parameter: NodeParameterDefinition,
  value: string,
): InternalStructureDefinition[] {
  if (parameter.type !== 'mapHashPointer') {
    return []
  }
  return parseMapHashPointerString(value)
    .filter((entry) => hasMapHashPointerStructure(entry))
    .map((entry) => ({
      id: mapHashPointerSlotId(parameter.id, entry.key),
      name: entry.typeName || entry.schemaId,
      schemaId: entry.schemaId,
    }))
}

export function findMapHashPointerEntryBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
  valuesByParameterId: Readonly<Record<string, string>>,
): { parameter: NodeParameterDefinition; entry: MapHashPointerEntry; slot: InternalStructureDefinition } | null {
  const parsed = parseMapHashPointerSlotId(slotId)
  if (!parsed) {
    return null
  }
  const parameter = schema.parameters.find((p) => p.id === parsed.parameterId)
  if (!parameter || parameter.type !== 'mapHashPointer') {
    return null
  }
  const value = valuesByParameterId[parameter.id] ?? parameter.defaultValue
  const entries = parseMapHashPointerString(value)
  const entry = entries.find(
    (e) =>
      hasMapHashPointerStructure(e) && mapHashPointerSlotId(parameter.id, e.key) === slotId,
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

export function resolveCollectionTypeForMapHashPointerSlot(
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

/** Altura do cabeçalho do bloco (título + ações mapa). */
export const MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT = 42
/** Hash row + ações por entrada. */
export const MAP_HASH_POINTER_HASH_ROW_HEIGHT = 40
/** Linha de estrutura interna + porta. */
export const MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT = 36
export const MAP_HASH_POINTER_ENTRY_GAP = 8
export const MAP_HASH_POINTER_ENTRY_PADDING = 16

export function estimateMapHashPointerParameterHeight(
  parameter: NodeParameterDefinition,
  value: string,
): number {
  if (parameter.type !== 'mapHashPointer') {
    return 128
  }
  const entries = parseMapHashPointerString(value)
  if (entries.length === 0) {
    return MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT + MAP_HASH_POINTER_HASH_ROW_HEIGHT
  }
  let height = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    height += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapHashPointerStructure(entry)) {
      height += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
    }
    height += MAP_HASH_POINTER_ENTRY_PADDING
    if (i < entries.length - 1) {
      height += MAP_HASH_POINTER_ENTRY_GAP
    }
  }
  return height
}

/** Offset vertical (px) do centro da porta dentro do bloco map[hash,pointer], a partir do topo do parâmetro. */
export function getMapHashPointerStructurePortYOffset(
  parameterId: string,
  entries: readonly MapHashPointerEntry[],
  structureId: string,
): number | null {
  let y = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!
    y += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasMapHashPointerStructure(entry)) {
      const slotId = mapHashPointerSlotId(parameterId, entry.key)
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

export function defaultMapHashPointerEntryFromCatalog(
  entries: readonly MapHashPointerEntry[],
): MapHashPointerEntry {
  const first = entries[0]
  if (first) {
    return {
      key: MAP_HASH_POINTER_NEW_KEY_DEFAULT,
      schemaId: first.schemaId,
      typeName: first.typeName,
    }
  }
  return {
    key: MAP_HASH_POINTER_NEW_KEY_DEFAULT,
    schemaId: '',
    typeName: 'Unknown',
  }
}
