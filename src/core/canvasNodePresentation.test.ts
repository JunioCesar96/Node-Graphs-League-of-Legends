import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  canvasNodeBodyStyle,
  canvasNodeCardStyle,
  canvasNodeInputPortStyle,
  getNodeDisplayTitle,
  filterRemovableNodeIds,
  filterSelectableNodeIds,
  isNodeLocked,
  isNodeRemovableFromScene,
  isNodeSelectableOnCanvas,
  isNodeVisibleOnCanvas,
  resolveCanvasNodeBodyCssColor,
} from '@/core/canvasNodePresentation'

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
