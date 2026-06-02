import { describe, expect, it } from 'vitest'

import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'
import {
  blockDefinitionInstanceKey,
  mergeSchemaRegistryWithSceneNodes,
  resolveSchemaIdForBlockDefinitionContext,
  resolveSchemaIdFromGlobalStructureReferences,
} from './blockDefinitionSchemaResolve'
import { enrichAutoBuildPlanWithCatalogParameters } from './blockAutoBuild'
import { collectParameterDocumentsForDefinitionTree } from './blockStructureFromDefinition'
import type { CanvasNode } from './canvasScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-test',
  title: 'VfxEmitterDefinitionData',
  parameters: [],
  embed: [],
  pointer: [
    {
      id: 'VfxEmitterDefinitionData_pointer_softParticleParams',
      title: 'softParticleParams',
      internalStructures: [
        {
          id: 'emitter-soft-particle',
          name: 'VfxSoftParticleDefinitionData',
          schemaId: 'vfx-soft-particle-scene',
        },
      ],
      slots: [
        {
          id: 'VfxEmitterDefinitionData_pointer_softParticleParams__slot__0',
          name: 'VfxSoftParticleDefinitionData',
          schemaId: 'vfx-soft-particle-scene',
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
  id: 'vfx-soft-particle-scene',
  title: 'VfxSoftParticleDefinitionData',
  parameters: [
    {
      id: 'VfxSoftParticleDefinitionData_parameter_deltaIn',
      name: 'deltaIn',
      type: 'f32',
      defaultValue: '50',
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

const emitterBlock: BlockDefinitionJsonDocument = {
  id: 'VfxEmitterDefinitionData_VfxEmitterDefinitionData',
  block: 'complexEmitterDefinitionData',
  blockName: 'VfxEmitterDefinitionData',
  type: 'pointer',
  name: 'VfxEmitterDefinitionData',
  source: {
    kind: 'block',
    nodeId: 'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}',
  },
  color: '#40ff56',
  headerSlots: ['in[complexEmitterDefinitionData]', 'out[VfxEmitterDefinitionDataPreview]'],
  parameters: ['softParticleParams'],
}

describe('blockDefinitionSchemaResolve', () => {
  it('resolve child schema via parent pointer reference', () => {
    const registry = {
      [emitterSchema.id]: emitterSchema,
      [softParticleSchema.id]: softParticleSchema,
    }

    const resolved = resolveSchemaIdForBlockDefinitionContext(
      'VfxSoftParticleDefinitionData',
      registry,
      {
        parentBlockName: 'VfxEmitterDefinitionData',
        parentParameterName: 'softParticleParams',
      },
    )

    expect(resolved).toBe('vfx-soft-particle-scene')
  })

  it('resolve schema from scene node when absent in global registry', () => {
    const softParticleNode: CanvasNode = {
      id: 'n-soft',
      position: { x: 0, y: 0 },
      node: {
        id: 'n-soft',
        schema: softParticleSchema,
        values: [],
      },
    }

    const registry = mergeSchemaRegistryWithSceneNodes({ [emitterSchema.id]: emitterSchema }, [
      softParticleNode,
    ])

    const resolved = resolveSchemaIdForBlockDefinitionContext(
      'VfxSoftParticleDefinitionData',
      registry,
      { sceneNodes: [softParticleNode] },
    )

    expect(resolved).toBe('vfx-soft-particle-scene')
  })

  it('uses unique instance key per block nodeId', () => {
    const a = blockDefinitionInstanceKey({
      blockName: 'ValueFloat',
      source: { nodeId: 'value-float__a' },
    })
    const b = blockDefinitionInstanceKey({
      blockName: 'ValueFloat',
      source: { nodeId: 'value-float__b' },
    })
    expect(a).not.toBe(b)
  })
})

describe('collectParameterDocumentsForDefinitionTree child hierarchy', () => {
  it('collects child block parameters through pointer chain', () => {
    const registry = {
      [emitterSchema.id]: emitterSchema,
      [softParticleSchema.id]: softParticleSchema,
    }

    const docs = collectParameterDocumentsForDefinitionTree(emitterBlock, registry)
    const keys = docs.map((doc) => `${doc.block}::${doc.parameterName}`)

    expect(keys).toContain('VfxEmitterDefinitionData::softParticleParams')
    expect(keys).toContain('VfxSoftParticleDefinitionData::deltaIn')
  })

  it('collects multiple child instances with distinct nodeIds', () => {
    const registry = {
      [emitterSchema.id]: emitterSchema,
      [softParticleSchema.id]: softParticleSchema,
    }

    const emitterBlockTwo: BlockDefinitionJsonDocument = {
      ...emitterBlock,
      source: {
        kind: 'block',
        nodeId:
          'vfx-emitter-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-2',
      },
    }

    const first = collectParameterDocumentsForDefinitionTree(emitterBlock, registry)
    const second = collectParameterDocumentsForDefinitionTree(emitterBlockTwo, registry)

    const childSources = [...first, ...second]
      .filter((doc) => doc.block === 'VfxSoftParticleDefinitionData')
      .map((doc) => doc.source.parameterId)

    expect(childSources).toHaveLength(2)
    expect(new Set(childSources).size).toBe(2)
  })
})

describe('enrichAutoBuildPlanWithCatalogParameters', () => {
  it('does not error when schema is missing but parameters already exist on disk', () => {
    const orphanBlock: BlockDefinitionJsonDocument = {
      id: 'VfxSoftParticleDefinitionData_VfxSoftParticleDefinitionData',
      block: 'softParticleParams',
      blockName: 'VfxSoftParticleDefinitionData',
      type: 'pointer',
      name: 'VfxSoftParticleDefinitionData',
      source: {
        kind: 'block',
        nodeId:
          'vfx-soft-particle-definition-data__main-entries-{particlePath}-complex-emitter-definition-data-{ceddId}-soft-particle-params',
      },
      color: '#40ff56',
      headerSlots: ['in[softParticleParams]', 'out[VfxSoftParticleDefinitionDataPreview]'],
      parameters: ['deltaIn'],
    }

    const enriched = enrichAutoBuildPlanWithCatalogParameters([], [orphanBlock], {}, [])

    expect(enriched.errors).toEqual([])
  })
})

describe('resolveSchemaIdFromGlobalStructureReferences', () => {
  it('finds child schema id referenced anywhere in registry', () => {
    const registry = {
      [emitterSchema.id]: emitterSchema,
      [softParticleSchema.id]: softParticleSchema,
    }

    expect(resolveSchemaIdFromGlobalStructureReferences('VfxSoftParticleDefinitionData', registry)).toBe(
      'vfx-soft-particle-scene',
    )
  })
})
