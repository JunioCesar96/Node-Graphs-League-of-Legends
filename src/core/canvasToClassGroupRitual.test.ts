import { describe, expect, it } from 'vitest'

import {
  canvasNodeSubtreeToRitual,
  canvasToClassGroupRitual,
} from '@/core/canvasToClassGroupRitual'
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
})
