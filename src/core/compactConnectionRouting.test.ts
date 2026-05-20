import { describe, expect, it } from 'vitest'

import {
  applyCollapsedBodyWireless,
  applyCompactWireless,
  reapplyCompactElementWireless,
  reapplyRetractedElementWireless,
  restoreCollapsedBodyWireless,
  restoreCompactWireless,
  syncSceneCollapsedBodyWireless,
} from '@/core/compactConnectionRouting'
import type { CanvasScene } from '@/core/canvasScene'
import { embedSlotId } from '@/core/embedSlots'
import { elementViewKeyForEmbed } from '@/core/elementViewState'

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

function withBodyCollapsed(scene: CanvasScene, ...nodeIds: string[]): CanvasScene {
  const idSet = new Set(nodeIds)
  return {
    ...scene,
    nodes: scene.nodes.map((node) =>
      idSet.has(node.id) ? { ...node, bodyCollapsed: true } : { ...node, bodyCollapsed: false },
    ),
  }
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

describe('collapsed body wireless', () => {
  it('applyCollapsedBodyWireless sets wireless on outgoing link', () => {
    const next = applyCollapsedBodyWireless(baseScene, 'parent')
    expect(next.connections[0]?.routing).toBe('wireless')
    expect(next.compactRoutingBackups?.['link-1']).toBe('rigid')
  })

  it('applyCollapsedBodyWireless on child keeps backup when already wireless', () => {
    const collapsedParent = applyCollapsedBodyWireless(baseScene, 'parent')
    const collapsedChild = applyCollapsedBodyWireless(collapsedParent, 'child')
    expect(collapsedChild.connections[0]?.routing).toBe('wireless')
    expect(collapsedChild.compactRoutingBackups?.['link-1']).toBe('rigid')
  })

  it('restoreCollapsedBodyWireless keeps wireless when peer still collapsed', () => {
    const bothCollapsed = withBodyCollapsed(
      applyCollapsedBodyWireless(applyCollapsedBodyWireless(baseScene, 'parent'), 'child'),
      'parent',
      'child',
    )
    const expandedParent = restoreCollapsedBodyWireless(
      withBodyCollapsed(bothCollapsed, 'child'),
      'parent',
    )
    expect(expandedParent.connections[0]?.routing).toBe('wireless')
    expect(expandedParent.compactRoutingBackups?.['link-1']).toBe('rigid')
  })

  it('restoreCollapsedBodyWireless restores rigid when peer expanded', () => {
    const bothCollapsed = withBodyCollapsed(
      applyCollapsedBodyWireless(applyCollapsedBodyWireless(baseScene, 'parent'), 'child'),
      'parent',
      'child',
    )
    const expandedParent = restoreCollapsedBodyWireless(
      withBodyCollapsed(bothCollapsed, 'child'),
      'parent',
    )
    const expandedChild = restoreCollapsedBodyWireless(expandedParent, 'child')
    expect(expandedChild.connections[0]?.routing).toBe('rigid')
    expect(expandedChild.compactRoutingBackups?.['link-1']).toBeUndefined()
  })

  it('syncSceneCollapsedBodyWireless applies to collapsed nodes only', () => {
    const scene: CanvasScene = {
      ...baseScene,
      nodes: baseScene.nodes.map((node) =>
        node.id === 'parent' ? { ...node, bodyCollapsed: true } : node,
      ),
    }
    const synced = syncSceneCollapsedBodyWireless(scene)
    expect(synced.connections[0]?.routing).toBe('wireless')
  })

  it('reapplyCompactElementWireless after body expand keeps compact embed slots wireless', () => {
    const sceneWithEmbed: CanvasScene = {
      ...baseScene,
      nodes: [
        {
          id: 'parent',
          position: { x: 0, y: 0 },
          bodyCollapsed: true,
          node: {
            id: 'parent',
            schema: {
              id: 's',
              title: 'P',
              parameters: [],
              internalStructures: [],
              embed: [
                {
                  id: 'emb1',
                  title: 'Embed',
                  internalStructures: [{ id: 'slot-a', name: 'A', schemaId: 'c' }],
                  slots: [{ id: embedSlotId('emb1', 0), name: 'A', schemaId: 'c' }],
                },
              ],
            },
            values: [],
            elementView: {
              [elementViewKeyForEmbed('emb1')]: { mode: 'compact', selectedIndex: 0 },
            },
          },
        },
        baseScene.nodes[1]!,
      ],
      connections: [
        {
          id: 'link-1',
          fromNodeId: 'parent',
          fromInternalStructureId: embedSlotId('emb1', 0),
          toNodeId: 'child',
          routing: 'rigid',
        },
      ],
    }

    const collapsed = applyCollapsedBodyWireless(sceneWithEmbed, 'parent')
    const expandedBody: CanvasScene = {
      ...collapsed,
      nodes: collapsed.nodes.map((node) =>
        node.id === 'parent' ? { ...node, bodyCollapsed: false } : node,
      ),
    }
    const restored = restoreCollapsedBodyWireless(expandedBody, 'parent')
    expect(restored.connections[0]?.routing).toBe('rigid')

    const parentNode = restored.nodes.find((node) => node.id === 'parent')!
    const reapplied = reapplyCompactElementWireless(restored, parentNode)
    expect(reapplied.connections[0]?.routing).toBe('wireless')
  })

  it('reapplyRetractedElementWireless after load keeps retracted embed slots wireless', () => {
    const embedKey = elementViewKeyForEmbed('emb1')
    const slotId = embedSlotId('emb1', 0)
    const sceneWithEmbed: CanvasScene = {
      ...baseScene,
      nodes: [
        {
          id: 'parent',
          position: { x: 0, y: 0 },
          node: {
            id: 'parent',
            schema: {
              id: 's',
              title: 'P',
              parameters: [],
              internalStructures: [],
              embed: [
                {
                  id: 'emb1',
                  title: 'Embed',
                  internalStructures: [{ id: 'slot-a', name: 'A', schemaId: 'c' }],
                  slots: [{ id: slotId, name: 'A', schemaId: 'c' }],
                },
              ],
            },
            values: [],
            elementView: {
              [embedKey]: { mode: 'list', retracted: true },
            },
          },
        },
        baseScene.nodes[1]!,
      ],
      connections: [
        {
          id: 'link-1',
          fromNodeId: 'parent',
          fromInternalStructureId: slotId,
          toNodeId: 'child',
          routing: 'rigid',
        },
      ],
    }

    const parentNode = sceneWithEmbed.nodes.find((node) => node.id === 'parent')!
    const reapplied = reapplyRetractedElementWireless(sceneWithEmbed, parentNode)
    expect(reapplied.connections[0]?.routing).toBe('wireless')
    expect(reapplied.compactRoutingBackups?.['link-1']).toBe('rigid')
  })

  it('restoreCompactWireless after retract expand restores rigid when not compact', () => {
    const embedKey = elementViewKeyForEmbed('emb1')
    const slotId = embedSlotId('emb1', 0)
    const sceneWithEmbed: CanvasScene = {
      ...baseScene,
      nodes: [
        {
          id: 'parent',
          position: { x: 0, y: 0 },
          node: {
            id: 'parent',
            schema: {
              id: 's',
              title: 'P',
              parameters: [],
              internalStructures: [],
              embed: [
                {
                  id: 'emb1',
                  title: 'Embed',
                  internalStructures: [{ id: 'slot-a', name: 'A', schemaId: 'c' }],
                  slots: [{ id: slotId, name: 'A', schemaId: 'c' }],
                },
              ],
            },
            values: [],
            elementView: {
              [embedKey]: { mode: 'list', retracted: true },
            },
          },
        },
        baseScene.nodes[1]!,
      ],
      connections: [
        {
          id: 'link-1',
          fromNodeId: 'parent',
          fromInternalStructureId: slotId,
          toNodeId: 'child',
          routing: 'rigid',
        },
      ],
    }

    const parentNode = sceneWithEmbed.nodes.find((node) => node.id === 'parent')!
    const wireless = reapplyRetractedElementWireless(sceneWithEmbed, parentNode)
    const restored = restoreCompactWireless(wireless, 'parent', [slotId])
    expect(restored.connections[0]?.routing).toBe('rigid')
    expect(restored.compactRoutingBackups?.['link-1']).toBeUndefined()
  })
})
