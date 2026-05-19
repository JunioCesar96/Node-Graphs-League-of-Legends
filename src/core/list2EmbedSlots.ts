import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import type {
  EmbedDefinition,
  InternalStructureDefinition,
  List2EmbedDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import {
  embedSlotId,
  ensureEmbedSlots,
  findEmbedBySlotId,
  isEmbedSlotId,
  populatedSlotsForEmbed,
  resolveCollectionTypeForEmbedSlot,
} from '@/core/embedSlots'

export function applyList2EmbedInstancesToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const list2Embed = schema.list2Embed
  if (!list2Embed || list2Embed.length === 0) {
    return schema
  }

  return {
    ...schema,
    list2Embed: list2Embed.map((block) => ({
      ...block,
      instances: block.instances.map((instance) => ({
        ...instance,
        slots: ensureEmbedSlots(instance),
      })),
    })),
  }
}

export function findList2EmbedByInstanceSlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { block: List2EmbedDefinition; instance: EmbedDefinition; slotIndex: number } | null {
  for (const block of schema.list2Embed ?? []) {
    for (const instance of block.instances) {
      const hit = findEmbedBySlotId({ ...schema, embed: [instance] }, slotId)
      if (hit) {
        return { block, instance: hit.embed, slotIndex: hit.slotIndex }
      }
    }
  }
  return null
}

export function findSlotInList2EmbedSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): {
  list2Embed: List2EmbedDefinition
  instance: EmbedDefinition
  slot: InternalStructureDefinition
} | null {
  const hit = findList2EmbedByInstanceSlotId(schema, slotId)
  if (!hit) {
    return null
  }
  const slots = populatedSlotsForEmbed(hit.instance)
  const slot = slots[hit.slotIndex]
  if (!slot) {
    return null
  }
  return { list2Embed: hit.block, instance: hit.instance, slot }
}

export function populatedSlotsForList2EmbedInstance(instance: EmbedDefinition): InternalStructureDefinition[] {
  return populatedSlotsForEmbed(instance)
}

export function catalogSchemaIdsForList2Embed(block: List2EmbedDefinition): string[] {
  return [...new Set(block.internalStructures.map((item) => item.schemaId))]
}

export function slotMatchesList2EmbedCatalog(block: List2EmbedDefinition, targetSchemaId: string): boolean {
  const allowed = catalogSchemaIdsForList2Embed(block)
  if (allowed.length === 0) {
    return true
  }
  return allowed.includes(targetSchemaId)
}

export function resolveCollectionTypeForList2EmbedInstanceSlot(
  slot: InternalStructureDefinition,
  block: List2EmbedDefinition,
  instance: EmbedDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  connectedTarget?: CanvasNode | null,
): string | undefined {
  return resolveCollectionTypeForEmbedSlot(slot, instance, registry, connectedTarget ?? null)
}

export function isList2EmbedInstanceSlotId(slotId: string, schema: NodeSchemaDefinition): boolean {
  if (!isEmbedSlotId(slotId)) {
    return false
  }
  return findList2EmbedByInstanceSlotId(schema, slotId) !== null
}

export function countList2EmbedInstanceConnections(
  connections: readonly CanvasConnection[],
  fromNodeId: string,
  instanceId: string,
): number {
  const prefix = `${instanceId}__slot__`
  return connections.filter(
    (c) => c.fromNodeId === fromNodeId && c.fromInternalStructureId.startsWith(prefix),
  ).length
}

export function createList2EmbedInstanceFromCatalog(
  block: List2EmbedDefinition,
  structure: InternalStructureDefinition,
  itemIdx: number,
): EmbedDefinition {
  const instanceId = `${block.id}-inst-${String(itemIdx)}`
  return {
    id: instanceId,
    title: structure.name,
    internalStructures: [{ ...structure }],
    slots: [
      {
        id: embedSlotId(instanceId, 0),
        name: structure.name,
        schemaId: structure.schemaId,
      },
    ],
  }
}
