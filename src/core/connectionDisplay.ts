import type { WirelessPortLinkProps } from '@/components/atoms/Port'

import type { CanvasConnection, CanvasNode, ConnectionRouting } from '@/core/canvasScene'
import type { ElementViewKey } from '@/core/nodeSchema'

export type WirelessPortLink = {
  connectionId: string
  routing: ConnectionRouting
  peerNodeId: string
  peerTitle: string
  /** Porta do par que deve piscar quando este slot recebe hover. */
  peerPulsePortKind: 'input' | 'output'
  peerPulseOutputSlotId?: string
}

export type PortPulseVariant = 'wireless' | 'focus'

export type WirelessPortPulseTarget = {
  connectionId: string
  nodeId: string
  portKind: 'input' | 'output'
  outputSlotId?: string
  /** Elemento retraído no card cujo slot de saída deve piscar (em vez do Port oculto). */
  retractedElementViewKey?: ElementViewKey
  /** Amarelo no foco entre portos; azul no hover wireless (defeito). */
  pulseVariant?: PortPulseVariant
}

export type WirelessPeerHoverPayload = {
  peerNodeId: string
  pulseOnPeer: {
    connectionId: string
    portKind: 'input' | 'output'
    outputSlotId?: string
  }
}

export type WirelessNodeDisplay = {
  input?: WirelessPortLink
  outputs: Map<string, WirelessPortLink>
  linked: boolean
}

function nodeTitle(nodes: readonly CanvasNode[], nodeId: string): string {
  return nodes.find((node) => node.id === nodeId)?.node.schema.title ?? nodeId
}

function emptyWirelessNodeDisplay(): WirelessNodeDisplay {
  return { outputs: new Map(), linked: false }
}

export function buildWirelessDisplayByNode(
  connections: readonly CanvasConnection[],
  nodes: readonly CanvasNode[],
): Map<string, WirelessNodeDisplay> {
  const byNode = new Map<string, WirelessNodeDisplay>()

  const ensure = (nodeId: string): WirelessNodeDisplay => {
    const existing = byNode.get(nodeId)
    if (existing) {
      return existing
    }
    const created = emptyWirelessNodeDisplay()
    byNode.set(nodeId, created)
    return created
  }

  for (const connection of connections) {
    const fromDisplay = ensure(connection.fromNodeId)
    const toDisplay = ensure(connection.toNodeId)
    const link: WirelessPortLink = {
      connectionId: connection.id,
      routing: connection.routing ?? 'flex',
      peerTitle: '',
    }

    fromDisplay.outputs.set(connection.fromInternalStructureId, {
      ...link,
      peerNodeId: connection.toNodeId,
      peerTitle: nodeTitle(nodes, connection.toNodeId),
      peerPulsePortKind: 'input',
    })
    fromDisplay.linked = true

    toDisplay.input = {
      ...link,
      peerNodeId: connection.fromNodeId,
      peerTitle: nodeTitle(nodes, connection.fromNodeId),
      peerPulsePortKind: 'output',
      peerPulseOutputSlotId: connection.fromInternalStructureId,
    }
    toDisplay.linked = true
  }

  return byNode
}

export type WirelessPortHandlers = {
  onCycleRouting?: (connectionId: string) => void
  onRemoveConnection?: (connectionId: string) => void
  onWirelessPeerHoverStart?: (payload: WirelessPeerHoverPayload) => void
  onWirelessPeerHoverEnd?: () => void
}

export function isPortPulsing(
  pulse: WirelessPortPulseTarget | null | undefined,
  nodeId: string,
  portKind: 'input' | 'output',
  outputSlotId?: string,
): boolean {
  if (!pulse || pulse.nodeId !== nodeId || pulse.portKind !== portKind) {
    return false
  }

  if (pulse.retractedElementViewKey) {
    return false
  }

  if (portKind === 'output') {
    return pulse.outputSlotId === outputSlotId
  }

  return true
}

export function portPulseVariantForTarget(
  pulse: WirelessPortPulseTarget | null | undefined,
  nodeId: string,
  portKind: 'input' | 'output',
  outputSlotId?: string,
): PortPulseVariant | undefined {
  return isPortPulsing(pulse, nodeId, portKind, outputSlotId) ? (pulse?.pulseVariant ?? 'wireless') : undefined
}

export function isWirelessPortPulsing(
  pulse: WirelessPortPulseTarget | null | undefined,
  connectionId: string,
  portKind: 'input' | 'output',
  outputSlotId?: string,
): boolean {
  if (!pulse || pulse.connectionId !== connectionId) {
    return false
  }

  if (pulse.retractedElementViewKey) {
    return false
  }

  if (pulse.portKind !== portKind) {
    return false
  }

  if (portKind === 'output') {
    return pulse.outputSlotId === outputSlotId
  }

  return true
}

export function isRetractedElementPulsing(
  pulse: WirelessPortPulseTarget | null | undefined,
  elementViewKey: ElementViewKey,
): boolean {
  return Boolean(pulse?.retractedElementViewKey && pulse.retractedElementViewKey === elementViewKey)
}

export function retractedElementPulseVariant(
  pulse: WirelessPortPulseTarget | null | undefined,
  elementViewKey: ElementViewKey,
): PortPulseVariant | undefined {
  return isRetractedElementPulsing(pulse, elementViewKey) ? (pulse?.pulseVariant ?? 'wireless') : undefined
}

export function toWirelessPortLinkProps(
  link: WirelessPortLink | undefined,
  handlers?: WirelessPortHandlers,
  wirelessPeerPulse = false,
): WirelessPortLinkProps | undefined {
  if (!link) {
    return undefined
  }

  return {
    connectionId: link.connectionId,
    routing: link.routing,
    peerNodeId: link.peerNodeId,
    peerTitle: link.peerTitle,
    peerPulsePortKind: link.peerPulsePortKind,
    peerPulseOutputSlotId: link.peerPulseOutputSlotId,
    wirelessPeerPulse,
    onCycleRouting: handlers?.onCycleRouting,
    onRemoveConnection: handlers?.onRemoveConnection,
    onWirelessPeerHoverStart: handlers?.onWirelessPeerHoverStart,
    onWirelessPeerHoverEnd: handlers?.onWirelessPeerHoverEnd,
  }
}
