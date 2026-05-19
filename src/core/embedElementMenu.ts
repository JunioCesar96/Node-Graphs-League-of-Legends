import type { CanvasConnection } from '@/core/canvasScene'
import type {
  EmbedDefinition,
  InternalStructureDefinition,
  NodeInstance,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import {
  embedSlotId,
  ensureEmbedSlots,
  isEmbedSlotId,
  populatedSlotsForEmbed,
} from '@/core/embedSlots'

export type EmbedCatalogPick = {
  embedId: string
  embedTitle: string
  structure: InternalStructureDefinition
}

export type EmbedAddStructureChoice = {
  choiceKey: string
  name: string
  meta: string
  structure: InternalStructureDefinition
}

export type EmbedAddBlockChoice = {
  embedId: string
  title: string
  structures: EmbedAddStructureChoice[]
}

export function resolveEmbedTemplateBlockId(block: EmbedDefinition): string {
  return block.templateBlockId?.trim() || block.id
}

export function findTemplateEmbedBlock(
  templateSchema: NodeSchemaDefinition | null | undefined,
  templateBlockId: string,
): EmbedDefinition | null {
  return templateSchema?.embed?.find((block) => block.id === templateBlockId) ?? null
}

export function embedCatalogChildSchemaIds(
  templateSchema: NodeSchemaDefinition | null | undefined,
): Set<string> {
  const ids = new Set<string>()
  for (const block of templateSchema?.embed ?? []) {
    for (const item of block.internalStructures) {
      const schemaId = item.schemaId.trim()
      if (schemaId) {
        ids.add(schemaId)
      }
    }
  }
  return ids
}

export function filterOutEmbedCatalogChildStructures(
  structures: readonly InternalStructureDefinition[],
  templateSchema: NodeSchemaDefinition | null | undefined,
): InternalStructureDefinition[] {
  const childIds = embedCatalogChildSchemaIds(templateSchema)
  if (childIds.size === 0) {
    return [...structures]
  }
  return structures.filter((structure) => !childIds.has(structure.schemaId.trim()))
}

export function createEmbedInstanceBlock(
  templateBlock: EmbedDefinition,
  structure: InternalStructureDefinition,
): EmbedDefinition {
  const instanceId = `dyn-emb-${crypto.randomUUID().slice(0, 10)}`
  return {
    id: instanceId,
    title: templateBlock.title,
    templateBlockId: templateBlock.id,
    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),
    slots: [
      {
        id: embedSlotId(instanceId, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      },
    ],
  }
}

export function appendEmbedSlotToBlock(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
  structure: InternalStructureDefinition,
): NodeSchemaDefinition {
  return {
    ...schema,
    embed: (schema.embed ?? []).map((block) => {
      if (block.id !== blockInstanceId) {
        return block
      }
      const currentSlots = populatedSlotsForEmbed(block)
      if (currentSlots.length >= 1) {
        return block
      }
      const slot: InternalStructureDefinition = {
        id: embedSlotId(block.id, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      }
      return { ...block, slots: [slot] }
    }),
  }
}

export function appendEmbedBlockFromTemplate(
  schema: NodeSchemaDefinition,
  templateEmbedId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const templateBlock = findTemplateEmbedBlock(templateSchema, templateEmbedId)
  if (!templateBlock) {
    return schema
  }
  const instance = createEmbedInstanceBlock(templateBlock, structure)
  return {
    ...schema,
    embed: [...(schema.embed ?? []), instance],
  }
}

export function appendEmbedCatalogItemToSchema(
  schema: NodeSchemaDefinition,
  targetId: string,
  structure: InternalStructureDefinition,
  templateSchema: NodeSchemaDefinition | null | undefined,
): NodeSchemaDefinition {
  const existingBlock = schema.embed?.find((block) => block.id === targetId)
  if (existingBlock) {
    return appendEmbedSlotToBlock(schema, targetId, structure)
  }
  return appendEmbedBlockFromTemplate(schema, targetId, structure, templateSchema)
}

export function buildEmbedAddChoices(
  _node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): EmbedAddBlockChoice[] {
  if (!templateSchema?.embed?.length) {
    return []
  }
  const choices: EmbedAddBlockChoice[] = []
  for (const templateBlock of templateSchema.embed) {
    if (templateBlock.internalStructures.length === 0) {
      continue
    }
    const structures: EmbedAddStructureChoice[] = templateBlock.internalStructures.map(
      (item, index) => ({
        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,
        name: item.name,
        meta: item.schemaId,
        structure: item,
      }),
    )
    choices.push({
      embedId: templateBlock.id,
      title: templateBlock.title,
      structures,
    })
  }
  return choices
}

export function embedCatalogPicksForElementMenu(
  node: NodeInstance,
  templateSchema: NodeSchemaDefinition | null | undefined,
): EmbedCatalogPick[] {
  const picks: EmbedCatalogPick[] = []
  for (const block of buildEmbedAddChoices(node, templateSchema)) {
    for (const choice of block.structures) {
      picks.push({
        embedId: block.embedId,
        embedTitle: block.title,
        structure: choice.structure,
      })
    }
  }
  return picks
}

export function structureForEmbedAdd(
  templateStructure: InternalStructureDefinition,
): InternalStructureDefinition {
  return {
    ...templateStructure,
    id: `dyn-eec-${crypto.randomUUID().slice(0, 10)}`,
  }
}

export type EmbedRemovableSlot = {
  id: string
  name: string
  meta: string
  embedId: string
}

export function listRemovableEmbedSlotsForBlock(
  node: NodeInstance,
  blockInstanceId: string,
): EmbedRemovableSlot[] {
  const block = node.schema.embed?.find((entry) => entry.id === blockInstanceId)
  if (!block) {
    return []
  }
  const items: EmbedRemovableSlot[] = []
  for (const slot of populatedSlotsForEmbed(block)) {
    if (!isEmbedSlotId(slot.id)) {
      continue
    }
    items.push({
      id: slot.id,
      name: slot.name || slot.schemaId,
      meta: `${block.title} · EMBED`,
      embedId: block.id,
    })
  }
  return items
}

export function listRemovableEmbedBlocks(node: NodeInstance): EmbedRemovableSlot[] {
  return (node.schema.embed ?? []).map((block) => ({
    id: block.id,
    name: block.title,
    meta: block.internalStructures[0]?.name ?? 'EMBED',
    embedId: block.id,
  }))
}

export function findEmbedBlockContainingSlot(
  schema: NodeSchemaDefinition,
  slotId: string,
): EmbedDefinition | null {
  for (const block of schema.embed ?? []) {
    const slots = block.slots ?? ensureEmbedSlots(block)
    if (slots.some((slot) => slot.id === slotId)) {
      return block
    }
  }
  return null
}

export function slotIdsForEmbedBlock(block: EmbedDefinition): string[] {
  return populatedSlotsForEmbed(block).map((slot) => slot.id)
}

export function removeEmbedSlotFromSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): NodeSchemaDefinition {
  const block = findEmbedBlockContainingSlot(schema, slotId)
  if (!block) {
    return schema
  }
  return {
    ...schema,
    embed: (schema.embed ?? []).map((entry) =>
      entry.id === block.id ? { ...entry, slots: [] } : entry,
    ),
  }
}

export function removeEmbedBlockFromSchema(
  schema: NodeSchemaDefinition,
  blockInstanceId: string,
): NodeSchemaDefinition {
  return {
    ...schema,
    embed: (schema.embed ?? []).filter((block) => block.id !== blockInstanceId),
  }
}
