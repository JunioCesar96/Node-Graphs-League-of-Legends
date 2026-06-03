import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { emitNodeRitualViewCodeText } from '@/core/nodeCodeEditorBinding'
import { parseRitualVfxCatalog } from './ritualParseVfx'
import { computeEmitterFrameState } from './vfxWebAnimation'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'

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

const vfxSystemSchema: NodeSchemaDefinition = {
  id: 'test-vfx-system',
  title: 'VfxSystemDefinitionData',
  parameters: [
    { id: 'pname', name: 'particleName', type: 'string', defaultValue: 'Test' },
    { id: 'ppath', name: 'particlePath', type: 'string', defaultValue: 'Test/Path' },
  ],
  listPointer: [
    {
      id: 'complex',
      title: 'complexEmitterDefinitionData',
      internalStructures: [
        { id: 'em-struct', name: 'VfxEmitterDefinitionData', schemaId: 'test-emitter' },
      ],
      slots: [
        {
          id: 'complex__slot__0',
          name: 'VfxEmitterDefinitionData',
          schemaId: 'test-emitter',
        },
      ],
    },
  ],
  embed: [],
  pointer: [],
  listEmbed: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'VfxSystemDefinitionData' },
}

const emitterSchema: NodeSchemaDefinition = {
  id: 'test-emitter',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'ename', name: 'emitterName', type: 'string', defaultValue: 'prestige_up_star2' },
    { id: 'prim', name: 'primitive', type: 'string', defaultValue: 'VfxPrimitiveRay' },
    { id: 'blend', name: 'blendMode', type: 'u8', defaultValue: '4' },
  ],
  embed: [
    {
      id: 'embed_birthScale0',
      title: 'birthScale0',
      internalStructures: [
        { id: 'bs-struct', name: 'ValueVector3', schemaId: 'test-value-vector3' },
      ],
      slots: [
        { id: 'embed_birthScale0__slot__0', name: 'ValueVector3', schemaId: 'test-value-vector3' },
      ],
    },
  ],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'VfxEmitterDefinitionData' },
}

const registry: Record<string, NodeSchemaDefinition> = {
  'test-value-vector3': valueVector3Schema,
  'test-dynamics': dynamicsSchema,
  'test-vfx-system': vfxSystemSchema,
  'test-emitter': emitterSchema,
}

function buildPrestigeScene(): CanvasScene {
  return {
    width: 1200,
    height: 800,
    nodes: [
      {
        id: 'vfx',
        position: { x: 0, y: 0 },
        node: { schema: vfxSystemSchema, values: [] },
      },
      {
        id: 'em',
        position: { x: 200, y: 0 },
        node: { schema: emitterSchema, values: [] },
      },
      {
        id: 'vv3',
        position: { x: 400, y: 0 },
        node: {
          schema: valueVector3Schema,
          values: [
            { parameterId: 'ValueVector3_parameter_constantValue', value: '20, 80, 45' },
          ],
        },
      },
      {
        id: 'dyn',
        position: { x: 600, y: 0 },
        node: {
          schema: dynamicsSchema,
          values: [
            { parameterId: 'VfxAnimatedVector3fVariableData_parameter_times', value: '0' },
            {
              parameterId: 'VfxAnimatedVector3fVariableData_parameter_values',
              value: '20000, 80000, 45000',
            },
          ],
        },
      },
    ],
    connections: [
      {
        fromNodeId: 'vfx',
        fromInternalStructureId: 'complex__slot__0',
        toNodeId: 'em',
        toInternalStructureId: '',
        routing: 'wireless',
      },
      {
        fromNodeId: 'em',
        fromInternalStructureId: 'embed_birthScale0__slot__0',
        toNodeId: 'vv3',
        toInternalStructureId: '',
        routing: 'wireless',
      },
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

describe('previewVfxGraphExportScale — grafo desalinhado → Preview VFX', () => {
  it('export + parse + frame.scale razoável com vfxScale 0.01', () => {
    const emitted = emitNodeRitualViewCodeText(buildPrestigeScene(), registry, 'vfx')
    expect(emitted.ok).toBe(true)
    if (!emitted.ok) {
      return
    }

    expect(emitted.text).not.toContain('20000')
    const catalog = parseRitualVfxCatalog(emitted.text)
    const emitter = catalog.entries[0]?.system.emitters.find((e) => e.name === 'prestige_up_star2')
    expect(emitter).toBeDefined()
    expect(emitter!.birthScale0?.constant).toEqual([20, 80, 45])

    const composable = getComposablePipeline(emitter!)
    const transformPipeline = resolveTransformPipeline(emitter!, composable)
    const frame = computeEmitterFrameState(emitter!, 0.01, 0, 42, {
      particleTime: 0,
      composablePipeline: composable,
      transformPipeline,
    })

    expect(frame.scale[0]).toBeLessThan(10)
    expect(frame.scale[1]).toBeLessThan(10)
    expect(frame.scale[2]).toBeLessThan(10)
  })
})
