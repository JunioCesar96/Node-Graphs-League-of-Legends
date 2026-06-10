import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { classifyOutgoingLink } from '@/core/canvasToClassGroupRitual'
import { findIncomingConnections } from '@/core/slotPeerFocus'

const LIST_CHILD_LINK_KINDS = new Set(['listPointer', 'listEmbed', 'list2Embed', 'list2Pointer'])

function isVfxSystemNode(canvasNode: CanvasNode): boolean {
  return (
    canvasNode.node.schema.title === 'VfxSystemDefinitionData' ||
    canvasNode.blockStructure?.blockType === 'VfxSystemDefinitionData'
  )
}

function findBlockParentNodeId(scene: CanvasScene, nodeId: string): string | null {
  for (const connection of findIncomingConnections(scene, nodeId)) {
    if (connection.toBlockSlotId?.trim() || connection.toBlockParameterId?.trim()) {
      return connection.fromNodeId
    }
  }

  return null
}

/**
 * «Ver código» num filho directo de list[pointer]/list[embed] exporta o nó pai
 * para incluir todos os itens da lista (ignora o índice compacto da UI).
 */
export function resolveViewCodeExportNodeId(scene: CanvasScene, nodeId: string): string {
  for (const connection of findIncomingConnections(scene, nodeId)) {
    const parent = scene.nodes.find((entry) => entry.id === connection.fromNodeId)
    if (!parent) {
      continue
    }

    const link = classifyOutgoingLink(parent, connection)
    if (link && LIST_CHILD_LINK_KINDS.has(link.kind)) {
      return parent.id
    }
  }

  return nodeId
}

/**
 * Export VFX a partir do bloco seleccionado — sobe a hierarquia de blocos até
 * `VfxSystemDefinitionData` (ou usa o nó de export League bin como fallback).
 */
export function resolveVfxExportNodeId(scene: CanvasScene, nodeId: string): string {
  let currentId = resolveViewCodeExportNodeId(scene, nodeId)
  const visited = new Set<string>()

  while (!visited.has(currentId)) {
    visited.add(currentId)
    const canvasNode = scene.nodes.find((entry) => entry.id === currentId)
    if (!canvasNode) {
      break
    }

    if (isVfxSystemNode(canvasNode)) {
      return currentId
    }

    const parentId = findBlockParentNodeId(scene, currentId)
    if (!parentId) {
      break
    }

    currentId = parentId
  }

  return resolveViewCodeExportNodeId(scene, nodeId)
}
