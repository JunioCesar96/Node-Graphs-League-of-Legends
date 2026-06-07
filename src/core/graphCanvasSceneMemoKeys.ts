import { getNodeDisplayTitle } from '@/core/canvasNodePresentation'
import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'

import type { GraphCanvasDragPositionOverride } from '@/core/graphCanvasDragPosition'
import { resolveGraphCanvasNodeRenderPosition } from '@/core/graphCanvasDragPosition'

/** Chave que muda quando qualquer posição de nó muda (inclui override de arrasto). */
export function graphCanvasNodePositionsKey(
  nodes: readonly CanvasNode[],
  dragOverride: GraphCanvasDragPositionOverride = null,
): string {
  const parts: string[] = []

  for (const node of nodes) {
    const position = resolveGraphCanvasNodeRenderPosition(node, dragOverride)
    parts.push(`${node.id}:${position.x},${position.y}`)
  }

  return parts.join('|')
}

/** Chave de topologia/títulos — ignora posição (wireless display nos cartões). */
export function graphCanvasWirelessDisplayKey(
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
): string {
  const connectionDigest = connections
    .map(
      (connection) =>
        [
          connection.id,
          connection.fromNodeId,
          connection.toNodeId,
          connection.fromInternalStructureId ?? '',
          connection.fromBlockSlotId ?? '',
          connection.toBlockSlotId ?? '',
          connection.routing ?? '',
          connection.forced ? '1' : '0',
        ].join(':'),
    )
    .join('\u0001')

  const nodeDigest = nodes
    .map((node) => `${node.id}:${getNodeDisplayTitle(node)}`)
    .join('\u0001')

  return `${connections.length}\u0002${connectionDigest}\u0002${nodeDigest}`
}

/** Chave para índices de slot de bloco / estrutura — ignora posição. */
export function graphCanvasBlockSlotIndexKey(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  lightModeDefaultFirst: boolean,
): string {
  const blockViewDigest = scene.nodes
    .map((node) => {
      if (!node.blockElementView) {
        return ''
      }
      return `${node.id}:${JSON.stringify(node.blockElementView)}`
    })
    .join('\u0001')

  return `${lightModeDefaultFirst ? '1' : '0'}:${scene.connections.length}:${scene.nodes.length}:${blockViewDigest}`
}
