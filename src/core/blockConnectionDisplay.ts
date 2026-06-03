import type { CanvasConnection, CanvasNode, ConnectionRouting } from './canvasScene'
import { connectionInvolvesAddon } from './addonSlotConnections'
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

function peerTitle(nodes: readonly CanvasNode[], nodeId: string): string {
  const node = nodes.find((entry) => entry.id === nodeId)
  if (!node) {
    return nodeId
  }
  if (node.addonInstance) {
    return node.addonInstance.addonId
  }
  return node.node.schema.title ?? nodeId
}

function peerBlockName(nodes: readonly CanvasNode[], nodeId: string): string {
  const node = nodes.find((entry) => entry.id === nodeId)
  if (node?.addonInstance) {
    return node.addonInstance.addonId
  }
  return blockName(nodes, nodeId)
}

function setBlockSlotLink(
  display: BlockWirelessNodeDisplay,
  slotId: string,
  link: BlockSlotWirelessLink,
): void {
  display.slots.set(slotId, link)
  display.linked = true
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

    const forced = connection.forced === true
    const routing = connection.routing ?? 'wireless'

    if (connection.fromBlockSlotId && connection.toBlockSlotId) {
      const fromDisplay = ensure(connection.fromNodeId)
      const toDisplay = ensure(connection.toNodeId)

      setBlockSlotLink(fromDisplay, connection.fromBlockSlotId, {
        connectionId: connection.id,
        routing,
        forced,
        peerNodeId: connection.toNodeId,
        peerTitle: nodeTitle(nodes, connection.toNodeId),
        peerBlockName: blockName(nodes, connection.toNodeId),
        peerSlotId: connection.toBlockSlotId,
        peerPulsePortKind: 'input',
      })

      setBlockSlotLink(toDisplay, connection.toBlockSlotId, {
        connectionId: connection.id,
        routing,
        forced,
        peerNodeId: connection.fromNodeId,
        peerTitle: nodeTitle(nodes, connection.fromNodeId),
        peerBlockName: blockName(nodes, connection.fromNodeId),
        peerSlotId: connection.fromBlockSlotId,
        peerPulsePortKind: 'output',
      })
      continue
    }

    if (!connectionInvolvesAddon(connection)) {
      continue
    }

    if (connection.fromBlockSlotId && connection.toAddonSlotId) {
      const fromDisplay = ensure(connection.fromNodeId)
      setBlockSlotLink(fromDisplay, connection.fromBlockSlotId, {
        connectionId: connection.id,
        routing,
        forced,
        peerNodeId: connection.toNodeId,
        peerTitle: peerTitle(nodes, connection.toNodeId),
        peerBlockName: peerBlockName(nodes, connection.toNodeId),
        peerSlotId: connection.toAddonSlotId,
        peerPulsePortKind: 'input',
      })
    }

    if (connection.fromAddonSlotId && connection.toBlockSlotId) {
      const toDisplay = ensure(connection.toNodeId)
      setBlockSlotLink(toDisplay, connection.toBlockSlotId, {
        connectionId: connection.id,
        routing,
        forced,
        peerNodeId: connection.fromNodeId,
        peerTitle: peerTitle(nodes, connection.fromNodeId),
        peerBlockName: peerBlockName(nodes, connection.fromNodeId),
        peerSlotId: connection.fromAddonSlotId,
        peerPulsePortKind: 'output',
      })
    }
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
