import { describe, expect, it } from 'vitest'

import { emptyCanvasScene } from '@/core/canvasScene'
import {
  outputSlotPeerKey,
  peerVisibilityOverlayPatch,
  peerVisibilityState,
  resolveOutputSlotPeer,
} from '@/core/outputSlotPeerState'
import type { NodeInstance } from '@/core/nodeSchema'

function minimalInstance(id: string, title: string): NodeInstance {
  return {
    id,
    schema: { id: title.toLowerCase(), title, parameters: [], internalStructures: [] },
    values: [],
  }
}

describe('outputSlotPeerState', () => {
  const scene = {
    ...emptyCanvasScene,
    nodes: [
      { id: 'from', node: minimalInstance('from', 'From'), position: { x: 0, y: 0 } },
      { id: 'peer', node: minimalInstance('peer', 'Peer'), position: { x: 200, y: 0 } },
    ],
    connections: [
      {
        id: 'c1',
        fromNodeId: 'from',
        fromInternalStructureId: 'slot-a',
        toNodeId: 'peer',
      },
    ],
  }

  it('resolveOutputSlotPeer returns null without connection', () => {
    expect(resolveOutputSlotPeer(scene, 'from', 'missing')).toBeNull()
  })

  it('resolveOutputSlotPeer returns peer node', () => {
    const resolved = resolveOutputSlotPeer(scene, 'from', 'slot-a')
    expect(resolved?.peerNodeId).toBe('peer')
    expect(resolved?.connection.id).toBe('c1')
  })

  it('peerVisibilityState reflects sceneHidden', () => {
    const peer = { ...scene.nodes[1]!, sceneHidden: true as const }
    const state = peerVisibilityState(peer)
    expect(state.hidden).toBe(true)
    expect(state.locked).toBe(false)
  })

  it('peerVisibilityOverlayPatch shows node when currently hidden', () => {
    expect(peerVisibilityOverlayPatch(true, false)).toEqual({ sceneHidden: undefined })
    expect(peerVisibilityOverlayPatch(true, true)).toEqual({
      sceneHidden: undefined,
      branchForceVisible: true,
    })
  })

  it('peerVisibilityOverlayPatch hides node when currently visible', () => {
    expect(peerVisibilityOverlayPatch(false, false)).toEqual({
      sceneHidden: true,
      branchForceVisible: undefined,
    })
  })

  it('outputSlotPeerKey combines node and slot ids', () => {
    expect(outputSlotPeerKey('n1', 'slot-a')).toBe('n1:slot-a')
  })
})
