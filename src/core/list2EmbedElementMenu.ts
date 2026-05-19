import type {
  EmbedDefinition,
  InternalStructureDefinition,
  List2EmbedDefinition,
  NodeInstance,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { embedSlotId, isEmbedSlotId, populatedSlotsForEmbed } from '@/core/embedSlots'
import {
  createList2EmbedInstanceFromCatalog,
  populatedSlotsForList2EmbedInstance,
} from '@/core/list2EmbedSlots'

export type List2EmbedAddStructureChoice = {
  choiceKey: string
  name: string
  meta: string
  structure: InternalStructureDefinition
}

export type List2EmbedAddBlockChoice = {
  list2EmbedId: string
  title: string
  structures: List2EmbedAddStructureChoice[]
}

export function resolveList2EmbedTemplateBlockId(block: List2EmbedDefinition): string {
  return block.templateBlockId?.trim() || block.id
}

export function findTemplateList2EmbedBlock(
  templateSchema: NodeSchemaDefinition | null | undefined,
  templateBlockId: string,
): List2EmbedDefinition | null {
  return templateSchema?.list2Embed?.find((block) => block.id === templateBlockId) ?? null
}

export function buildList2EmbedAddChoices(
  _node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): List2EmbedAddBlockChoice[] {
  if (!templateSchema?.list2Embed?.length) {
    return []
  }

  const choices: List2EmbedAddBlockChoice[] = []
  for (const templateBlock of templateSchema.list2Embed) {
    if (templateBlock.internalStructures.length === 0) {
      continue
    }
    const structures: List2EmbedAddStructureChoice[] = templateBlock.internalStructures.map(
      (item, index) => ({
        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,
        name: item.name,
        meta: item.schemaId,
        structure: item,
      }),
    )
    choices.push({
      list2EmbedId: templateBlock.id,
      title: templateBlock.title,
      structures,
    })
  }
  return choices
}

export function appendList2EmbedInstanceToBlock(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
  structure: InternalStructureDefinition,
): NodeSchemaDefinition {
  return {
    ...schema,
    list2Embed: (schema.list2Embed ?? []).map((block) => {
      if (block.id !== blockInstanceId) {
        return block
      }
      const nextIdx = block.instances.length
      const instance = createList2EmbedInstanceFromCatalog(block, structure, nextIdx)
      return {
        ...block,
        instances: [...block.instances, instance],
      }
    }),
  }
}

export function appendList2EmbedInstanceFromTemplate(
  schema: NodeSchemaDefinition,
  templateList2EmbedId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const templateBlock = findTemplateList2EmbedBlock(templateSchema, templateList2EmbedId)
  if (!templateBlock) {
    return schema
  }

  const existing = schema.list2Embed?.find(
    (block) => block.title === templateBlock.title && block.id !== templateBlock.id,
  )
  if (existing) {
    return appendList2EmbedInstanceToBlock(schema, existing.id, structure)
  }

  const instanceId = `dyn-l2e-${crypto.randomUUID().slice(0, 10)}`
  const instance = createList2EmbedInstanceFromCatalog(
    { ...templateBlock, id: instanceId },
    structure,
    0,
  )
  const block: List2EmbedDefinition = {
    id: instanceId,
    title: templateBlock.title,
    templateBlockId: templateBlock.id,
    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),
    instances: [instance],
  }
  return {
    ...schema,
    list2Embed: [...(schema.list2Embed ?? []), block],
  }
}

export function appendList2EmbedCatalogItemToSchema(
  schema: NodeSchemaDefinition,
  targetId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const existingBlock = schema.list2Embed?.find((block) => block.id === targetId)
  if (existingBlock) {
    return appendList2EmbedInstanceToBlock(schema, targetId, structure)
  }
  return appendList2EmbedInstanceFromTemplate(schema, targetId, structure, templateSchema)
}

export type List2EmbedRemovableInstance = {
  id: string
  name: string
  meta: string
  list2EmbedId: string
  instanceId: string
}

export function listRemovableList2EmbedInstancesForBlock(
  node: NodeInstance,
  blockId: string,
): List2EmbedRemovableInstance[] {
  const block = node.schema.list2Embed?.find((entry) => entry.id === blockId)
  if (!block) {
    return []
  }
  return block.instances.map((instance) => ({
    id: instance.id,
    name: instance.title,
    meta: `${block.title} · LIST2_EMBED`,
    list2EmbedId: block.id,
    instanceId: instance.id,
  }))
}

export function removeList2EmbedInstanceFromSchema(
  schema: NodeSchemaDefinition,
  blockId: string,
  instanceId: string,
): NodeSchemaDefinition {
  return {
    ...schema,
    list2Embed: (schema.list2Embed ?? [])
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

export function listRemovableList2EmbedInstanceSlots(
  node: NodeInstance,
  blockId: string,
): { id: string; name: string; list2EmbedId: string; instanceId: string }[] {
  const block = node.schema.list2Embed?.find((entry) => entry.id === blockId)
  if (!block) {
    return []
  }
  const items: { id: string; name: string; list2EmbedId: string; instanceId: string }[] = []
  for (const instance of block.instances) {
    for (const slot of populatedSlotsForList2EmbedInstance(instance)) {
      if (!isEmbedSlotId(slot.id)) {
        continue
      }
      items.push({
        id: slot.id,
        name: slot.name || slot.schemaId,
        list2EmbedId: block.id,
        instanceId: instance.id,
      })
    }
  }
  return items
}

export function removeList2EmbedInstanceSlotFromSchema(
  schema: NodeSchemaDefinition,
  blockId: string,
  instanceId: string,
  slotId: string,
): NodeSchemaDefinition {
  return {
    ...schema,
    list2Embed: (schema.list2Embed ?? []).map((block) => {
      if (block.id !== blockId) {
        return block
      }
      return {
        ...block,
        instances: block.instances.map((instance) => {
          if (instance.id !== instanceId) {
            return instance
          }
          return {
            ...instance,
            slots: (instance.slots ?? []).filter((slot) => slot.id !== slotId),
          }
        }),
      }
    }),
  }
}

export function canAddList2EmbedInstance(block: List2EmbedDefinition): boolean {
  return block.internalStructures.length > 0
}

export function canAddList2EmbedInstanceSlot(instance: EmbedDefinition): boolean {
  return populatedSlotsForEmbed(instance).length < 1
}

export function slotIdsForList2EmbedBlock(block: List2EmbedDefinition): string[] {
  return block.instances.flatMap((instance) =>
    populatedSlotsForList2EmbedInstance(instance).map((slot) => slot.id),
  )
}
