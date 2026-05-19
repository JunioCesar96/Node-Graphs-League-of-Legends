import type {
  InternalStructureDefinition,
  List2PointerDefinition,
  NodeInstance,
  NodeSchemaDefinition,
  PointerDefinition,
} from '@/core/nodeSchema'
import { isPointerSlotId, populatedSlotsForPointer } from '@/core/pointerSlots'
import {
  createList2PointerInstanceFromCatalog,
  populatedSlotsForList2PointerInstance,
} from '@/core/list2PointerSlots'

export type List2PointerAddStructureChoice = {
  choiceKey: string
  name: string
  meta: string
  structure: InternalStructureDefinition
}

export type List2PointerAddBlockChoice = {
  list2PointerId: string
  title: string
  structures: List2PointerAddStructureChoice[]
}

export function findTemplateList2PointerBlock(
  templateSchema: NodeSchemaDefinition | null | undefined,
  templateBlockId: string,
): List2PointerDefinition | null {
  return templateSchema?.list2Pointer?.find((block) => block.id === templateBlockId) ?? null
}

export function buildList2PointerAddChoices(
  _node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): List2PointerAddBlockChoice[] {
  if (!templateSchema?.list2Pointer?.length) {
    return []
  }

  const choices: List2PointerAddBlockChoice[] = []
  for (const templateBlock of templateSchema.list2Pointer) {
    if (templateBlock.internalStructures.length === 0) {
      continue
    }
    const structures: List2PointerAddStructureChoice[] = templateBlock.internalStructures.map(
      (item, index) => ({
        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,
        name: item.name,
        meta: item.schemaId,
        structure: item,
      }),
    )
    choices.push({
      list2PointerId: templateBlock.id,
      title: templateBlock.title,
      structures,
    })
  }
  return choices
}

export function appendList2PointerInstanceToBlock(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
  structure: InternalStructureDefinition,
): NodeSchemaDefinition {
  return {
    ...schema,
    list2Pointer: (schema.list2Pointer ?? []).map((block) => {
      if (block.id !== blockInstanceId) {
        return block
      }
      const nextIdx = block.instances.length
      const instance = createList2PointerInstanceFromCatalog(block, structure, nextIdx)
      return {
        ...block,
        instances: [...block.instances, instance],
      }
    }),
  }
}

export function appendList2PointerInstanceFromTemplate(
  schema: NodeSchemaDefinition,
  templateList2PointerId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const templateBlock = findTemplateList2PointerBlock(templateSchema, templateList2PointerId)
  if (!templateBlock) {
    return schema
  }

  const existing = schema.list2Pointer?.find(
    (block) => block.title === templateBlock.title && block.id !== templateBlock.id,
  )
  if (existing) {
    return appendList2PointerInstanceToBlock(schema, existing.id, structure)
  }

  const instanceId = `dyn-l2p-${crypto.randomUUID().slice(0, 10)}`
  const instance = createList2PointerInstanceFromCatalog(
    { ...templateBlock, id: instanceId },
    structure,
    0,
  )
  const block: List2PointerDefinition = {
    id: instanceId,
    title: templateBlock.title,
    templateBlockId: templateBlock.id,
    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),
    instances: [instance],
  }
  return {
    ...schema,
    list2Pointer: [...(schema.list2Pointer ?? []), block],
  }
}

export function appendList2PointerCatalogItemToSchema(
  schema: NodeSchemaDefinition,
  targetId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const existingBlock = schema.list2Pointer?.find((block) => block.id === targetId)
  if (existingBlock) {
    return appendList2PointerInstanceToBlock(schema, targetId, structure)
  }
  return appendList2PointerInstanceFromTemplate(schema, targetId, structure, templateSchema)
}

export function removeList2PointerInstanceFromSchema(
  schema: NodeSchemaDefinition,
  blockId: string,
  instanceId: string,
): NodeSchemaDefinition {
  return {
    ...schema,
    list2Pointer: (schema.list2Pointer ?? [])
      .map((block) => {
        if (block.id !== blockId) {
          return block
        }
        return {
          ...block,
          instances: block.instances.filter((instance) => instance.id !== instanceId),
        }
      })
      .filter((block) => block.instances.length > 0 || block.internalStructures.length > 0),
  }
}

export function listRemovableList2PointerInstancesForBlock(
  node: NodeInstance,
  blockId: string,
): { id: string; name: string; meta: string; list2PointerId: string; instanceId: string }[] {
  const block = node.schema.list2Pointer?.find((entry) => entry.id === blockId)
  if (!block) {
    return []
  }
  return block.instances.map((instance) => ({
    id: instance.id,
    name: instance.title,
    meta: `${block.title} · LIST2_POINTER`,
    list2PointerId: block.id,
    instanceId: instance.id,
  }))
}

export function canAddList2PointerInstance(block: List2PointerDefinition): boolean {
  return block.internalStructures.length > 0
}

export function canAddList2PointerInstanceSlot(instance: PointerDefinition): boolean {
  return populatedSlotsForPointer(instance).length < 1
}

export function slotIdsForList2PointerBlock(block: List2PointerDefinition): string[] {
  return block.instances.flatMap((instance) =>
    populatedSlotsForList2PointerInstance(instance).map((slot) => slot.id),
  )
}
