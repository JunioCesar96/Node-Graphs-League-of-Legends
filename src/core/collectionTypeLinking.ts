import type { CanvasNode } from '@/core/canvasScene'
import type { InternalStructureDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

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
