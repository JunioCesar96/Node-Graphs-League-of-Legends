import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { CanvasContextTarget } from '@/core/canvasContextMenuTypes'
import type { WirelessPortPulseTarget } from '@/core/connectionDisplay'
import { elementViewKeyForOutputSlot, isElementRetracted } from '@/core/elementViewState'
import { isStructuralSlotContextKind } from '@/core/sceneNodeLinkVisibility'

export const FOCUS_PEER_OUTPUT_SLOT_PREFIX = 'slot.focusPeerOutputSlot:'

export function focusPeerOutputSlotMenuId(connectionId: string): string {
  return `${FOCUS_PEER_OUTPUT_SLOT_PREFIX}${connectionId}`
}

export function parseFocusPeerOutputSlotMenuId(id: string): string | null {
  if (!id.startsWith(FOCUS_PEER_OUTPUT_SLOT_PREFIX)) {
    return null
  }

  const connectionId = id.slice(FOCUS_PEER_OUTPUT_SLOT_PREFIX.length)
  return connectionId.length > 0 ? connectionId : null
}

export function findConnectionFromOutputSlot(
  scene: Pick<CanvasScene, 'connections'>,
  fromNodeId: string,
  slotId: string,
): CanvasConnection | undefined {
  return scene.connections.find(
    (connection) =>
      connection.fromNodeId === fromNodeId && connection.fromInternalStructureId === slotId,
  )
}

export function findIncomingConnections(
  scene: Pick<CanvasScene, 'connections'>,
  toNodeId: string,
): CanvasConnection[] {
  return scene.connections.filter((connection) => connection.toNodeId === toNodeId)
}

export function outputSlotIdFromElementTarget(
  target: Extract<CanvasContextTarget, { type: 'element' }>,
): string | null {
  if (!isStructuralSlotContextKind(target.kind)) {
    return null
  }

  return target.elementId
}

export function peerInputFromConnection(connection: CanvasConnection): { nodeId: string } {
  return { nodeId: connection.toNodeId }
}

export function peerOutputFromConnection(connection: CanvasConnection): {
  nodeId: string
  structureId: string
} {
  return {
    nodeId: connection.fromNodeId,
    structureId: connection.fromInternalStructureId,
  }
}

export function buildPortFocusPulseTarget(
  connection: CanvasConnection,
  portKind: 'input' | 'output',
  nodes: readonly CanvasNode[],
): WirelessPortPulseTarget {
  const nodeId = portKind === 'input' ? connection.toNodeId : connection.fromNodeId
  const outputSlotId = portKind === 'output' ? connection.fromInternalStructureId : undefined
  let retractedElementViewKey: WirelessPortPulseTarget['retractedElementViewKey']

  if (portKind === 'output' && outputSlotId) {
    const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
    if (fromNode) {
      const elementKey = elementViewKeyForOutputSlot(fromNode.node, outputSlotId)
      if (elementKey && isElementRetracted(fromNode.node, elementKey)) {
        retractedElementViewKey = elementKey
      }
    }
  }

  return {
    connectionId: connection.id,
    nodeId,
    portKind,
    outputSlotId,
    retractedElementViewKey,
    pulseVariant: 'focus',
  }
}
