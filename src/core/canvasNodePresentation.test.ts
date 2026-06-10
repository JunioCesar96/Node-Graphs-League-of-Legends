import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  canvasNodeBodyStyle,
  canvasNodeCardStyle,
  canvasNodeInputPortStyle,
  createMapHashEmbedCanvasVisibility,
  getNodeDisplayTitle,
  filterRemovableNodeIds,
  filterSelectableNodeIds,
  isNodeBodyEffectivelyCollapsed,
  isNodeLocked,
  isNodeRemovableFromScene,
  isNodeSelectableOnCanvas,
  isNodeVisibleOnCanvas,
  resolveCanvasNodeBodyCssColor,
} from '@/core/canvasNodePresentation'
import type { CanvasScene } from '@/core/canvasScene'
import { formatMapHashEmbedString, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { elementViewKeyForParameter, patchElementViewMode } from '@/core/elementViewState'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'

function stubCanvasNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'n1',
    position: { x: 0, y: 0 },
    node: {
      id: 'n1',
      schema: {
        id: 'test.schema',
        title: 'Schema Title',
        parameters: [],
        embedBlocks: [],
        embedSlots: [],
        listEmbeds: [],
        listPointers: [],
        list2Embeds: [],
        list2Pointers: [],
      },
      values: [],
    },
    ...overrides,
  }
}

describe('canvasNodePresentation', () => {
  it('getNodeDisplayTitle usa displayLabel quando definido', () => {
    const node = stubCanvasNode({ displayLabel: '  Custom  ' })
    expect(getNodeDisplayTitle(node)).toBe('Custom')
  })

  it('getNodeDisplayTitle volta ao título do schema quando label vazio', () => {
    expect(getNodeDisplayTitle(stubCanvasNode({ displayLabel: '   ' }))).toBe('Schema Title')
    expect(getNodeDisplayTitle(stubCanvasNode())).toBe('Schema Title')
  })

  it('isNodeRemovableFromScene e filterRemovableNodeIds', () => {
    const locked = stubCanvasNode({ id: 'locked', locked: true })
    const free = stubCanvasNode({ id: 'free' })

    expect(isNodeRemovableFromScene(locked)).toBe(false)
    expect(isNodeRemovableFromScene(free)).toBe(true)
    expect(filterRemovableNodeIds({ nodes: [locked, free] }, ['locked', 'free'])).toEqual(['free'])
  })

  it('isNodeVisibleOnCanvas e isNodeLocked', () => {
    expect(isNodeVisibleOnCanvas(stubCanvasNode())).toBe(true)
    expect(isNodeVisibleOnCanvas(stubCanvasNode({ sceneHidden: true }))).toBe(false)
    expect(isNodeLocked(stubCanvasNode())).toBe(false)
    expect(isNodeLocked(stubCanvasNode({ locked: true }))).toBe(true)
  })

  it('isNodeVisibleOnCanvas oculta label quando o bloco pai está oculto', () => {
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [
        stubCanvasNode({
          id: 'parent',
          blockViewActive: true,
          sceneHidden: true,
        }),
        stubCanvasNode({
          id: 'label',
          labelViewActive: true,
          labelStructure: {
            labelName: 'Teste',
            color: '#f5d000',
            parentBlockNodeId: 'parent',
            parameters: [],
          },
        }),
      ],
      connections: [],
    }

    const label = scene.nodes[1]!
    expect(isNodeVisibleOnCanvas(label, undefined, scene)).toBe(false)
    expect(
      isNodeVisibleOnCanvas({ ...label, branchForceVisible: true }, undefined, scene),
    ).toBe(false)
  })

  it('isNodeVisibleOnCanvas respeita ramos mapHashEmbed compactos', () => {
    const paramId = 'param-entries'
    const key = elementViewKeyForParameter(paramId)
    const mainNode = {
      id: 'main',
      schema: {
        id: 'main',
        title: 'Main',
        parameters: [{ id: paramId, name: 'entries', type: 'mapHashEmbed' as const, defaultValue: '' }],
        internalStructures: [],
      },
      values: [
        {
          parameterId: paramId,
          value: formatMapHashEmbedString([
            { key: '0xaaa', typeName: 'A', schemaId: 'a' },
            { key: '0xbbb', typeName: 'B', schemaId: 'b' },
          ]),
        },
      ],
    }
    const mapValue = mainNode.values[0]!.value
    const entries = parseMapHashEmbedString(mapValue)
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [
        stubCanvasNode({
          id: 'main',
          node: patchElementViewMode(mainNode, key, 'compact', 0),
        }),
        stubCanvasNode({ id: 'visible-child' }),
        stubCanvasNode({ id: 'hidden-child' }),
      ],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'main',
          fromInternalStructureId: mapHashEmbedSlotId(paramId, entries[0]!.key),
          toNodeId: 'visible-child',
        },
        {
          id: 'c2',
          fromNodeId: 'main',
          fromInternalStructureId: mapHashEmbedSlotId(paramId, entries[1]!.key),
          toNodeId: 'hidden-child',
        },
      ],
    }
    const visibility = createMapHashEmbedCanvasVisibility(scene)
    expect(isNodeVisibleOnCanvas(scene.nodes[1]!, visibility)).toBe(true)
    expect(isNodeVisibleOnCanvas(scene.nodes[2]!, visibility)).toBe(false)
    expect(
      isNodeVisibleOnCanvas({ ...scene.nodes[2]!, branchForceVisible: true }, visibility),
    ).toBe(true)
  })

  it('isNodeBodyEffectivelyCollapsed em modo lista mapHashEmbed', () => {
    const paramId = 'param-entries'
    const key = elementViewKeyForParameter(paramId)
    const mapValue = formatMapHashEmbedString([{ key: '0xaaa', typeName: 'A', schemaId: 'a' }])
    const entryKey = parseMapHashEmbedString(mapValue)[0]!.key
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [
        stubCanvasNode({
          id: 'main',
          node: {
            id: 'main',
            schema: {
              id: 'main',
              title: 'Main',
              parameters: [{ id: paramId, name: 'entries', type: 'mapHashEmbed', defaultValue: '' }],
              internalStructures: [],
            },
            values: [
              {
                parameterId: paramId,
                value: mapValue,
              },
            ],
            elementView: { [key]: { mode: 'list' } },
          },
        }),
        stubCanvasNode({ id: 'child' }),
      ],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'main',
          fromInternalStructureId: mapHashEmbedSlotId(paramId, entryKey),
          toNodeId: 'child',
        },
      ],
    }
    const visibility = createMapHashEmbedCanvasVisibility(scene)
    expect(isNodeBodyEffectivelyCollapsed(scene.nodes[1]!, visibility)).toBe(true)
    expect(
      isNodeBodyEffectivelyCollapsed({ ...scene.nodes[1]!, bodyCollapsed: false }, visibility),
    ).toBe(false)
  })

  it('isNodeSelectableOnCanvas e filterSelectableNodeIds excluem ocultos', () => {
    const hidden = stubCanvasNode({ id: 'hidden', sceneHidden: true })
    const visible = stubCanvasNode({ id: 'visible' })

    expect(isNodeSelectableOnCanvas(hidden)).toBe(false)
    expect(isNodeSelectableOnCanvas(visible)).toBe(true)
    expect(filterSelectableNodeIds({ nodes: [hidden, visible] }, ['hidden', 'visible'])).toEqual(['visible'])
  })

  it('resolveCanvasNodeBodyCssColor converte formato persistido r,g,b,a', () => {
    expect(
      resolveCanvasNodeBodyCssColor(
        stubCanvasNode({ bodyColor: '1, 0, 0, 1', bodyColorEnabled: true }),
      ),
    ).toBe('rgba(255, 0, 0, 1)')
  })

  it('canvasNodeBodyStyle e port só com cor activada', () => {
    expect(canvasNodeBodyStyle(stubCanvasNode())).toBeUndefined()
    expect(
      canvasNodeBodyStyle(
        stubCanvasNode({ bodyColor: '1, 0, 0, 1', bodyColorEnabled: false }),
      ),
    ).toBeUndefined()
    const enabled = stubCanvasNode({ bodyColor: '1, 0, 0, 1', bodyColorEnabled: true })
    expect(canvasNodeBodyStyle(enabled)).toEqual({
      background: 'rgba(255, 0, 0, 1)',
      '--node-body-fill': 'rgba(255, 0, 0, 1)',
    })
    expect(canvasNodeInputPortStyle(enabled)?.background).toBe('rgba(255, 0, 0, 1)')
    expect(canvasNodeCardStyle(enabled)?.['--node-body-fill']).toBe('rgba(255, 0, 0, 1)')
  })
})
