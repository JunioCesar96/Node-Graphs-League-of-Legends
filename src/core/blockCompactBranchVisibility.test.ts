import { describe, expect, it } from 'vitest'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { blockParameterSlotId } from '@/core/blockSchema'
import { blockElementViewKeyForParameter, blockElementViewKeyForSlot } from '@/core/blockElementViewState'
import { computeBlockCompactHiddenNodeIds, collectInactiveBlockIndexBranchNodeIds } from '@/core/blockCompactBranchVisibility'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { formatMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { listPointerSlotId } from '@/core/listPointerSlots'

function makeScene(): CanvasScene {
  const parent: CanvasNode = {
    id: 'parent',
    position: { x: 0, y: 0 },
    node: { id: 'parent', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
    blockViewActive: true,
    blockStructure: {
      blockType: 'ListHost',
      blockName: 'ListHost',
      parameters: [
        {
          idParameter: 'items',
          nameParameter: 'items',
          typeParameter: 'mapHashEmbed',
          defaultValue: 'a{} b{}',
          sourcePath: { kind: 'parameter', parameterId: 'items' },
        },
      ],
      identification_codes: [],
    },
    blockElementView: {
      [blockElementViewKeyForParameter('items')]: { mode: 'compact', selectedIndex: 0 },
    },
  }

  const peerA: CanvasNode = {
    id: 'peer-a',
    position: { x: 100, y: 0 },
    node: { id: 'peer-a', schema: { id: 'y', title: 'Y', parameters: [] }, values: [] },
    blockViewActive: true,
    blockStructure: {
      blockType: 'Child',
      blockName: 'ChildA',
      parameters: [],
      identification_codes: [],
    },
  }

  const peerB: CanvasNode = {
    id: 'peer-b',
    position: { x: 200, y: 0 },
    node: { id: 'peer-b', schema: { id: 'z', title: 'Z', parameters: [] }, values: [] },
    blockViewActive: true,
    blockStructure: {
      blockType: 'Child',
      blockName: 'ChildB',
      parameters: [],
      identification_codes: [],
    },
  }

  const outputSlot = blockParameterSlotId('items', 'output')

  return {
    width: 800,
    height: 600,
    nodes: [parent, peerA, peerB],
    connections: [
      {
        id: 'c0',
        fromNodeId: 'parent',
        fromInternalStructureId: '',
        fromBlockSlotId: outputSlot,
        toNodeId: 'peer-a',
        toBlockSlotId: 'block-header:in:0',
      },
      {
        id: 'c1',
        fromNodeId: 'parent',
        fromInternalStructureId: '',
        fromBlockSlotId: outputSlot,
        toNodeId: 'peer-b',
        toBlockSlotId: 'block-header:in:0',
      },
    ],
  }
}

describe('blockCompactBranchVisibility', () => {
  it('returns empty hidden set when light mode is off', () => {
    const hidden = computeBlockCompactHiddenNodeIds(makeScene())
    expect(hidden.size).toBe(0)
  })

  it('hides inactive fan-out peers when light mode is on', () => {
    const scene = makeScene()
    const parent = scene.nodes.find((node) => node.id === 'parent')!
    const outputSlot = blockParameterSlotId('items', 'output')
    scene.nodes = scene.nodes.map((node) =>
      node.id === 'parent'
        ? {
            ...parent,
            blockElementView: {
              ...(parent.blockElementView ?? {}),
              [blockElementViewKeyForSlot(outputSlot)]: { mode: 'compact', selectedIndex: 0 },
            },
          }
        : node,
    )

    const hidden = computeBlockCompactHiddenNodeIds(scene, { lightModeDefaultFirst: true })
    expect(hidden.has('peer-a')).toBe(false)
    expect(hidden.has('peer-b')).toBe(true)
  })

  it('list[pointer] indexado oculta emissores fora do índice activo no modo leve', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: { id: 'system', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'compact', selectedIndex: 0 },
      },
    }
    const emitterA: CanvasNode = {
      id: 'emitter-a',
      position: { x: 400, y: 0 },
      node: { id: 'emitter-a', schema: { id: 'y', title: 'Y', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterA',
        parameters: [],
        identification_codes: [],
      },
    }
    const emitterB: CanvasNode = {
      id: 'emitter-b',
      position: { x: 800, y: 0 },
      node: { id: 'emitter-b', schema: { id: 'z', title: 'Z', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [],
        identification_codes: [],
      },
    }

    const scene: CanvasScene = {
      width: 1200,
      height: 800,
      nodes: [parent, emitterA, emitterB],
      connections: [
        {
          id: 'c0',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 0)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 0),
          toNodeId: 'emitter-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c1',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 1)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 1),
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const hidden = computeBlockCompactHiddenNodeIds(scene, { lightModeDefaultFirst: true })
    expect(hidden.has('emitter-a')).toBe(false)
    expect(hidden.has('emitter-b')).toBe(true)
  })

  it('list[pointer] fora do índice oculta toda a ramificação ligada', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const lifetimeParamId = 'particleLifetime'
    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: { id: 'system', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'compact', selectedIndex: 0 },
      },
    }
    const emitterA: CanvasNode = {
      id: 'emitter-a',
      position: { x: 400, y: 0 },
      node: { id: 'emitter-a', schema: { id: 'y', title: 'Y', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterA',
        parameters: [
          {
            idParameter: lifetimeParamId,
            nameParameter: 'particleLifetime',
            typeParameter: 'ValueFloat',
            defaultValue: '',
            sourcePath: { kind: 'pointerChild', pointerId: 'p-lt', slotId: 'p-lt-slot' },
          },
        ],
        identification_codes: [],
      },
    }
    const emitterB: CanvasNode = {
      id: 'emitter-b',
      position: { x: 800, y: 0 },
      node: { id: 'emitter-b', schema: { id: 'z', title: 'Z', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [
          {
            idParameter: lifetimeParamId,
            nameParameter: 'particleLifetime',
            typeParameter: 'ValueFloat',
            defaultValue: '',
            sourcePath: { kind: 'pointerChild', pointerId: 'p-lt', slotId: 'p-lt-slot' },
          },
        ],
        identification_codes: [],
      },
    }
    const shapeA: CanvasNode = {
      id: 'shape-a',
      position: { x: 600, y: 100 },
      node: { id: 'shape-a', schema: { id: 's-a', title: 'VfxShapeBox', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxShapeBox',
        blockName: 'ShapeA',
        parameters: [],
        identification_codes: [],
      },
    }
    const shapeB: CanvasNode = {
      id: 'shape-b',
      position: { x: 1000, y: 100 },
      node: { id: 'shape-b', schema: { id: 's-b', title: 'VfxShapeSphere', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxShapeSphere',
        blockName: 'ShapeB',
        parameters: [],
        identification_codes: [],
      },
    }

    const lifetimeOutput = blockParameterSlotId(lifetimeParamId, 'output')

    const scene: CanvasScene = {
      width: 1600,
      height: 800,
      nodes: [parent, emitterA, emitterB, shapeA, shapeB],
      connections: [
        {
          id: 'c0',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 0)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 0),
          toNodeId: 'emitter-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c1',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 1)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 1),
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c-shape-a',
          fromNodeId: 'emitter-a',
          fromBlockSlotId: lifetimeOutput,
          toNodeId: 'shape-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c-shape-b',
          fromNodeId: 'emitter-b',
          fromBlockSlotId: lifetimeOutput,
          toNodeId: 'shape-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const hidden = computeBlockCompactHiddenNodeIds(scene, { lightModeDefaultFirst: true })
    expect(hidden.has('emitter-a')).toBe(false)
    expect(hidden.has('shape-a')).toBe(false)
    expect(hidden.has('emitter-b')).toBe(true)
    expect(hidden.has('shape-b')).toBe(true)
  })

  it('map[hash,embed] fora do índice oculta toda a ramificação do bloco', () => {
    const entriesParamId = 'entries'
    const entriesValue = formatMapHashEmbedString([
      { key: 'path/a', typeName: 'VfxSystemDefinitionData', schemaId: 'system' },
      { key: 'path/b', typeName: 'VfxSystemDefinitionData', schemaId: 'system' },
    ])
    const slotA = mapHashEmbedSlotId(entriesParamId, 'path/a')
    const slotB = mapHashEmbedSlotId(entriesParamId, 'path/b')

    const main: CanvasNode = {
      id: 'main',
      position: { x: 0, y: 0 },
      node: { id: 'main', schema: { id: 'main', title: 'Main', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'Main',
        blockName: 'Main',
        parameters: [
          {
            idParameter: entriesParamId,
            nameParameter: 'entries',
            typeParameter: 'mapHashEmbed',
            defaultValue: entriesValue,
            sourcePath: { kind: 'parameter', parameterId: entriesParamId },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForParameter(entriesParamId)]: { mode: 'compact', selectedIndex: 0 },
      },
    }

    const systemA: CanvasNode = {
      id: 'system-a',
      position: { x: 420, y: 0 },
      node: { id: 'system-a', schema: { id: 'sys', title: 'System', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'SystemA',
        parameters: [],
        identification_codes: [],
      },
    }
    const systemB: CanvasNode = {
      id: 'system-b',
      position: { x: 420, y: 36 },
      node: { id: 'system-b', schema: { id: 'sys', title: 'System', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'SystemB',
        parameters: [],
        identification_codes: [],
      },
    }
    const emitterB: CanvasNode = {
      id: 'emitter-b',
      position: { x: 840, y: 36 },
      node: { id: 'emitter-b', schema: { id: 'em', title: 'Emitter', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [],
        identification_codes: [],
      },
    }
    const shapeB: CanvasNode = {
      id: 'shape-b',
      position: { x: 1260, y: 36 },
      node: { id: 'shape-b', schema: { id: 'sh', title: 'VfxShapeBox', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxShapeBox',
        blockName: 'ShapeB',
        parameters: [],
        identification_codes: [],
      },
    }

    const scene: CanvasScene = {
      width: 1600,
      height: 800,
      nodes: [main, systemA, systemB, emitterB, shapeB],
      connections: [
        {
          id: 'main-a',
          fromNodeId: 'main',
          fromInternalStructureId: `__block__:${slotA}`,
          fromBlockSlotId: slotA,
          toNodeId: 'system-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'main-b',
          fromNodeId: 'main',
          fromInternalStructureId: `__block__:${slotB}`,
          fromBlockSlotId: slotB,
          toNodeId: 'system-b',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'system-b-emitter',
          fromNodeId: 'system-b',
          fromBlockSlotId: blockParameterSlotId('child', 'output'),
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'emitter-b-shape',
          fromNodeId: 'emitter-b',
          fromBlockSlotId: blockParameterSlotId('shape', 'output'),
          toNodeId: 'shape-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const hidden = computeBlockCompactHiddenNodeIds(scene, { lightModeDefaultFirst: true })
    expect(hidden.has('system-a')).toBe(false)
    expect(hidden.has('system-b')).toBe(true)
    expect(hidden.has('emitter-b')).toBe(true)
    expect(hidden.has('shape-b')).toBe(true)
  })

  it('list[pointer] com saída agregada oculta ramos no modo leve mesmo sem blockElementView compact', () => {
    const listParamId = 'complexEmitterDefinitionData_complexEmitterDefinitionData_pointe'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const emitters = Array.from({ length: 14 }, (_, index) => {
      const id = `emitter-${index}`
      return {
        id,
        position: { x: 420, y: index * 36 },
        node: { id, schema: { id: `y-${index}`, title: 'Y', parameters: [] }, values: [] },
        blockViewActive: true,
        blockStructure: {
          blockType: 'VfxEmitterDefinitionData',
          blockName: `Emitter${index}`,
          parameters: [],
          identification_codes: [],
        },
      } satisfies CanvasNode
    })

    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: { id: 'system', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'list', selectedIndex: 2 },
      },
    }

    const scene: CanvasScene = {
      width: 1600,
      height: 1200,
      nodes: [parent, ...emitters],
      connections: emitters.map((emitter, index) => ({
        id: `c-${index}`,
        fromNodeId: 'system',
        fromInternalStructureId: `__block__:${outputSlot}`,
        fromBlockSlotId: outputSlot,
        fromBlockParameterId: listParamId,
        toNodeId: emitter.id,
        toBlockSlotId: 'block-header:VfxEmitterDefinitionData:0:complexEmitterDefinitionData',
      })),
    }

    const hidden = computeBlockCompactHiddenNodeIds(scene, { lightModeDefaultFirst: true })
    expect(hidden.has('emitter-2')).toBe(false)
    for (let index = 0; index < 14; index += 1) {
      if (index === 2) {
        continue
      }
      expect(hidden.has(`emitter-${index}`)).toBe(true)
    }
  })

  it('collectInactiveBlockIndexBranchNodeIds inclui descendentes para ocultar manualmente', () => {
    const listParamId = 'complexEmitterDefinitionData_list_pointer'
    const outputSlot = blockParameterSlotId(listParamId, 'output')
    const lifetimeOutput = blockParameterSlotId('particleLifetime', 'output')

    const parent: CanvasNode = {
      id: 'system',
      position: { x: 0, y: 0 },
      node: { id: 'system', schema: { id: 'x', title: 'X', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxSystemDefinitionData',
        blockName: 'System',
        parameters: [
          {
            idParameter: listParamId,
            nameParameter: 'complexEmitterDefinitionData',
            typeParameter: 'VfxEmitterDefinitionData',
            defaultValue: '',
            listParameter: true,
            sourcePath: {
              kind: 'pointerChild',
              pointerId: 'catalog-ptr',
              slotId: 'catalog-ptr-slot',
            },
          },
        ],
        identification_codes: [],
      },
      blockElementView: {
        [blockElementViewKeyForSlot(outputSlot)]: { mode: 'list', selectedIndex: 0 },
      },
    }

    const emitterA: CanvasNode = {
      id: 'emitter-a',
      position: { x: 400, y: 0 },
      node: { id: 'emitter-a', schema: { id: 'y', title: 'Y', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterA',
        parameters: [
          {
            idParameter: 'particleLifetime',
            nameParameter: 'particleLifetime',
            typeParameter: 'ValueFloat',
            defaultValue: '',
            sourcePath: { kind: 'pointerChild', pointerId: 'p', slotId: 'p-slot' },
          },
        ],
        identification_codes: [],
      },
    }

    const emitterB: CanvasNode = {
      id: 'emitter-b',
      position: { x: 800, y: 0 },
      node: { id: 'emitter-b', schema: { id: 'z', title: 'Z', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'EmitterB',
        parameters: [
          {
            idParameter: 'particleLifetime',
            nameParameter: 'particleLifetime',
            typeParameter: 'ValueFloat',
            defaultValue: '',
            sourcePath: { kind: 'pointerChild', pointerId: 'p2', slotId: 'p2-slot' },
          },
        ],
        identification_codes: [],
      },
    }

    const shapeB: CanvasNode = {
      id: 'shape-b',
      position: { x: 1000, y: 100 },
      node: { id: 'shape-b', schema: { id: 's', title: 'S', parameters: [] }, values: [] },
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxShapeBox',
        blockName: 'ShapeB',
        parameters: [],
        identification_codes: [],
      },
    }

    const scene: CanvasScene = {
      width: 1600,
      height: 800,
      nodes: [parent, emitterA, emitterB, shapeB],
      connections: [
        {
          id: 'c0',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 0)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 0),
          toNodeId: 'emitter-a',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c1',
          fromNodeId: 'system',
          fromInternalStructureId: `__block__:${listPointerSlotId(listParamId, 1)}`,
          fromBlockSlotId: listPointerSlotId(listParamId, 1),
          toNodeId: 'emitter-b',
          toBlockSlotId: 'block-header:in:0',
        },
        {
          id: 'c-shape',
          fromNodeId: 'emitter-b',
          fromBlockSlotId: lifetimeOutput,
          toNodeId: 'shape-b',
          toBlockSlotId: 'block-header:in:0',
        },
      ],
    }

    const branchIds = collectInactiveBlockIndexBranchNodeIds(scene, parent, {
      ignoreCompactMode: true,
    })

    expect(branchIds.has('emitter-a')).toBe(false)
    expect(branchIds.has('emitter-b')).toBe(true)
    expect(branchIds.has('shape-b')).toBe(true)
  })
})
