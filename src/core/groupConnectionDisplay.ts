import type { CanvasConnection, CanvasNode, ConnectionRouting } from './canvasScene'
import { isGroupSlotConnection } from './groupSlotConnections'

export type GroupSlotWirelessLink = {
  connectionId: string
  routing: ConnectionRouting
  peerNodeId: string
  peerTitle: string
  peergroupName: string
  peerSlotId: string
  peerPulsePortKind: 'input' | 'output'
}

export type GroupWirelessNodeDisplay = {
  slots: Map<string, GroupSlotWirelessLink>
  linked: boolean
}

export type GroupWirelessPeerHoverPayload = {
  peerNodeId: string
  pulseOnPeer: {
    connectionId: string
    slotId: string
    portKind: 'input' | 'output'
  }
}

function emptyGroupWirelessDisplay(): GroupWirelessNodeDisplay {
  return { slots: new Map(), linked: false }
}

function nodeTitle(nodes: readonly CanvasNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.node.schema.title ?? nodeId
}

function groupName(nodes: readonly CanvasNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.groupStructure?.groupName ?? ''
}

export function buildGroupWirelessDisplayByNode(
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
): Map<string, GroupWirelessNodeDisplay> {
  const byNode = new Map<string, GroupWirelessNodeDisplay>()

  const ensure = (nodeId: string): GroupWirelessNodeDisplay => {
    const existing = byNode.get(nodeId)
    if (existing) {
      return existing
    }
    const created = emptyGroupWirelessDisplay()
    byNode.set(nodeId, created)
    return created
  }

  for (const connection of connections) {
    if (!isGroupSlotConnection(connection)) {
      continue
    }
    if (!connection.fromGroupSlotId || !connection.toGroupSlotId) {
      continue
    }

    const fromDisplay = ensure(connection.fromNodeId)
    const toDisplay = ensure(connection.toNodeId)

    fromDisplay.slots.set(connection.fromGroupSlotId, {
      connectionId: connection.id,
      routing: connection.routing ?? 'wireless',
      peerNodeId: connection.toNodeId,
      peerTitle: nodeTitle(nodes, connection.toNodeId),
      peergroupName: groupName(nodes, connection.toNodeId),
      peerSlotId: connection.toGroupSlotId,
      peerPulsePortKind: 'input',
    })
    fromDisplay.linked = true

    toDisplay.slots.set(connection.toGroupSlotId, {
      connectionId: connection.id,
      routing: connection.routing ?? 'wireless',
      peerNodeId: connection.fromNodeId,
      peerTitle: nodeTitle(nodes, connection.fromNodeId),
      peergroupName: groupName(nodes, connection.fromNodeId),
      peerSlotId: connection.fromGroupSlotId,
      peerPulsePortKind: 'output',
    })
    toDisplay.linked = true
  }

  return byNode
}

export function isGroupSlotPulsing(
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
