import { describe, expect, it } from 'vitest'

import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { AddonManifest } from '@/services/addonLoader.service'

import {
  addonSlotId,
  classifyAddonSlotConnection,
  listAddonSlotEndpoints,
  parseAddonSlotId,
  resolveAddonInvolvedConnectionPath,
  resolveWiredAddonInputSlotNames,
} from './addonSlotConnections'
import { blockParameterSlotId } from './blockSchema'
import { makeVfxEmitterCanvasNode } from './blockTestFixtures'
import type { CanvasConnection } from './canvasScene'

function makeBlockNode(id: string, x: number, y: number): CanvasNode {
  return makeVfxEmitterCanvasNode({
    id,
    position: { x, y },
    blockViewActive: true,
    blockStructure: {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: 'Emitter01',
          nameParameter: 'color',
          typeParameter: 'vec4',
          defaultValue: '0.55,0.95,1,1',
        },
      ],
    },
  })
}

const manifest: AddonManifest = {
  id: 'x',
  name: 'X',
  category: 'U',
  drive: 'inputChange',
  get: true,
  set: true,
  data: [
    { name: 'a', type: 'string', direction: 'output' },
    { name: 'b', type: 'string', direction: 'input' },
  ],
}

describe('addonSlotConnections', () => {
  it('parseAddonSlotId', () => {
    expect(parseAddonSlotId('addon:a:output')).toEqual({ name: 'a', direction: 'output' })
  })

  it('lista endpoints do manifest', () => {
    const node: CanvasNode = {
      id: 'n1',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'x', outputValues: {} },
      node: createAddonPlaceholderInstance('n1'),
    }
    const endpoints = listAddonSlotEndpoints(node, manifest)
    expect(endpoints).toHaveLength(2)
    expect(endpoints[0]?.slotId).toBe(addonSlotId('a', 'output'))
  })

  it('classifica tipos compatíveis', () => {
    const from = {
      nodeId: 'a',
      slotId: addonSlotId('a', 'output'),
      slotName: 'a',
      direction: 'output' as const,
      type: 'string',
    }
    const to = {
      nodeId: 'b',
      slotId: addonSlotId('b', 'input'),
      slotName: 'b',
      direction: 'input' as const,
      type: 'string',
    }
    expect(classifyAddonSlotConnection(from, to).kind).toBe('compatible')
  })

  it('classifica tipos diferentes como forçado', () => {
    const from = {
      nodeId: 'a',
      slotId: addonSlotId('a', 'output'),
      slotName: 'a',
      direction: 'output' as const,
      type: 'string',
    }
    const to = {
      nodeId: 'b',
      slotId: addonSlotId('b', 'input'),
      slotName: 'b',
      direction: 'input' as const,
      type: 'number',
    }
    expect(classifyAddonSlotConnection(from, to).kind).toBe('forced')
  })

  it('resolveWiredAddonInputSlotNames lista slots de input com fio', () => {
    const manifestWithInput: AddonManifest = {
      ...manifest,
      data: [
        { name: 'text', type: 'string', direction: 'input' },
        { name: 'result', type: 'string', direction: 'output' },
      ],
    }
    const target: CanvasNode = {
      id: 'target',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'x', outputValues: {} },
      node: createAddonPlaceholderInstance('target'),
    }
    const source: CanvasNode = {
      id: 'source',
      position: { x: 0, y: 0 },
      addonViewActive: true,
      addonInstance: { addonId: 'x', outputValues: { result: 'hello' } },
      node: createAddonPlaceholderInstance('source'),
    }
    const scene: CanvasScene = {
      width: 100,
      height: 100,
      nodes: [source, target],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'source',
          fromInternalStructureId: '__addon__:out',
          toNodeId: 'target',
          fromAddonSlotId: addonSlotId('result', 'output'),
          toAddonSlotId: addonSlotId('text', 'input'),
        },
      ],
    }

    expect(resolveWiredAddonInputSlotNames(scene, target, manifestWithInput)).toEqual(new Set(['text']))
  })

  it('resolveAddonInvolvedConnectionPath respeita routing rigid bloco->add-on', () => {
    const blockNode = makeBlockNode('block', 80, 40)
    const addonNode: CanvasNode = {
      id: 'addon',
      position: { x: 420, y: 120 },
      addonViewActive: true,
      addonInstance: { addonId: 'x', outputValues: {} },
      node: createAddonPlaceholderInstance('addon'),
    }
    const connection: CanvasConnection = {
      id: 'mix:block->addon',
      fromNodeId: 'block',
      fromInternalStructureId: '__block__:out',
      toNodeId: 'addon',
      routing: 'rigid',
      fromBlockSlotId: blockParameterSlotId('Emitter01', 'output'),
      fromBlockParameterId: 'Emitter01',
      toAddonSlotId: addonSlotId('b', 'input'),
    }

    const path = resolveAddonInvolvedConnectionPath(
      connection,
      [blockNode, addonNode],
      () => manifest,
    )
    expect(path).not.toBeNull()
    expect(path?.routing).toBe('rigid')
    expect(path?.d).not.toContain('C ')
    expect(path?.d).toMatch(/L \d+(\.\d+)? \d+(\.\d+)?/)
  })
})
