import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  List2PointerDefinition,
  NodeSchemaDefinition,
  PointerDefinition,
} from '@/core/nodeSchema'
import {
  findPointerBySlotId,
  isPointerSlotId,
  populatedSlotsForPointer,
  pointerSlotId,
  ensurePointerSlots,
  resolveCollectionTypeForPointerSlot,
} from '@/core/pointerSlots'

export function applyList2PointerInstancesToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const list2Pointer = schema.list2Pointer
  if (!list2Pointer || list2Pointer.length === 0) {
    return schema
  }

  return {
    ...schema,
    list2Pointer: list2Pointer.map((block) => ({
      ...block,
      instances: block.instances.map((instance) => ({
        ...instance,
        slots: ensurePointerSlots(instance),
      })),
    })),
  }
}

export function findList2PointerByInstanceSlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { block: List2PointerDefinition; instance: PointerDefinition; slotIndex: number } | null {
  for (const block of schema.list2Pointer ?? []) {
    for (const instance of block.instances) {
      const hit = findPointerBySlotId({ ...schema, pointer: [instance] }, slotId)
      if (hit) {
        return { block, instance: hit.pointer, slotIndex: hit.slotIndex }
      }
    }
  }
  return null
}

export function findSlotInList2PointerSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): {
  list2Pointer: List2PointerDefinition
  instance: PointerDefinition
  slot: InternalStructureDefinition
} | null {
  const hit = findList2PointerByInstanceSlotId(schema, slotId)
  if (!hit) {
    return null
  }
  const slots = populatedSlotsForPointer(hit.instance)
  const slot = slots[hit.slotIndex]
  if (!slot) {
    return null
  }
  return { list2Pointer: hit.block, instance: hit.instance, slot }
}

export function populatedSlotsForList2PointerInstance(instance: PointerDefinition): InternalStructureDefinition[] {
  return populatedSlotsForPointer(instance)
}

export function catalogSchemaIdsForList2Pointer(block: List2PointerDefinition): string[] {
  return [...new Set(block.internalStructures.map((item) => item.schemaId))]
}

export function slotMatchesList2PointerCatalog(block: List2PointerDefinition, targetSchemaId: string): boolean {
  const allowed = catalogSchemaIdsForList2Pointer(block)
  if (allowed.length === 0) {
    return true
  }
  return allowed.includes(targetSchemaId)
}

export function resolveCollectionTypeForList2PointerInstanceSlot(
  slot: InternalStructureDefinition,
  block: List2PointerDefinition,
  instance: PointerDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  connectedTarget?: CanvasNode | null,
): string | undefined {
  return resolveCollectionTypeForPointerSlot(slot, instance, registry, connectedTarget ?? null)
}

export function isList2PointerInstanceSlotId(slotId: string, schema: NodeSchemaDefinition): boolean {
  if (!isPointerSlotId(slotId)) {
    return false
  }
  return findList2PointerByInstanceSlotId(schema, slotId) !== null
}

export function createList2PointerInstanceFromCatalog(
  block: List2PointerDefinition,
  structure: InternalStructureDefinition,
  itemIdx: number,
): PointerDefinition {
  const instanceId = `${block.id}-inst-${String(itemIdx)}`
  return {
    id: instanceId,
    title: structure.name,
    internalStructures: [{ ...structure }],
    slots: [
      {
        id: pointerSlotId(instanceId, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      },
    ],
  }
}
