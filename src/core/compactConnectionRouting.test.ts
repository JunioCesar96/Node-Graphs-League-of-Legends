import { describe, expect, it } from 'vitest'

import { applyCompactWireless, restoreCompactWireless } from '@/core/compactConnectionRouting'
import type { CanvasScene } from '@/core/canvasScene'

const baseScene: CanvasScene = {
  width: 800,
  height: 600,
  nodes: [
    {
      id: 'parent',
      position: { x: 0, y: 0 },
      node: {
        id: 'parent',
        schema: { id: 's', title: 'P', parameters: [], internalStructures: [] },
        values: [],
      },
    },
    {
      id: 'child',
      position: { x: 200, y: 0 },
      node: {
        id: 'child',
        schema: { id: 'c', title: 'C', parameters: [], internalStructures: [] },
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

describe('compactConnectionRouting', () => {
  it('applyCompactWireless sets wireless and backs up routing', () => {
    const next = applyCompactWireless(baseScene, 'parent', ['slot-a'])
    expect(next.connections[0]?.routing).toBe('wireless')
    expect(next.compactRoutingBackups?.['link-1']).toBe('rigid')
  })

  it('restoreCompactWireless restores prior routing', () => {
    const compact = applyCompactWireless(baseScene, 'parent', ['slot-a'])
    const restored = restoreCompactWireless(compact, 'parent', ['slot-a'])
    expect(restored.connections[0]?.routing).toBe('rigid')
    expect(restored.compactRoutingBackups?.['link-1']).toBeUndefined()
  })
})
