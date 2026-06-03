import { describe, expect, it } from 'vitest'

import type { BlockInspectorDraft, BlockInspectorDraftEntry } from './blockSchema'
import {
  buildBlockParameterDocumentId,
  buildBlockParameterJsonDocument,
  buildBlockParameterSourceId,
  humanizeParameterDisplayName,
  isSimpleBlockParameterDocument,
  sanitizeBlockParameterFileStem,
  sanitizeBlockStructureFolderName,
  slotsFromDraftEntry,
} from './blockParameterJson'
import { buildBlockInspectorDraftFromNode } from './blockTokenCodegen'
import { makeVfxEmitterCanvasNode, makeVfxEmitterScene } from './blockTestFixtures'
import type { CanvasNode, CanvasScene } from './canvasScene'

function baseEntry(overrides: Partial<BlockInspectorDraftEntry> = {}): BlockInspectorDraftEntry {
  return {
    sourcePath: { kind: 'parameter', parameterId: 'p-blend' },
    ritualName: 'blendMode',
    typeParameter: 'u8',
    defaultValue: '0',
    exposed: false,
    nameParameter: 'blend Mode',
    iconHint: null,
    iconId: '',
    slotTags: [
      { direction: 'output', type: 'u8', active: true },
      { direction: 'input', type: 'u8', active: true },
    ],
    ...overrides,
  }
}

const draft: BlockInspectorDraft = {
  blockType: 'VfxEmitterDefinitionData',
  blockName: 'Emitter',
  entries: [],
}

function makeEmbedScale0Scene(): { scene: CanvasScene; parent: CanvasNode } {
  const parent = makeVfxEmitterCanvasNode({
    node: {
      ...makeVfxEmitterCanvasNode().node,
      schema: {
        ...makeVfxEmitterCanvasNode().node.schema,
        embed: [
          {
            id: 'embed-scale0',
            title: 'scale0',
            internalStructures: [
              {
                id: 'slot-scale0',
                name: 'scale0',
                schemaId: 'value-vector3-scale0',
              },
            ],
            slots: [
              {
                id: 'slot-scale0',
                name: 'scale0',
                schemaId: 'value-vector3-scale0',
              },
            ],
          },
        ],
      },
    },
  })

  const child: CanvasNode = {
    id: 'n-value-vector3',
    position: { x: 400, y: 80 },
    node: {
      id: 'n-value-vector3',
      schema: {
        id: 'ValueVector3',
        title: 'ValueVector3',
        parameters: [{ id: 'p-cv', name: 'constantValue', type: 'vector3', defaultValue: '2, 3, 1' }],
        internalStructures: [],
      },
      values: [{ parameterId: 'p-cv', value: '2, 3, 1' }],
    },
  }

  const scene: CanvasScene = {
    width: 1120,
    height: 760,
    nodes: [parent, child],
    connections: [
      {
        id: 'c-scale0',
        fromNodeId: parent.id,
        fromInternalStructureId: 'slot-scale0',
        toNodeId: child.id,
        toInternalStructureId: 'input',
      },
    ],
  }

  return { scene, parent }
}

describe('humanizeParameterDisplayName', () => {
  it('separa camelCase', () => {
    expect(humanizeParameterDisplayName('blendMode')).toBe('blend Mode')
  })
})

describe('buildBlockParameterDocumentId', () => {
  it('concatena parameterName e name', () => {
    expect(buildBlockParameterDocumentId('blendMode', 'blend Mode')).toBe('blendMode_blend Mode')
  })
})

describe('sanitizeBlockParameterFileStem', () => {
  it('normaliza id para nome de ficheiro', () => {
    expect(sanitizeBlockParameterFileStem('blendMode_blend Mode')).toBe('blendmode_blend-mode')
  })
})

describe('sanitizeBlockStructureFolderName', () => {
  it('aceita PascalCase de blockType', () => {
    expect(sanitizeBlockStructureFolderName('VfxEmitterDefinitionData')).toBe(
      'VfxEmitterDefinitionData',
    )
  })

  it('rejeita path traversal', () => {
    expect(sanitizeBlockStructureFolderName('../evil')).toBeNull()
    expect(sanitizeBlockStructureFolderName('foo/bar')).toBeNull()
  })
})

describe('buildBlockParameterSourceId', () => {
  it('usa template do blockType VfxEmitterDefinitionData', () => {
    const entry = baseEntry({ sourcePath: { kind: 'parameter', parameterId: '' } })
    expect(buildBlockParameterSourceId(entry, 'VfxEmitterDefinitionData')).toBe(
      'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}_parameter_blendMode',
    )
  })

  it('expande id curto com schemaId e templatiza sufixo spawn-shape', () => {
    const entry = baseEntry({
      ritualName: 'height',
      nameParameter: 'height',
      typeParameter: 'f32',
      sourcePath: { kind: 'parameter', parameterId: 'VfxShapeCylinder_parameter_height' },
    })
    const schemaId =
      'vfx-shape-cylinder__main-entries-characters-brand-skins-skin0-particles-brand-base-e-conflagration-buf-complex-emitter-definition-data-5-spawn-shape'
    expect(buildBlockParameterSourceId(entry, 'VfxShapeCylinder', schemaId)).toBe(
      'vfx-shape-cylinder__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-spawn-shape_parameter_height',
    )
  })
})

describe('slotsFromDraftEntry', () => {
  it('mapeia tags activas para in/out', () => {
    expect(slotsFromDraftEntry(baseEntry())).toEqual({
      in: ['u8'],
      out: ['u8'],
    })
  })
})

describe('buildBlockParameterJsonDocument', () => {
  it('gera documento simples completo', () => {
    const scene = makeVfxEmitterScene()
    const node = makeVfxEmitterCanvasNode()
    const result = buildBlockParameterJsonDocument(
      baseEntry({ sourcePath: { kind: 'parameter', parameterId: '' } }),
      draft,
      scene,
      node,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(isSimpleBlockParameterDocument(result.document)).toBe(true)
    expect(result.document).toMatchObject({
      id: 'blendMode_blend Mode',
      block: 'VfxEmitterDefinitionData',
      parameterName: 'blendMode',
      type: 'u8',
      value: '0',
      name: 'blend Mode',
      slots: { in: ['u8'], out: ['u8'] },
    })
  })

  it('gera documento embed para scale0 com ValueVector3', () => {
    const { scene, parent } = makeEmbedScale0Scene()
    const result = buildBlockParameterJsonDocument(
      {
        sourcePath: {
          kind: 'embedChild',
          embedId: 'embed-scale0',
          slotId: 'slot-scale0',
          childParameterId: 'p-cv',
        },
        ritualName: 'scale0',
        typeParameter: 'vec3',
        defaultValue: '2, 3, 1',
        exposed: true,
        nameParameter: 'scale0',
        iconHint: null,
        iconId: '',
        slotTags: [],
      },
      draft,
      scene,
      parent,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(isSimpleBlockParameterDocument(result.document)).toBe(false)
    expect(result.document).toMatchObject({
      id: 'scale0_scale0_embed_ValueVector3',
      parameterName: 'scale0',
      type: 'embed',
      embed: 'ValueVector3',
      name: 'scale0',
      source: {
        kind: 'parameter',
        parameterId:
          'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}_parameter_scale0',
      },
      slots: { out: ['ValueVector3'] },
    })
    expect('value' in result.document).toBe(false)
  })

  it('gera documento embed para rate com ValueFloat', () => {
    const parent = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          embed: [
            {
              id: 'embed-rate',
              title: 'rate',
              internalStructures: [{ id: 'slot-rate', name: 'rate', schemaId: 'value-float-rate' }],
              slots: [{ id: 'slot-rate', name: 'rate', schemaId: 'value-float-rate' }],
            },
          ],
        },
      },
    })
    const child: CanvasNode = {
      id: 'n-value-float',
      position: { x: 400, y: 80 },
      node: {
        id: 'n-value-float',
        schema: {
          id: 'ValueFloat',
          title: 'ValueFloat',
          parameters: [{ id: 'p-cv', name: 'constantValue', type: 'f32', defaultValue: '5' }],
          internalStructures: [],
        },
        values: [{ parameterId: 'p-cv', value: '5' }],
      },
    }
    const scene: CanvasScene = {
      width: 1120,
      height: 760,
      nodes: [parent, child],
      connections: [
        {
          id: 'c-rate',
          fromNodeId: parent.id,
          fromInternalStructureId: 'slot-rate',
          toNodeId: child.id,
          toInternalStructureId: 'input',
        },
      ],
    }

    const result = buildBlockParameterJsonDocument(
      {
        sourcePath: {
          kind: 'embedChild',
          embedId: 'embed-rate',
          slotId: 'slot-rate',
          childParameterId: 'p-cv',
        },
        ritualName: 'rate',
        typeParameter: 'f32',
        defaultValue: '5',
        exposed: true,
        nameParameter: 'rate',
        iconHint: null,
        iconId: '',
        slotTags: [],
      },
      draft,
      scene,
      parent,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      id: 'rate_rate_embed_ValueFloat',
      type: 'embed',
      embed: 'ValueFloat',
      slots: { out: ['ValueFloat'] },
    })
  })

  it('gera documento pointer', () => {
    const parent = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          pointer: [
            {
              id: 'ptr-shape',
              title: 'shape',
              internalStructures: [
                {
                  id: 'slot-shape',
                  name: 'VfxShapeCylinder',
                  schemaId: 'vfx-shape-cylinder',
                },
              ],
              slots: [
                {
                  id: 'slot-shape',
                  name: 'VfxShapeCylinder',
                  schemaId: 'vfx-shape-cylinder',
                },
              ],
            },
          ],
        },
      },
    })
    const scene = makeVfxEmitterScene(parent)

    const draftFromNode = buildBlockInspectorDraftFromNode(scene, parent)
    const pointerEntry = draftFromNode.entries.find((entry) => entry.sourcePath.kind === 'pointerChild')
    expect(pointerEntry).toBeDefined()

    const result = buildBlockParameterJsonDocument(
      { ...pointerEntry!, exposed: true },
      draftFromNode,
      scene,
      parent,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      id: 'shape_shape_pointer_VfxShapeCylinder',
      parameterName: 'shape',
      type: 'pointer',
      pointer: 'VfxShapeCylinder',
      slots: { out: ['VfxShapeCylinder'] },
      source: {
        parameterId:
          'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}_parameter_shape',
      },
    })
  })

  it('gera documento listF32', () => {
    const node = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          parameters: [
            {
              id: 'p-times',
              name: 'times',
              type: 'listF32',
              defaultValue: '1\n2\n5',
            },
          ],
        },
        values: [{ parameterId: 'p-times', value: '1\n2\n5' }],
      },
    })
    const scene = makeVfxEmitterScene(node)

    const result = buildBlockParameterJsonDocument(
      baseEntry({
        sourcePath: { kind: 'parameter', parameterId: 'p-times' },
        ritualName: 'times',
        nameParameter: 'times',
        typeParameter: 'listF32',
        defaultValue: '1\n2\n5',
        slotTags: [],
      }),
      draft,
      scene,
      node,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      id: 'times_times_listF32_1-2-5',
      type: 'listF32',
      items: ['1', '2', '5'],
      slots: { out: ['f32'] },
    })
  })

  it('gera documento optionF32', () => {
    const node = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          parameters: [{ id: 'p-opt', name: 'opt', type: 'optionF32', defaultValue: '3.5' }],
        },
        values: [{ parameterId: 'p-opt', value: '3.5' }],
      },
    })
    const scene = makeVfxEmitterScene(node)

    const result = buildBlockParameterJsonDocument(
      baseEntry({
        sourcePath: { kind: 'parameter', parameterId: 'p-opt' },
        ritualName: 'opt',
        nameParameter: 'opt',
        typeParameter: 'optionF32',
        defaultValue: '3.5',
        slotTags: [],
      }),
      draft,
      scene,
      node,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      id: 'opt_opt_optionF32_3-5',
      type: 'optionF32',
      item: '3.5',
      slots: { out: ['f32'] },
    })
  })

  it('gera documento mapHashPointer', () => {
    const mapValue = '0x11111111\tvfx-shape-cylinder\tVfxShapeCylinder'
    const node = makeVfxEmitterCanvasNode({
      node: {
        ...makeVfxEmitterCanvasNode().node,
        schema: {
          ...makeVfxEmitterCanvasNode().node.schema,
          parameters: [{ id: 'p-map', name: 'shapeMap', type: 'mapHashPointer', defaultValue: mapValue }],
        },
        values: [{ parameterId: 'p-map', value: mapValue }],
      },
    })
    const scene = makeVfxEmitterScene(node)

    const result = buildBlockParameterJsonDocument(
      baseEntry({
        sourcePath: { kind: 'parameter', parameterId: 'p-map' },
        ritualName: 'shapeMap',
        nameParameter: 'shapeMap',
        typeParameter: 'mapHashPointer',
        defaultValue: mapValue,
        slotTags: [],
      }),
      draft,
      scene,
      node,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      type: 'mapHashPointer',
      mapKind: 'mapHashPointer',
      entries: [{ key: '0x11111111', target: 'VfxShapeCylinder' }],
      slots: { out: ['VfxShapeCylinder'] },
    })
  })

  it('rejeita name com underscore', () => {
    const scene = makeVfxEmitterScene()
    const node = makeVfxEmitterCanvasNode()
    const result = buildBlockParameterJsonDocument(
      baseEntry({ nameParameter: 'bad_name' }),
      draft,
      scene,
      node,
    )
    expect(result.ok).toBe(false)
  })
})
