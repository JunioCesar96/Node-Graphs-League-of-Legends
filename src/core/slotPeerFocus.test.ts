import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import { embedSlotId } from '@/core/embedSlots'
import {
  findConnectionFromOutputSlot,
  findIncomingConnections,
  focusPeerOutputSlotMenuId,
  outputSlotIdFromElementTarget,
  parseFocusPeerOutputSlotMenuId,
  peerInputFromConnection,
  peerOutputFromConnection,
} from '@/core/slotPeerFocus'

const scene: CanvasScene = {
  width: 800,
  height: 600,
  nodes: [
    {
      id: 'parent',
      position: { x: 0, y: 0 },
      node: {
        id: 'parent',
        schema: {
          id: 's',
          title: 'Parent',
          parameters: [],
          internalStructures: [{ id: 'slot-a', name: 'Slot A', schemaId: 'child-schema' }],
        },
        values: [],
      },
    },
    {
      id: 'child',
      position: { x: 300, y: 0 },
      node: {
        id: 'child',
        schema: { id: 'c', title: 'Child', parameters: [], internalStructures: [] },
        values: [],
      },
    },
  ],
  connections: [
    {
      id: 'link-1',
      fromNodeId: 'parent',
      fromInternalStructureId: 'slot-a',
      toNodeId: 'child',
      routing: 'rigid',
    },
  ],
}

describe('slotPeerFocus', () => {
  it('findConnectionFromOutputSlot resolves outgoing link', () => {
    expect(findConnectionFromOutputSlot(scene, 'parent', 'slot-a')?.id).toBe('link-1')
    expect(findConnectionFromOutputSlot(scene, 'parent', 'missing')).toBeUndefined()
  })

  it('findIncomingConnections lists links to node', () => {
    expect(findIncomingConnections(scene, 'child').map((c) => c.id)).toEqual(['link-1'])
    expect(findIncomingConnections(scene, 'parent')).toEqual([])
  })

  it('outputSlotIdFromElementTarget for structural slots', () => {
    const slotId = embedSlotId('emb1', 0)
    expect(
      outputSlotIdFromElementTarget({
        type: 'element',
        nodeId: 'parent',
        kind: 'embedSlot',
        elementId: slotId,
        embedId: 'emb1',
      }),
    ).toBe(slotId)
    expect(
      outputSlotIdFromElementTarget({
        type: 'element',
        nodeId: 'parent',
        kind: 'parameter',
        elementId: 'p1',
      }),
    ).toBeNull()
  })

  it('peer helpers map connection ends', () => {
    const connection = scene.connections[0]!
    expect(peerInputFromConnection(connection)).toEqual({ nodeId: 'child' })
    expect(peerOutputFromConnection(connection)).toEqual({
      nodeId: 'parent',
      structureId: 'slot-a',
    })
  })

  it('focusPeerOutputSlotMenuId round-trips via parse', () => {
    const id = focusPeerOutputSlotMenuId('link-1')
    expect(id).toBe('slot.focusPeerOutputSlot:link-1')
    expect(parseFocusPeerOutputSlotMenuId(id)).toBe('link-1')
    expect(parseFocusPeerOutputSlotMenuId('other')).toBeNull()
  })
})
