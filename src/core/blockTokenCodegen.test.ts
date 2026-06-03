import { describe, expect, it } from 'vitest'

import {
  buildBlockInspectorDraftFromNode,
  extractBlockStructureFromNode,
  generateBlockStructureFromDraft,
  revertBlockTokensFromNode,
  updateBlockParameterTokenValue,
} from './blockTokenCodegen'
import type { CanvasNode, CanvasScene } from './canvasScene'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleDraft,
  VFX_EMITTER_COLOR_TOKEN,
  VFX_EMITTER_LIFETIME_TOKEN,
} from './blockTestFixtures'

describe('blockTokenCodegen', () => {
  it('inject tokens into node values from inspector draft', () => {
    const scene = makeVfxEmitterScene()
    const canvasNode = scene.nodes[0]
    const generated = generateBlockStructureFromDraft(scene, canvasNode, vfxEmitterSampleDraft)

    expect(generated).not.toBeNull()
    expect(generated!.structure.parameters).toHaveLength(3)
    expect(generated!.node.values.find((entry) => entry.parameterId === 'p-color')?.value).toContain(
      '_blockType&VfxEmitterDefinitionData',
    )
    expect(generated!.node.values.find((entry) => entry.parameterId === 'p-lifetime')?.value).toContain(
      'particleLifetime',
    )
    expect(generated!.structure.identification_codes).toHaveLength(3)
  })

  it('extracts block structure from tokenized node values', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      blockViewActive: true,
      blockStructure: {
        blockType: 'VfxEmitterDefinitionData',
        blockName: 'Emitter',
        parameters: [],
        identification_codes: [],
      },
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [
          { parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN },
          { parameterId: 'p-lifetime', value: VFX_EMITTER_LIFETIME_TOKEN },
        ],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)

    const extracted = extractBlockStructureFromNode(scene, canvasNode)
    expect(extracted).not.toBeNull()
    expect(extracted?.blockType).toBe('VfxEmitterDefinitionData')
    expect(extracted?.parameters).toHaveLength(2)
    expect(extracted?.parameters[0]?.nameParameter).toBe('color')
  })

  it('reverts tokens back to scalar values', () => {
    const structure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: 'Emitter01',
          nameParameter: 'color',
          typeParameter: 'vec4',
          defaultValue: '0.55,0.95,1,1',
          sourcePath: { kind: 'parameter' as const, parameterId: 'p-color' },
        },
      ],
      identification_codes: [VFX_EMITTER_COLOR_TOKEN],
    }
    const canvasNode = makeVfxEmitterCanvasNode({
      blockStructure: structure,
      blockViewActive: true,
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [{ parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN }],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)

    const reverted = revertBlockTokensFromNode(scene, canvasNode, structure)
    expect(reverted.node.values.find((entry) => entry.parameterId === 'p-color')?.value).toBe('0.55,0.95,1,1')
  })

  it('updates default value inside token payload', () => {
    const structure = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'Emitter',
      parameters: [
        {
          idParameter: 'Emitter02',
          nameParameter: 'particleLifetime',
          typeParameter: 'f32',
          defaultValue: '1.15',
          sourcePath: { kind: 'parameter' as const, parameterId: 'p-lifetime' },
        },
      ],
      identification_codes: [VFX_EMITTER_LIFETIME_TOKEN],
    }

    const updated = updateBlockParameterTokenValue(structure, 'Emitter02', '2.5')
    expect(updated.parameters[0]?.defaultValue).toBe('2.5')
    expect(updated.identification_codes[0]).toContain('f32{2.5}')
  })

  it('removes linked_parameter_values for tokenized top-level parameters', () => {
    const scene = makeVfxEmitterScene()
    const canvasNode = scene.nodes[0]
    canvasNode.node = {
      ...canvasNode.node,
      parameter_value_links: [
        ['p-color', 'p-lifetime'],
      ],
    }

    const generated = generateBlockStructureFromDraft(scene, canvasNode, vfxEmitterSampleDraft)
    expect(generated?.node.parameter_value_links).toBeUndefined()
  })

  it('lista pointers no inspetor com nome do campo ritual e slot IN pelo tipo filho', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          pointer: [
            {
              id: 'ptr-filtering',
              title: 'Filtering',
              internalStructures: [
                {
                  id: 'ptr-filtering-slot',
                  name: 'VfxEmitterFiltering',
                  schemaId: 'vfx-emitter-filtering',
                },
              ],
              slots: [
                {
                  id: 'ptr-filtering-slot',
                  name: 'VfxEmitterFiltering',
                  schemaId: 'vfx-emitter-filtering',
                },
              ],
            },
          ],
        },
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const draft = buildBlockInspectorDraftFromNode(scene, canvasNode)
    const pointerEntry = draft.entries.find((entry) => entry.sourcePath.kind === 'pointerChild')

    expect(pointerEntry).toMatchObject({
      ritualName: 'Filtering',
      nameParameter: 'Filtering',
      typeParameter: 'VfxEmitterFiltering',
      slotTags: [{ direction: 'input', type: 'VfxEmitterFiltering', active: true }],
    })
  })

  it('gera bloco pointer só com slot de entrada', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          pointer: [
            {
              id: 'ptr-filtering',
              title: 'Filtering',
              internalStructures: [
                {
                  id: 'ptr-filtering-slot',
                  name: 'VfxEmitterFiltering',
                  schemaId: 'vfx-emitter-filtering',
                },
              ],
              slots: [
                {
                  id: 'ptr-filtering-slot',
                  name: 'VfxEmitterFiltering',
                  schemaId: 'vfx-emitter-filtering',
                },
              ],
            },
          ],
        },
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const draft = buildBlockInspectorDraftFromNode(scene, canvasNode)
    const pointerEntry = draft.entries.find((entry) => entry.sourcePath.kind === 'pointerChild')
    expect(pointerEntry).toBeDefined()

    const generated = generateBlockStructureFromDraft(scene, canvasNode, {
      ...draft,
      entries: draft.entries.map((entry) =>
        entry.sourcePath.kind === 'pointerChild' ? { ...entry, exposed: true } : entry,
      ),
    })

    expect(generated?.structure.parameters).toHaveLength(1)
    expect(generated?.structure.parameters[0]?.nameParameter).toBe('Filtering')
    expect(generated?.structure.parameters[0]?.slotRules).toEqual({ inputs: ['VfxEmitterFiltering'] })
    expect(generated?.structure.parameters[0]?.slotRules?.outputs).toBeUndefined()
  })

  it('define blockType pelo título do schema do nó quando não há JSON em blockStructures', () => {
    const base = makeVfxEmitterCanvasNode()
    const valueFloatNode: CanvasNode = {
      ...base,
      node: {
        ...base.node,
        schema: {
          ...base.node.schema,
          id: 'ValueFloat',
          title: 'ValueFloat',
          parameters: [{ id: 'p-cv', name: 'constantValue', type: 'f32', defaultValue: '1' }],
        },
      },
    }
    const scene = makeVfxEmitterScene(valueFloatNode)
    const draft = buildBlockInspectorDraftFromNode(scene, valueFloatNode)

    expect(draft.blockType).toBe('ValueFloat')
    expect(draft.blockName).toBe('ValueFloat')
  })

  it('inclui embed estrutural mMesh sem constantValue no filho', () => {
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

    const draft = buildBlockInspectorDraftFromNode(scene, meshNode)

    expect(draft.entries).toHaveLength(1)
    expect(draft.entries[0]?.ritualName).toBe('mMesh')
    expect(draft.entries[0]?.typeParameter).toBe('VfxMeshDefinitionData')
    expect(draft.entries[0]?.sourcePath).toMatchObject({
      kind: 'embedChild',
      childParameterId: '',
    })
  })

  it('gera bloco struct-only vazio a partir do draft', () => {
    const quadNode: CanvasNode = {
      id: 'n-quad',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-quad',
        schema: {
          id: 'vfx-primitive-arbitrary-quad',
          title: 'VfxPrimitiveArbitraryQuad',
          parameters: [],
          internalStructures: [],
        },
        values: [],
      },
    }
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [quadNode],
      connections: [],
    }

    const generated = generateBlockStructureFromDraft(scene, quadNode, {
      blockType: 'VfxPrimitiveArbitraryQuad',
      blockName: 'VfxPrimitiveArbitraryQuad',
      entries: [],
    })

    expect(generated).not.toBeNull()
    expect(generated!.structure.parameters).toEqual([])
    expect(generated!.structure.identification_codes).toEqual([])
  })
})
