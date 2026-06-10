import { describe, expect, it } from 'vitest'

import {
  canvasNodeSubtreeToRitual,
  canvasToClassGroupRitual,
  classifyOutgoingLink,
} from '@/core/canvasToClassGroupRitual'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { codeToCanvasScene } from '@/core/codeToCanvasScene'
import { MAIN_SCHEMA_ID, parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import type { BlockStructurePayload } from '@/core/blockSchema'

const minimalMainSchema: NodeSchemaDefinition = {
  id: 'main',
  title: 'Main',
  parameters: [
    { id: 'main_parameter_type', name: 'type', type: 'string', defaultValue: 'PROP' },
    { id: 'main_parameter_version', name: 'version', type: 'u32', defaultValue: '3' },
    { id: 'main_parameter_linked', name: 'linked', type: 'listString', defaultValue: '"DATA/foo.bin"' },
    {
      id: 'main_parameter_entries',
      name: 'entries',
      type: 'mapHashEmbed',
      defaultValue: 'key1\tsample-type\tSampleType',
    },
  ],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'main' },
}

const childSchema: NodeSchemaDefinition = {
  id: 'sample-type',
  title: 'SampleType',
  parameters: [
    { id: 'sample-type_parameter_name', name: 'name', type: 'string', defaultValue: '' },
    { id: 'sample-type_parameter_count', name: 'count', type: 'u32', defaultValue: '7' },
  ],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'SampleType' },
}

const registry: Record<string, NodeSchemaDefinition> = {
  main: minimalMainSchema,
  'sample-type': childSchema,
}

const packFolderBySchemaId: Record<string, string> = {
  main: 'testpack',
  'sample-type': 'testpack',
}

function buildSceneFromRitual(ritual: string): CanvasScene {
  const built = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
  expect(built.ok).toBe(true)
  if (!built.ok) {
    throw new Error(built.error)
  }
  return built.scene
}

describe('canvasToClassGroupRitual', () => {
  it('rejeita cena sem Main', () => {
    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: 'only-child',
          node: {
            schema: childSchema,
            values: [],
          },
          position: { x: 0, y: 0 },
        },
      ],
      connections: [],
    }

    const result = canvasToClassGroupRitual(scene, registry)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/Main/i)
    }
  })

  it('emite #PROP_text com entries a partir de cena mínima', () => {
    const ritual = `
type: string = "PROP"
version: u32 = 3
linked: list[string] = {
    "DATA/foo.bin"
}
entries: map[hash,embed] = {
  "key1" = SampleType {
    name: string = "hello"
    count: u32 = 42
  }
}
`
    const scene = buildSceneFromRitual(ritual)
    const result = canvasToClassGroupRitual(scene, registry)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('#PROP_text')
    expect(result.text).toContain('type: string = "PROP"')
    expect(result.text).toContain('version: u32 = 3')
    expect(result.text).toContain('linked: list[string] = {')
    expect(result.text).not.toContain('Type: string')
    expect(result.text).toContain('entries: map[hash,embed] = {')
    expect(result.text).toContain('"key1" = SampleType {')
    expect(result.text).toContain('Name: string = "hello"')
    expect(result.text).toContain('Count: u32 = 42')
  })

  it('round-trip parcial: parse após emit recupera main', () => {
    const ritual = `
entries: map[hash,embed] = {
  "key1" = SampleType {
    name: string = "x"
  }
}
`
    const scene = buildSceneFromRitual(ritual)
    const exported = canvasToClassGroupRitual(scene, registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const parsed = parseClassGroupRitualWithStack(exported.text)
    expect(parsed.registry.has(MAIN_SCHEMA_ID)).toBe(true)
    const main = parsed.registry.get(MAIN_SCHEMA_ID)
    expect(main?.parameters.some((p) => p.name === 'entries')).toBe(true)

    const sample = [...parsed.registry.values()].find((s) => s.title === 'SampleType')
    expect(
      sample?.parameters.some((p) => p.name === 'name' || p.name === 'Name'),
    ).toBe(true)
  })
})

describe('canvasNodeSubtreeToRitual', () => {
  const ritual = `
type: string = "PROP"
version: u32 = 3
linked: list[string] = {
    "DATA/foo.bin"
}
entries: map[hash,embed] = {
  "key1" = SampleType {
    name: string = "hello"
    count: u32 = 42
  }
}
`

  it('rejeita nó inexistente', () => {
    const scene = buildSceneFromRitual(ritual)
    const result = canvasNodeSubtreeToRitual(scene, registry, 'missing-node')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/não encontrado/i)
    }
  })

  it('emite preview de filho com subárvore', () => {
    const scene = buildSceneFromRitual(ritual)
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    const child = scene.connections
      .filter((c) => c.fromNodeId === mainNode?.id)
      .map((c) => scene.nodes.find((n) => n.id === c.toNodeId))
      .find((n) => n?.node.schema.title === 'SampleType')

    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const result = canvasNodeSubtreeToRitual(scene, registry, child.id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('# Preview: SampleType')
    expect(result.text).toContain('SampleType {')
    expect(result.text).toContain('name: string = "hello"')
    expect(result.text).toContain('count: u32 = 42')
    expect(result.text).not.toContain('#PROP_text')
  })

  it('emite #PROP_text ao pré-visualizar Main', () => {
    const scene = buildSceneFromRitual(ritual)
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    expect(mainNode).toBeDefined()
    if (!mainNode) {
      return
    }

    const result = canvasNodeSubtreeToRitual(scene, registry, mainNode.id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('#PROP_text')
    expect(result.text).toContain('entries: map[hash,embed] = {')
    expect(result.text).toContain('"key1" = SampleType {')
  })

  it('no preview de block card Main exporta só parâmetros do bloco, não o template completo', () => {
    const scene = buildSceneFromRitual(ritual)
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    expect(mainNode).toBeDefined()
    if (!mainNode) {
      return
    }

    const brandPath = 'Characters/Brand/Skins/Skin0/Particles/Brand_Base_Joke'
    const entriesValue = `${brandPath}\tsample-type\tSampleType`

    const blockStructure: BlockStructurePayload = {
      blockType: 'Main',
      blockName: 'Main',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_type',
          nameParameter: 'type',
          typeParameter: 'string',
          defaultValue: 'PROP',
          sourcePath: { kind: 'parameter', parameterId: 'main_parameter_type' },
        },
        {
          idParameter: 'catalog_version',
          nameParameter: 'version',
          typeParameter: 'u32',
          defaultValue: '3',
          sourcePath: { kind: 'parameter', parameterId: 'main_parameter_version' },
        },
        {
          idParameter: 'catalog_entries',
          nameParameter: 'entries',
          typeParameter: 'mapHashEmbed',
          defaultValue: entriesValue,
          sourcePath: { kind: 'parameter', parameterId: 'main_parameter_entries' },
        },
      ],
    }

    const previewScene: CanvasScene = {
      ...scene,
      nodes: scene.nodes.map((node) =>
        node.id === mainNode.id
          ? { ...node, blockViewActive: true, blockStructure }
          : node,
      ),
    }

    const result = canvasNodeSubtreeToRitual(previewScene, registry, mainNode.id, {
      blockCardSelectedParametersOnly: true,
      useSchemaFieldNames: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('#PROP_text')
    expect(result.text).toContain('type: string = "PROP"')
    expect(result.text).toContain('version: u32 = 3')
    expect(result.text).toContain('entries: map[hash,embed] = {')
    expect(result.text).toContain(`"${brandPath}" = SampleType`)
    expect(result.text).not.toContain('linked:')
    expect(result.text).not.toContain('"key1"')
  })

  it('reconhece ligação mapHashEmbed do block card via __block__:slotId', () => {
    const brandPath = 'Characters/Brand/Skins/Skin0/Particles/Brand_Base_E_Conflagration_buf'
    const entriesParamId = 'entries_entries_mapHashEmbed'
    const entriesValue = `${brandPath}\tvfx-system-def\tVfxSystemDefinitionData`
    const embedSlot = mapHashEmbedSlotId(entriesParamId, brandPath)

    const vfxSchema: NodeSchemaDefinition = {
      id: 'vfx-system-def',
      title: 'VfxSystemDefinitionData',
      parameters: [{ id: 'p-flags', name: 'flags', type: 'u16', defaultValue: '198' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const mainSchema: NodeSchemaDefinition = {
      id: 'main',
      title: 'Main',
      parameters: [
        {
          id: 'main_parameter_entries',
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: '',
        },
      ],
      internalStructures: [],
      nomenclature: { group: '', collection: '', collectionType: 'main' },
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const mainId = 'node-main'
    const childId = 'node-vfx'
    const blockStructure: BlockStructurePayload = {
      blockType: 'Main',
      blockName: 'Main',
      identification_codes: [],
      parameters: [
        {
          idParameter: entriesParamId,
          nameParameter: 'entries',
          typeParameter: 'mapHashEmbed',
          defaultValue: entriesValue,
          sourcePath: { kind: 'parameter', parameterId: 'main_parameter_entries' },
        },
      ],
    }

    const mainNode = {
      id: mainId,
      position: { x: 0, y: 0 },
      blockViewActive: true,
      blockStructure,
      node: {
        schema: mainSchema,
        values: [],
      },
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        mainNode,
        {
          id: childId,
          position: { x: 400, y: 0 },
          blockViewActive: true,
          blockStructure: {
            blockType: 'VfxSystemDefinitionData',
            blockName: 'VfxSystemDefinitionData',
            identification_codes: [],
            parameters: [
              {
                idParameter: 'p-flags',
                nameParameter: 'flags',
                typeParameter: 'u16',
                defaultValue: '198',
                sourcePath: { kind: 'parameter', parameterId: 'p-flags' },
              },
            ],
          },
          node: {
            schema: vfxSchema,
            values: [{ parameterId: 'p-flags', value: '198' }],
          },
        },
      ],
      connections: [
        {
          id: 'c-main-vfx',
          fromNodeId: mainId,
          fromInternalStructureId: `__block__:${embedSlot}`,
          fromBlockSlotId: embedSlot,
          fromBlockParameterId: entriesParamId,
          toNodeId: childId,
          toBlockSlotId: 'block-header:VfxSystemDefinitionData:0',
        },
      ],
    }

    const link = classifyOutgoingLink(mainNode, scene.connections[0]!)
    expect(link).toEqual({
      kind: 'mapHashEmbed',
      parameterName: 'entries',
      entryKey: brandPath,
      childCanvasId: childId,
    })

    const result = canvasNodeSubtreeToRitual(scene, { main: mainSchema, 'vfx-system-def': vfxSchema }, mainId, {
      blockCardSelectedParametersOnly: true,
      useSchemaFieldNames: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.warnings.some((warning) => /sem nó ligado na cena/i.test(warning))).toBe(false)
    expect(result.text).toContain(`"${brandPath}" = VfxSystemDefinitionData {`)
    expect(result.text).toContain('flags: u16 = 198')
  })

  it('com fidelidade de block card exporta apenas parâmetros seleccionados', () => {
    const emitterSchema: NodeSchemaDefinition = {
      id: 'vfx-emitter-test',
      title: 'VfxEmitterDefinitionData',
      parameters: [
        { id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: '' },
        { id: 'p-blend', name: 'blendMode', type: 'u8', defaultValue: '0' },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'p-emitter',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          defaultValue: 'aaa',
          sourcePath: { kind: 'parameter', parameterId: 'p-emitter' },
        },
      ],
    }

    const nodeId = 'node-emitter'
    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: nodeId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure,
          node: {
            schema: emitterSchema,
            values: [
              { parameterId: 'p-emitter', value: 'aaa' },
              { parameterId: 'p-blend', value: '4' },
            ],
          },
        },
      ],
      connections: [],
    }

    const result = canvasNodeSubtreeToRitual(scene, { [emitterSchema.id]: emitterSchema }, nodeId, {
      blockCardSelectedParametersOnly: true,
      useSchemaFieldNames: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('emitterName: string = "aaa"')
    expect(result.text).not.toContain('blendMode')
  })

  it('no preview de block card usa valor definido no blockStructure actual', () => {
    const emitterSchema: NodeSchemaDefinition = {
      id: 'vfx-emitter-test-live',
      title: 'VfxEmitterDefinitionData',
      parameters: [{ id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: '' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_emitterName',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          // valor actual editado no card de bloco
          defaultValue: 'Teste',
          sourcePath: { kind: 'parameter', parameterId: 'catalog_parameter_emitterName' },
        },
      ],
    }

    const nodeId = 'node-emitter-live'
    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: nodeId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure,
          node: {
            schema: emitterSchema,
            values: [
              // valor antigo no nó (deve ser ignorado no preview de block card)
              { parameterId: 'p-emitter', value: 'Energy Cracks' },
            ],
          },
        },
      ],
      connections: [],
    }

    const result = canvasNodeSubtreeToRitual(scene, { [emitterSchema.id]: emitterSchema }, nodeId, {
      blockCardSelectedParametersOnly: true,
      useSchemaFieldNames: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('emitterName: string = "Teste"')
    expect(result.text).not.toContain('"Energy Cracks"')
  })

  it('exporta parâmetro do card mesmo quando não existe no schema do nó', () => {
    const emitterSchema: NodeSchemaDefinition = {
      id: 'vfx-emitter-test-no-alpha',
      title: 'VfxEmitterDefinitionData',
      parameters: [{ id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: '' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_emitterName',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          defaultValue: 'Aasd',
          sourcePath: { kind: 'parameter', parameterId: 'catalog_parameter_emitterName' },
        },
        {
          idParameter: 'catalog_alphaRef',
          nameParameter: 'alphaRef',
          typeParameter: 'u8',
          defaultValue: '0',
          sourcePath: { kind: 'parameter', parameterId: 'catalog_parameter_alphaRef' },
        },
      ],
    }

    const nodeId = 'node-emitter-no-alpha'
    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: nodeId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure,
          node: {
            schema: emitterSchema,
            values: [{ parameterId: 'p-emitter', value: 'Energy Cracks' }],
          },
        },
      ],
      connections: [],
    }

    const result = canvasNodeSubtreeToRitual(scene, { [emitterSchema.id]: emitterSchema }, nodeId, {
      blockCardSelectedParametersOnly: true,
      useSchemaFieldNames: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('emitterName: string = "Aasd"')
    expect(result.text).toMatch(/alphaRef:\s+\w+\s+=\s+0/)
  })

  it('no preview de block card interpreta ligação de parâmetro estrutural para embed filho', () => {
    const emitterSchema: NodeSchemaDefinition = {
      id: 'vfx-emitter-test-embed-link',
      title: 'VfxEmitterDefinitionData',
      parameters: [],
      internalStructures: [],
      embed: [
        {
          id: 'VfxEmitterDefinitionData_embed_birthScale0',
          title: 'birthScale0',
          internalStructures: [],
          slots: [],
        },
      ],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const valueVector3Schema: NodeSchemaDefinition = {
      id: 'value-vector3-test',
      title: 'ValueVector3',
      parameters: [
        {
          id: 'ValueVector3_parameter_constantValue',
          name: 'constantValue',
          type: 'vector3',
          defaultValue: '0,0,0',
        },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const parentId = 'node-emitter'
    const childId = 'node-value-vector3'
    const parentBlockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_birthScale0',
          nameParameter: 'birthScale0',
          typeParameter: 'ValueVector3',
          defaultValue: '',
          sourcePath: {
            kind: 'embedChild',
            embedId: 'catalog-embed-birthScale0',
            slotId: 'catalog-embed-birthScale0-slot',
            childParameterId: 'ValueVector3_parameter_constantValue',
          },
        },
      ],
    }

    const childBlockStructure: BlockStructurePayload = {
      blockType: 'ValueVector3',
      blockName: 'ValueVector3',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_constantValue',
          nameParameter: 'constantValue',
          typeParameter: 'vec3',
          defaultValue: '191.927, 0, 200',
          sourcePath: { kind: 'parameter', parameterId: 'ValueVector3_parameter_constantValue' },
        },
      ],
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: parentId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure: parentBlockStructure,
          node: {
            schema: emitterSchema,
            values: [],
          },
        },
        {
          id: childId,
          position: { x: 400, y: 0 },
          blockViewActive: true,
          blockStructure: childBlockStructure,
          node: {
            schema: valueVector3Schema,
            values: [
              {
                parameterId: 'ValueVector3_parameter_constantValue',
                value: '191.927, 0, 200',
              },
            ],
          },
        },
      ],
      connections: [
        {
          id: 'c-emitter-to-value-vector3',
          fromNodeId: parentId,
          fromInternalStructureId: '__block__:catalog_birthScale0',
          toNodeId: childId,
          fromBlockSlotId: 'block-param:catalog_birthScale0:output',
          fromBlockParameterId: 'catalog_birthScale0',
          toBlockSlotId: 'block-header:ValueVector3:0',
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(
      scene,
      {
        [emitterSchema.id]: emitterSchema,
        [valueVector3Schema.id]: valueVector3Schema,
      },
      parentId,
      {
        blockCardSelectedParametersOnly: true,
        useSchemaFieldNames: true,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('birthScale0: embed = ValueVector3 {')
    expect(result.text).toContain('constantValue: vec3 = { 191.927, 0, 200 }')
  })

  it('preview de block card usa valor vivo do nó mesmo com defaultValue obsoleto no blockStructure', () => {
    const valueVector3Schema: NodeSchemaDefinition = {
      id: 'value-vector3-def',
      title: 'ValueVector3',
      parameters: [
        {
          id: 'ValueVector3_parameter_constantValue',
          name: 'constantValue',
          type: 'vector3',
          defaultValue: '0, 0, 0',
        },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const emitterSchema: NodeSchemaDefinition = {
      id: 'emitter-def',
      title: 'VfxEmitterDefinitionData',
      parameters: [],
      internalStructures: [],
      embed: [
        {
          id: 'catalog-embed-birthScale0',
          title: 'birthScale0',
          templateBlockId: 'catalog-embed-birthScale0',
          internalStructures: [{ id: 'cat-0', name: 'ValueVector3', schemaId: 'value-vector3-def' }],
          slots: [{ id: 'catalog-embed-birthScale0-slot', name: 'ValueVector3', schemaId: 'value-vector3-def' }],
        },
      ],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const parentId = 'node-emitter-stale'
    const childId = 'node-value-vector3-stale'
    const parentBlockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'circulo_magico',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_birthScale0',
          nameParameter: 'birthScale0',
          typeParameter: 'ValueVector3',
          defaultValue: '',
          sourcePath: {
            kind: 'embedChild',
            embedId: 'catalog-embed-birthScale0',
            slotId: 'catalog-embed-birthScale0-slot',
            childParameterId: 'ValueVector3_parameter_constantValue',
          },
        },
      ],
    }

    const childBlockStructure: BlockStructurePayload = {
      blockType: 'ValueVector3',
      blockName: 'ValueVector3',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_constantValue',
          nameParameter: 'constantValue',
          typeParameter: 'vec3',
          defaultValue: '0, 0, 0',
          sourcePath: { kind: 'parameter', parameterId: 'ValueVector3_parameter_constantValue' },
        },
      ],
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: parentId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure: parentBlockStructure,
          node: { schema: emitterSchema, values: [] },
        },
        {
          id: childId,
          position: { x: 400, y: 0 },
          blockViewActive: true,
          blockStructure: childBlockStructure,
          node: {
            schema: valueVector3Schema,
            values: [
              {
                parameterId: 'ValueVector3_parameter_constantValue',
                value: '680, 680, 50',
              },
            ],
          },
        },
      ],
      connections: [
        {
          id: 'c-emitter-to-value-vector3-stale',
          fromNodeId: parentId,
          fromInternalStructureId: '__block__:catalog_birthScale0',
          toNodeId: childId,
          fromBlockSlotId: 'block-param:catalog_birthScale0:output',
          fromBlockParameterId: 'catalog_birthScale0',
          toBlockSlotId: 'block-header:ValueVector3:0',
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(
      scene,
      {
        [emitterSchema.id]: emitterSchema,
        [valueVector3Schema.id]: valueVector3Schema,
      },
      parentId,
      {
        blockCardSelectedParametersOnly: true,
        useSchemaFieldNames: true,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('constantValue: vec3 = { 680, 680, 50 }')
    expect(result.text).not.toContain('constantValue: vec3 = { 0, 0, 0 }')
  })

  it('no preview de block card emite map[hash,embed] a partir do catálogo', () => {
    const vfxSchema: NodeSchemaDefinition = {
      id: 'vfx-system-def',
      title: 'VfxSystemDefinitionData',
      parameters: [{ id: 'p-name', name: 'particleName', type: 'string', defaultValue: '' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const parentSchema: NodeSchemaDefinition = {
      id: 'vfx-holder',
      title: 'VfxHolder',
      parameters: [
        {
          id: 'p-entries',
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: '',
        },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const pathKey = 'Characters/Brand/Particles/Brand_Base_Joke'
    const mapValue = `${pathKey}\tvfx-system-def\tVfxSystemDefinitionData`

    const nodeId = 'node-vfx-holder'
    const childId = 'node-vfx-child'
    const blockStructure: BlockStructurePayload = {
      blockType: 'VfxHolder',
      blockName: 'VfxHolder',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'p-entries',
          nameParameter: 'entries',
          typeParameter: 'mapHashEmbed',
          defaultValue: mapValue,
          sourcePath: { kind: 'parameter', parameterId: 'p-entries' },
        },
      ],
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: nodeId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure,
          node: {
            schema: parentSchema,
            values: [{ parameterId: 'p-entries', value: mapValue }],
          },
        },
        {
          id: childId,
          position: { x: 400, y: 0 },
          node: {
            schema: vfxSchema,
            values: [{ parameterId: 'p-name', value: 'JokeFx' }],
          },
        },
      ],
      connections: [
        {
          id: 'c-holder-to-vfx',
          fromNodeId: nodeId,
          fromInternalStructureId: `p-entries__map_embed__${pathKey}`,
          toNodeId: childId,
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(
      scene,
      { 'vfx-holder': parentSchema, 'vfx-system-def': vfxSchema },
      nodeId,
      {
        blockCardSelectedParametersOnly: true,
        useSchemaFieldNames: true,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('entries: map[hash,embed] = {')
    expect(result.text).toContain(`"${pathKey}" = VfxSystemDefinitionData {`)
    expect(result.text).toContain('particleName: string = "JokeFx"')
  })

  it('no preview de block card emite list[pointer] do parâmetro estrutural (com ou sem ligação)', () => {
    const emitterSchema: NodeSchemaDefinition = {
      id: 'vfx-emitter-test-list-ptr',
      title: 'VfxEmitterDefinitionData',
      parameters: [{ id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: '' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const systemSchema: NodeSchemaDefinition = {
      id: 'vfx-system-test-list-ptr',
      title: 'VfxSystemDefinitionData',
      parameters: [{ id: 'p-flags', name: 'flags', type: 'u16', defaultValue: '0' }],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [
        {
          id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData',
          title: 'complexEmitterDefinitionData',
          internalStructures: Array.from({ length: 11 }, (_, index) => ({
            id: `catalog-emitter-${String(index)}`,
            name: 'VfxEmitterDefinitionData',
            schemaId: emitterSchema.id,
          })),
        },
      ],
      list2Embed: [],
      list2Pointer: [],
    }

    const listParamId = 'complexEmitterDefinitionData_pointer'
    const listSlotId = `${listParamId}__slot__0`
    const systemId = 'node-system'
    const emitterId = 'node-emitter'

    const systemBlockStructure: BlockStructurePayload = {
      blockType: 'VfxSystemDefinitionData',
      blockName: 'VfxSystemDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_flags',
          nameParameter: 'flags',
          typeParameter: 'u16',
          defaultValue: '198',
          sourcePath: { kind: 'parameter', parameterId: 'p-flags' },
        },
        {
          idParameter: listParamId,
          nameParameter: 'complexEmitterDefinitionData',
          typeParameter: 'VfxEmitterDefinitionData',
          listParameter: true,
          defaultValue: '',
          sourcePath: {
            kind: 'pointerChild',
            pointerId: 'catalog-ptr-complex',
            slotId: 'catalog-ptr-complex-slot',
          },
        },
      ],
    }

    const emitterBlockStructure: BlockStructurePayload = {
      blockType: 'VfxEmitterDefinitionData',
      blockName: 'VfxEmitterDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_emitterName',
          nameParameter: 'emitterName',
          typeParameter: 'string',
          defaultValue: 'Brand_Base_E_Conflagration_buf',
          sourcePath: { kind: 'parameter', parameterId: 'p-emitter' },
        },
      ],
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: systemId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure: systemBlockStructure,
          node: {
            schema: systemSchema,
            values: [{ parameterId: 'p-flags', value: '198' }],
          },
        },
        {
          id: emitterId,
          position: { x: 400, y: 0 },
          blockViewActive: true,
          blockStructure: emitterBlockStructure,
          node: {
            schema: emitterSchema,
            values: [{ parameterId: 'p-emitter', value: 'Brand_Base_E_Conflagration_buf' }],
          },
        },
      ],
      connections: [
        {
          id: 'c-system-emitter',
          fromNodeId: systemId,
          fromInternalStructureId: `__block__:${listSlotId}`,
          toNodeId: emitterId,
          fromBlockSlotId: listSlotId,
          fromBlockParameterId: listParamId,
          toBlockSlotId: 'block-header:VfxEmitterDefinitionData:0:complexEmitterDefinitionData',
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(
      scene,
      { [systemSchema.id]: systemSchema, [emitterSchema.id]: emitterSchema },
      systemId,
      {
        blockCardSelectedParametersOnly: true,
        useSchemaFieldNames: true,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('flags: u16 = 198')
    expect(result.text).toContain('complexEmitterDefinitionData: list[pointer] = {')
    expect(result.text).toContain('VfxEmitterDefinitionData {')
    expect(result.text).toContain('emitterName: string = "Brand_Base_E_Conflagration_buf"')
    expect(result.text.match(/VfxEmitterDefinitionData \{\}/g)?.length ?? 0).toBe(0)
    expect(result.text.match(/VfxEmitterDefinitionData \{/g)?.length ?? 0).toBe(1)
  })

  it('no preview de block card emite list[embed] mesmo sem listParameter quando o schema tem listEmbed', () => {
    const valueFloatSchema: NodeSchemaDefinition = {
      id: 'value-float-test',
      title: 'ValueFloat',
      parameters: [
        { id: 'p-constant', name: 'constantValue', type: 'f32', defaultValue: '0' },
      ],
      internalStructures: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const alphaSchema: NodeSchemaDefinition = {
      id: 'vfx-alpha-erosion-test',
      title: 'VfxAlphaErosionDefinitionData',
      parameters: [
        { id: 'p-feather', name: 'erosionFeatherIn', type: 'f32', defaultValue: '0.2' },
      ],
      internalStructures: [],
      embed: [
        {
          id: 'VfxAlphaErosionDefinitionData_embed_erosionDriveCurve',
          title: 'erosionDriveCurve',
          internalStructures: [
            {
              id: 'catalog-value-float-embed',
              name: 'ValueFloat',
              schemaId: valueFloatSchema.id,
            },
          ],
        },
      ],
      pointer: [],
      listEmbed: [
        {
          id: 'VfxAlphaErosionDefinitionData_listEmbed_erosionDriveCurve',
          title: 'erosionDriveCurve',
          internalStructures: [
            {
              id: 'catalog-value-float-list',
              name: 'ValueFloat',
              schemaId: valueFloatSchema.id,
            },
          ],
        },
      ],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
    }

    const embedParamId = 'erosionDriveCurve_embed'
    const embedSlotId = `${embedParamId}__slot__0`
    const alphaId = 'node-alpha'
    const valueFloatId = 'node-value-float'

    const alphaBlockStructure: BlockStructurePayload = {
      blockType: 'VfxAlphaErosionDefinitionData',
      blockName: 'VfxAlphaErosionDefinitionData',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_erosionFeatherIn',
          nameParameter: 'erosionFeatherIn',
          typeParameter: 'f32',
          defaultValue: '0.2',
          sourcePath: { kind: 'parameter', parameterId: 'p-feather' },
        },
        {
          idParameter: embedParamId,
          nameParameter: 'erosionDriveCurve',
          typeParameter: 'ValueFloat',
          defaultValue: '',
          sourcePath: {
            kind: 'embedChild',
            embedId: 'catalog-embed-erosion',
            slotId: 'catalog-embed-erosion-slot',
          },
        },
      ],
    }

    const valueFloatBlockStructure: BlockStructurePayload = {
      blockType: 'ValueFloat',
      blockName: 'ValueFloat',
      identification_codes: [],
      parameters: [
        {
          idParameter: 'catalog_constantValue',
          nameParameter: 'constantValue',
          typeParameter: 'f32',
          defaultValue: '5',
          sourcePath: { kind: 'parameter', parameterId: 'p-constant' },
        },
      ],
    }

    const scene: CanvasScene = {
      width: 1000,
      height: 800,
      nodes: [
        {
          id: alphaId,
          position: { x: 0, y: 0 },
          blockViewActive: true,
          blockStructure: alphaBlockStructure,
          node: {
            schema: alphaSchema,
            values: [{ parameterId: 'p-feather', value: '0.2' }],
          },
        },
        {
          id: valueFloatId,
          position: { x: 400, y: 0 },
          blockViewActive: true,
          blockStructure: valueFloatBlockStructure,
          node: {
            schema: valueFloatSchema,
            values: [{ parameterId: 'p-constant', value: '5' }],
          },
        },
      ],
      connections: [
        {
          id: 'c-alpha-value-float',
          fromNodeId: alphaId,
          fromInternalStructureId: `__block__:${embedSlotId}`,
          toNodeId: valueFloatId,
          fromBlockSlotId: embedSlotId,
          fromBlockParameterId: embedParamId,
          toBlockSlotId: 'block-header:ValueFloat:0:constantValue',
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(
      scene,
      { [alphaSchema.id]: alphaSchema, [valueFloatSchema.id]: valueFloatSchema },
      alphaId,
      {
        blockCardSelectedParametersOnly: true,
        useSchemaFieldNames: true,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('erosionFeatherIn: f32 = 0.2')
    expect(result.text).toContain('erosionDriveCurve: list[embed] = {')
    expect(result.text).toContain('ValueFloat {')
    expect(result.text).toContain('constantValue: f32 = 5')
    expect(result.text).not.toContain('erosionDriveCurve: embed =')
    expect(result.text.match(/erosionDriveCurve: list\[embed\] = \{\s*\}/s)?.length ?? 0).toBe(0)
  })
})
