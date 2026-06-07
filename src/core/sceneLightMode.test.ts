import { describe, expect, it } from 'vitest'

import { emptyCanvasScene } from '@/core/canvasScene'
import { elementViewKeyForParameter, getElementViewState } from '@/core/elementViewState'
import { applyLightModeCompactToNode, applyLightModeToScene } from '@/core/sceneLightMode'
import { blockElementViewKeyForParameter, getBlockElementViewState } from '@/core/blockElementViewState'
import type { NodeInstance } from '@/core/nodeSchema'

function nodeWithMapParam(mode: 'list' | 'compact'): NodeInstance {
  const key = elementViewKeyForParameter('param-map')
  const base: NodeInstance = {
    id: 'n1',
    schema: {
      id: 'schema',
      title: 'Test',
      parameters: [
        {
          id: 'param-map',
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: '',
        },
      ],
      internalStructures: [],
    },
    values: [],
    elementView: { [key]: { mode, selectedIndex: 0 } },
  }
  return base
}

describe('sceneLightMode', () => {
  it('applyLightModeCompactToNode forces compact on structure keys', () => {
    const key = elementViewKeyForParameter('param-map')
    const compact = applyLightModeCompactToNode(nodeWithMapParam('list'))
    expect(getElementViewState(compact, key).mode).toBe('compact')
  })

  it('applyLightModeToScene updates all canvas nodes', () => {
    const key = elementViewKeyForParameter('param-map')
    const scene = {
      ...emptyCanvasScene,
      nodes: [
        {
          id: 'c1',
          x: 0,
          y: 0,
          node: nodeWithMapParam('list'),
        },
      ],
    }
    const next = applyLightModeToScene(scene)
    expect(getElementViewState(next.nodes[0]!.node, key).mode).toBe('compact')
  })

  it('leaves already compact nodes unchanged in mode', () => {
    const key = elementViewKeyForParameter('param-map')
    const node = nodeWithMapParam('compact')
    const next = applyLightModeCompactToNode(node)
    expect(getElementViewState(next, key).mode).toBe('compact')
  })

  it('does not throw when structure list is empty', () => {
    const node: NodeInstance = {
      id: 'n1',
      schema: { id: 's', title: 'T', parameters: [], internalStructures: [] },
      values: [],
    }
    expect(() => applyLightModeCompactToNode(node)).not.toThrow()
  })

  it('applyLightModeToScene with initBlockIndices sets block map entries to index 0', () => {
    const scene = {
      ...emptyCanvasScene,
      nodes: [
        {
          id: 'b1',
          position: { x: 0, y: 0 },
          node: { id: 'b1', schema: { id: 's', title: 'T', parameters: [] }, values: [] },
          blockViewActive: true,
          blockStructure: {
            blockType: 'Main',
            blockName: 'Main',
            parameters: [
              {
                idParameter: 'entries',
                nameParameter: 'entries',
                typeParameter: 'mapHashEmbed',
                defaultValue: '',
                sourcePath: { kind: 'parameter', parameterId: 'entries' },
              },
            ],
            identification_codes: [],
          },
          blockElementView: {
            [blockElementViewKeyForParameter('entries')]: { mode: 'list', selectedIndex: 2 },
          },
        },
      ],
    }
    const next = applyLightModeToScene(scene, { initBlockIndices: true })
    const key = blockElementViewKeyForParameter('entries')
    expect(getBlockElementViewState(next.nodes[0]!, key)).toEqual({ mode: 'compact', selectedIndex: 0 })
  })
})
