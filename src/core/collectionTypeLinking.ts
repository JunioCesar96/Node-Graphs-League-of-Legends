import type { CanvasNode } from '@/core/canvasScene'
import type { InternalStructureDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  catalogSchemaIdsForEmbed,
  findEmbedBySlotId,
  slotMatchesEmbedCatalog,
} from '@/core/embedSlots'
import {
  catalogSchemaIdsForListEmbed,
  findSlotInSchema,
  isListEmbedSlotId,
  slotMatchesListEmbedCatalog,
} from '@/core/listEmbedSlots'
import {
  catalogSchemaIdsForListPointer,
  findListPointerBySlotId,
  isListPointerSlotId,
  slotMatchesListPointerCatalog,
} from '@/core/listPointerSlots'
import {
  catalogSchemaIdsForPointer,
  findPointerBySlotId,
  slotMatchesPointerCatalog,
} from '@/core/pointerSlots'

export function resolveCollectionTypeForSlot(
  schemaId: string,
  registry: Record<string, NodeSchemaDefinition>,
): string | undefined {
  const collectionType = registry[schemaId]?.nomenclature?.collectionType?.trim()
  return collectionType || undefined
}

export function getCollectionTypeForCanvasNode(canvasNode: CanvasNode): string | undefined {
  const collectionType = canvasNode.node.schema.nomenclature?.collectionType?.trim()
  return collectionType || undefined
}

export function resolveCollectionTypeForInternalStructure(
  structure: InternalStructureDefinition,
  registry: Record<string, NodeSchemaDefinition>,
  connectedTarget?: CanvasNode | null,
): string | undefined {
  const fromSlot = resolveCollectionTypeForSlot(structure.schemaId, registry)
  if (fromSlot) {
    return fromSlot
  }

  if (connectedTarget) {
    return getCollectionTypeForCanvasNode(connectedTarget)
  }

  return undefined
}

export type GetNodesByCollectionTypeOptions = {
  excludeNodeId?: string
}

export function getNodesByCollectionType(
  nodes: readonly CanvasNode[],
  collectionType: string,
  options?: GetNodesByCollectionTypeOptions,
): CanvasNode[] {
  const normalizedType = collectionType.trim()
  if (!normalizedType) {
    return []
  }

  return nodes.filter((canvasNode) => {
    if (options?.excludeNodeId && canvasNode.id === options.excludeNodeId) {
      return false
    }

    return getCollectionTypeForCanvasNode(canvasNode) === normalizedType
  })
}

export function nodesShareCollectionType(
  sourceSchemaId: string,
  targetNode: CanvasNode,
  registry: Record<string, NodeSchemaDefinition>,
): boolean {
  const sourceType = resolveCollectionTypeForSlot(sourceSchemaId, registry)
  const targetType = getCollectionTypeForCanvasNode(targetNode)

  if (sourceType && targetType) {
    return sourceType === targetType
  }

  return targetNode.node.schema.id === sourceSchemaId
}

export function nodesShareCollectionTypeForOutputSlot(
  fromNode: CanvasNode,
  slot: InternalStructureDefinition,
  targetNode: CanvasNode,
  registry: Record<string, NodeSchemaDefinition>,
): boolean {
  const embedBySlot = findEmbedBySlotId(fromNode.node.schema, slot.id)
  if (embedBySlot) {
    const embedBlock = embedBySlot.embed
    if (!slotMatchesEmbedCatalog(embedBlock, targetNode.node.schema.id)) {
      return false
    }

    const targetType = getCollectionTypeForCanvasNode(targetNode)
    if (!targetType) {
      return catalogSchemaIdsForEmbed(embedBlock).includes(targetNode.node.schema.id)
    }

    const allowedTypes = catalogSchemaIdsForEmbed(embedBlock)
      .map((schemaId) => resolveCollectionTypeForSlot(schemaId, registry))
      .filter((value): value is string => Boolean(value))

    if (allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.includes(targetType)
  }

  const pointerBySlot = findPointerBySlotId(fromNode.node.schema, slot.id)
  if (pointerBySlot) {
    const pointerBlock = pointerBySlot.pointer
    if (!slotMatchesPointerCatalog(pointerBlock, targetNode.node.schema.id)) {
      return false
    }

    const targetType = getCollectionTypeForCanvasNode(targetNode)
    if (!targetType) {
      return catalogSchemaIdsForPointer(pointerBlock).includes(targetNode.node.schema.id)
    }

    const allowedTypes = catalogSchemaIdsForPointer(pointerBlock)
      .map((schemaId) => resolveCollectionTypeForSlot(schemaId, registry))
      .filter((value): value is string => Boolean(value))

    if (allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.includes(targetType)
  }

  if (isListEmbedSlotId(slot.id)) {
    const hit = findSlotInSchema(fromNode.node.schema, slot.id)
    if (!hit) {
      return false
    }

    if (!slotMatchesListEmbedCatalog(hit.listEmbed, targetNode.node.schema.id)) {
      return false
    }

    const targetType = getCollectionTypeForCanvasNode(targetNode)
    if (!targetType) {
      return catalogSchemaIdsForListEmbed(hit.listEmbed).includes(targetNode.node.schema.id)
    }

    const allowedTypes = catalogSchemaIdsForListEmbed(hit.listEmbed)
      .map((schemaId) => resolveCollectionTypeForSlot(schemaId, registry))
      .filter((value): value is string => Boolean(value))

    if (allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.includes(targetType)
  }

  if (isListPointerSlotId(slot.id)) {
    const hit = findListPointerBySlotId(fromNode.node.schema, slot.id)
    if (!hit) {
      return false
    }

    if (!slotMatchesListPointerCatalog(hit.listPointer, targetNode.node.schema.id)) {
      return false
    }

    const targetType = getCollectionTypeForCanvasNode(targetNode)
    if (!targetType) {
      return catalogSchemaIdsForListPointer(hit.listPointer).includes(targetNode.node.schema.id)
    }

    const allowedTypes = catalogSchemaIdsForListPointer(hit.listPointer)
      .map((schemaId) => resolveCollectionTypeForSlot(schemaId, registry))
      .filter((value): value is string => Boolean(value))

    if (allowedTypes.length === 0) {
      return true
    }

    return allowedTypes.includes(targetType)
  }

  return nodesShareCollectionType(slot.schemaId, targetNode, registry)
}

export function schemaMatchesCollectionType(
  schema: NodeSchemaDefinition,
  collectionType: string,
): boolean {
  const normalizedType = collectionType.trim()
  if (!normalizedType) {
    return false
  }

  const schemaType = schema.nomenclature?.collectionType?.trim()
  if (schemaType) {
    return schemaType === normalizedType
  }

  return schema.id === normalizedType
}

export function resolveInternalStructureLabelFromTarget(target: CanvasNode): string {
  const title = target.node.schema.title.trim()
  if (title) {
    return title
  }

  return target.node.schema.id
}

export function patchInternalStructureSlotForLink(
  slot: InternalStructureDefinition,
  target: CanvasNode,
): InternalStructureDefinition {
  return {
    ...slot,
    schemaId: target.node.schema.id,
    name: resolveInternalStructureLabelFromTarget(target),
  }
}

export function findConnectionTargetForSlot(
  connections: readonly { fromNodeId: string; fromInternalStructureId: string; toNodeId: string }[],
  fromNodeId: string,
  structureId: string,
  nodes: readonly CanvasNode[],
): CanvasNode | undefined {
  const connection = connections.find(
    (item) => item.fromNodeId === fromNodeId && item.fromInternalStructureId === structureId,
  )

  if (!connection) {
    return undefined
  }

  return nodes.find((node) => node.id === connection.toNodeId)
}
