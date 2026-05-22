import type { CanvasConnection } from '@/core/canvasScene'
import type { CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  ListEmbedDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'
import {
  findList2EmbedByInstanceSlotId,
  populatedSlotsForList2EmbedInstance,
} from '@/core/list2EmbedSlots'
import {
  findList2PointerByInstanceSlotId,
  populatedSlotsForList2PointerInstance,
} from '@/core/list2PointerSlots'
import {
  isMapHashEmbedSlotId,
  mapHashEmbedSlotsForParameter,
} from '@/core/mapHashEmbedSlots'
import {
  isMapHashPointerSlotId,
  mapHashPointerSlotsForParameter,
} from '@/core/mapHashPointerSlots'
import {
  isMapU64PointerSlotId,
  mapU64PointerSlotsForParameter,
} from '@/core/mapU64PointerSlots'
import { populatedSlotsForListPointer } from '@/core/listPointerSlots'
import { populatedSlotsForPointer } from '@/core/pointerSlots'

export const LIST_EMBED_SLOT_ID_PREFIX = '__slot__'

export function listEmbedSlotId(listEmbedId: string, index: number): string {
  return `${listEmbedId}${LIST_EMBED_SLOT_ID_PREFIX}${String(index)}`
}

export function parseListEmbedSlotIndex(slotId: string, listEmbedId: string): number | null {
  const prefix = `${listEmbedId}${LIST_EMBED_SLOT_ID_PREFIX}`
  if (!slotId.startsWith(prefix)) {
    return null
  }
  const n = Number.parseInt(slotId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function isListEmbedSlotId(slotId: string): boolean {
  return slotId.includes(LIST_EMBED_SLOT_ID_PREFIX)
}

export function findListEmbedBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { listEmbed: ListEmbedDefinition; slotIndex: number } | null {
  for (const block of schema.listEmbed ?? []) {
    const index = parseListEmbedSlotIndex(slotId, block.id)
    if (index !== null) {
      return { listEmbed: block, slotIndex: index }
    }
  }
  return null
}

export function findListEmbedOwningCatalogId(
  schema: NodeSchemaDefinition,
  catalogId: string,
): ListEmbedDefinition | null {
  for (const block of schema.listEmbed ?? []) {
    if (block.internalStructures.some((item) => item.id === catalogId)) {
      return block
    }
  }
  return null
}

function defaultSlotSchemaId(block: ListEmbedDefinition): string {
  return block.internalStructures[0]?.schemaId ?? ''
}

function defaultSlotName(block: ListEmbedDefinition): string {
  return block.internalStructures[0]?.name ?? block.title
}

export function createEmptyListEmbedSlot(
  listEmbedId: string,
  index: number,
  block: ListEmbedDefinition,
): InternalStructureDefinition {
  return {
    id: listEmbedSlotId(listEmbedId, index),
    name: defaultSlotName(block),
    schemaId: defaultSlotSchemaId(block),
  }
}

/** Normaliza ids de slots existentes (sem criar porta vazia). */
export function ensureListEmbedSlots(block: ListEmbedDefinition): InternalStructureDefinition[] {
  const existing = block.slots ?? []
  if (existing.length === 0) {
    return []
  }

  const normalized: InternalStructureDefinition[] = []
  for (let i = 0; i < existing.length; i += 1) {
    const slot = existing[i]!
    const expectedId = listEmbedSlotId(block.id, i)
    normalized.push({
      ...slot,
      id: slot.id.includes(LIST_EMBED_SLOT_ID_PREFIX) ? slot.id : expectedId,
    })
  }
  return normalized
}

/** Slots já adicionados ao bloco (sem porta «próximo slot» vazia). */
export function populatedSlotsForListEmbed(block: ListEmbedDefinition): InternalStructureDefinition[] {
  return ensureListEmbedSlots(block)
}

export function countListEmbedConnections(
  connections: readonly CanvasConnection[],
  fromNodeId: string,
  listEmbedId: string,
): number {
  const prefix = `${listEmbedId}${LIST_EMBED_SLOT_ID_PREFIX}`
  return connections.filter(
    (c) => c.fromNodeId === fromNodeId && c.fromInternalStructureId.startsWith(prefix),
  ).length
}

/** @deprecated Use `populatedSlotsForListEmbed` — o botão + substitui a porta vazia. */
export function visibleSlotsForListEmbed(
  block: ListEmbedDefinition,
  _connections: readonly CanvasConnection[],
  _fromNodeId: string,
): InternalStructureDefinition[] {
  return populatedSlotsForListEmbed(block)
}

export function resolveCollectionTypeForListEmbedSlot(
  slot: InternalStructureDefinition,
  block: ListEmbedDefinition,
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

export function catalogSchemaIdsForListEmbed(block: ListEmbedDefinition): string[] {
  return [...new Set(block.internalStructures.map((item) => item.schemaId))]
}

export function slotMatchesListEmbedCatalog(
  block: ListEmbedDefinition,
  targetSchemaId: string,
): boolean {
  const allowed = catalogSchemaIdsForListEmbed(block)
  if (allowed.length === 0) {
    return true
  }
  return allowed.includes(targetSchemaId)
}

/** Mapeia id legado de catálogo (pré-LIST_EMBED) para o primeiro slot do bloco. */
export function migrateLegacyCatalogConnectionId(
  schema: NodeSchemaDefinition,
  fromInternalStructureId: string,
): string {
  for (const block of schema.listEmbed ?? []) {
    const catalogHit = block.internalStructures.find((item) => item.id === fromInternalStructureId)
    if (catalogHit) {
      return listEmbedSlotId(block.id, 0)
    }
  }
  return fromInternalStructureId
}

export function migrateSceneListEmbedConnections(
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
): CanvasConnection[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return connections.map((connection) => {
    const fromNode = nodeById.get(connection.fromNodeId)
    if (!fromNode || isListEmbedSlotId(connection.fromInternalStructureId)) {
      return connection
    }

    const migratedId = migrateLegacyCatalogConnectionId(
      fromNode.node.schema,
      connection.fromInternalStructureId,
    )

    if (migratedId === connection.fromInternalStructureId) {
      return connection
    }

    return {
      ...connection,
      id: connection.id.replace(
        connection.fromInternalStructureId,
        migratedId,
      ),
      fromInternalStructureId: migratedId,
    }
  })
}

/** Converte blocos legados (vários slots num único bloco) em instâncias separadas. */
export function normalizeListEmbedInstances(
  schema: NodeSchemaDefinition,
  templateSchema?: NodeSchemaDefinition | null,
): NodeSchemaDefinition {
  const listEmbed = schema.listEmbed
  if (!listEmbed || listEmbed.length === 0) {
    return schema
  }

  const templateBlocks = templateSchema?.listEmbed ?? []
  const next: ListEmbedDefinition[] = []
  let changed = false

  for (const block of listEmbed) {
    const slots = populatedSlotsForListEmbed(block)
    const templateBlock =
      templateBlocks.find((entry) => entry.id === block.templateBlockId) ??
      templateBlocks.find((entry) => entry.id === block.id) ??
      null
    const templateBlockId = block.templateBlockId ?? templateBlock?.id
    const isTemplateShapedBlock =
      templateBlock !== null && !block.templateBlockId && block.id === templateBlock.id
    const shouldSplitLegacy = slots.length > 1 && (isTemplateShapedBlock || !block.templateBlockId)

    if (shouldSplitLegacy) {
      changed = true
      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index]!
        const instanceId =
          index === 0 && !block.templateBlockId
            ? block.id
            : `dyn-leb-${crypto.randomUUID().slice(0, 10)}`
        next.push({
          ...block,
          id: instanceId,
          templateBlockId: templateBlockId ?? block.id,
          internalStructures: block.internalStructures.map((item) => ({ ...item })),
          slots: [
            {
              ...slot,
              id: listEmbedSlotId(instanceId, 0),
            },
          ],
        })
      }
      continue
    }

    const normalizedSlots = slots.map((slot, index) => ({
      ...slot,
      id: listEmbedSlotId(block.id, index),
    }))

    const normalizedBlock: ListEmbedDefinition = {
      ...block,
      templateBlockId: templateBlockId ?? block.templateBlockId,
      slots: normalizedSlots,
    }

    if (
      normalizedBlock.templateBlockId !== block.templateBlockId ||
      normalizedSlots.length !== (block.slots?.length ?? 0) ||
      normalizedSlots.some((slot, index) => slot.id !== (block.slots?.[index]?.id ?? ''))
    ) {
      changed = true
    }

    next.push(normalizedBlock)
  }

  if (!changed) {
    return schema
  }

  return {
    ...schema,
    listEmbed: next,
  }
}

export function applyListEmbedSlotsToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const listEmbed = schema.listEmbed
  if (!listEmbed || listEmbed.length === 0) {
    return schema
  }

  const normalized = normalizeListEmbedInstances({
    ...schema,
    listEmbed: listEmbed.map((block) => ({
      ...block,
      slots: ensureListEmbedSlots(block),
    })),
  })

  return normalized
}

export function findSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): { listEmbed: ListEmbedDefinition; slot: InternalStructureDefinition } | null {
  for (const block of schema.listEmbed ?? []) {
    const slots = block.slots ?? ensureListEmbedSlots(block)
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return { listEmbed: block, slot }
    }
  }
  return null
}

export function findOutputSlotInNode(
  node: CanvasNode,
  slotId: string,
  connections: readonly CanvasConnection[],
): InternalStructureDefinition | null {
  const topLevel = node.node.schema.internalStructures.find((structure) => structure.id === slotId)
  if (topLevel) {
    return topLevel
  }

  for (const block of node.node.schema.embed ?? []) {
    const slots = block.slots ?? []
    const slot = slots.find((entry) => entry.id === slotId)
    if (slot) {
      return slot
    }
  }

  for (const block of node.node.schema.pointer ?? []) {
    const slots = populatedSlotsForPointer(block)
    const slot = slots.find((entry) => entry.id === slotId)
    if (slot) {
      return slot
    }
  }

  for (const block of node.node.schema.listEmbed ?? []) {
    const slots = populatedSlotsForListEmbed(block)
    const slot = slots.find((entry) => entry.id === slotId)
    if (slot) {
      return slot
    }
  }

  for (const block of node.node.schema.listPointer ?? []) {
    const slots = populatedSlotsForListPointer(block)
    const slot = slots.find((entry) => entry.id === slotId)
    if (slot) {
      return slot
    }
  }

  const list2EmbedHit = findList2EmbedByInstanceSlotId(node.node.schema, slotId)
  if (list2EmbedHit) {
    const slots = populatedSlotsForList2EmbedInstance(list2EmbedHit.instance)
    return slots[list2EmbedHit.slotIndex] ?? null
  }

  const list2PointerHit = findList2PointerByInstanceSlotId(node.node.schema, slotId)
  if (list2PointerHit) {
    const slots = populatedSlotsForList2PointerInstance(list2PointerHit.instance)
    return slots[list2PointerHit.slotIndex] ?? null
  }

  if (isMapHashPointerSlotId(slotId)) {
    for (const param of node.node.schema.parameters) {
      if (param.type !== 'mapHashPointer') {
        continue
      }
      const stored =
        node.node.values.find((entry) => entry.parameterId === param.id)?.value ?? param.defaultValue
      const slots = mapHashPointerSlotsForParameter(param, stored)
      const slot = slots.find((entry) => entry.id === slotId)
      if (slot) {
        return slot
      }
    }
  }

  if (isMapHashEmbedSlotId(slotId)) {
    for (const param of node.node.schema.parameters) {
      if (param.type !== 'mapHashEmbed') {
        continue
      }
      const stored =
        node.node.values.find((entry) => entry.parameterId === param.id)?.value ?? param.defaultValue
      const slots = mapHashEmbedSlotsForParameter(param, stored)
      const slot = slots.find((entry) => entry.id === slotId)
      if (slot) {
        return slot
      }
    }
  }

  if (isMapU64PointerSlotId(slotId)) {
    for (const param of node.node.schema.parameters) {
      if (param.type !== 'mapU64Pointer') {
        continue
      }
      const stored =
        node.node.values.find((entry) => entry.parameterId === param.id)?.value ?? param.defaultValue
      const slots = mapU64PointerSlotsForParameter(param, stored)
      const slot = slots.find((entry) => entry.id === slotId)
      if (slot) {
        return slot
      }
    }
  }

  return null
}

export function patchListEmbedSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  const listEmbed = schema.listEmbed
  if (!listEmbed) {
    return schema
  }

  return {
    ...schema,
    listEmbed: listEmbed.map((block) => {
      const slots = block.slots ?? ensureListEmbedSlots(block)
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

export function patchOutputSlotInNodeSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
  connections: readonly CanvasConnection[],
  fromNodeId: string,
): NodeSchemaDefinition {
  const listHit = findSlotInSchema(schema, slotId)
  if (listHit) {
    return patchListEmbedSlotInSchema(schema, slotId, patch)
  }

  return {
    ...schema,
    internalStructures: schema.internalStructures.map((item) =>
      item.id === slotId ? patch : item,
    ),
  }
}

export function appendListEmbedSlotIfNeeded(
  schema: NodeSchemaDefinition,
  listEmbedId: string,
  connections: readonly CanvasConnection[],
  fromNodeId: string,
): NodeSchemaDefinition {
  const block = schema.listEmbed?.find((b) => b.id === listEmbedId)
  if (!block) {
    return schema
  }

  const prefix = `${listEmbedId}${LIST_EMBED_SLOT_ID_PREFIX}`
  const linkedSlotIds = connections
    .filter((c) => c.fromNodeId === fromNodeId && c.fromInternalStructureId.startsWith(prefix))
    .map((c) => c.fromInternalStructureId)

  const currentSlots = [...(block.slots ?? [])]
  let changed = false

  for (const slotId of linkedSlotIds) {
    if (!currentSlots.some((s) => s.id === slotId)) {
      const index = parseListEmbedSlotIndex(slotId, listEmbedId) ?? currentSlots.length
      currentSlots.push(createEmptyListEmbedSlot(listEmbedId, index, block))
      changed = true
    }
  }

  if (!changed) {
    return schema
  }

  return {
    ...schema,
    listEmbed: (schema.listEmbed ?? []).map((b) =>
      b.id === listEmbedId ? { ...b, slots: ensureListEmbedSlots({ ...b, slots: currentSlots }) } : b,
    ),
  }
}
