import type { CanvasConnection } from '@/core/canvasScene'

import type {

  InternalStructureDefinition,

  ListPointerDefinition,

  NodeInstance,

  NodeSchemaDefinition,

} from '@/core/nodeSchema'

import {

  ensureListPointerSlots,

  isListPointerSlotId,

  listPointerSlotId,

  populatedSlotsForListPointer,

} from '@/core/listPointerSlots'



export type ListPointerCatalogPick = {

  listPointerId: string

  listPointerTitle: string

  structure: InternalStructureDefinition

}



export type ListPointerAddStructureChoice = {

  choiceKey: string

  name: string

  meta: string

  structure: InternalStructureDefinition

}



export type ListPointerAddBlockChoice = {

  listPointerId: string

  title: string

  structures: ListPointerAddStructureChoice[]

}



export function resolveListPointerTemplateBlockId(block: ListPointerDefinition): string {

  return block.templateBlockId?.trim() || block.id

}



export function findTemplateListPointerBlock(

  templateSchema: NodeSchemaDefinition | null | undefined,

  templateBlockId: string,

): ListPointerDefinition | null {

  return templateSchema?.listPointer?.find((block) => block.id === templateBlockId) ?? null

}



export function listPointerCatalogChildSchemaIds(

  templateSchema: NodeSchemaDefinition | null | undefined,

): Set<string> {

  const ids = new Set<string>()

  for (const block of templateSchema?.listPointer ?? []) {

    for (const item of block.internalStructures) {

      const schemaId = item.schemaId.trim()

      if (schemaId) {

        ids.add(schemaId)

      }

    }

  }

  return ids

}



export function filterOutListPointerCatalogChildStructures(

  structures: readonly InternalStructureDefinition[],

  templateSchema: NodeSchemaDefinition | null | undefined,

): InternalStructureDefinition[] {

  const childIds = listPointerCatalogChildSchemaIds(templateSchema)

  if (childIds.size === 0) {

    return [...structures]

  }

  return structures.filter((structure) => !childIds.has(structure.schemaId.trim()))

}



export function createListPointerInstanceBlock(

  templateBlock: ListPointerDefinition,

  structure: InternalStructureDefinition,

): ListPointerDefinition {

  const instanceId = `dyn-lpb-${crypto.randomUUID().slice(0, 10)}`

  return {

    id: instanceId,

    title: templateBlock.title,

    templateBlockId: templateBlock.id,

    internalStructures: templateBlock.internalStructures.map((item) => ({ ...item })),

    slots: [

      {

        id: listPointerSlotId(instanceId, 0),

        name: structure.name,

        schemaId: structure.schemaId,

      },

    ],

  }

}



export function appendListPointerSlotToBlock(

  schema: NodeSchemaDefinition,

  blockInstanceId: string,

  structure: InternalStructureDefinition,

): NodeSchemaDefinition {

  return {

    ...schema,

    listPointer: (schema.listPointer ?? []).map((block) => {

      if (block.id !== blockInstanceId) {

        return block

      }



      const currentSlots = populatedSlotsForListPointer(block)

      const nextIndex = currentSlots.length

      const slot: InternalStructureDefinition = {

        id: listPointerSlotId(block.id, nextIndex),

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



/** Menu «+ Element»: novo bloco LIST_POINTER a partir do template. */

export function appendListPointerBlockFromTemplate(

  schema: NodeSchemaDefinition,

  templateListPointerId: string,

  structure: InternalStructureDefinition,

  templateSchema: NodeSchemaDefinition | null | undefined,

): NodeSchemaDefinition {

  const templateBlock = findTemplateListPointerBlock(templateSchema, templateListPointerId)

  if (!templateBlock) {

    return schema

  }



  const instance = createListPointerInstanceBlock(templateBlock, structure)

  return {

    ...schema,

    listPointer: [...(schema.listPointer ?? []), instance],

  }

}



/**

 * `targetId` = id da instância do bloco → acrescenta slot;

 * id do template (sem bloco com esse id) → novo bloco LIST_POINTER.

 */

export function appendListPointerCatalogItemToSchema(

  schema: NodeSchemaDefinition,

  targetId: string,

  structure: InternalStructureDefinition,

  templateSchema: NodeSchemaDefinition | null | undefined,

): NodeSchemaDefinition {

  const existingBlock = schema.listPointer?.find((block) => block.id === targetId)

  if (existingBlock) {

    return appendListPointerSlotToBlock(schema, targetId, structure)

  }



  return appendListPointerBlockFromTemplate(schema, targetId, structure, templateSchema)

}



export function listListPointerCatalogPicksForElementMenu(

  _node: NodeInstance,

  templateSchema: NodeSchemaDefinition | null | undefined,

): ListPointerCatalogPick[] {

  const picks: ListPointerCatalogPick[] = []

  for (const block of buildListPointerAddChoices(_node, templateSchema)) {

    for (const choice of block.structures) {

      picks.push({

        listPointerId: block.listPointerId,

        listPointerTitle: block.title,

        structure: choice.structure,

      })

    }

  }

  return picks

}



export function buildListPointerAddChoices(

  _node: NodeInstance,

  templateSchema: NodeSchemaDefinition | null | undefined,

): ListPointerAddBlockChoice[] {

  if (!templateSchema?.listPointer?.length) {

    return []

  }



  const choices: ListPointerAddBlockChoice[] = []



  for (const templateBlock of templateSchema.listPointer) {

    if (templateBlock.internalStructures.length === 0) {

      continue

    }



    const structures: ListPointerAddStructureChoice[] = templateBlock.internalStructures.map(

      (item, index) => ({

        choiceKey: `${templateBlock.id}:${item.schemaId}:${String(index)}`,

        name: item.name,

        meta: item.schemaId,

        structure: item,

      }),

    )



    choices.push({

      listPointerId: templateBlock.id,

      title: templateBlock.title,

      structures,

    })

  }



  return choices

}



export function structureForListPointerAdd(

  templateStructure: InternalStructureDefinition,

): InternalStructureDefinition {

  return {

    ...templateStructure,

    id: `dyn-lpc-${crypto.randomUUID().slice(0, 10)}`,

  }

}



export type ListPointerRemovableSlot = {

  id: string

  name: string

  meta: string

  listPointerId: string

}



export function listRemovableListPointerSlotsForBlock(

  node: NodeInstance,

  blockInstanceId: string,

): ListPointerRemovableSlot[] {

  const block = node.schema.listPointer?.find((entry) => entry.id === blockInstanceId)

  if (!block) {

    return []

  }



  const items: ListPointerRemovableSlot[] = []

  for (const slot of populatedSlotsForListPointer(block)) {

    if (!isListPointerSlotId(slot.id)) {

      continue

    }

    items.push({

      id: slot.id,

      name: slot.name || slot.schemaId,

      meta: `${block.title} · LIST_POINTER`,

      listPointerId: block.id,

    })

  }

  return items

}



export function listRemovableListPointerSlots(

  node: NodeInstance,

  _connections: readonly CanvasConnection[],

  _canvasNodeId: string,

): ListPointerRemovableSlot[] {

  const items: ListPointerRemovableSlot[] = []

  for (const block of node.schema.listPointer ?? []) {

    items.push(...listRemovableListPointerSlotsForBlock(node, block.id))

  }

  return items

}



export type ListPointerRemovableBlock = {

  id: string

  name: string

  meta: string

  listPointerId: string

}



export function listRemovableListPointerBlocks(node: NodeInstance): ListPointerRemovableBlock[] {

  return (node.schema.listPointer ?? []).map((block) => {

    const slotNames = populatedSlotsForListPointer(block)

      .map((slot) => slot.name.trim())

      .filter(Boolean)

    const meta =

      slotNames.length > 0 ? slotNames.join(', ') : 'LIST_POINTER'

    return {

      id: block.id,

      name: block.title,

      meta,

      listPointerId: block.id,

    }

  })

}



export function findListPointerBlockContainingSlot(

  schema: NodeSchemaDefinition,

  slotId: string,

): ListPointerDefinition | null {

  for (const block of schema.listPointer ?? []) {

    const slots = block.slots ?? ensureListPointerSlots(block)

    if (slots.some((slot) => slot.id === slotId)) {

      return block

    }

    if (parseListPointerSlotIndexFromId(slotId, block.id) !== null) {

      return block

    }

  }

  return null

}



function parseListPointerSlotIndexFromId(slotId: string, listPointerId: string): number | null {

  const prefix = `${listPointerId}__slot__`

  if (!slotId.startsWith(prefix)) {

    return null

  }

  const n = Number.parseInt(slotId.slice(prefix.length), 10)

  return Number.isFinite(n) ? n : null

}



export function slotIdsForListPointerBlock(block: ListPointerDefinition): string[] {

  return populatedSlotsForListPointer(block).map((slot) => slot.id)

}



export function removeListPointerSlotFromSchema(

  schema: NodeSchemaDefinition,

  slotId: string,

  connections: readonly CanvasConnection[],

  fromNodeId: string,

): NodeSchemaDefinition {

  const block = findListPointerBlockContainingSlot(schema, slotId)

  if (!block) {

    return schema

  }



  const linkedCount = connections.filter(

    (connection) =>

      connection.fromNodeId === fromNodeId &&

      connection.fromInternalStructureId.startsWith(`${block.id}__slot__`),

  ).length



  const currentSlots = populatedSlotsForListPointer(block)

  const nextSlots = currentSlots.filter((slot) => slot.id !== slotId)



  const minSlots = linkedCount

  while (nextSlots.length < minSlots) {

    const index = nextSlots.length

    nextSlots.push({

      id: listPointerSlotId(block.id, index),

      name: block.internalStructures[0]?.name ?? block.title,

      schemaId: block.internalStructures[0]?.schemaId ?? '',

    })

  }



  return {

    ...schema,

    listPointer: (schema.listPointer ?? []).map((entry) =>

      entry.id === block.id ? { ...entry, slots: nextSlots } : entry,

    ),

  }

}



export function removeListPointerBlockFromSchema(

  schema: NodeSchemaDefinition,

  blockInstanceId: string,

): NodeSchemaDefinition {

  return {

    ...schema,

    listPointer: (schema.listPointer ?? []).filter((block) => block.id !== blockInstanceId),

  }

}


