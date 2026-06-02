import { describe, expect, it } from 'vitest'

import {
  buildAutoExposedDraft,
  buildBlockAutoBuildPlan,
  buildBlockAutoBuildPlanFromRitualCode,
  buildBlockAutoBuildPlanFromViewCode,
  collectMainSubtreeNodes,
  enrichAutoBuildPlanWithCatalogParameters,
} from './blockAutoBuild'
import {
  buildBlockCatalogFromNodeRitualCode,
} from './blockAutoBuildFromRitualCode'
import { mergeSchemaRegistryWithSceneNodes } from './blockDefinitionSchemaResolve'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import type { NodeSchemaDefinition } from './nodeSchema'
import type { CanvasNode, CanvasScene } from './canvasScene'
import { MAIN_SCHEMA_ID } from './classGroupRitualStackParser'

function makeMainSubtreeScene(): CanvasScene {
  const mainNode: CanvasNode = {
    id: 'n-main',
    position: { x: 0, y: 0 },
    node: {
      id: 'n-main',
      schema: {
        id: MAIN_SCHEMA_ID,
        title: 'Main',
        parameters: [
          { id: 'main_parameter_type', name: 'type', type: 'string', defaultValue: 'PROP' },
          { id: 'main_parameter_version', name: 'version', type: 'u32', defaultValue: '3' },
        ],
        internalStructures: [],
        mapHashEmbed: [
          {
            id: 'Main_mapHashEmbed_entries',
            title: 'entries',
            parameterName: 'entries',
            internalStructures: [
              {
                id: 'Main_mapHashEmbed_entries__slot__key1',
                name: 'key1',
                schemaId: 'sample-type',
              },
            ],
          },
        ],
      },
      values: [],
    },
  }

  const childNode: CanvasNode = {
    id: 'n-child',
    position: { x: 120, y: 0 },
    node: {
      id: 'n-child',
      schema: {
        id: 'sample-type',
        title: 'SampleType',
        parameters: [
          { id: 'sample-type_parameter_name', name: 'name', type: 'string', defaultValue: 'hello' },
          { id: 'sample-type_parameter_count', name: 'count', type: 'u32', defaultValue: '7' },
        ],
        internalStructures: [],
      },
      values: [],
    },
  }

  return {
    width: 800,
    height: 600,
    nodes: [mainNode, childNode],
    connections: [
      {
        id: 'c-main-child',
        fromNodeId: 'n-main',
        fromInternalStructureId: 'Main_mapHashEmbed_entries__slot__key1',
        toNodeId: 'n-child',
      },
    ],
  }
}

function makeEmitterUnderMainScene(): { scene: CanvasScene; emitter: CanvasNode } {
  const mainNode: CanvasNode = {
    id: 'n-main',
    position: { x: 0, y: 0 },
    node: {
      id: 'n-main',
      schema: {
        id: MAIN_SCHEMA_ID,
        title: 'Main',
        parameters: [],
        internalStructures: [],
        listPointer: [
          {
            id: 'Main_listPointer_system',
            title: 'system',
            internalStructures: [
              {
                id: 'Main_listPointer_system__slot__0',
                name: 'VfxSystemDefinitionData',
                schemaId: 'vfx-system',
              },
            ],
          },
        ],
      },
      values: [],
    },
  }

  const systemNode: CanvasNode = {
    id: 'n-system',
    position: { x: 80, y: 0 },
    node: {
      id: 'n-system',
      schema: {
        id: 'vfx-system',
        title: 'VfxSystemDefinitionData',
        parameters: [],
        internalStructures: [],
        listPointer: [
          {
            id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData',
            title: 'complexEmitterDefinitionData',
            internalStructures: [
              {
                id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
                name: 'VfxEmitterDefinitionData',
                schemaId: 'vfx-emitter',
              },
            ],
          },
        ],
      },
      values: [],
    },
  }

  const emitter: CanvasNode = {
    id: 'n-emitter',
    position: { x: 160, y: 0 },
    node: {
      id: 'n-emitter',
      schema: {
        id: 'vfx-emitter',
        title: 'VfxEmitterDefinitionData',
        parameters: [
          { id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: 'sparks' },
          { id: 'p-vfx', name: 'VfxEmitterDefinitionData', type: 'string', defaultValue: '' },
        ],
        internalStructures: [],
      },
      values: [],
    },
  }

  const scene: CanvasScene = {
    width: 800,
    height: 600,
    nodes: [mainNode, systemNode, emitter],
    connections: [
      {
        id: 'c-main-system',
        fromNodeId: 'n-main',
        fromInternalStructureId: 'Main_listPointer_system__slot__0',
        toNodeId: 'n-system',
      },
      {
        id: 'c-system-emitter',
        fromNodeId: 'n-system',
        fromInternalStructureId: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
        toNodeId: 'n-emitter',
      },
    ],
  }

  return { scene, emitter }
}

describe('collectMainSubtreeNodes', () => {
  it('inclui Main e todos os descendentes', () => {
    const scene = makeMainSubtreeScene()
    const nodes = collectMainSubtreeNodes(scene)

    expect(nodes.map((node) => node.id)).toEqual(['n-main', 'n-child'])
  })

  it('retorna vazio quando a cena está vazia', () => {
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [],
      connections: [],
    }

    expect(collectMainSubtreeNodes(scene)).toEqual([])
  })

  it('usa o primeiro nó raiz quando não há Main', () => {
    const root: CanvasNode = {
      id: 'n-root',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-root',
        schema: {
          id: 'vfx-system',
          title: 'VfxSystemDefinitionData',
          parameters: [{ id: 'p-flags', name: 'flags', type: 'u32', defaultValue: '0' }],
          internalStructures: [],
          listPointer: [
            {
              id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData',
              title: 'complexEmitterDefinitionData',
              internalStructures: [
                {
                  id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
                  name: 'VfxEmitterDefinitionData',
                  schemaId: 'vfx-emitter',
                },
              ],
            },
          ],
        },
        values: [],
      },
    }

    const child: CanvasNode = {
      id: 'n-emitter',
      position: { x: 100, y: 0 },
      node: {
        id: 'n-emitter',
        schema: {
          id: 'vfx-emitter',
          title: 'VfxEmitterDefinitionData',
          parameters: [{ id: 'p-name', name: 'emitterName', type: 'string', defaultValue: '' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [root, child],
      connections: [
        {
          id: 'c-root-child',
          fromNodeId: 'n-root',
          fromInternalStructureId: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
          toNodeId: 'n-emitter',
        },
      ],
    }

    expect(collectMainSubtreeNodes(scene).map((node) => node.id)).toEqual(['n-root', 'n-emitter'])
  })
})

describe('buildAutoExposedDraft', () => {
  it('expõe todas as entries e sanitiza blockName com underscore', () => {
    const scene = makeMainSubtreeScene()
    const child = scene.nodes.find((node) => node.id === 'n-child')!
    const withLabel: CanvasNode = {
      ...child,
      displayLabel: 'bad_name',
    }

    const draft = buildAutoExposedDraft(scene, withLabel)

    expect(draft.entries.every((entry) => entry.exposed)).toBe(true)
    expect(draft.blockName).not.toContain('_')
  })
})

describe('buildBlockAutoBuildPlan', () => {
  it('gera parâmetros e blocos para Main→System→Emitter', () => {
    const { scene } = makeEmitterUnderMainScene()
    const plan = buildBlockAutoBuildPlan(scene)

    expect(plan.errors).not.toContain('NO_NODES')
    expect(plan.nodeResults.length).toBe(3)
    expect(plan.parameterDocuments.length).toBeGreaterThan(0)
    expect(plan.blockDocuments.length).toBeGreaterThan(0)

    const emitterBlock = plan.blockDocuments.find(
      (doc) => doc.blockName === 'VfxEmitterDefinitionData',
    )
    expect(emitterBlock).toMatchObject({
      type: 'pointer',
      block: 'complexEmitterDefinitionData',
      parameters: ['emitterName', 'VfxEmitterDefinitionData'],
    })
  })

  it('usa o mesmo pipeline que «Ver código» antes de gerar blocos', () => {
    const { scene, emitter } = makeEmitterUnderMainScene()
    const viewCode = buildBlockAutoBuildPlanFromViewCode(scene, undefined, {
      rootNodeId: emitter.id,
    })

    expect(viewCode.exportedText.trim().length).toBeGreaterThan(0)
    expect(viewCode.plan.blockDocuments.length).toBeGreaterThan(0)
    expect(viewCode.plan.parameterDocuments.length).toBeGreaterThan(0)
  })

  it('retorna NO_NODES quando a cena está vazia', () => {
    const plan = buildBlockAutoBuildPlan({
      width: 800,
      height: 600,
      nodes: [],
      connections: [],
    })

    expect(plan.errors).toContain('NO_NODES')
    expect(plan.parameterDocuments).toEqual([])
    expect(plan.blockDocuments).toEqual([])
  })

  it('gera plano a partir do primeiro nó raiz quando não há Main', () => {
    const root: CanvasNode = {
      id: 'n-root',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-root',
        schema: {
          id: 'vfx-system',
          title: 'VfxSystemDefinitionData',
          parameters: [{ id: 'p-flags', name: 'flags', type: 'u32', defaultValue: '0' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const plan = buildBlockAutoBuildPlan({
      width: 800,
      height: 600,
      nodes: [root],
      connections: [],
    })

    expect(plan.errors).not.toContain('NO_NODES')
    expect(plan.nodeResults).toHaveLength(1)
    expect(plan.nodeResults[0]?.nodeId).toBe('n-root')
    expect(plan.parameterDocuments.length).toBeGreaterThan(0)
    expect(plan.blockDocuments.length).toBe(1)
  })

  it('continua exportando blocos válidos quando um filho tem nome inválido', () => {
    const scene = makeMainSubtreeScene()
    const failingChild: CanvasNode = {
      id: 'n-fail',
      displayLabel: 'invalid_block_name',
      position: { x: 200, y: 0 },
      node: {
        id: 'n-fail',
        schema: {
          id: 'fail-type',
          title: 'FailType',
          parameters: [],
          embed: [],
          internalStructures: [],
        },
        values: [],
      },
    }

    scene.nodes = [...scene.nodes, failingChild]
    scene.connections = [
      ...scene.connections,
      {
        id: 'c-main-fail',
        fromNodeId: 'n-main',
        fromInternalStructureId: 'Main_mapHashEmbed_entries__slot__key1',
        toNodeId: 'n-fail',
      },
    ]

    const plan = buildBlockAutoBuildPlan(scene)

    expect(plan.nodeResults.length).toBe(3)
    expect(plan.parameterDocuments.length).toBeGreaterThan(0)
    expect(plan.blockDocuments.length).toBeGreaterThan(0)
    expect(plan.blockDocuments.some((doc) => doc.blockName === 'FailType')).toBe(false)
  })

  it('gera bloco struct-only vazio para VfxPrimitiveArbitraryQuad', () => {
    const quadNode: CanvasNode = {
      id: 'n-quad',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-quad',
        schema: {
          id: 'vfx-primitive-arbitrary-quad',
          title: 'VfxPrimitiveArbitraryQuad',
          parameters: [],
          embed: [],
          pointer: [],
          internalStructures: [],
        },
        values: [],
      },
    }

    const plan = buildBlockAutoBuildPlan({
      width: 800,
      height: 600,
      nodes: [quadNode],
      connections: [],
    })

    expect(plan.blockDocuments).toHaveLength(1)
    expect(plan.blockDocuments[0]).toMatchObject({
      blockName: 'VfxPrimitiveArbitraryQuad',
      parameters: [],
    })
  })

  it('gera bloco VfxPrimitiveMesh com embed mMesh', () => {
    const meshNode: CanvasNode = {
      id: 'n-mesh',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-mesh',
        schema: {
          id: 'vfx-primitive-mesh',
          title: 'VfxPrimitiveMesh',
          parameters: [],
          embed: [
            {
              id: 'VfxPrimitiveMesh_embed_mMesh',
              title: 'mMesh',
              internalStructures: [
                {
                  id: 'vfx-primitive-mesh-m-mesh',
                  name: 'VfxMeshDefinitionData',
                  schemaId: 'vfx-mesh-definition-data',
                },
              ],
              slots: [
                {
                  id: 'VfxPrimitiveMesh_embed_mMesh__slot__0',
                  name: 'VfxMeshDefinitionData',
                  schemaId: 'vfx-mesh-definition-data',
                },
              ],
            },
          ],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [meshNode],
      connections: [],
    }
    const registry = mergeSchemaRegistryWithSceneNodes({}, [meshNode])
    const slice = buildBlockCatalogFromNodeRitualCode(scene, registry, meshNode)

    expect(slice.errors).toEqual([])
    expect(slice.blockDocuments[0]?.parameters).toEqual(['mMesh'])
    expect(slice.parameterDocuments.some((doc) => doc.parameterName === 'mMesh')).toBe(true)
  })

  it('faz merge de parâmetros no plano para blocos com mesmo id', () => {
    const mainNode: CanvasNode = {
      id: 'n-main',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-main',
        schema: {
          id: MAIN_SCHEMA_ID,
          title: 'Main',
          parameters: [],
          internalStructures: [],
          mapHashEmbed: [
            {
              id: 'Main_mapHashEmbed_entries',
              title: 'entries',
              parameterName: 'entries',
              internalStructures: [
                {
                  id: 'Main_mapHashEmbed_entries__slot__a',
                  name: 'DupBlock',
                  schemaId: 'dup-a',
                },
                {
                  id: 'Main_mapHashEmbed_entries__slot__b',
                  name: 'DupBlock',
                  schemaId: 'dup-b',
                },
              ],
            },
          ],
        },
        values: [],
      },
    }

    const dupNodeA: CanvasNode = {
      id: 'n-dup-a',
      position: { x: 100, y: 0 },
      node: {
        id: 'n-dup-a',
        schema: {
          id: 'dup-a',
          title: 'DupBlock',
          parameters: [{ id: 'dup-a_param_onlyA', name: 'onlyA', type: 'f32', defaultValue: '1' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const dupNodeB: CanvasNode = {
      id: 'n-dup-b',
      position: { x: 200, y: 0 },
      node: {
        id: 'n-dup-b',
        schema: {
          id: 'dup-b',
          title: 'DupBlock',
          parameters: [{ id: 'dup-b_param_onlyB', name: 'onlyB', type: 'f32', defaultValue: '2' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [mainNode, dupNodeA, dupNodeB],
      connections: [
        {
          id: 'c-main-a',
          fromNodeId: 'n-main',
          fromInternalStructureId: 'Main_mapHashEmbed_entries__slot__a',
          toNodeId: 'n-dup-a',
        },
        {
          id: 'c-main-b',
          fromNodeId: 'n-main',
          fromInternalStructureId: 'Main_mapHashEmbed_entries__slot__b',
          toNodeId: 'n-dup-b',
        },
      ],
    }

    const plan = buildBlockAutoBuildPlan(scene)
    const dupBlocks = plan.blockDocuments.filter((doc) => doc.blockName === 'DupBlock')

    expect(dupBlocks).toHaveLength(1)
    expect(dupBlocks[0]?.parameters).toEqual(['onlyA', 'onlyB'])
  })

  it('faz merge de headerSlots no plano para blocos com mesmo id', () => {
    const mainNode: CanvasNode = {
      id: 'n-main',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-main',
        schema: {
          id: MAIN_SCHEMA_ID,
          title: 'Main',
          parameters: [],
          internalStructures: [],
          listPointer: [
            {
              id: 'Main_listPointer_branchA',
              title: 'branchA',
              internalStructures: [
                {
                  id: 'Main_listPointer_branchA__slot__0',
                  name: 'DupBlock',
                  schemaId: 'dup-a',
                },
              ],
            },
            {
              id: 'Main_listPointer_branchB',
              title: 'branchB',
              internalStructures: [
                {
                  id: 'Main_listPointer_branchB__slot__0',
                  name: 'DupBlock',
                  schemaId: 'dup-b',
                },
              ],
            },
          ],
        },
        values: [],
      },
    }

    const dupNodeA: CanvasNode = {
      id: 'n-dup-a',
      position: { x: 100, y: 0 },
      node: {
        id: 'n-dup-a',
        schema: {
          id: 'dup-a',
          title: 'DupBlock',
          parameters: [{ id: 'dup-a_param_onlyA', name: 'onlyA', type: 'f32', defaultValue: '1' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const dupNodeB: CanvasNode = {
      id: 'n-dup-b',
      position: { x: 200, y: 0 },
      node: {
        id: 'n-dup-b',
        schema: {
          id: 'dup-b',
          title: 'DupBlock',
          parameters: [{ id: 'dup-b_param_onlyB', name: 'onlyB', type: 'f32', defaultValue: '2' }],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [mainNode, dupNodeA, dupNodeB],
      connections: [
        {
          id: 'c-main-a',
          fromNodeId: 'n-main',
          fromInternalStructureId: 'Main_listPointer_branchA__slot__0',
          toNodeId: 'n-dup-a',
        },
        {
          id: 'c-main-b',
          fromNodeId: 'n-main',
          fromInternalStructureId: 'Main_listPointer_branchB__slot__0',
          toNodeId: 'n-dup-b',
        },
      ],
    }

    const plan = buildBlockAutoBuildPlan(scene)
    const dupBlock = plan.blockDocuments.find((doc) => doc.blockName === 'DupBlock')
    expect(dupBlock?.headerSlots).toEqual([
      'in[branchA,branchB]',
      'out[DupBlockPreview]',
    ])
  })

  it('templatiza parameterId de nó filho com sufixo spawn-shape', () => {
    const shapeNode: CanvasNode = {
      id: 'n-shape',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-shape',
        schema: {
          id: 'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape',
          title: 'VfxShapeCylinder',
          parameters: [
            { id: 'VfxShapeCylinder_parameter_height', name: 'height', type: 'f32', defaultValue: '100' },
          ],
          internalStructures: [],
        },
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [shapeNode],
      connections: [],
    }
    const registry = mergeSchemaRegistryWithSceneNodes({}, [shapeNode])
    const slice = buildBlockCatalogFromNodeRitualCode(scene, registry, shapeNode)

    const heightParam = slice.parameterDocuments.find((doc) => doc.parameterName === 'height')
    expect(heightParam?.source).toMatchObject({
      kind: 'parameter',
      parameterId:
        'vfx-shape-cylinder__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-spawn-shape_parameter_height',
    })
  })

  it('sintetiza parâmetros de catálogo listados no JSON de bloco', () => {
    const integratedBlock: BlockDefinitionJsonDocument = {
      id: 'TestIntegratedBlock_TestIntegratedBlock',
      block: 'worldAcceleration',
      blockName: 'TestIntegratedBlock',
      type: 'embed',
      name: 'TestIntegratedBlock',
      source: {
        kind: 'block',
        nodeId: 'test-integrated-block__main-entries-test-world-acceleration',
      },
      color: '#40ff56',
      headerSlots: ['in[worldAcceleration]', 'out[TestIntegratedBlockPreview]'],
      parameters: ['constantValue', 'dynamics'],
    }

    const integratedSchema: NodeSchemaDefinition = {
      id: 'test-integrated-block-test',
      title: 'TestIntegratedBlock',
      parameters: [
        {
          id: 'IntegratedValueVector3_parameter_constantValue',
          name: 'constantValue',
          type: 'vector3',
          defaultValue: '0,0,0',
        },
      ],
      embed: [],
      pointer: [
        {
          id: 'IntegratedValueVector3_pointer_dynamics',
          title: 'dynamics',
          internalStructures: [
            {
              id: 'integrated-value-vector3-dynamics',
              name: 'VfxAnimatedVector3fVariableData',
              schemaId: 'vfx-animated-vector3f-variable-data-test',
            },
          ],
          slots: [
            {
              id: 'IntegratedValueVector3_pointer_dynamics__slot__0',
              name: 'VfxAnimatedVector3fVariableData',
              schemaId: 'vfx-animated-vector3f-variable-data-test',
            },
          ],
        },
      ],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const childSchema: NodeSchemaDefinition = {
      id: 'vfx-animated-vector3f-variable-data-test',
      title: 'VfxAnimatedVector3fVariableData',
      parameters: [
        {
          id: 'VfxAnimatedVector3fVariableData_parameter_times',
          name: 'times',
          type: 'listF32',
          defaultValue: '0',
        },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const schemaRegistry: Record<string, NodeSchemaDefinition> = {
      [integratedSchema.id]: integratedSchema,
      [childSchema.id]: childSchema,
    }

    const enriched = enrichAutoBuildPlanWithCatalogParameters(
      [],
      [integratedBlock],
      schemaRegistry,
    )

    const paramNames = enriched.documents.map((doc) => `${doc.block}::${doc.parameterName}`)
    expect(paramNames).toContain('TestIntegratedBlock::constantValue')
    expect(paramNames).toContain('TestIntegratedBlock::dynamics')
    expect(enriched.errors).toEqual([])
  })

  it('inclui parâmetros de catálogo no plano quando schemaRegistry está disponível', () => {
    const integratedNode: CanvasNode = {
      id: 'n-integrated',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-integrated',
        schema: {
          id: 'integrated-value-vector3__scene-node',
          title: 'IntegratedValueVector3',
          parameters: [
            {
              id: 'IntegratedValueVector3_parameter_constantValue',
              name: 'constantValue',
              type: 'vector3',
              defaultValue: '1, 2, 3',
            },
          ],
          embed: [],
          pointer: [
            {
              id: 'IntegratedValueVector3_pointer_dynamics',
              title: 'dynamics',
              internalStructures: [
                {
                  id: 'integrated-value-vector3-dynamics',
                  name: 'VfxAnimatedVector3fVariableData',
                  schemaId: 'vfx-animated-vector3f-variable-data-scene',
                },
              ],
              slots: [
                {
                  id: 'IntegratedValueVector3_pointer_dynamics__slot__0',
                  name: 'VfxAnimatedVector3fVariableData',
                  schemaId: 'vfx-animated-vector3f-variable-data-scene',
                },
              ],
            },
          ],
          internalStructures: [],
        },
        values: [],
      },
    }

    const schemaRegistry: Record<string, NodeSchemaDefinition> = {
      'integrated-value-vector3__scene-node': integratedNode.node.schema,
      'vfx-animated-vector3f-variable-data-scene': {
        id: 'vfx-animated-vector3f-variable-data-scene',
        title: 'VfxAnimatedVector3fVariableData',
        parameters: [
          {
            id: 'VfxAnimatedVector3fVariableData_parameter_times',
            name: 'times',
            type: 'listF32',
            defaultValue: '0',
          },
        ],
        embed: [],
        pointer: [],
        listEmbed: [],
        listPointer: [],
        list2Embed: [],
        list2Pointer: [],
        internalStructures: [],
      },
    }

    const plan = buildBlockAutoBuildPlan(
      {
        width: 800,
        height: 600,
        nodes: [integratedNode],
        connections: [],
      },
      schemaRegistry,
    )

    expect(plan.blockDocuments.some((doc) => doc.blockName === 'IntegratedValueVector3')).toBe(true)
    expect(
      plan.parameterDocuments.some(
        (doc) => doc.block === 'IntegratedValueVector3' && doc.parameterName === 'constantValue',
      ),
    ).toBe(true)
    expect(
      plan.parameterDocuments.some(
        (doc) => doc.block === 'IntegratedValueVector3' && doc.parameterName === 'dynamics',
      ),
    ).toBe(true)
  })

})

describe('buildBlockAutoBuildPlanFromRitualCode', () => {
  it('gera plano a partir do texto ritual no editor', () => {
    const ritual = `VfxEmitterDefinitionData {
  emitterName: string = "Teste"
}`

    const plan = buildBlockAutoBuildPlanFromRitualCode(ritual, {
      'vfx-emitter-test': {
        id: 'vfx-emitter-test',
        title: 'VfxEmitterDefinitionData',
        parameters: [{ id: 'p1', name: 'emitterName', type: 'string', defaultValue: '' }],
        embed: [],
        pointer: [],
        listEmbed: [],
        listPointer: [],
        list2Embed: [],
        list2Pointer: [],
        internalStructures: [],
      },
    })

    expect(plan.errors).not.toContain('EMPTY_CODE')
    expect(plan.blockDocuments.some((doc) => doc.blockName === 'VfxEmitterDefinitionData')).toBe(true)
    expect(
      plan.parameterDocuments.some(
        (doc) => doc.block === 'VfxEmitterDefinitionData' && doc.parameterName === 'emitterName',
      ),
    ).toBe(true)
  })

  it('retorna EMPTY_CODE quando o editor está vazio', () => {
    const plan = buildBlockAutoBuildPlanFromRitualCode('  ')
    expect(plan.errors).toContain('EMPTY_CODE')
  })

  it('inclui blocos e parâmetros de entradas map[hash,embed] em Main', () => {
    const ritual = `
#PROP_text
type: string = "PROP"
version: u32 = 3
entries: map[hash,embed] = {
  "path/a" = SampleType { name: string = "a" }
  "path/b" = SampleType { name: string = "b" }
}
`.trim()

    const plan = buildBlockAutoBuildPlanFromRitualCode(ritual)
    expect(plan.blockDocuments.some((doc) => doc.blockName === 'Main')).toBe(true)
    expect(plan.blockDocuments.some((doc) => doc.blockName === 'SampleType')).toBe(true)
    expect(
      plan.parameterDocuments.some((doc) => doc.block === 'SampleType' && doc.parameterName === 'name'),
    ).toBe(true)
  })
})
