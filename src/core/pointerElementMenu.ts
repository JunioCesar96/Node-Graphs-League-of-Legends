import type { CanvasConnection } from '@/core/canvasScene'
import type {
  PointerDefinition,
  InternalStructureDefinition,
  NodeInstance,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import {
  pointerSlotId,
  ensurePointerSlots,
  isPointerSlotId,
  populatedSlotsForPointer,
} from '@/core/pointerSlots'

export type PointerCatalogPick = {
  pointerId: string
  pointerTitle: string
  structure: InternalStructureDefinition
}

export type PointerAddStructureChoice = {
  choiceKey: string
  name: string
  meta: string
  structure: InternalStructureDefinition
}

export type PointerAddBlockChoice = {
  pointerId: string
  title: string
  structures: PointerAddStructureChoice[]
}

export function resolvePointerTemplateBlockId(block: PointerDefinition): string {
  return block.templateBlockId?.trim() || block.id
}

export function findTemplatePointerBlock(
  templateSchema: NodeSchemaDefinition | null | undefined,
  templateBlockId: string,
): PointerDefinition | null {
  return templateSchema?.pointer?.find((block) => block.id === templateBlockId) ?? null
}

export function pointerCatalogChildSchemaIds(
  templateSchema: NodeSchemaDefinition | null | undefined,
): Set<string> {
  const ids = new Set<string>()
  for (const block of templateSchema?.pointer ?? []) {
    for (const item of block.internalStructures) {
      const schemaId = item.schemaId.trim()
      if (schemaId) {
        ids.add(schemaId)
      }
    }
  }
  return ids
}

export function filterOutPointerCatalogChildStructures(
  structures: readonly InternalStructureDefinition[],
  templateSchema: NodeSchemaDefinition | null | undefined,
): InternalStructureDefinition[] {
  const childIds = pointerCatalogChildSchemaIds(templateSchema)
  if (childIds.size === 0) {
    return [...structures]
  }
  return structures.filter((structure) => !childIds.has(structure.schemaId.trim()))
}

export function createPointerInstanceBlock(
  templateBlock: PointerDefinition,
  structure: InternalStructureDefinition,
): PointerDefinition {
  const instanceId = `dyn-ptr-${crypto.randomUUID().slice(0, 10)}`
  return {
    id: instanceId,
    title: templateBlock.title,
    templateBlockId: templateBlock.id,
    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),
    slots: [
      {
        id: pointerSlotId(instanceId, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      },
    ],
  }
}

export function appendPointerSlotToBlock(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
  structure: InternalStructureDefinition,
): NodeSchemaDefinition {
  return {
    ...schema,
    pointer: (schema.pointer ?? []).map((block) => {
      if (block.id !== blockInstanceId) {
        return block
      }
      const currentSlots = populatedSlotsForPointer(block)
      if (currentSlots.length >= 1) {
        return block
      }
      const slot: InternalStructureDefinition = {
        id: pointerSlotId(block.id, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      }
      return { ...block, slots: [slot] }
    }),
  }
}

export function appendPointerBlockFromTemplate(
  schema: NodeSchemaDefinition,
  templatePointerId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const templateBlock = findTemplatePointerBlock(templateSchema, templatePointerId)
  if (!templateBlock) {
    return schema
  }
  const instance = createPointerInstanceBlock(templateBlock, structure)
  return {
    ...schema,
    pointer: [...(schema.pointer ?? []), instance],
  }
}

export function appendPointerCatalogItemToSchema(
  schema: NodeSchemaDefinition,
  targetId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const existingBlock = schema.pointer?.find((block) => block.id === targetId)
  if (existingBlock) {
    return appendPointerSlotToBlock(schema, targetId, structure)
  }
  return appendPointerBlockFromTemplate(schema, targetId, structure, templateSchema)
}

export function buildPointerAddChoices(
  _node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): PointerAddBlockChoice[] {
  if (!templateSchema?.pointer?.length) {
    return []
  }
  const choices: PointerAddBlockChoice[] = []
  for (const templateBlock of templateSchema.pointer) {
    if (templateBlock.internalStructures.length === 0) {
      continue
    }
    const structures: PointerAddStructureChoice[] = templateBlock.internalStructures.map(
      (item, index) => ({
        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,
        name: item.name,
        meta: item.schemaId,
        structure: item,
      }),
    )
    choices.push({
      pointerId: templateBlock.id,
      title: templateBlock.title,
      structures,
    })
  }
  return choices
}

export function pointerCatalogPicksForElementMenu(
  node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): PointerCatalogPick[] {
  const picks: PointerCatalogPick[] = []
  for (const block of buildPointerAddChoices(node, templateSchema)) {
    for (const choice of block.structures) {
      picks.push({
        pointerId: block.pointerId,
        pointerTitle: block.title,
        structure: choice.structure,
      })
    }
  }
  return picks
}

export function structureForPointerAdd(
  templateStructure: InternalStructureDefinition,
): InternalStructureDefinition {
  return {
    ...templateStructure,
    id: `dyn-pcc-${crypto.randomUUID().slice(0, 10)}`,
  }
}

export type PointerRemovableSlot = {
  id: string
  name: string
  meta: string
  pointerId: string
}

export function listRemovablePointerSlotsForBlock(
  node: NodeInstance,
  blockInstanceId: string,
): PointerRemovableSlot[] {
  const block = node.schema.pointer?.find((entry) => entry.id === blockInstanceId)
  if (!block) {
    return []
  }
  const items: PointerRemovableSlot[] = []
  for (const slot of populatedSlotsForPointer(block)) {
    if (!isPointerSlotId(slot.id)) {
      continue
    }
    items.push({
      id: slot.id,
      name: slot.name || slot.schemaId,
      meta: `${block.title} · POINTER`,
      pointerId: block.id,
    })
  }
  return items
}

export function listRemovablePointerBlocks(node: NodeInstance): PointerRemovableSlot[] {
  return (node.schema.pointer ?? []).map((block) => ({
    id: block.id,
    name: block.title,
    meta: block.internalStructures[0]?.name ?? 'POINTER',
    pointerId: block.id,
  }))
}

export function findPointerBlockContainingSlot(
  schema: NodeSchemaDefinition,
  slotId: string,
): PointerDefinition | null {
  for (const block of schema.pointer ?? []) {
    const slots = block.slots ?? ensurePointerSlots(block)
    if (slots.some((slot) => slot.id === slotId)) {
      return block
    }
  }
  return null
}

export function slotIdsForPointerBlock(block: PointerDefinition): string[] {
  return populatedSlotsForPointer(block).map((slot) => slot.id)
}

export function removePointerSlotFromSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): NodeSchemaDefinition {
  const block = findPointerBlockContainingSlot(schema, slotId)
  if (!block) {
    return schema
  }
  return {
    ...schema,
    pointer: (schema.pointer ?? []).map((entry) =>
      entry.id === block.id ? { ...entry, slots: [] } : entry,
    ),
  }
}

export function removePointerBlockFromSchema(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
): NodeSchemaDefinition {
  return {
    ...schema,
    pointer: (schema.pointer ?? []).filter((block) => block.id !== blockInstanceId),
  }
}
