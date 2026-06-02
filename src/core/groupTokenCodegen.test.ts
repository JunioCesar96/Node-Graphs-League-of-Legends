import { describe, expect, it } from 'vitest'

import {
  buildGroupInspectorDraftFromNode,
  extractGroupStructureFromNode,
  generateGroupStructureFromDraft,
  revertGroupTokensFromNode,
  updateGroupParameterTokenValue,
} from './groupTokenCodegen'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleDraft,
  VFX_EMITTER_COLOR_TOKEN,
  VFX_EMITTER_LIFETIME_TOKEN,
} from './groupTestFixtures'

describe('GroupTokenCodegen', () => {
  it('usa tipo default e nome do nó quando schema não tem JSON em groupStructures', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      displayLabel: 'Meu Emitter',
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          title: 'TipoDesconhecidoSemJson',
        },
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const draft = buildGroupInspectorDraftFromNode(scene, canvasNode)

    expect(draft.groupType).toBe('default')
    expect(draft.groupName).toBe('Meu Emitter')
  })

  it('usa schema.title como nome do grupo quando displayLabel está vazio', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      displayLabel: undefined,
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          title: 'TipoDesconhecidoSemJson',
        },
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)
    const draft = buildGroupInspectorDraftFromNode(scene, canvasNode)

    expect(draft.groupType).toBe('default')
    expect(draft.groupName).toBe('TipoDesconhecidoSemJson')
  })

  it('inject tokens into node values from inspector draft', () => {
    const scene = makeVfxEmitterScene()
    const canvasNode = scene.nodes[0]
    const generated = generateGroupStructureFromDraft(scene, canvasNode, vfxEmitterSampleDraft)

    expect(generated).not.toBeNull()
    expect(generated!.structure.parameters).toHaveLength(3)
    expect(generated!.node.values.find((entry) => entry.parameterId === 'p-color')?.value).toContain(
      '_groupType&VfxEmitterDefinitionData',
    )
    expect(generated!.node.values.find((entry) => entry.parameterId === 'p-lifetime')?.value).toContain(
      'particleLifetime',
    )
    expect(generated!.structure.identification_codes).toHaveLength(3)
  })

  it('extracts Group structure from tokenized node values', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      groupViewActive: true,
      groupStructure: {
        groupType: 'VfxEmitterDefinitionData',
        groupName: 'Emitter',
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

    const extracted = extractGroupStructureFromNode(scene, canvasNode)
    expect(extracted).not.toBeNull()
    expect(extracted?.groupType).toBe('VfxEmitterDefinitionData')
    expect(extracted?.parameters).toHaveLength(2)
    expect(extracted?.parameters[0]?.nameParameter).toBe('color')
  })

  it('reverts tokens back to scalar values', () => {
    const structure = {
      groupType: 'VfxEmitterDefinitionData',
      groupName: 'Emitter',
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
      groupStructure: structure,
      groupViewActive: true,
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [{ parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN }],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)

    const reverted = revertGroupTokensFromNode(scene, canvasNode, structure)
    expect(reverted.node.values.find((entry) => entry.parameterId === 'p-color')?.value).toBe('0.55,0.95,1,1')
  })

  it('updates default value inside token payload', () => {
    const structure = {
      groupType: 'VfxEmitterDefinitionData',
      groupName: 'Emitter',
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

    const updated = updateGroupParameterTokenValue(structure, 'Emitter02', '2.5')
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

    const generated = generateGroupStructureFromDraft(scene, canvasNode, vfxEmitterSampleDraft)
    expect(generated?.node.parameter_value_links).toBeUndefined()
  })

  it('lista pointers no inspetor com nome da estrutura interna e slot IN fixo', () => {
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
    const draft = buildGroupInspectorDraftFromNode(scene, canvasNode)
    const pointerEntry = draft.entries.find((entry) => entry.sourcePath.kind === 'pointerChild')

    expect(pointerEntry).toMatchObject({
      ritualName: 'Filtering',
      nameParameter: 'Filtering',
      typeParameter: 'VfxEmitterFiltering',
      slotTags: [{ direction: 'input', type: 'VfxEmitterFiltering', active: true }],
    })
  })

  it('gera Grupo pointer só com slot de entrada', () => {
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
    const draft = buildGroupInspectorDraftFromNode(scene, canvasNode)
    const pointerEntry = draft.entries.find((entry) => entry.sourcePath.kind === 'pointerChild')
    expect(pointerEntry).toBeDefined()

    const generated = generateGroupStructureFromDraft(scene, canvasNode, {
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
})
