import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  isNodeVisibleOnCanvas,
  type CompactElementCanvasVisibility,
  type NodeVisibilitySceneContext,
} from '@/core/canvasNodePresentation'
import { findConnectionFromOutputSlot } from '@/core/slotPeerFocus'

export type OutputSlotPeerResolved = {
  connection: CanvasConnection
  peerCanvasNode: CanvasNode
  peerNodeId: string
}

export function resolveOutputSlotPeer(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  fromNodeId: string,
  slotId: string,
): OutputSlotPeerResolved | null {
  const connection = findConnectionFromOutputSlot(scene, fromNodeId, slotId)

  if (!connection) {
    return null
  }

  const peerCanvasNode = scene.nodes.find((node) => node.id === connection.toNodeId)

  if (!peerCanvasNode) {
    return null
  }

  return {
    connection,
    peerCanvasNode,
    peerNodeId: peerCanvasNode.id,
  }
}

export type PeerVisibilityState = {
  hidden: boolean
  policyHidden: boolean
  locked: boolean
}

export function peerVisibilityState(
  peerNode: CanvasNode,
  compactVisibility?: CompactElementCanvasVisibility,
  sceneContext?: NodeVisibilitySceneContext,
): PeerVisibilityState {
  const visibleOnCanvas = isNodeVisibleOnCanvas(peerNode, compactVisibility, sceneContext)
  const hidden = !visibleOnCanvas
  const policyHidden =
    compactVisibility?.hiddenNodeIds?.has(peerNode.id) === true && peerNode.sceneHidden !== true

  return {
    hidden,
    policyHidden,
    locked: peerNode.locked === true,
  }
}

/** Patch para `patchNodeSceneOverlay` ao alternar visibilidade do nó ligado (igual ao painel Nodes em cena). */
export function peerVisibilityOverlayPatch(
  currentlyHidden: boolean,
  policyHidden: boolean,
): Partial<Pick<CanvasNode, 'sceneHidden' | 'branchForceVisible'>> {
  if (currentlyHidden) {
    return {
      sceneHidden: undefined,
      ...(policyHidden ? { branchForceVisible: true } : {}),
    }
  }

  return { sceneHidden: true, branchForceVisible: undefined }
}

export function outputSlotPeerKey(fromNodeId: string, slotId: string): string {
  return `${fromNodeId}:${slotId}`
}
