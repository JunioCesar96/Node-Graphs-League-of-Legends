import type { CanvasConnection, CanvasScene } from '@/core/canvasScene'
import { fx_required_parameter_isMarked } from '@/core/fx_required_parameter'
import { listRemovableEmbedBlocks, slotIdsForEmbedBlock } from '@/core/embedElementMenu'
import {
  listRemovableListEmbedBlocks,
  slotIdsForListEmbedBlock,
} from '@/core/listEmbedElementMenu'
import {
  listRemovableListPointerBlocks,
  slotIdsForListPointerBlock,
} from '@/core/listPointerElementMenu'
import { listRemovablePointerBlocks, slotIdsForPointerBlock } from '@/core/pointerElementMenu'
import type { NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'

export type NodeElementKind =
  | 'parameter'
  | 'internalStructure'
  | 'embedSlot'
  | 'embedBlock'
  | 'pointerSlot'
  | 'pointerBlock'
  | 'listEmbedSlot'
  | 'listEmbedBlock'
  | 'listPointerSlot'
  | 'listPointerBlock'

export type NodeElementListItem = {
  id: string
  kind: NodeElementKind
  meta?: string
  name: string
  /** Bloco LIST_EMBED / LIST_POINTER pai (slot ou bloco). */
  listEmbedId?: string
  listPointerId?: string
  embedId?: string
  pointerId?: string
}

export type ListRemovableNodeElementsOptions = {
  canvasNodeId?: string
  connections?: readonly CanvasConnection[]
}

export function listNodeElements(node: NodeInstance): NodeElementListItem[] {
  const parameters: NodeElementListItem[] = node.schema.parameters.map((parameter) => ({
    id: parameter.id,
    kind: 'parameter',
    meta: parameter.type,
    name: parameter.name,
  }))

  const structures: NodeElementListItem[] = node.schema.internalStructures.map((structure) => ({
    id: structure.id,
    kind: 'internalStructure',
    meta: structure.schemaId,
    name: structure.name,
  }))

  return [...parameters, ...structures]
}

/** Lista elementos que podem ser removidos via `- Element` (exclui parâmetros obrigatórios). */
export function listRemovableNodeElements(
  node: NodeInstance,
  stubCatalog?: readonly NodeParameterDefinition[],
  options?: ListRemovableNodeElementsOptions,
): NodeElementListItem[] {
  const parameters: NodeElementListItem[] = node.schema.parameters
    .filter(
      (parameter) => !fx_required_parameter_isMarked(node, parameter.id, stubCatalog),
    )
    .map((parameter) => ({
      id: parameter.id,
      kind: 'parameter' as const,
      meta: parameter.type,
      name: parameter.name,
    }))

  const embedBlocks: NodeElementListItem[] = listRemovableEmbedBlocks(node).map((block) => ({
    id: block.id,
    kind: 'embedBlock' as const,
    meta: block.meta,
    name: block.name,
    embedId: block.embedId,
  }))

  const pointerBlocks: NodeElementListItem[] = listRemovablePointerBlocks(node).map((block) => ({
    id: block.id,
    kind: 'pointerBlock' as const,
    meta: block.meta,
    name: block.name,
    pointerId: block.pointerId,
  }))

  const listEmbedBlocks: NodeElementListItem[] = listRemovableListEmbedBlocks(node).map((block) => ({
    id: block.id,
    kind: 'listEmbedBlock' as const,
    meta: block.meta,
    name: block.name,
    listEmbedId: block.listEmbedId,
  }))

  const listPointerBlocks: NodeElementListItem[] = listRemovableListPointerBlocks(node).map((block) => ({
    id: block.id,
    kind: 'listPointerBlock' as const,
    meta: block.meta,
    name: block.name,
    listPointerId: block.listPointerId,
  }))

  return [
    ...parameters,
    ...embedBlocks,
    ...pointerBlocks,
    ...listEmbedBlocks,
    ...listPointerBlocks,
  ]
}

export function countElementDependencies(
  scene: CanvasScene,
  nodeId: string,
  elementId: string,
  kind: NodeElementKind,
): number {
  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
  if (!canvasNode) {
    return 0
  }

  if (
    kind === 'internalStructure' ||
    kind === 'listEmbedSlot' ||
    kind === 'listPointerSlot' ||
    kind === 'embedSlot' ||
    kind === 'pointerSlot'
  ) {
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && connection.fromInternalStructureId === elementId,
    ).length
  }

  if (kind === 'embedBlock') {
    const block = canvasNode.node.schema.embed?.find((entry) => entry.id === elementId)
    if (!block) {
      return 0
    }
    const slotIds = new Set(slotIdsForEmbedBlock(block))
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId),
    ).length
  }

  if (kind === 'pointerBlock') {
    const block = canvasNode.node.schema.pointer?.find((entry) => entry.id === elementId)
    if (!block) {
      return 0
    }
    const slotIds = new Set(slotIdsForPointerBlock(block))
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId),
    ).length
  }

  if (kind === 'listEmbedBlock') {
    const block = canvasNode.node.schema.listEmbed?.find((entry) => entry.id === elementId)
    if (!block) {
      return 0
    }
    const slotIds = new Set(slotIdsForListEmbedBlock(block))
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId),
    ).length
  }

  if (kind === 'listPointerBlock') {
    const block = canvasNode.node.schema.listPointer?.find((entry) => entry.id === elementId)
    if (!block) {
      return 0
    }
    const slotIds = new Set(slotIdsForListPointerBlock(block))
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId),
    ).length
  }

  const links = canvasNode.node.parameter_value_links ?? []
  return links.filter(([a, b]) => a === elementId || b === elementId).length
}

export function formatElementDependencyWarning(count: number): string {
  if (count <= 0) {
    return ''
  }

  if (count === 1) {
    return ' Isso pode afetar 1 conexão ou vínculo existente.'
  }

  return ` Isso pode afetar ${count} conexões ou vínculos existentes.`
}
