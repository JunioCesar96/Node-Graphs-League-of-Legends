import type { CanvasConnection } from '@/core/canvasScene'

import type {

  InternalStructureDefinition,

  ListEmbedDefinition,

  NodeInstance,

  NodeSchemaDefinition,

} from '@/core/nodeSchema'

import {

  ensureListEmbedSlots,

  isListEmbedSlotId,

  listEmbedSlotId,

  populatedSlotsForListEmbed,

} from '@/core/listEmbedSlots'



export type ListEmbedCatalogPick = {

  listEmbedId: string

  listEmbedTitle: string

  structure: InternalStructureDefinition

}



export type ListEmbedAddStructureChoice = {

  choiceKey: string

  name: string

  meta: string

  structure: InternalStructureDefinition

}



export type ListEmbedAddBlockChoice = {

  listEmbedId: string

  title: string

  structures: ListEmbedAddStructureChoice[]

}



export function resolveListEmbedTemplateBlockId(block: ListEmbedDefinition): string {

  return block.templateBlockId?.trim() || block.id

}



export function findTemplateListEmbedBlock(

  templateSchema: NodeSchemaDefinition | null | undefined,

  templateBlockId: string,

): ListEmbedDefinition | null {

  return templateSchema?.listEmbed?.find((block) => block.id === templateBlockId) ?? null

}



export function listEmbedCatalogChildSchemaIds(

  templateSchema: NodeSchemaDefinition | null | undefined,

): Set<string> {

  const ids = new Set<string>()

  for (const block of templateSchema?.listEmbed ?? []) {

    for (const item of block.internalStructures) {

      const schemaId = item.schemaId.trim()

      if (schemaId) {

        ids.add(schemaId)

      }

    }

  }

  return ids

}



export function filterOutListEmbedCatalogChildStructures(

  structures: readonly InternalStructureDefinition[],

  templateSchema: NodeSchemaDefinition | null | undefined,

): InternalStructureDefinition[] {

  const childIds = listEmbedCatalogChildSchemaIds(templateSchema)

  if (childIds.size === 0) {

    return [...structures]

  }

  return structures.filter((structure) => !childIds.has(structure.schemaId.trim()))

}



export function createListEmbedInstanceBlock(

  templateBlock: ListEmbedDefinition,

  structure: InternalStructureDefinition,

): ListEmbedDefinition {

  const instanceId = `dyn-leb-${crypto.randomUUID().slice(0, 10)}`

  return {

    id: instanceId,

    title: templateBlock.title,

    templateBlockId: templateBlock.id,

    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),

    slots: [

      {

        id: listEmbedSlotId(instanceId, 0),

        name: structure.name,

        schemaId: structure.schemaId,

      },

    ],

  }

}



export function appendListEmbedSlotToBlock(

  schema: NodeSchemaDefinition,

  blockInstanceId: string,

  structure: InternalStructureDefinition,

): NodeSchemaDefinition {

  return {

    ...schema,

    listEmbed: (schema.listEmbed ?? []).map((block) => {

      if (block.id !== blockInstanceId) {

        return block

      }



      const currentSlots = populatedSlotsForListEmbed(block)

      const nextIndex = currentSlots.length

      const slot: InternalStructureDefinition = {

        id: listEmbedSlotId(block.id, nextIndex),

        name: structure.name,

        schemaId: structure.schemaId,

      }



      return {

        ...block,

        slots: [...currentSlots, slot],

      }

    }),

  }

}



/** Menu «+ Element»: novo bloco LIST_EMBED a partir do template. */

export function appendListEmbedBlockFromTemplate(

  schema: NodeSchemaDefinition,

  templateListEmbedId: string,

  structure: InternalStructureDefinition,

  templateSchema: NodeSchemaDefinition | null | undefined,

): NodeSchemaDefinition {

  const templateBlock = findTemplateListEmbedBlock(templateSchema, templateListEmbedId)

  if (!templateBlock) {

    return schema

  }



  const instance = createListEmbedInstanceBlock(templateBlock, structure)

  return {

    ...schema,

    listEmbed: [...(schema.listEmbed ?? []), instance],

  }

}



/**

 * `targetId` = id da instância do bloco → acrescenta slot;

 * id do template (sem bloco com esse id) → novo bloco LIST_EMBED.

 */

export function appendListEmbedCatalogItemToSchema(

  schema: NodeSchemaDefinition,

  targetId: string,

  structure: InternalStructureDefinition,

  templateSchema: NodeSchemaDefinition | null | undefined,

): NodeSchemaDefinition {

  const existingBlock = schema.listEmbed?.find((block) => block.id === targetId)

  if (existingBlock) {

    return appendListEmbedSlotToBlock(schema, targetId, structure)

  }



  return appendListEmbedBlockFromTemplate(schema, targetId, structure, templateSchema)

}



export function listListEmbedCatalogPicksForElementMenu(

  _node: NodeInstance,

  templateSchema: NodeSchemaDefinition | null | undefined,

): ListEmbedCatalogPick[] {

  const picks: ListEmbedCatalogPick[] = []

  for (const block of buildListEmbedAddChoices(_node, templateSchema)) {

    for (const choice of block.structures) {

      picks.push({

        listEmbedId: block.listEmbedId,

        listEmbedTitle: block.title,

        structure: choice.structure,

      })

    }

  }

  return picks

}



export function buildListEmbedAddChoices(

  _node: NodeInstance,

  templateSchema: NodeSchemaDefinition | null | undefined,

): ListEmbedAddBlockChoice[] {

  if (!templateSchema?.listEmbed?.length) {

    return []

  }



  const choices: ListEmbedAddBlockChoice[] = []



  for (const templateBlock of templateSchema.listEmbed) {

    if (templateBlock.internalStructures.length === 0) {

      continue

    }



    const structures: ListEmbedAddStructureChoice[] = templateBlock.internalStructures.map(

      (item, index) => ({

        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,

        name: item.name,

        meta: item.schemaId,

        structure: item,

      }),

    )



    choices.push({

      listEmbedId: templateBlock.id,

      title: templateBlock.title,

      structures,

    })

  }



  return choices

}



export function structureForListEmbedAdd(

  templateStructure: InternalStructureDefinition,

): InternalStructureDefinition {

  return {

    ...templateStructure,

    id: `dyn-lec-${crypto.randomUUID().slice(0, 10)}`,

  }

}



export type ListEmbedRemovableSlot = {

  id: string

  name: string

  meta: string

  listEmbedId: string

}



export function listRemovableListEmbedSlotsForBlock(

  node: NodeInstance,

  blockInstanceId: string,

): ListEmbedRemovableSlot[] {

  const block = node.schema.listEmbed?.find((entry) => entry.id === blockInstanceId)

  if (!block) {

    return []

  }



  const items: ListEmbedRemovableSlot[] = []

  for (const slot of populatedSlotsForListEmbed(block)) {

    if (!isListEmbedSlotId(slot.id)) {

      continue

    }

    items.push({

      id: slot.id,

      name: slot.name || slot.schemaId,

      meta: `${block.title} · LIST_EMBED`,

      listEmbedId: block.id,

    })

  }

  return items

}



export function listRemovableListEmbedSlots(

  node: NodeInstance,

  _connections: readonly CanvasConnection[],

  _canvasNodeId: string,

): ListEmbedRemovableSlot[] {

  const items: ListEmbedRemovableSlot[] = []

  for (const block of node.schema.listEmbed ?? []) {

    items.push(...listRemovableListEmbedSlotsForBlock(node, block.id))

  }

  return items

}



export type ListEmbedRemovableBlock = {

  id: string

  name: string

  meta: string

  listEmbedId: string

}



export function listRemovableListEmbedBlocks(node: NodeInstance): ListEmbedRemovableBlock[] {

  return (node.schema.listEmbed ?? []).map((block) => {

    const slotNames = populatedSlotsForListEmbed(block)

      .map((slot) => slot.name.trim())

      .filter(Boolean)

    const meta =

      slotNames.length > 0 ? slotNames.join(', ') : 'LIST_EMBED'

    return {

      id: block.id,

      name: block.title,

      meta,

      listEmbedId: block.id,

    }

  })

}



export function findListEmbedBlockContainingSlot(

  schema: NodeSchemaDefinition,

  slotId: string,

): ListEmbedDefinition | null {

  for (const block of schema.listEmbed ?? []) {

    const slots = block.slots ?? ensureListEmbedSlots(block)

    if (slots.some((slot) => slot.id === slotId)) {

      return block

    }

    if (parseListEmbedSlotIndexFromId(slotId, block.id) !== null) {

      return block

    }

  }

  return null

}



function parseListEmbedSlotIndexFromId(slotId: string, listEmbedId: string): number | null {

  const prefix = `${listEmbedId}__slot__`

  if (!slotId.startsWith(prefix)) {

    return null

  }

  const n = Number.parseInt(slotId.slice(prefix.length), 10)

  return Number.isFinite(n) ? n : null

}



export function slotIdsForListEmbedBlock(block: ListEmbedDefinition): string[] {

  return populatedSlotsForListEmbed(block).map((slot) => slot.id)

}



export function removeListEmbedSlotFromSchema(

  schema: NodeSchemaDefinition,

  slotId: string,

  connections: readonly CanvasConnection[],

  fromNodeId: string,

): NodeSchemaDefinition {

  const block = findListEmbedBlockContainingSlot(schema, slotId)

  if (!block) {

    return schema

  }



  const linkedCount = connections.filter(

    (connection) =>

      connection.fromNodeId === fromNodeId &&

      connection.fromInternalStructureId.startsWith(`${block.id}__slot__`),

  ).length



  const currentSlots = populatedSlotsForListEmbed(block)

  const nextSlots = currentSlots.filter((slot) => slot.id !== slotId)



  const minSlots = linkedCount

  while (nextSlots.length < minSlots) {

    const index = nextSlots.length

    nextSlots.push({

      id: listEmbedSlotId(block.id, index),

      name: block.internalStructures[0]?.name ?? block.title,

      schemaId: block.internalStructures[0]?.schemaId ?? '',

    })

  }



  return {

    ...schema,

    listEmbed: (schema.listEmbed ?? []).map((entry) =>

      entry.id === block.id ? { ...entry, slots: nextSlots } : entry,

    ),

  }

}



export function removeListEmbedBlockFromSchema(

  schema: NodeSchemaDefinition,

  blockInstanceId: string,

): NodeSchemaDefinition {

  return {

    ...schema,

    listEmbed: (schema.listEmbed ?? []).filter((block) => block.id !== blockInstanceId),

  }

}


