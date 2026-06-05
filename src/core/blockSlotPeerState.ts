import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  findConnectionForBlockSlot,
  findConnectionsForBlockOutputSlot,
  resolveBlockOutputSlotConnectionIndex,
} from '@/core/blockSlotConnections'

export type BlockSlotPeerResolved = {
  connection: CanvasConnection
  peerCanvasNode: CanvasNode
  peerNodeId: string
  slotDirection: 'input' | 'output'
}

export function resolveBlockSlotPeer(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  nodeId: string,
  slotId: string,
  slotDirection: 'input' | 'output',
  options?: {
    connectionIndex?: number
    outputIndexBySlotKey?: ReadonlyMap<string, number>
  },
): BlockSlotPeerResolved | null {
  let connectionIndex = options?.connectionIndex
  if (slotDirection === 'output' && connectionIndex === undefined && options?.outputIndexBySlotKey) {
    const count = findConnectionsForBlockOutputSlot(scene, nodeId, slotId).length
    connectionIndex = resolveBlockOutputSlotConnectionIndex(
      options.outputIndexBySlotKey,
      nodeId,
      slotId,
      count,
    )
  }

  const connection = findConnectionForBlockSlot(scene, nodeId, slotId, {
    connectionIndex: slotDirection === 'output' ? connectionIndex : undefined,
  })

  if (!connection) {
    return null
  }

  const peerNodeId = slotDirection === 'output' ? connection.toNodeId : connection.fromNodeId
  const peerCanvasNode = scene.nodes.find((node) => node.id === peerNodeId)

  if (!peerCanvasNode) {
    return null
  }

  return {
    connection,
    peerCanvasNode,
    peerNodeId,
    slotDirection,
  }
}
