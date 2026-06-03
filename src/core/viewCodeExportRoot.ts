import type { CanvasScene } from '@/core/canvasScene'
import { classifyOutgoingLink } from '@/core/canvasToClassGroupRitual'
import { findIncomingConnections } from '@/core/slotPeerFocus'

const LIST_CHILD_LINK_KINDS = new Set(['listPointer', 'listEmbed', 'list2Embed', 'list2Pointer'])

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
