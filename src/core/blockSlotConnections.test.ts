import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode } from './canvasScene'
import {
  canConnectBlockSlots,
  classifyBlockSlotConnection,
  createBlockDraftConnectionPath,
  findBlockSlotAtPoint,
  listBlockSlotEndpoints,
  resolveBlockConnectionPath,
  resolveBlockSlotCanvasPoint,
  withoutConnectionsToBlockInputSlot,
} from './blockSlotConnections'
import { blockHeaderSlotId, blockParameterSlotId } from './blockSchema'
import { makeVfxEmitterCanvasNode } from './blockTestFixtures'

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
          slotRules: { outputs: ['vec4', 'vec4list'], inputs: ['multiplyVec4'] },
          iconHint: null,
          sourcePath: { kind: 'parameter', parameterId: 'p-color' },
        },
      ],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
      },
    },
  })
}

describe('blockSlotConnections', () => {
  it('lists header and parameter slot endpoints', () => {
    const node = makeBlockNode('a', 0, 0)
    const endpoints = listBlockSlotEndpoints(node)
    expect(endpoints.some((entry) => entry.kind === 'header' && entry.direction === 'output')).toBe(true)
    expect(endpoints.some((entry) => entry.slotId === blockParameterSlotId('Emitter01', 'output'))).toBe(true)
    expect(endpoints.some((entry) => entry.slotId === blockParameterSlotId('Emitter01', 'input'))).toBe(true)
  })

  it('allows header OUT to header IN quando os tipos são equivalentes', () => {
    const from = {
      nodeId: 'system',
      slotId: 'header-out',
      direction: 'output' as const,
      types: ['VfxSystemDefinitionDataPreview'],
      kind: 'header' as const,
    }
    const to = {
      nodeId: 'emitter',
      slotId: 'header-in',
      direction: 'input' as const,
      types: ['VfxSystemDefinitionData'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'VfxSystemDefinitionData',
      blockName: 'System',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[VfxSystemDefinitionData]', 'out[VfxSystemDefinitionDataPreview]'],
        parentBlockField: 'VfxSystemDefinitionData',
      },
    }
    const toStructure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[VfxSystemDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
        parentBlockField: 'VfxSystemDefinitionData',
      },
    }
    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(true)
  })

  it('rejects header OUT of VfxEmitterDefinitionData to ValueVector3 header IN', () => {
    const from = {
      nodeId: 'emitter',
      slotId: 'header-out',
      direction: 'output' as const,
      types: ['VfxEmitterDefinitionDataPreview'],
      kind: 'header' as const,
    }
    const to = {
      nodeId: 'value-vector3',
      slotId: 'header-in',
      direction: 'input' as const,
      types: ['birthVelocity', 'birthDrag', 'birthScale0'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
        parentBlockField: 'complexEmitterDefinitionData',
      },
    }
    const toStructure = {
      blockType: 'ValueVector3',
      blockName: 'ValueVector3',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[birthVelocity,birthDrag,birthScale0]', 'out[ValueVector3Preview]'],
        parentBlockField: 'birthVelocity',
      },
    }

    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(false)
  })

  it('allows parameter OUT (embed) to child header IN', () => {
    const from = {
      nodeId: 'emitter',
      slotId: blockParameterSlotId('worldAcceleration', 'output'),
      direction: 'output' as const,
      types: ['IntegratedValueVector3'],
      kind: 'parameter' as const,
      parameterId: 'worldAcceleration',
    }
    const to = {
      nodeId: 'integrated',
      slotId: blockHeaderSlotId('IntegratedValueVector3', 0),
      direction: 'input' as const,
      types: ['worldAcceleration'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: 'worldAcceleration',
          nameParameter: 'worldAcceleration',
          typeParameter: 'IntegratedValueVector3',
          defaultValue: '',
          slotRules: { outputs: ['IntegratedValueVector3'] },
          iconHint: null,
          sourcePath: { kind: 'embedChild', embedId: 'e1', slotId: 's1', childParameterId: 'c1' },
        },
      ],
      identification_codes: [],
    }
    const toStructure = {
      blockType: 'IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[worldAcceleration]', 'out[IntegratedValueVector3Preview]'],
        parentBlockField: 'worldAcceleration',
      },
    }
    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(true)
  })

  it('permite duas ligações IN distintas num ValueFloat com in[campos combinados]', () => {
    const rateSlot = blockHeaderSlotId('ValueFloat', 0, 'rate')
    const lifetimeSlot = blockHeaderSlotId('ValueFloat', 0, 'particleLifetime')
    const first: CanvasConnection = {
      id: 'block:rate',
      fromNodeId: 'emitter',
      fromInternalStructureId: '__block__:rate:out',
      toNodeId: 'value-float',
      routing: 'wireless',
      fromBlockSlotId: blockParameterSlotId('rate', 'output'),
      toBlockSlotId: rateSlot,
    }
    const second: CanvasConnection = {
      id: 'block:lifetime',
      fromNodeId: 'emitter',
      fromInternalStructureId: '__block__:lifetime:out',
      toNodeId: 'value-float',
      routing: 'wireless',
      fromBlockSlotId: blockParameterSlotId('particleLifetime', 'output'),
      toBlockSlotId: lifetimeSlot,
    }

    const afterRate = withoutConnectionsToBlockInputSlot([first], 'value-float', rateSlot)
    expect(afterRate).toEqual([])
    const afterLifetime = withoutConnectionsToBlockInputSlot([first, second], 'value-float', lifetimeSlot)
    expect(afterLifetime).toEqual([first])
  })

  it('allows parameter OUT to header IN when slot has multiple accepted parent fields', () => {
    const from = {
      nodeId: 'emitter',
      slotId: blockParameterSlotId('birthDrag', 'output'),
      direction: 'output' as const,
      types: ['ValueVector3'],
      kind: 'parameter' as const,
      parameterId: 'birthDrag',
    }
    const to = {
      nodeId: 'valueVector3',
      slotId: blockHeaderSlotId('ValueVector3', 0, 'birthDrag'),
      direction: 'input' as const,
      types: ['birthDrag'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: 'birthDrag',
          nameParameter: 'birthDrag',
          typeParameter: 'ValueVector3',
          defaultValue: '',
          slotRules: { outputs: ['ValueVector3'] },
          iconHint: null,
          sourcePath: { kind: 'embedChild', embedId: 'e1', slotId: 's1', childParameterId: 'c1' },
        },
      ],
      identification_codes: [],
    }
    const toStructure = {
      blockType: 'ValueVector3',
      blockName: 'ValueVector3',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[birthVelocity,birthDrag,EmitterPosition]', 'out[ValueVector3Preview]'],
        parentBlockField: 'birthVelocity',
      },
    }
    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(true)
  })

  it('classifica ligação forçada quando IN aceita o campo mas OUT não corresponde ao tipo do filho', () => {
    const from = {
      nodeId: 'integrated',
      slotId: blockParameterSlotId('dynamics', 'output'),
      direction: 'output' as const,
      types: ['VfxAnimatedVector3fVariableData'],
      kind: 'parameter' as const,
      parameterId: 'dynamics',
    }
    const to = {
      nodeId: 'color-child',
      slotId: blockHeaderSlotId('VfxAnimatedColorVariableData', 0),
      direction: 'input' as const,
      types: ['dynamics'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'IntegratedValueVector3',
      blockName: 'IntegratedValueVector3',
      parameters: [
        {
          idParameter: 'dynamics',
          nameParameter: 'dynamics',
          typeParameter: 'VfxAnimatedVector3fVariableData',
          defaultValue: '',
          slotRules: { outputs: ['VfxAnimatedVector3fVariableData'] },
          iconHint: null,
          sourcePath: { kind: 'pointerChild', pointerId: 'p1', slotId: 's1' },
        },
      ],
      identification_codes: [],
    }
    const toStructure = {
      blockType: 'VfxAnimatedColorVariableData',
      blockName: 'VfxAnimatedColorVariableData',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[dynamics]', 'out[VfxAnimatedColorVariableDataPreview]'],
        parentBlockField: 'dynamics',
      },
    }

    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(false)
    expect(classifyBlockSlotConnection(from, to, fromStructure, toStructure)).toEqual({ kind: 'forced' })
  })

  it('rejects scalar parameter OUT to unrelated header IN', () => {
    const from = {
      nodeId: 'system',
      slotId: blockParameterSlotId('particlePath', 'output'),
      direction: 'output' as const,
      types: ['string'],
      kind: 'parameter' as const,
      parameterId: 'particlePath',
    }
    const to = {
      nodeId: 'emitter',
      slotId: blockHeaderSlotId('VfxEmitterDefinitionData', 0),
      direction: 'input' as const,
      types: ['complexEmitterDefinitionData'],
      kind: 'header' as const,
    }
    const fromStructure = {
      blockType: 'VfxSystemDefinitionData',
      blockName: 'System',
      parameters: [
        {
          idParameter: 'particlePath',
          nameParameter: 'particlePath',
          typeParameter: 'string',
          defaultValue: '',
          slotRules: { inputs: ['string'], outputs: ['string'] },
          iconHint: null,
          sourcePath: { kind: 'parameter', parameterId: 'particlePath' },
        },
      ],
      identification_codes: [],
    }
    const toStructure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [],
      identification_codes: [],
      appearance: {
        color: '#40ff56',
        headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
        parentBlockField: 'complexEmitterDefinitionData',
      },
    }
    expect(canConnectBlockSlots(from, to, fromStructure, toStructure)).toBe(false)
  })

  it('allows vec4 output to multiplyVec4 input across nodes', () => {
    const from = {
      nodeId: 'a',
      slotId: 'out',
      direction: 'output' as const,
      types: ['vec4'],
      kind: 'parameter' as const,
    }
    const to = {
      nodeId: 'b',
      slotId: 'in',
      direction: 'input' as const,
      types: ['multiplyVec4'],
      kind: 'parameter' as const,
    }
    expect(canConnectBlockSlots(from, to)).toBe(true)
  })

  it('resolves canvas coordinates for block slots', () => {
    const node = makeBlockNode('a', 100, 50)
    const outputSlot = blockParameterSlotId('Emitter01', 'output')
    const point = resolveBlockSlotCanvasPoint(node, outputSlot, 'output')
    expect(point).not.toBeNull()
    expect(point!.x).toBeGreaterThan(node.position.x)
    expect(point!.y).toBeGreaterThan(node.position.y)
  })

  it('finds nearest input slot at canvas point', () => {
    const node = makeBlockNode('a', 100, 50)
    const inputSlot = blockParameterSlotId('Emitter01', 'input')
    const target = resolveBlockSlotCanvasPoint(node, inputSlot, 'input')
    expect(target).not.toBeNull()

    const hit = findBlockSlotAtPoint([node], target!)
    expect(hit?.nodeId).toBe('a')
    expect(hit?.slotId).toBe(inputSlot)
    expect(hit?.direction).toBe('input')
  })

  it('builds SVG path between block slots', () => {
    const fromNode = makeBlockNode('a', 80, 40)
    const toNode = makeBlockNode('b', 420, 120)
    const connection: CanvasConnection = {
      id: 'block:a->b',
      fromNodeId: 'a',
      fromInternalStructureId: '__block__:out',
      toNodeId: 'b',
      routing: 'wireless',
      fromBlockSlotId: blockParameterSlotId('Emitter01', 'output'),
      toBlockSlotId: blockParameterSlotId('Emitter01', 'input'),
      fromBlockParameterId: 'Emitter01',
      toBlockParameterId: 'Emitter01',
    }

    const path = resolveBlockConnectionPath(connection, [fromNode, toNode])
    expect(path).not.toBeNull()
    expect(path!.d.startsWith('M ')).toBe(true)
  })

  it('creates draft path for in-progress block link', () => {
    const d = createBlockDraftConnectionPath(10, 20, 200, 80)
    expect(d).toContain('M 10 20')
    expect(d).toContain('200 80')
  })

  it('matches header slot ids for VfxEmitterDefinitionData', () => {
    const node = makeBlockNode('a', 0, 0)
    const endpoints = listBlockSlotEndpoints(node)
    const headerOut = endpoints.find((entry) => entry.kind === 'header' && entry.direction === 'output')
    expect(headerOut).toBeDefined()
    const point = resolveBlockSlotCanvasPoint(node, headerOut!.slotId, 'output')
    expect(point).not.toBeNull()
    expect(point!.x).toBeGreaterThan(0)
    expect(point!.y).toBeGreaterThan(0)
  })

  it('resolve header slots from appearance with in[ ] and out[ ]', () => {
    const node = makeVfxEmitterCanvasNode({
      id: 'catalog-system',
      position: { x: 200, y: 100 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxSystemDefinitionDataPreview]'],
        },
      },
    })

    const endpoints = listBlockSlotEndpoints(node)
    const headerOut = endpoints.find((entry) => entry.kind === 'header' && entry.direction === 'output')
    expect(headerOut).toBeDefined()

    const point = resolveBlockSlotCanvasPoint(node, headerOut!.slotId, 'output')
    expect(point).not.toBeNull()
    expect(point!.x).toBeCloseTo(200 + 360 - 10, 0)
    expect(point!.y).toBeGreaterThan(100)
  })

  it('normaliza headerSlots legados preservando entradas in[] separadas', () => {
    const node = makeVfxEmitterCanvasNode({
      id: 'catalog-legacy-multi-in',
      position: { x: 200, y: 100 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'ValueVector3',
        blockName: 'ValueVector3',
        parameters: [],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: [
            'in[birthVelocity]',
            'out[ValueVector3Preview]',
            'in[birthDrag]',
            'in[birthScale0]',
          ],
        },
      },
    })

    const endpoints = listBlockSlotEndpoints(node).filter((entry) => entry.kind === 'header')
    const inputHeaders = endpoints.filter((entry) => entry.direction === 'input')
    const outputHeaders = endpoints.filter((entry) => entry.direction === 'output')

    expect(inputHeaders).toHaveLength(3)
    expect(outputHeaders).toHaveLength(1)
    expect(inputHeaders.map((entry) => entry.types)).toEqual([
      ['birthVelocity'],
      ['birthDrag'],
      ['birthScale0'],
    ])
  })

  it('considera múltiplos tipos num único descriptor de headerSlot IN/OUT', () => {
    const node = makeVfxEmitterCanvasNode({
      id: 'catalog-multi-header',
      position: { x: 200, y: 100 },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [],
        identification_codes: [],
        appearance: {
          color: '#40ff56',
          headerSlots: [
            'in[branchA,branchB]',
            'out[VfxSystemDefinitionDataPreview,VfxSystemDefinitionDataPreviewAlt]',
          ],
        },
      },
    })

    const endpoints = listBlockSlotEndpoints(node)
    const headerIns = endpoints.filter((entry) => entry.kind === 'header' && entry.direction === 'input')
    const headerOuts = endpoints.filter((entry) => entry.kind === 'header' && entry.direction === 'output')

    expect(headerIns).toHaveLength(1)
    expect(headerIns[0]?.types).toEqual(['branchA', 'branchB'])
    expect(headerOuts).toHaveLength(1)
    expect(headerOuts[0]?.types).toEqual([
      'VfxSystemDefinitionDataPreview',
      'VfxSystemDefinitionDataPreviewAlt',
    ])

    const inPoint = resolveBlockSlotCanvasPoint(
      node,
      blockHeaderSlotId('VfxSystemDefinitionData', 0),
      'input',
    )
    const outPoint = resolveBlockSlotCanvasPoint(
      node,
      blockHeaderSlotId('VfxSystemDefinitionData', 1),
      'output',
    )
    expect(inPoint).not.toBeNull()
    expect(outPoint).not.toBeNull()
  })

  it('withoutConnectionsToBlockInputSlot removes prior links to the same input', () => {
    const inputSlot = blockHeaderSlotId('VfxEmitterDefinitionData', 0)
    const first: CanvasConnection = {
      id: 'block:sys:out->emitter:in',
      fromNodeId: 'sys',
      fromInternalStructureId: '__block__:out0',
      toNodeId: 'emitter',
      routing: 'wireless',
      fromBlockSlotId: blockHeaderSlotId('VfxSystemDefinitionData', 1),
      toBlockSlotId: inputSlot,
    }
    const second: CanvasConnection = {
      id: 'block:sys2:out->emitter:in',
      fromNodeId: 'sys2',
      fromInternalStructureId: '__block__:out0',
      toNodeId: 'emitter',
      routing: 'wireless',
      fromBlockSlotId: blockHeaderSlotId('VfxSystemDefinitionData', 1),
      toBlockSlotId: inputSlot,
    }
    const otherTarget: CanvasConnection = {
      id: 'block:sys:out->emitter:param',
      fromNodeId: 'sys',
      fromInternalStructureId: '__block__:out1',
      toNodeId: 'emitter',
      routing: 'wireless',
      fromBlockSlotId: blockParameterSlotId('p1', 'output'),
      toBlockSlotId: blockParameterSlotId('p2', 'input'),
      toBlockParameterId: 'p2',
    }

    const filtered = withoutConnectionsToBlockInputSlot([first, second, otherTarget], 'emitter', inputSlot)
    expect(filtered).toEqual([otherTarget])
  })
})
