import type { CanvasConnection } from '@/core/canvasScene'
import type { CanvasNode } from '@/core/canvasScene'
import type {
  EmbedDefinition,
  InternalStructureDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'

export const EMBED_SLOT_ID_PREFIX = '__slot__'

export function embedSlotId(embedBlockId: string, index: number): string {
  return `${embedBlockId}${EMBED_SLOT_ID_PREFIX}${String(index)}`
}

export function parseEmbedSlotIndex(slotId: string, embedBlockId: string): number | null {
  const prefix = `${embedBlockId}${EMBED_SLOT_ID_PREFIX}`
  if (!slotId.startsWith(prefix)) {
    return null
  }
  const n = Number.parseInt(slotId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function isEmbedSlotId(slotId: string): boolean {
  return slotId.includes(EMBED_SLOT_ID_PREFIX)
}

export function findEmbedBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { embed: EmbedDefinition; slotIndex: number } | null {
  for (const block of schema.embed ?? []) {
    const index = parseEmbedSlotIndex(slotId, block.id)
    if (index !== null) {
      return { embed: block, slotIndex: index }
    }
  }
  return null
}

export function ensureEmbedSlots(block: EmbedDefinition): InternalStructureDefinition[] {
  const existing = block.slots ?? []
  if (existing.length === 0) {
    return []
  }
  const normalized: InternalStructureDefinition[] = []
  for (let i = 0; i < Math.min(existing.length, 1); i += 1) {
    const slot = existing[i]!
    normalized.push({
      ...slot,
      id: slot.id.includes(EMBED_SLOT_ID_PREFIX) ? slot.id : embedSlotId(block.id, i),
    })
  }
  return normalized
}

export function populatedSlotsForEmbed(block: EmbedDefinition): InternalStructureDefinition[] {
  return ensureEmbedSlots(block)
}

export function resolveCollectionTypeForEmbedSlot(
  slot: InternalStructureDefinition,
  block: EmbedDefinition,
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

export function applyEmbedSlotsToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const embed = schema.embed
  if (!embed || embed.length === 0) {
    return schema
  }
  return {
    ...schema,
    embed: embed.map((block) => ({
      ...block,
      slots: ensureEmbedSlots(block),
    })),
  }
}

export function findSlotInEmbedSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): { embed: EmbedDefinition; slot: InternalStructureDefinition } | null {
  for (const block of schema.embed ?? []) {
    const slots = block.slots ?? ensureEmbedSlots(block)
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return { embed: block, slot }
    }
  }
  return null
}

function embedBlockOwnsSlotId(block: EmbedDefinition, slotId: string): boolean {
  if ((block.slots ?? []).some((s) => s.id === slotId)) {
    return true
  }
  return parseEmbedSlotIndex(slotId, block.id) !== null
}

export function patchEmbedSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  const embed = schema.embed
  if (!embed) {
    return schema
  }
  return {
    ...schema,
    embed: embed.map((block) => {
      if (!embedBlockOwnsSlotId(block, slotId)) {
        return block
      }

      const slots = block.slots ?? []
      const existing = slots.find((s) => s.id === slotId)
      if (existing) {
        return {
          ...block,
          slots: slots.map((s) => (s.id === slotId ? patch : s)),
        }
      }

      const resolvedId =
        parseEmbedSlotIndex(slotId, block.id) !== null ? slotId : embedSlotId(block.id, 0)
      return {
        ...block,
        slots: [{ ...patch, id: resolvedId }],
      }
    }),
  }
}

export function patchOutputSlotInNodeSchemaWithEmbed(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  if (findSlotInEmbedSchema(schema, slotId)) {
    return patchEmbedSlotInSchema(schema, slotId, patch)
  }
  return {
    ...schema,
    internalStructures: schema.internalStructures.map((item) =>
      item.id === slotId ? patch : item,
    ),
  }
}

export function findOutputSlotInNodeWithEmbed(
  node: CanvasNode,
  slotId: string,
): InternalStructureDefinition | null {
  const topLevel = node.node.schema.internalStructures.find((s) => s.id === slotId)
  if (topLevel) {
    return topLevel
  }
  for (const block of node.node.schema.embed ?? []) {
    const slot = populatedSlotsForEmbed(block).find((s) => s.id === slotId)
    if (slot) {
      return slot
    }
  }
  for (const block of node.node.schema.listEmbed ?? []) {
    const slots = block.slots ?? []
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return slot
    }
  }
  return null
}

export function catalogSchemaIdsForEmbed(block: EmbedDefinition): string[] {
  return block.internalStructures.map((item) => item.schemaId.trim()).filter(Boolean)
}

export function slotMatchesEmbedCatalog(block: EmbedDefinition, targetSchemaId: string): boolean {
  const normalized = targetSchemaId.trim()
  return catalogSchemaIdsForEmbed(block).some((schemaId) => schemaId === normalized)
}

export function migrateSceneEmbedConnections(
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
): CanvasConnection[] {
  return connections
}
