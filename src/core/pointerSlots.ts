import type { CanvasConnection } from '@/core/canvasScene'
import type { CanvasNode } from '@/core/canvasScene'
import type {
  PointerDefinition,
  InternalStructureDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'

export const POINTER_SLOT_ID_PREFIX = '__slot__'

export function pointerSlotId(pointerBlockId: string, index: number): string {
  return `${pointerBlockId}${POINTER_SLOT_ID_PREFIX}${String(index)}`
}

export function parsePointerSlotIndex(slotId: string, pointerBlockId: string): number | null {
  const prefix = `${pointerBlockId}${POINTER_SLOT_ID_PREFIX}`
  if (!slotId.startsWith(prefix)) {
    return null
  }
  const n = Number.parseInt(slotId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function isPointerSlotId(slotId: string): boolean {
  return slotId.includes(POINTER_SLOT_ID_PREFIX)
}

export function findPointerBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { pointer: PointerDefinition; slotIndex: number } | null {
  for (const block of schema.pointer ?? []) {
    const index = parsePointerSlotIndex(slotId, block.id)
    if (index !== null) {
      return { pointer: block, slotIndex: index }
    }
  }
  return null
}

export function ensurePointerSlots(block: PointerDefinition): InternalStructureDefinition[] {
  const existing = block.slots ?? []
  if (existing.length === 0) {
    return []
  }
  const normalized: InternalStructureDefinition[] = []
  for (let i = 0; i < Math.min(existing.length, 1); i += 1) {
    const slot = existing[i]!
    normalized.push({
      ...slot,
      id: slot.id.includes(POINTER_SLOT_ID_PREFIX) ? slot.id : pointerSlotId(block.id, i),
    })
  }
  return normalized
}

export function populatedSlotsForPointer(block: PointerDefinition): InternalStructureDefinition[] {
  return ensurePointerSlots(block)
}

export function resolveCollectionTypeForPointerSlot(
  slot: InternalStructureDefinition,
  block: PointerDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  connectedTarget?: CanvasNode | null,
): string | undefined {
  const fromSlot = resolveCollectionTypeForSlot(slot.schemaId, registry)
  if (fromSlot) {
    return fromSlot
  }
  for (const catalogItem of block.internalStructures) {
    const t = resolveCollectionTypeForSlot(catalogItem.schemaId, registry)
    if (t) {
      return t
    }
  }
  if (connectedTarget) {
    return connectedTarget.node.schema.nomenclature?.collectionType?.trim() || undefined
  }
  return undefined
}

export function applyPointerSlotsToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const pointer = schema.pointer
  if (!pointer || pointer.length === 0) {
    return schema
  }
  return {
    ...schema,
    pointer: pointer.map((block) => ({
      ...block,
      slots: ensurePointerSlots(block),
    })),
  }
}

export function findSlotInPointerSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): { pointer: PointerDefinition; slot: InternalStructureDefinition } | null {
  for (const block of schema.pointer ?? []) {
    const slots = block.slots ?? ensurePointerSlots(block)
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return { pointer: block, slot }
    }
  }
  return null
}

export function patchPointerSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  const pointer = schema.pointer
  if (!pointer) {
    return schema
  }
  return {
    ...schema,
    pointer: pointer.map((block) => {
      const slots = block.slots ?? ensurePointerSlots(block)
      if (!slots.some((s) => s.id === slotId)) {
        return block
      }
      return {
        ...block,
        slots: slots.map((s) => (s.id === slotId ? patch : s)),
      }
    }),
  }
}

export function patchOutputSlotInNodeSchemaWithPointer(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  if (findSlotInPointerSchema(schema, slotId)) {
    return patchPointerSlotInSchema(schema, slotId, patch)
  }
  return {
    ...schema,
    internalStructures: schema.internalStructures.map((item) =>
      item.id === slotId ? patch : item,
    ),
  }
}

export function findOutputSlotInNodeWithPointer(
  node: CanvasNode,
  slotId: string,
): InternalStructureDefinition | null {
  const topLevel = node.node.schema.internalStructures.find((s) => s.id === slotId)
  if (topLevel) {
    return topLevel
  }
  for (const block of node.node.schema.pointer ?? []) {
    const slot = populatedSlotsForPointer(block).find((s) => s.id === slotId)
    if (slot) {
      return slot
    }
  }
  for (const block of node.node.schema.listPointer ?? []) {
    const slots = block.slots ?? []
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return slot
    }
  }
  return null
}

export function catalogSchemaIdsForPointer(block: PointerDefinition): string[] {
  return block.internalStructures.map((item) => item.schemaId.trim()).filter(Boolean)
}

export function slotMatchesPointerCatalog(block: PointerDefinition, targetSchemaId: string): boolean {
  const normalized = targetSchemaId.trim()
  return catalogSchemaIdsForPointer(block).some((schemaId) => schemaId === normalized)
}

export function migrateScenePointerConnections(
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
): CanvasConnection[] {
  return connections
}
