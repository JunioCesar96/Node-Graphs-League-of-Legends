import type { CanvasConnection } from '@/core/canvasScene'
import type { CanvasNode } from '@/core/canvasScene'
import type {
  InternalStructureDefinition,
  ListPointerDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { resolveCollectionTypeForSlot } from '@/core/collectionTypeLinking'

export const LIST_POINTER_SLOT_ID_PREFIX = '__slot__'

export function listPointerSlotId(listPointerId: string, index: number): string {
  return `${listPointerId}${LIST_POINTER_SLOT_ID_PREFIX}${String(index)}`
}

export function parseListPointerSlotIndex(slotId: string, listPointerId: string): number | null {
  const prefix = `${listPointerId}${LIST_POINTER_SLOT_ID_PREFIX}`
  if (!slotId.startsWith(prefix)) {
    return null
  }
  const n = Number.parseInt(slotId.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : null
}

export function isListPointerSlotId(slotId: string): boolean {
  return slotId.includes(LIST_POINTER_SLOT_ID_PREFIX)
}

export function findListPointerBySlotId(
  schema: NodeSchemaDefinition,
  slotId: string,
): { listPointer: ListPointerDefinition; slotIndex: number } | null {
  for (const block of schema.listPointer ?? []) {
    const index = parseListPointerSlotIndex(slotId, block.id)
    if (index !== null) {
      return { listPointer: block, slotIndex: index }
    }
  }
  return null
}

export function findListPointerOwningCatalogId(
  schema: NodeSchemaDefinition,
  catalogId: string,
): ListPointerDefinition | null {
  for (const block of schema.listPointer ?? []) {
    if (block.internalStructures.some((item) => item.id === catalogId)) {
      return block
    }
  }
  return null
}

function defaultSlotSchemaId(block: ListPointerDefinition): string {
  return block.internalStructures[0]?.schemaId ?? ''
}

function defaultSlotName(block: ListPointerDefinition): string {
  return block.internalStructures[0]?.name ?? block.title
}

export function createEmptyListPointerSlot(
  listPointerId: string,
  index: number,
  block: ListPointerDefinition,
): InternalStructureDefinition {
  return {
    id: listPointerSlotId(listPointerId, index),
    name: defaultSlotName(block),
    schemaId: defaultSlotSchemaId(block),
  }
}

/** Normaliza ids de slots existentes (sem criar porta vazia). */
export function ensureListPointerSlots(block: ListPointerDefinition): InternalStructureDefinition[] {
  const existing = block.slots ?? []
  if (existing.length === 0) {
    return []
  }

  const normalized: InternalStructureDefinition[] = []
  for (let i = 0; i < existing.length; i += 1) {
    const slot = existing[i]!
    const expectedId = listPointerSlotId(block.id, i)
    normalized.push({
      ...slot,
      id: slot.id.includes(LIST_POINTER_SLOT_ID_PREFIX) ? slot.id : expectedId,
    })
  }
  return normalized
}

/** Slots já adicionados ao bloco (sem porta «próximo slot» vazia). */
export function populatedSlotsForListPointer(block: ListPointerDefinition): InternalStructureDefinition[] {
  return ensureListPointerSlots(block)
}

export function countListPointerConnections(
  connections: readonly CanvasConnection[],
  fromNodeId: string,
  listPointerId: string,
): number {
  const prefix = `${listPointerId}${LIST_POINTER_SLOT_ID_PREFIX}`
  return connections.filter(
    (c) => c.fromNodeId === fromNodeId && c.fromInternalStructureId.startsWith(prefix),
  ).length
}

/** @deprecated Use `populatedSlotsForListPointer` — o botão + substitui a porta vazia. */
export function visibleSlotsForListPointer(
  block: ListPointerDefinition,
  _connections: readonly CanvasConnection[],
  _fromNodeId: string,
): InternalStructureDefinition[] {
  return populatedSlotsForListPointer(block)
}

export function resolveCollectionTypeForListPointerSlot(
  slot: InternalStructureDefinition,
  block: ListPointerDefinition,
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

export function catalogSchemaIdsForListPointer(block: ListPointerDefinition): string[] {
  return [...new Set(block.internalStructures.map((item) => item.schemaId))]
}

export function slotMatchesListPointerCatalog(
  block: ListPointerDefinition,
  targetSchemaId: string,
): boolean {
  const allowed = catalogSchemaIdsForListPointer(block)
  if (allowed.length === 0) {
    return true
  }
  return allowed.includes(targetSchemaId)
}

/** Ids possíveis de ligação de saída para um índice de list[pointer] (slot normalizado + aliases). */
export function listPointerOutputSlotConnectionIds(
  block: ListPointerDefinition,
  index: number,
): string[] {
  const ids = new Set<string>()
  ids.add(listPointerSlotId(block.id, index))

  const slots = populatedSlotsForListPointer(block)
  const slot = slots[index]
  if (slot) {
    ids.add(slot.id)
  }

  const catalog = block.internalStructures[index]
  if (catalog) {
    ids.add(catalog.id)
  }

  return [...ids]
}

/** Mapeia id legado de catálogo (pré-LIST_POINTER) para o slot indexado correcto. */
export function migrateLegacyCatalogConnectionId(
  schema: NodeSchemaDefinition,
  fromInternalStructureId: string,
): string {
  for (const block of schema.listPointer ?? []) {
    const catalogIndex = block.internalStructures.findIndex(
      (item) => item.id === fromInternalStructureId,
    )
    if (catalogIndex >= 0) {
      return listPointerSlotId(block.id, catalogIndex)
    }

    const slots = populatedSlotsForListPointer(block)
    const slotIndex = slots.findIndex((slot) => slot.id === fromInternalStructureId)
    if (slotIndex >= 0) {
      return listPointerSlotId(block.id, slotIndex)
    }
  }
  return fromInternalStructureId
}

export function migrateSceneListPointerConnections(
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
): CanvasConnection[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return connections.map((connection) => {
    const fromNode = nodeById.get(connection.fromNodeId)
    if (!fromNode || isListPointerSlotId(connection.fromInternalStructureId)) {
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
export function normalizeListPointerInstances(
  schema: NodeSchemaDefinition,
  templateSchema?: NodeSchemaDefinition | null,
): NodeSchemaDefinition {
  const listPointer = schema.listPointer
  if (!listPointer || listPointer.length === 0) {
    return schema
  }

  const templateBlocks = templateSchema?.listPointer ?? []
  const next: ListPointerDefinition[] = []
  let changed = false

  for (const block of listPointer) {
    const slots = populatedSlotsForListPointer(block)
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
              id: listPointerSlotId(instanceId, 0),
            },
          ],
        })
      }
      continue
    }

    const normalizedSlots = slots.map((slot, index) => ({
      ...slot,
      id: listPointerSlotId(block.id, index),
    }))

    const normalizedBlock: ListPointerDefinition = {
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
    listPointer: next,
  }
}

export function applyListPointerSlotsToSchema(schema: NodeSchemaDefinition): NodeSchemaDefinition {
  const listPointer = schema.listPointer
  if (!listPointer || listPointer.length === 0) {
    return schema
  }

  const normalized = normalizeListPointerInstances({
    ...schema,
    listPointer: listPointer.map((block) => ({
      ...block,
      slots: ensureListPointerSlots(block),
    })),
  })

  return normalized
}

export function findSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
): { listPointer: ListPointerDefinition; slot: InternalStructureDefinition } | null {
  for (const block of schema.listPointer ?? []) {
    const slots = block.slots ?? ensureListPointerSlots(block)
    const slot = slots.find((s) => s.id === slotId)
    if (slot) {
      return { listPointer: block, slot }
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

  for (const block of node.node.schema.listPointer ?? []) {
    const slots = populatedSlotsForListPointer(block)
    const slot = slots.find((entry) => entry.id === slotId)
    if (slot) {
      return slot
    }
  }

  return null
}

export function patchListPointerSlotInSchema(
  schema: NodeSchemaDefinition,
  slotId: string,
  patch: InternalStructureDefinition,
): NodeSchemaDefinition {
  const listPointer = schema.listPointer
  if (!listPointer) {
    return schema
  }

  return {
    ...schema,
    listPointer: listPointer.map((block) => {
      const slots = block.slots ?? ensureListPointerSlots(block)
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
    return patchListPointerSlotInSchema(schema, slotId, patch)
  }

  return {
    ...schema,
    internalStructures: schema.internalStructures.map((item) =>
      item.id === slotId ? patch : item,
    ),
  }
}

export function appendListPointerSlotIfNeeded(
  schema: NodeSchemaDefinition,
  listPointerId: string,
  connections: readonly CanvasConnection[],
  fromNodeId: string,
): NodeSchemaDefinition {
  const block = schema.listPointer?.find((b) => b.id === listPointerId)
  if (!block) {
    return schema
  }

  const prefix = `${listPointerId}${LIST_POINTER_SLOT_ID_PREFIX}`
  const linkedSlotIds = connections
    .filter((c) => c.fromNodeId === fromNodeId && c.fromInternalStructureId.startsWith(prefix))
    .map((c) => c.fromInternalStructureId)

  const currentSlots = [...(block.slots ?? [])]
  let changed = false

  for (const slotId of linkedSlotIds) {
    if (!currentSlots.some((s) => s.id === slotId)) {
      const index = parseListPointerSlotIndex(slotId, listPointerId) ?? currentSlots.length
      currentSlots.push(createEmptyListPointerSlot(listPointerId, index, block))
      changed = true
    }
  }

  if (!changed) {
    return schema
  }

  return {
    ...schema,
    listPointer: (schema.listPointer ?? []).map((b) =>
      b.id === listPointerId ? { ...b, slots: ensureListPointerSlots({ ...b, slots: currentSlots }) } : b,
    ),
  }
}
