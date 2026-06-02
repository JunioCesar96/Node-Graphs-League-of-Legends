import { describe, expect, it } from 'vitest'

import type { BlockInspectorDraft } from './blockSchema'
import type { CanvasNode, CanvasScene } from './canvasScene'
import {
  buildBlockDefinitionJsonDocument,
  mapOutgoingLinkKindToBlockType,
  resolveBlockParentContext,
  resolveSchemaIdForBlockDefinition,
} from './blockDefinitionJson'
import type { NodeSchemaDefinition } from './nodeSchema'
import { templatizeSchemaNodeId } from './blockParameterIdTemplate'

function makeEmitterUnderListPointerScene(): { scene: CanvasScene; emitter: CanvasNode } {
  const systemNode: CanvasNode = {
    id: 'n-system',
    position: { x: 0, y: 0 },
    node: {
      id: 'n-system',
      schema: {
        id: 'vfx-system-definition-data__entries-characters-brand-skins-skin0-particles-brand-base-dance',
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
                schemaId: 'vfx-emitter-definition-data__main-entries-characters-brand-skins-skin0-particles-brand-base-dance-complex-emitter-definition-data-0',
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
    position: { x: 100, y: 0 },
    node: {
      id: 'n-emitter',
      schema: {
        id: 'vfx-emitter-definition-data__main-entries-characters-brand-skins-skin0-particles-brand-base-dance-complex-emitter-definition-data-3',
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
    nodes: [systemNode, emitter],
    connections: [
      {
        id: 'c-1',
        fromNodeId: 'n-system',
        fromInternalStructureId: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
        toNodeId: 'n-emitter',
      },
    ],
  }

  return { scene, emitter }
}

const baseDraft: BlockInspectorDraft = {
  blockType: 'VfxEmitterDefinitionData',
  blockName: 'VfxEmitterDefinitionData',
  entries: [
    {
      sourcePath: { kind: 'parameter', parameterId: 'p-emitter' },
      ritualName: 'emitterName',
      typeParameter: 'string',
      defaultValue: 'sparks',
      exposed: true,
      nameParameter: 'emitterName',
      iconHint: null,
      iconId: '',
      slotTags: [],
    },
    {
      sourcePath: { kind: 'parameter', parameterId: 'p-vfx' },
      ritualName: 'VfxEmitterDefinitionData',
      typeParameter: 'string',
      defaultValue: '',
      exposed: true,
      nameParameter: 'VfxEmitterDefinitionData',
      iconHint: null,
      iconId: '',
      slotTags: [],
    },
  ],
}

describe('mapOutgoingLinkKindToBlockType', () => {
  it('mapeia listPointer para pointer', () => {
    expect(mapOutgoingLinkKindToBlockType('listPointer')).toBe('pointer')
  })

  it('mapeia mapHashEmbed para embed', () => {
    expect(mapOutgoingLinkKindToBlockType('mapHashEmbed')).toBe('embed')
  })
})

describe('resolveBlockParentContext', () => {
  it('resolve complexEmitterDefinitionData como block e pointer como type', () => {
    const { scene, emitter } = makeEmitterUnderListPointerScene()
    expect(resolveBlockParentContext(scene, emitter, 'VfxEmitterDefinitionData')).toEqual({
      block: 'complexEmitterDefinitionData',
      type: 'pointer',
    })
  })
})

describe('templatizeSchemaNodeId', () => {
  it('substitui segmentos do schema.id do emitter', () => {
    expect(
      templatizeSchemaNodeId(
        'vfx-emitter-definition-data__main-entries-characters-brand-skins-skin0-particles-brand-base-dance-complex-emitter-definition-data-3',
        'VfxEmitterDefinitionData',
      ),
    ).toBe(
      'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}',
    )
  })
})

describe('buildBlockDefinitionJsonDocument', () => {
  it('gera documento completo para emitter sob listPointer', () => {
    const { scene, emitter } = makeEmitterUnderListPointerScene()
    const draft: BlockInspectorDraft = {
      ...baseDraft,
      blockName: 'VfxEmitter Definition Data',
    }

    const result = buildBlockDefinitionJsonDocument(draft, scene, emitter)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.document).toMatchObject({
      block: 'complexEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      type: 'pointer',
      name: 'VfxEmitter Definition Data',
      source: {
        kind: 'block',
        nodeId:
          'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}',
      },
      color: '#40ff56',
      headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
      parameters: ['emitterName', 'VfxEmitterDefinitionData'],
    })
    expect(result.document.id).toBe('VfxEmitterDefinitionData_VfxEmitter Definition Data')
  })

  it('rejeita name com underscore', () => {
    const { scene, emitter } = makeEmitterUnderListPointerScene()
    const result = buildBlockDefinitionJsonDocument(
      { ...baseDraft, blockName: 'bad_name' },
      scene,
      emitter,
    )
    expect(result.ok).toBe(false)
  })

  it('rejeita sem parâmetros expostos', () => {
    const { scene, emitter } = makeEmitterUnderListPointerScene()
    const result = buildBlockDefinitionJsonDocument(
      {
        ...baseDraft,
        entries: baseDraft.entries.map((entry) => ({ ...entry, exposed: false })),
      },
      scene,
      emitter,
    )
    expect(result.ok).toBe(false)
  })

  it('aceita bloco struct-only vazio com parameters vazio', () => {
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
    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [quadNode],
      connections: [],
    }

    const result = buildBlockDefinitionJsonDocument(
      {
        blockType: 'VfxPrimitiveArbitraryQuad',
        blockName: 'VfxPrimitiveArbitraryQuad',
        entries: [],
      },
      scene,
      quadNode,
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document.parameters).toEqual([])
      expect(result.document.blockName).toBe('VfxPrimitiveArbitraryQuad')
    }
  })
})

describe('resolveSchemaIdForBlockDefinition', () => {
  it('não rebenta com schemas sem title nem collectionType', () => {
    const registry: Record<string, NodeSchemaDefinition> = {
      broken: {
        id: 'broken',
        title: undefined as unknown as string,
        parameters: [],
        internalStructures: [],
        nomenclature: { collectionType: undefined },
      },
      emitter: {
        id: 'vfx-emitter-definition-data',
        title: 'VfxEmitterDefinitionData',
        parameters: [],
        internalStructures: [],
      },
    }

    expect(() =>
      resolveSchemaIdForBlockDefinition('VfxEmitterDefinitionData', registry),
    ).not.toThrow()
    expect(resolveSchemaIdForBlockDefinition('VfxEmitterDefinitionData', registry)).toBe(
      'vfx-emitter-definition-data',
    )
  })
})
