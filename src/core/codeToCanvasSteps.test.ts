import { describe, expect, it } from 'vitest'

import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { buildPackTypeIndex, codeToCanvasScene } from '@/core/codeToCanvasScene'
import {
  buildSceneThroughSteps,
  finalizeCodeToCanvasScene,
  formatStepLabel,
  planBuildSteps,
  prepareCodeToCanvasBuild,
} from '@/core/codeToCanvasSteps'
import { parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'
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
  ],
  internalStructures: [],
  nomenclature: {
    group: '',
    collection: '',
    collectionType: 'VfxEmitterDefinitionData',
  },
}

const registry: Record<string, NodeSchemaDefinition> = {
  main: minimalMainSchema,
  'vfx-system-definition-data': vfxSchema,
  'vfx-emitter-definition-data': emitterSchema,
}

const packFolderBySchemaId: Record<string, string> = {
  main: 'testpack',
  'vfx-system-definition-data': 'testpack',
  'vfx-emitter-definition-data': 'testpack',
}

const listPointerRitual = `
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

describe('planBuildSteps', () => {
  it('ordena createNode e attachLink como walkParsedNode (list[pointer] PascalCase)', () => {
    const parsed = parseClassGroupRitualWithStack(listPointerRitual)
    const steps = planBuildSteps(parsed.registry)

    expect(steps[0]?.kind).toBe('createNode')
    expect(steps[0]?.kind === 'createNode' && steps[0].parsedId).toBe(MAIN_SCHEMA_ID)

    const listPointerLinks = steps.filter(
      (step) => step.kind === 'attachLink' && step.link.kind === 'listPointer',
    )
    expect(listPointerLinks).toHaveLength(2)
    expect(listPointerLinks.map((step) => (step.kind === 'attachLink' ? step.link.index : -1))).toEqual([
      0, 1,
    ])

    const attachLinkStep = steps.find(
      (step) =>
        step.kind === 'attachLink' &&
        step.link.kind === 'listPointer' &&
        step.link.fieldName === 'ComplexEmitterDefinitionData',
    )
    expect(attachLinkStep).toBeDefined()
    if (attachLinkStep?.kind === 'attachLink') {
      expect(formatStepLabel(attachLinkStep)).toContain('ComplexEmitterDefinitionData')
    }
  })
})

describe('buildSceneThroughSteps', () => {
  it('cena final equivale a codeToCanvasScene para ritual list[pointer]', () => {
    const prepared = prepareCodeToCanvasBuild(
      listPointerRitual,
      'testpack',
      registry,
      packFolderBySchemaId,
    )
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const lastIndex = prepared.steps.length - 1
    const partial = buildSceneThroughSteps(
      registry,
      prepared.typeIndex,
      prepared.parseRegistry,
      prepared.warnings,
      prepared.steps,
      lastIndex,
      { hydrate: false },
    )
    const incrementalScene = finalizeCodeToCanvasScene(partial.scene)

    const full = codeToCanvasScene(listPointerRitual, 'testpack', registry, packFolderBySchemaId)
    expect(full.ok).toBe(true)
    if (!full.ok) {
      return
    }

    expect(incrementalScene.nodes.length).toBe(full.scene.nodes.length)
    expect(incrementalScene.connections.length).toBe(full.scene.connections.length)

    const vfxIncremental = incrementalScene.nodes.find(
      (node) => node.node.schema.id === 'vfx-system-definition-data',
    )
    const vfxFull = full.scene.nodes.find((node) => node.node.schema.id === 'vfx-system-definition-data')
    expect(vfxIncremental).toBeDefined()
    expect(vfxFull).toBeDefined()

    const listBlock = vfxIncremental!.node.schema.listPointer?.find(
      (block) => block.title === 'complexEmitterDefinitionData',
    )
    expect(listBlock?.slots?.length).toBeGreaterThanOrEqual(2)
    expect(listBlock?.slots?.length).toBe(vfxFull!.node.schema.listPointer?.[0]?.slots?.length)
  })
})

describe('prepareCodeToCanvasBuild', () => {
  it('rejeita ritual vazio', () => {
    const result = prepareCodeToCanvasBuild('', 'testpack', registry, packFolderBySchemaId)
    expect(result.ok).toBe(false)
  })

  it('gera passos com typeIndex do pack', () => {
    const result = prepareCodeToCanvasBuild(
      listPointerRitual,
      'testpack',
      registry,
      packFolderBySchemaId,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.steps.length).toBeGreaterThan(3)
    const index = buildPackTypeIndex(Object.values(registry))
    expect(index.byTitle.get('VfxSystemDefinitionData')).toBe('vfx-system-definition-data')
  })
})
