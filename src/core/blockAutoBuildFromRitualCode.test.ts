import { describe, expect, it } from 'vitest'

import {
  buildBlockCatalogFromNodeRitualCode,
  collectBlockInstancesFromRitualCode,
  collectBlockInstancesFromRitualParse,
  extractBlockParameterDocumentsFromRitualInstances,
  parseRitualCodeToBlockSchemas,
  prepareSceneForRitualBlockExport,
  resolveRootSchemaFromParse,
  synchronizeParameterDocumentsWithBlockDefinitions,
} from './blockAutoBuildFromRitualCode'
import { buildBlockAutoBuildPlanFromRitualCode } from './blockAutoBuild'
import { validateBlockParameterDocument } from './blockParameterRegistry'
import { canvasNodeSubtreeToRitual } from './canvasToClassGroupRitual'
import type { CanvasNode, CanvasScene } from './canvasScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-test',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'p-name', name: 'emitterName', type: 'string', defaultValue: 'sparks' },
  ],
  embed: [],
  pointer: [
    {
      id: 'VfxEmitterDefinitionData_pointer_softParticleParams',
      title: 'softParticleParams',
      internalStructures: [
        {
          id: 'emitter-soft-particle',
          name: 'VfxSoftParticleDefinitionData',
          schemaId: 'vfx-soft-particle-test',
        },
      ],
      slots: [
        {
          id: 'VfxEmitterDefinitionData_pointer_softParticleParams__slot__0',
          name: 'VfxSoftParticleDefinitionData',
          schemaId: 'vfx-soft-particle-test',
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

const softParticleSchema: NodeSchemaDefinition = {
  id: 'vfx-soft-particle-test',
  title: 'VfxSoftParticleDefinitionData',
  parameters: [
    { id: 'p-delta', name: 'deltaIn', type: 'f32', defaultValue: '50' },
  ],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

function makeEmitterScene(): {
  scene: CanvasScene
  emitter: CanvasNode
  softParticle: CanvasNode
  registry: Record<string, NodeSchemaDefinition>
} {
  const systemSchema: NodeSchemaDefinition = {
    id: 'vfx-system-test',
    title: 'VfxSystemDefinitionData',
    parameters: [],
    internalStructures: [],
    listPointer: [
      {
        id: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData',
        title: 'complexEmitterDefinitionData',
        internalStructures: [
          {
            id: 'slot-emitter',
            name: 'VfxEmitterDefinitionData',
            schemaId: 'vfx-emitter-test',
          },
        ],
      },
    ],
    embed: [],
    pointer: [],
    listEmbed: [],
    list2Embed: [],
    list2Pointer: [],
  }

  const systemNode: CanvasNode = {
    id: 'n-system',
    position: { x: 0, y: 0 },
    node: { id: 'n-system', schema: systemSchema, values: [] },
  }

  const softParticle: CanvasNode = {
    id: 'n-soft',
    position: { x: 240, y: 0 },
    node: {
      id: 'n-soft',
      schema: softParticleSchema,
      values: [{ parameterId: 'p-delta', value: '50' }],
    },
  }

  const emitter: CanvasNode = {
    id: 'n-emitter',
    position: { x: 120, y: 0 },
    node: {
      id: 'n-emitter',
      schema: emitterSchema,
      values: [{ parameterId: 'p-name', value: 'sparks' }],
    },
  }

  const scene: CanvasScene = {
    width: 800,
    height: 600,
    nodes: [systemNode, emitter, softParticle],
    connections: [
      {
        id: 'c-system-emitter',
        fromNodeId: 'n-system',
        fromInternalStructureId: 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData__slot__0',
        toNodeId: 'n-emitter',
      },
      {
        id: 'c-emitter-soft',
        fromNodeId: 'n-emitter',
        fromInternalStructureId: 'VfxEmitterDefinitionData_pointer_softParticleParams__slot__0',
        toNodeId: 'n-soft',
      },
    ],
  }

  const registry: Record<string, NodeSchemaDefinition> = {
    [systemSchema.id]: systemSchema,
    [emitterSchema.id]: emitterSchema,
    [softParticleSchema.id]: softParticleSchema,
  }

  return { scene, emitter, softParticle, registry }
}

describe('blockAutoBuildFromRitualCode', () => {
  it('exporta ritual e inclui bloco filho softParticleParams no parse', () => {
    const { scene, emitter, registry } = makeEmitterScene()
    const prepared = prepareSceneForRitualBlockExport(scene)

    const exported = canvasNodeSubtreeToRitual(prepared, registry, emitter.id, {
      mapEntryKey: null,
    })
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    expect(exported.text).toContain('softParticleParams')
    expect(exported.text).toContain('deltaIn')

    const parse = parseRitualCodeToBlockSchemas(exported.text)
    const rootSchema = resolveRootSchemaFromParse(parse, emitter)
    expect(rootSchema).not.toBeNull()

    const instances = collectBlockInstancesFromRitualParse(parse, rootSchema!, scene, emitter)
    const blocks = instances.map((entry) => entry.blockName)
    expect(blocks).toContain('VfxEmitterDefinitionData')
    expect(blocks).toContain('VfxSoftParticleDefinitionData')
  })

  it('gera catálogo com parâmetro filho deltaIn', () => {
    const { scene, emitter, registry } = makeEmitterScene()
    const catalog = buildBlockCatalogFromNodeRitualCode(scene, registry, emitter)

    expect(catalog.errors).toEqual([])
    const paramKeys = catalog.parameterDocuments.map(
      (doc) => `${doc.block}::${doc.parameterName}`,
    )
    expect(paramKeys).toContain('VfxEmitterDefinitionData::emitterName')
    expect(paramKeys).toContain('VfxEmitterDefinitionData::softParticleParams')
    expect(paramKeys).toContain('VfxSoftParticleDefinitionData::deltaIn')
  })

  it('serializa list[vec3] values como items string[] válidos para JSON', () => {
    const dynamicsSchema: NodeSchemaDefinition = {
      id: 'vfx-animated-vector3-test',
      title: 'VfxAnimatedVector3fVariableData',
      parameters: [
        { id: 'p-times', name: 'times', type: 'listF32', defaultValue: '0' },
        { id: 'p-values', name: 'values', type: 'listVector3', defaultValue: '' },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const dynamicsNode: CanvasNode = {
      id: 'n-dynamics',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-dynamics',
        schema: dynamicsSchema,
        values: [
          { parameterId: 'p-times', value: '0\n0.3\n1' },
          {
            parameterId: 'p-values',
            value: '{ 0, 1400, 0 }\n{ 0, 1400, 0 }\n{ 0, 3500, 0 }',
          },
        ],
      },
    }

    const scene: CanvasScene = {
      width: 800,
      height: 600,
      nodes: [dynamicsNode],
      connections: [],
    }
    const registry = { [dynamicsSchema.id]: dynamicsSchema }
    const catalog = buildBlockCatalogFromNodeRitualCode(scene, registry, dynamicsNode)
    const valuesDoc = catalog.parameterDocuments.find((doc) => doc.parameterName === 'values')

    expect(valuesDoc?.type).toBe('listVector3')
    expect(Array.isArray(valuesDoc?.items)).toBe(true)
    expect(valuesDoc?.items?.every((item) => typeof item === 'string')).toBe(true)
    expect(valuesDoc?.items).toEqual(['0, 1400, 0', '0, 1400, 0', '0, 3500, 0'])

    const validated = validateBlockParameterDocument(valuesDoc)
    expect(validated.ok).toBe(true)
  })

  it('atravessa entries map[hash,embed] no ritual puro', () => {
    const ritual = `
#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = { "DATA/test.bin" }
entries: map[hash,embed] = {
  "Characters/Test/Skins/Skin0" = SkinCharacterDataProperties {
    armorMaterial: string = "Flesh"
  }
}
`.trim()

    const parse = parseRitualCodeToBlockSchemas(ritual)
    const main = parse.registry.get('main') ?? [...parse.registry.values()].find((s) => s.title === 'Main')
    expect(main).toBeDefined()

    const instances = collectBlockInstancesFromRitualCode(parse, main!)
    const blockNames = instances.map((entry) => entry.blockName)
    expect(blockNames).toContain('Main')
    expect(blockNames).toContain('SkinCharacterDataProperties')

    const plan = buildBlockAutoBuildPlanFromRitualCode(ritual)
    expect(plan.errors).not.toContain('EMPTY_CODE')
    expect(
      plan.parameterDocuments.some(
        (doc) => doc.block === 'SkinCharacterDataProperties' && doc.parameterName === 'armorMaterial',
      ),
    ).toBe(true)
  })

  it('extractBlockParameterDocumentsFromRitualInstances cobre nomes dos blocos', () => {
    const ritual = `
ValueFloat {
  constantValue: f32 = 3
}
`.trim()

    const parse = parseRitualCodeToBlockSchemas(ritual)
    const root = [...parse.registry.values()].find((s) => s.title === 'ValueFloat')
    expect(root).toBeDefined()

    const instances = collectBlockInstancesFromRitualCode(parse, root!)
    const extracted = extractBlockParameterDocumentsFromRitualInstances(instances)

    expect(extracted.some((doc) => doc.parameterName === 'constantValue')).toBe(true)

    const synced = synchronizeParameterDocumentsWithBlockDefinitions(
      [
        {
          id: 'ValueFloat_ValueFloat',
          block: 'standalone',
          blockName: 'ValueFloat',
          type: 'standalone',
          name: 'ValueFloat',
          source: { kind: 'block', nodeId: 'test' },
          color: '#40ff56',
          headerSlots: [],
          parameters: ['constantValue'],
        },
      ],
      [],
      instances,
    )

    expect(synced.map((doc) => doc.parameterName)).toEqual(['constantValue'])
  })
})
