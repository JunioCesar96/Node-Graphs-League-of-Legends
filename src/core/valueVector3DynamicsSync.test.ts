import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  isSingleKeyframeDynamicsAtZero,
  syncAllValueVector3ConstantsToDynamicsInScene,
  syncValueVector3ConstantToDynamicsChild,
} from '@/core/valueVector3DynamicsSync'
import { emitNodeRitualViewCodeText } from '@/core/nodeCodeEditorBinding'

const valueVector3Schema: NodeSchemaDefinition = {
  id: 'test-value-vector3',
  title: 'ValueVector3',
  parameters: [
    {
      id: 'ValueVector3_parameter_constantValue',
      name: 'constantValue',
      type: 'vector3',
      defaultValue: '0, 0, 0',
    },
  ],
  pointer: [
    {
      id: 'ValueVector3_pointer_dynamics',
      title: 'dynamics',
      internalStructures: [
        {
          id: 'dyn-struct',
          name: 'VfxAnimatedVector3fVariableData',
          schemaId: 'test-dynamics',
        },
      ],
      slots: [
        {
          id: 'ValueVector3_pointer_dynamics__slot__0',
          name: 'VfxAnimatedVector3fVariableData',
          schemaId: 'test-dynamics',
        },
      ],
    },
  ],
  embed: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'ValueVector3' },
}

const dynamicsSchema: NodeSchemaDefinition = {
  id: 'test-dynamics',
  title: 'VfxAnimatedVector3fVariableData',
  parameters: [
    {
      id: 'VfxAnimatedVector3fVariableData_parameter_times',
      name: 'times',
      type: 'listF32',
      defaultValue: '0',
    },
    {
      id: 'VfxAnimatedVector3fVariableData_parameter_values',
      name: 'values',
      type: 'listVector3',
      defaultValue: '20000, 80000, 45000',
    },
  ],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'VfxAnimatedVector3fVariableData' },
}

const registry: Record<string, NodeSchemaDefinition> = {
  'test-value-vector3': valueVector3Schema,
  'test-dynamics': dynamicsSchema,
}

function buildScene(constantValue: string, dynamicsValues: string): CanvasScene {
  return {
    width: 1200,
    height: 800,
    nodes: [
      {
        id: 'vv3',
        position: { x: 0, y: 0 },
        node: {
          schema: valueVector3Schema,
          values: [
            {
              parameterId: 'ValueVector3_parameter_constantValue',
              value: constantValue,
            },
          ],
        },
      },
      {
        id: 'dyn',
        position: { x: 200, y: 0 },
        node: {
          schema: dynamicsSchema,
          values: [
            { parameterId: 'VfxAnimatedVector3fVariableData_parameter_times', value: '0' },
            { parameterId: 'VfxAnimatedVector3fVariableData_parameter_values', value: dynamicsValues },
          ],
        },
      },
    ],
    connections: [
      {
        fromNodeId: 'vv3',
        fromInternalStructureId: 'ValueVector3_pointer_dynamics__slot__0',
        toNodeId: 'dyn',
        toInternalStructureId: '',
        routing: 'wireless',
      },
    ],
  }
}

describe('valueVector3DynamicsSync', () => {
  it('isSingleKeyframeDynamicsAtZero', () => {
    expect(isSingleKeyframeDynamicsAtZero('0')).toBe(true)
    expect(isSingleKeyframeDynamicsAtZero('0\n1')).toBe(false)
  })

  it('syncAllValueVector3ConstantsToDynamicsInScene percorre todos os ValueVector3', () => {
    const scene = buildScene('20, 80, 45', '20000, 80000, 45000')
    const synced = syncAllValueVector3ConstantsToDynamicsInScene(scene)
    const dyn = synced.nodes.find((entry) => entry.id === 'dyn')!
    const values = dyn.node.values.find(
      (entry) => entry.parameterId === 'VfxAnimatedVector3fVariableData_parameter_values',
    )?.value
    expect(values).toBe('20, 80, 45')
  })

  it('sincroniza values do dynamics com constantValue', () => {
    const scene = buildScene('20, 80, 45', '20000, 80000, 45000')
    const synced = syncValueVector3ConstantToDynamicsChild(scene, 'vv3', '20, 80, 45')
    const dyn = synced.nodes.find((entry) => entry.id === 'dyn')!
    const values = dyn.node.values.find(
      (entry) => entry.parameterId === 'VfxAnimatedVector3fVariableData_parameter_values',
    )?.value
    expect(values).toBe('20, 80, 45')
  })

  it('export Preview não contém escala inflada no dynamics (sync automático no emit)', () => {
    const scene = buildScene('20, 80, 45', '20000, 80000, 45000')
    const emitted = emitNodeRitualViewCodeText(scene, registry, 'vv3')
    expect(emitted.ok).toBe(true)
    if (!emitted.ok) {
      return
    }
    expect(emitted.text).toContain('constantValue: vec3 = { 20, 80, 45 }')
    expect(emitted.text).toContain('{ 20, 80, 45 }')
    expect(emitted.text).not.toContain('20000')
    expect(emitted.text).not.toContain('80000')
    expect(emitted.text).not.toContain('45000')
  })
})
