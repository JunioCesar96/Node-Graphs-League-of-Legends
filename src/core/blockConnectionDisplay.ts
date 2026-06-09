import type { WirelessPortLink } from './connectionDisplay'
import type { CanvasConnection, CanvasNode, ConnectionRouting } from './canvasScene'
import { connectionInvolvesAddon } from './addonSlotConnections'
import { blockParameterSlotId, isBlockListCollectionParameter } from './blockSchema'
import {
  findConnectionsForBlockOutputSlot,
  isBlockSlotConnection,
  resolveBlockOutputSlotConnectionIndex,
} from './blockSlotConnections'

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

      if (connection.fromBlockParameterId) {
        const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
        const param = fromNode?.blockStructure?.parameters.find(
          (entry) => entry.idParameter === connection.fromBlockParameterId,
        )
        if (param && isBlockListCollectionParameter(param)) {
          const canonicalOutputSlotId = blockParameterSlotId(param.idParameter, 'output')
          if (canonicalOutputSlotId !== connection.fromBlockSlotId) {
            setBlockSlotLink(fromDisplay, canonicalOutputSlotId, {
              connectionId: connection.id,
              routing,
              forced,
              peerNodeId: connection.toNodeId,
              peerTitle: nodeTitle(nodes, connection.toNodeId),
              peerBlockName: blockName(nodes, connection.toNodeId),
              peerSlotId: connection.toBlockSlotId,
              peerPulsePortKind: 'input',
            })
          }
        }
      }

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

/** Substitui a ligação activa em saídas com fan-out pela selecção do índice. */
export function applyBlockOutputSlotConnectionSelection(
  displayByNode: Map<string, BlockWirelessNodeDisplay>,
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
  indexBySlotKey: ReadonlyMap<string, number>,
): Map<string, BlockWirelessNodeDisplay> {
  const next = new Map<string, BlockWirelessNodeDisplay>()

  for (const [nodeId, display] of displayByNode) {
    const patchedSlots = new Map(display.slots)
    let changed = false

    for (const [slotId, link] of display.slots) {
      const outputConnections = findConnectionsForBlockOutputSlot(
        { connections, nodes },
        nodeId,
        slotId,
      )
      if (outputConnections.length <= 1) {
        continue
      }

      const index = resolveBlockOutputSlotConnectionIndex(
        indexBySlotKey,
        nodeId,
        slotId,
        outputConnections.length,
      )
      const selected = outputConnections[index]
      if (!selected || selected.id === link.connectionId) {
        continue
      }

      patchedSlots.set(slotId, {
        connectionId: selected.id,
        routing: selected.routing ?? 'wireless',
        forced: selected.forced === true,
        peerNodeId: selected.toNodeId,
        peerTitle: nodeTitle(nodes, selected.toNodeId),
        peerBlockName: blockName(nodes, selected.toNodeId),
        peerSlotId: selected.toBlockSlotId ?? link.peerSlotId,
        peerPulsePortKind: 'input',
      })
      changed = true
    }

    next.set(nodeId, changed ? { ...display, slots: patchedSlots } : display)
  }

  return next
}

export function blockWirelessSlotsToOutputLinks(
  slots: ReadonlyMap<string, BlockSlotWirelessLink> | undefined,
): ReadonlyMap<string, WirelessPortLink> {
  const outputs = new Map<string, WirelessPortLink>()
  if (!slots) {
    return outputs
  }
  for (const [slotId, link] of slots) {
    outputs.set(slotId, {
      connectionId: link.connectionId,
      routing: link.routing,
      peerNodeId: link.peerNodeId,
      peerTitle: link.peerTitle,
      peerPulsePortKind: link.peerPulsePortKind,
      peerPulseOutputSlotId: link.peerSlotId,
    })
  }
  return outputs
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
