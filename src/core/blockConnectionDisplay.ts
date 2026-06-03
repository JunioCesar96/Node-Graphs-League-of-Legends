import type { CanvasConnection, CanvasNode, ConnectionRouting } from './canvasScene'
import { isBlockSlotConnection } from './blockSlotConnections'

export type BlockSlotWirelessLink = {
  connectionId: string
  routing: ConnectionRouting
  forced?: boolean
  peerNodeId: string
  peerTitle: string
  peerBlockName: string
  peerSlotId: string
  peerPulsePortKind: 'input' | 'output'
}

export type BlockWirelessNodeDisplay = {
  slots: Map<string, BlockSlotWirelessLink>
  linked: boolean
}

export type BlockWirelessPeerHoverPayload = {
  peerNodeId: string
  pulseOnPeer: {
    connectionId: string
    slotId: string
    portKind: 'input' | 'output'
  }
}

function emptyBlockWirelessDisplay(): BlockWirelessNodeDisplay {
  return { slots: new Map(), linked: false }
}

function nodeTitle(nodes: readonly CanvasNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.node.schema.title ?? nodeId
}

function blockName(nodes: readonly CanvasNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.blockStructure?.blockName ?? ''
}

export function buildBlockWirelessDisplayByNode(
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
): Map<string, BlockWirelessNodeDisplay> {
  const byNode = new Map<string, BlockWirelessNodeDisplay>()

  const ensure = (nodeId: string): BlockWirelessNodeDisplay => {
    const existing = byNode.get(nodeId)
    if (existing) {
      return existing
    }
    const created = emptyBlockWirelessDisplay()
    byNode.set(nodeId, created)
    return created
  }

  for (const connection of connections) {
    if (!isBlockSlotConnection(connection)) {
      continue
    }
    if (!connection.fromBlockSlotId || !connection.toBlockSlotId) {
      continue
    }

    const fromDisplay = ensure(connection.fromNodeId)
    const toDisplay = ensure(connection.toNodeId)

    const forced = connection.forced === true

    fromDisplay.slots.set(connection.fromBlockSlotId, {
      connectionId: connection.id,
      routing: connection.routing ?? 'wireless',
      forced,
      peerNodeId: connection.toNodeId,
      peerTitle: nodeTitle(nodes, connection.toNodeId),
      peerBlockName: blockName(nodes, connection.toNodeId),
      peerSlotId: connection.toBlockSlotId,
      peerPulsePortKind: 'input',
    })
    fromDisplay.linked = true

    toDisplay.slots.set(connection.toBlockSlotId, {
      connectionId: connection.id,
      routing: connection.routing ?? 'wireless',
      forced,
      peerNodeId: connection.fromNodeId,
      peerTitle: nodeTitle(nodes, connection.fromNodeId),
      peerBlockName: blockName(nodes, connection.fromNodeId),
      peerSlotId: connection.fromBlockSlotId,
      peerPulsePortKind: 'output',
    })
    toDisplay.linked = true
  }

  return byNode
}

export function isBlockSlotPulsing(
  pulse:
    | {
        nodeId: string
        slotId: string
      }
    | null
    | undefined,
  nodeId: string,
  slotId: string,
): boolean {
  return Boolean(pulse && pulse.nodeId === nodeId && pulse.slotId === slotId)
}
