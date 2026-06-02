import { describe, expect, it } from 'vitest'

import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import {
  buildNewNodeGraphScene,
  codeToNewNodeGraph,
  finalizeNewNodeGraphScene,
  materializeParsedSchemaAtPhase,
  prepareCodeToNewNodeGraph,
  ritualParameterId,
} from '@/core/codeToNewNodeGraph'
import {
  buildNewNodeGraphThroughSteps,
  buildFullNewNodeGraphScene,
  planNewNodeGraphSteps,
} from '@/core/codeToNewNodeGraphSteps'
import { parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'
import { populatedSlotsForEmbed } from '@/core/embedSlots'

const embedVfxRitual = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    rate: embed = ValueFloat {
      constantValue: f32 = 1
    }
    particleLifetime: embed = ValueFloat {
      constantValue: f32 = 2
    }
    birthVelocity: embed = ValueVector3 {
      constantValue: vec3 = { 1, 2, 3 }
    }
  }
}
`

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

const listPointerThreeEmittersRitual = `
entries: map[hash,embed] = {
  "Vfx/Key" = VfxSystemDefinitionData {
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        emitterName: string = "Juice"
      }
      VfxEmitterDefinitionData {
        emitterName: string = "Splat"
      }
      VfxEmitterDefinitionData {
        emitterName: string = "Ring"
      }
    }
  }
}
`

const threeEmittersRateEmbedRitual = `
entries: map[hash,embed] = {
  "Vfx/Key" = VfxSystemDefinitionData {
    ComplexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        emitterName: string = "Juice"
        rate: embed = ValueFloat {
          constantValue: f32 = 1
        }
      }
      VfxEmitterDefinitionData {
        emitterName: string = "Splat"
        rate: embed = ValueFloat {
          constantValue: f32 = 2
        }
      }
      VfxEmitterDefinitionData {
        emitterName: string = "Ring"
        rate: embed = ValueFloat {
          constantValue: f32 = 3
        }
      }
    }
  }
}
`

describe('prepareCodeToNewNodeGraph', () => {
  it('rejeita ritual vazio', () => {
    const result = prepareCodeToNewNodeGraph('')
    expect(result.ok).toBe(false)
  })

  it('gera schemas a partir do ritual', () => {
    const result = prepareCodeToNewNodeGraph(listPointerRitual)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.schemas.length).toBeGreaterThan(0)
    expect(result.parseRegistry.has(MAIN_SCHEMA_ID)).toBe(true)
  })
})

describe('materializeParsedSchemaAtPhase', () => {
  it('acumula elementos, valores e internals por fase', () => {
    const parsed = parseClassGroupRitualWithStack(listPointerRitual)
    const vfxId = [...parsed.registry.keys()].find((id) => id.includes('vfx-system')) ?? ''
    const vfxParsed = parsed.registry.get(vfxId)
    expect(vfxParsed).toBeDefined()

    const shell = materializeParsedSchemaAtPhase(vfxParsed!, 'inst-1', 'shell')
    expect(shell.schema.embed?.length ?? 0).toBe(0)
    expect(shell.values).toHaveLength(0)

    const elements = materializeParsedSchemaAtPhase(vfxParsed!, 'inst-1', 'elements')
    expect(elements.schema.listPointer?.length).toBeGreaterThan(0)
    expect(elements.values).toHaveLength(0)

    const values = materializeParsedSchemaAtPhase(vfxParsed!, 'inst-1', 'values')
    expect(values.schema.parameters.some((p) => p.name === 'particleLifetime')).toBe(true)
    expect(values.values.length).toBeGreaterThan(0)

    const internals = materializeParsedSchemaAtPhase(vfxParsed!, 'inst-1', 'internals')
    const listBlock = internals.schema.listPointer?.find(
      (b) => b.title === 'ComplexEmitterDefinitionData' || b.title === 'complexEmitterDefinitionData',
    )
    expect(listBlock?.slots?.length).toBeGreaterThanOrEqual(2)
  })

  it('fase internals restaura slots embed do parse', () => {
    const parsed = parseClassGroupRitualWithStack(embedVfxRitual)
    const emitterParsed = [...parsed.registry.values()].find(
      (schema) =>
        schema.title === 'VfxEmitterDefinitionData' &&
        (schema.embed ?? []).some((block) => block.title === 'rate'),
    )
    expect(emitterParsed).toBeDefined()

    const internals = materializeParsedSchemaAtPhase(emitterParsed!, 'inst-em', 'internals')
    const rateBlock = internals.schema.embed?.find((b) => b.title === 'rate')
    expect(rateBlock).toBeDefined()
    expect(populatedSlotsForEmbed(rateBlock!).length).toBe(1)
    expect(populatedSlotsForEmbed(rateBlock!)[0]!.name).toBe('ValueFloat')
  })
})

describe('planNewNodeGraphSteps', () => {
  it('ordena shell, fases do nó e attachLink list[pointer]', () => {
    const parsed = parseClassGroupRitualWithStack(listPointerRitual)
    const steps = planNewNodeGraphSteps(parsed.registry)

    expect(steps[0]?.kind).toBe('createNodeShell')
    expect(steps.some((s) => s.kind === 'defineElements')).toBe(true)
    expect(steps.some((s) => s.kind === 'defineValues')).toBe(true)
    expect(steps.some((s) => s.kind === 'defineInternals')).toBe(true)

    const listLinks = steps.filter(
      (s) => s.kind === 'attachLink' && s.link.kind === 'listPointer',
    )
    expect(listLinks).toHaveLength(2)
  })
})

describe('codeToNewNodeGraph', () => {
  it('gera cena com emitters e ligações wireless', () => {
    const result = codeToNewNodeGraph(listPointerRitual)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const emitters = result.scene.nodes.filter((n) =>
      n.node.schema.title.includes('VfxEmitter'),
    )
    expect(emitters).toHaveLength(2)

    const vfxNode = result.scene.nodes.find((n) =>
      n.node.schema.title.includes('VfxSystem'),
    )
    expect(vfxNode).toBeDefined()

    const connections = result.scene.connections.filter(
      (c) => c.fromNodeId === vfxNode!.id && c.routing === 'wireless',
    )
    expect(connections.length).toBeGreaterThanOrEqual(2)

    const emitterTargets = new Set(connections.map((c) => c.toNodeId))
    expect(emitterTargets.size).toBe(emitters.length)

    const listBlock = vfxNode!.node.schema.listPointer?.find((b) =>
      b.title.toLowerCase().includes('complexemitter'),
    )
    expect(listBlock?.slots?.length).toBeGreaterThanOrEqual(2)

    const emitterNode = emitters[0]!
    expect(emitterNode.node.schema.parameters.length).toBeGreaterThanOrEqual(1)
    const paramId = ritualParameterId(emitterNode.node.schema.id, 'EmitterName')
    expect(emitterNode.node.values.some((v) => v.parameterId === paramId)).toBe(true)
  })

  it('preenche slots embed no card e liga nós ValueFloat/ValueVector3', () => {
    const result = codeToNewNodeGraph(embedVfxRitual)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const emitter = result.scene.nodes.find((n) =>
      n.node.schema.title.includes('VfxEmitter'),
    )
    expect(emitter).toBeDefined()

    const valueFloatNodes = result.scene.nodes.filter((n) =>
      /value-float/i.test(n.node.schema.id),
    )
    const valueVector3Nodes = result.scene.nodes.filter((n) =>
      /value-vector3/i.test(n.node.schema.id),
    )
    expect(valueFloatNodes.length).toBe(2)
    expect(valueVector3Nodes.length).toBe(1)

    const floatTargets = new Set(
      result.scene.connections
        .filter((c) => c.fromNodeId === emitter!.id && /value-float/i.test(
          result.scene.nodes.find((n) => n.id === c.toNodeId)?.node.schema.id ?? '',
        ))
        .map((c) => c.toNodeId),
    )
    expect(floatTargets.size).toBe(2)

    for (const fieldName of ['rate', 'particleLifetime', 'birthVelocity'] as const) {
      const block = emitter!.node.schema.embed?.find((b) => b.title === fieldName)
      expect(block, fieldName).toBeDefined()
      const slots = populatedSlotsForEmbed(block!)
      expect(slots.length, fieldName).toBe(1)
      expect(slots[0]!.schemaId.length, fieldName).toBeGreaterThan(0)
    }

    const rateBlock = emitter!.node.schema.embed!.find((b) => b.title === 'rate')!
    const rateSlotId = populatedSlotsForEmbed(rateBlock)[0]!.id
    const rateConnection = result.scene.connections.find(
      (c) =>
        c.fromNodeId === emitter!.id &&
        c.fromInternalStructureId === rateSlotId &&
        c.routing === 'wireless',
    )
    expect(rateConnection).toBeDefined()
  })

  it('list[pointer] com 3 emitters gera 3 nós e 3 ligações distintas', () => {
    const result = codeToNewNodeGraph(listPointerThreeEmittersRitual)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const emitters = result.scene.nodes.filter((n) =>
      n.node.schema.title.includes('VfxEmitter'),
    )
    expect(emitters).toHaveLength(3)

    const vfxNode = result.scene.nodes.find((n) =>
      n.node.schema.title.includes('VfxSystem'),
    )
    expect(vfxNode).toBeDefined()

    const listConnections = result.scene.connections.filter(
      (c) => c.fromNodeId === vfxNode!.id && c.routing === 'wireless',
    )
    expect(listConnections).toHaveLength(3)
    expect(new Set(listConnections.map((c) => c.toNodeId)).size).toBe(3)
  })

  it('cada emitter com rate embed liga a ValueFloat distinto', () => {
    const result = codeToNewNodeGraph(threeEmittersRateEmbedRitual)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const emitters = result.scene.nodes.filter((n) =>
      n.node.schema.title.includes('VfxEmitter'),
    )
    expect(emitters).toHaveLength(3)

    const valueFloatNodes = result.scene.nodes.filter((n) =>
      /value-float/i.test(n.node.schema.id),
    )
    expect(valueFloatNodes).toHaveLength(3)

    for (const emitter of emitters) {
      const rateBlock = emitter.node.schema.embed?.find((b) => b.title === 'rate')
      expect(rateBlock).toBeDefined()
      const rateSlotId = populatedSlotsForEmbed(rateBlock!)[0]!.id
      const connection = result.scene.connections.find(
        (c) =>
          c.fromNodeId === emitter.id &&
          c.fromInternalStructureId === rateSlotId &&
          c.routing === 'wireless',
      )
      expect(connection).toBeDefined()
    }

    expect(
      new Set(
        result.scene.connections
          .filter((c) => emitters.some((em) => em.id === c.fromNodeId))
          .map((c) => c.toNodeId),
      ).size,
    ).toBe(3)
  })

  it('incremental equivale ao one-shot', () => {
    const prepared = prepareCodeToNewNodeGraph(listPointerRitual)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const steps = planNewNodeGraphSteps(prepared.parseRegistry)
    const incremental = buildNewNodeGraphThroughSteps(
      prepared.parseRegistry,
      prepared.warnings,
      steps,
      steps.length - 1,
      { hydrate: true },
    ).scene

    const full = buildFullNewNodeGraphScene(prepared.parseRegistry, prepared.warnings)

    expect(incremental.nodes.length).toBe(full.nodes.length)
    expect(incremental.connections.length).toBe(full.connections.length)
  })
})
