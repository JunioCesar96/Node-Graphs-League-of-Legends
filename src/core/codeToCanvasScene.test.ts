import { describe, expect, it } from 'vitest'

import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { buildPackTypeIndex, codeToCanvasScene, resolvePackSchemaId } from '@/core/codeToCanvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

const minimalMainSchema: NodeSchemaDefinition = {
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
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'main',
  },
}

const childSchema: NodeSchemaDefinition = {
  id: 'sample-type',
  title: 'SampleType',
  parameters: [
    {
      id: 'sample-type_parameter_name',
      name: 'name',
      type: 'string',
      defaultValue: '',
    },
  ],
  internalStructures: [],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'SampleType',
  },
}

const verboseChildSchema: NodeSchemaDefinition = {
  id: 'verbose-type',
  title: 'VerboseType',
  parameters: [
    {
      id: 'verbose-type_parameter_name',
      name: 'name',
      type: 'string',
      defaultValue: 'pack-default-name',
    },
    {
      id: 'verbose-type_parameter_extra',
      name: 'extraField',
      type: 'f32',
      defaultValue: '99',
    },
    {
      id: 'verbose-type_parameter_unused',
      name: 'unused',
      type: 'u32',
      defaultValue: '0',
    },
  ],
  internalStructures: [],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'VerboseType',
  },
}

const vfxSchema: NodeSchemaDefinition = {
  id: 'vfx-system-definition-data',
  title: 'VfxSystemDefinitionData',
  parameters: [
    {
      id: 'vfx-system-definition-data_parameter_particleLifetime',
      name: 'particleLifetime',
      type: 'f32',
      defaultValue: '0',
    },
  ],
  internalStructures: [],
  listPointer: [
    {
      id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData',
      title: 'complexEmitterDefinitionData',
      internalStructures: [
        {
          id: 'vfx-system-definition-data-complex-emitter-definition-data-0',
          name: 'VfxEmitterDefinitionData',
          schemaId: 'vfx-emitter-definition-data',
        },
      ],
      slots: [],
    },
  ],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'VfxSystemDefinitionData',
  },
}

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-definition-data',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    {
      id: 'vfx-emitter-definition-data_parameter_EmitterName',
      name: 'EmitterName',
      type: 'string',
      defaultValue: '',
    },
    {
      id: 'vfx-emitter-definition-data_parameter_Lifetime',
      name: 'Lifetime',
      type: 'f32',
      defaultValue: '1',
    },
  ],
  internalStructures: [],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'VfxEmitterDefinitionData',
  },
}

const outerSchema: NodeSchemaDefinition = {
  id: 'outer-type',
  title: 'OuterType',
  parameters: [],
  internalStructures: [],
  listEmbed: [
    {
      id: 'outer-type_list_embed_Items',
      title: 'Items',
      internalStructures: [],
      catalog: [{ schemaId: 'sample-type', typeName: 'SampleType' }],
      slots: [],
    },
  ],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'OuterType',
  },
}

describe('buildPackTypeIndex', () => {
  it('resolve tipo pelo title', () => {
    const index = buildPackTypeIndex([minimalMainSchema, childSchema])
    const packRegistry: Record<string, NodeSchemaDefinition> = {
      'sample-type': childSchema,
    }
    expect(
      resolvePackSchemaId(packRegistry, index, { ...childSchema, title: 'SampleType' } as never),
    ).toBe('sample-type')
  })

  it('prefere instância parseada no registry quando o id tem sufixo __', () => {
    const index = buildPackTypeIndex([minimalMainSchema, childSchema])
    const instanceId = 'sample-type__entries-key1'
    const instanceSchema = {
      ...childSchema,
      id: instanceId,
      parameters: [{ id: 'p1', name: 'name', type: 'string', defaultValue: 'hello' }],
    }
    const packRegistry: Record<string, NodeSchemaDefinition> = {
      'sample-type': childSchema,
      [instanceId]: instanceSchema,
    }
    expect(resolvePackSchemaId(packRegistry, index, instanceSchema as never)).toBe(instanceId)
  })
})

describe('codeToCanvasScene', () => {
  const registry: Record<string, NodeSchemaDefinition> = {
    main: minimalMainSchema,
    'sample-type': childSchema,
    'outer-type': outerSchema,
    'verbose-type': verboseChildSchema,
    'vfx-system-definition-data': vfxSchema,
    'vfx-emitter-definition-data': emitterSchema,
  }

  const packFolderBySchemaId: Record<string, string> = {
    main: 'testpack',
    'sample-type': 'testpack',
    'outer-type': 'testpack',
    'verbose-type': 'testpack',
    'vfx-system-definition-data': 'testpack',
    'vfx-emitter-definition-data': 'testpack',
  }

  it('rejeita texto vazio', () => {
    const result = codeToCanvasScene('', 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/vazio/i)
    }
  })

  it('rejeita pack sem main', () => {
    const result = codeToCanvasScene('x = 1', 'other', registry, {
      main: 'other',
      'sample-type': 'testpack',
    })
    expect(result.ok).toBe(false)
  })

  it('gera cena com main e ligação wireless a partir de entries map', () => {
    const ritual = `
entries: map[hash,embed] = {
  "key1" = SampleType {
    name = "hello"
  }
}
`
    const result = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.scene.nodes.length).toBeGreaterThanOrEqual(2)
      const mainNode = result.scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
      expect(mainNode).toBeDefined()
      const child = result.scene.nodes.find((n) => n.node.schema.title === 'SampleType')
      expect(child).toBeDefined()
      expect(result.scene.connections.length).toBeGreaterThan(0)
      expect(result.scene.connections.every((c) => c.routing === 'wireless')).toBe(true)
      const mainCanvasId = mainNode!.id
      const entryConnection = result.scene.connections.find(
        (c) =>
          c.fromNodeId === mainCanvasId &&
          c.toNodeId === child!.id &&
          c.fromInternalStructureId.includes('__map_embed__'),
      )
      expect(entryConnection).toBeDefined()
    }
  })

  it('cria um nó canvas por entrada mapHashEmbed do mesmo tipo', () => {
    const ritual = `
entries: map[hash,embed] = {
  "key1" = SampleType {
    name: string = "first"
  }
  "key2" = SampleType {
    name: string = "second"
  }
}
`
    const result = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const sampleNodes = result.scene.nodes.filter((n) => n.node.schema.title === 'SampleType')
    expect(sampleNodes).toHaveLength(2)

    const names = sampleNodes.map(
      (n) => n.node.values.find((v) => v.parameterId.includes('name'))?.value ?? '',
    )
    expect(names).toContain('first')
    expect(names).toContain('second')
    expect(new Set(names).size).toBe(2)

    const mainNode = result.scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)!
    const embedConnections = result.scene.connections.filter(
      (c) =>
        c.fromNodeId === mainNode.id &&
        c.fromInternalStructureId.includes('__map_embed__') &&
        c.routing === 'wireless',
    )
    expect(embedConnections).toHaveLength(2)
    expect(new Set(embedConnections.map((c) => c.toNodeId)).size).toBe(2)
  })

  it('cria um nó canvas por item list[embed] do mesmo tipo', () => {
    const ritual = `
entries: map[hash,embed] = {
  "key" = OuterType {
    Items: list[embed] = {
      SampleType {
        name: string = "first"
      }
      SampleType {
        name: string = "second"
      }
    }
  }
}
`
    const result = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const innerNodes = result.scene.nodes.filter((n) => n.node.schema.title === 'SampleType')
    expect(innerNodes).toHaveLength(2)

    const names = innerNodes.map(
      (n) => n.node.values.find((v) => v.parameterId.includes('name'))?.value ?? '',
    )
    expect(names).toContain('first')
    expect(names).toContain('second')
    expect(new Set(names).size).toBe(2)

    const outerNode = result.scene.nodes.find((n) => n.node.schema.title === 'OuterType')
    expect(outerNode).toBeDefined()
    const listConnections = result.scene.connections.filter(
      (c) => c.fromNodeId === outerNode!.id && c.routing === 'wireless',
    )
    expect(listConnections.length).toBeGreaterThanOrEqual(2)
    expect(new Set(listConnections.map((c) => c.toNodeId)).size).toBe(2)
  })

  it('só inclui parâmetros presentes no ritual (sem defaults extra do pack)', () => {
    const ritual = `
entries: map[hash,embed] = {
  "key" = VerboseType {
    name: string = "from-ritual"
  }
}
`
    const result = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const verboseNode = result.scene.nodes.find((n) => n.node.schema.title === 'VerboseType')
    expect(verboseNode).toBeDefined()
    expect(verboseNode!.node.schema.parameters).toHaveLength(1)
    expect(verboseNode!.node.schema.parameters[0]!.name).toBe('name')
    expect(verboseNode!.node.values).toHaveLength(1)
    expect(verboseNode!.node.values[0]!.value).toBe('from-ritual')
  })

  it('cria um nó canvas por item list[pointer] do mesmo tipo', () => {
    const ritual = `
entries: map[hash,embed] = {
  "Vfx/Key" = VfxSystemDefinitionData {
    particleLifetime: f32 = 1
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        EmitterName: string = "Ring"
      }
      VfxEmitterDefinitionData {
        EmitterName: string = "Glow"
      }
    }
  }
}
`
    const result = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const emitters = result.scene.nodes.filter((n) => n.node.schema.title === 'VfxEmitterDefinitionData')
    expect(emitters).toHaveLength(2)

    const emitterNames = emitters.map(
      (n) => n.node.values.find((v) => v.parameterId.includes('EmitterName'))?.value ?? '',
    )
    expect(emitterNames).toContain('Ring')
    expect(emitterNames).toContain('Glow')
    expect(emitters.every((n) => n.node.schema.parameters.length === 1)).toBe(true)

    const vfxNode = result.scene.nodes.find((n) => n.node.schema.title === 'VfxSystemDefinitionData')
    expect(vfxNode).toBeDefined()
    const listPtrConnections = result.scene.connections.filter(
      (c) => c.fromNodeId === vfxNode!.id && c.routing === 'wireless',
    )
    expect(listPtrConnections.length).toBeGreaterThanOrEqual(2)
    expect(new Set(listPtrConnections.map((c) => c.toNodeId)).size).toBe(2)
    expect(new Set(listPtrConnections.map((c) => c.fromInternalStructureId)).size).toBe(2)

    const listBlock = vfxNode!.node.schema.listPointer?.find((block) =>
      block.title.localeCompare('complexEmitterDefinitionData', undefined, {
        sensitivity: 'accent',
      }) === 0,
    )
    expect(listBlock).toBeDefined()
    expect(listBlock!.slots?.length).toBeGreaterThanOrEqual(2)
    expect(listBlock!.slots![0]!.schemaId.startsWith('vfx-emitter-definition-data')).toBe(true)
  })
})
