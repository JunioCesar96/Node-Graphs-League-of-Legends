import { describe, expect, it } from 'vitest'

import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { emptyCanvasScene } from '@/core/canvasScene'
import { createNodeInstanceFromRegistry, schemaRegistry } from '@/core/nodeStructureRegistry'
import {
  applyNeekoTransformToScene,
  buildNeekoSubtreePlan,
  materializeNeekoRootAtPhase,
  NEEKO_SCHEMA_ID,
  prepareNeekoTransform,
  resolveNeekoRootParsedId,
  stripNeekoTransientFromScene,
} from '@/core/neekoNodeTransform'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import { defaultNewCanvasNodeLayout } from '@/core/nodeCardSections'

const bankUnitSnippet = `
BankUnit {
  Name: string = "Vo"
}
`.trim()

const embedChildSnippet = `
VfxEmitterDefinitionData {
  rate: embed = ValueFloat {
    constantValue: f32 = 1
  }
}
`.trim()

const entriesMapSnippet = `
entries: map[hash,embed] = {
  "K" = VfxEmitterDefinitionData {
    EmitterName: string = "Ring"
  }
}
`.trim()

const vfxJadeSnippet = `
"Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar" = VfxSystemDefinitionData {
  complexEmitterDefinitionData: list[pointer] = {
    VfxEmitterDefinitionData {
      blendMode: u8 = 1
      emitterName: string = "Ring"
    }
    VfxEmitterDefinitionData {
      blendMode: u8 = 1
      emitterName: string = "Splat"
    }
  }
  particleName: string = "Zac_Base_Q_tar"
  flags: u16 = 198
}
`.trim()

function createNeekoCanvasNode(id: string, x = 100, y = 200) {
  const instance = createNodeInstanceFromRegistry(schemaRegistry, NEEKO_SCHEMA_ID, id)
  if (!instance) {
    throw new Error('neeko schema missing')
  }
  return {
    id,
    node: instance,
    position: { x, y },
    ...defaultNewCanvasNodeLayout(instance),
  }
}

describe('resolveNeekoRootParsedId', () => {
  it('usa tipo standalone como raiz', () => {
    const prepared = prepareNeekoTransform(bankUnitSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }
    const resolved = resolveNeekoRootParsedId(
      prepared.parseRegistry,
      new Set([...prepared.parseRegistry.keys()].filter((id) => id !== MAIN_SCHEMA_ID)),
    )
    expect('rootParsedId' in resolved).toBe(true)
    if ('rootParsedId' in resolved) {
      expect(prepared.parseRegistry.has(resolved.rootParsedId)).toBe(true)
    }
  })
})

describe('prepareNeekoTransform', () => {
  it('rejeita texto vazio', () => {
    expect(prepareNeekoTransform('').ok).toBe(false)
  })

  it('aceita snippet BankUnit sem exigir main útil', () => {
    const result = prepareNeekoTransform(bankUnitSnippet)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    const parsed = result.parseRegistry.get(result.rootParsedId)
    expect(parsed?.parameters.some((p) => p.name === 'Name')).toBe(true)
  })

  it('ritual VFX Jade usa VfxSystemDefinitionData como raiz, não emitter', () => {
    const result = prepareNeekoTransform(vfxJadeSnippet)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.rootParsedId).not.toBe(MAIN_SCHEMA_ID)
    const root = result.parseRegistry.get(result.rootParsedId)
    expect(root?.title).toBe('VfxSystemDefinitionData')
    expect(root?.parameters.some((p) => p.name === 'flags')).toBe(true)
    expect(root?.parameters.some((p) => p.name === 'particleName')).toBe(true)
    expect(root?.listPointer.some((b) => b.title === 'complexEmitterDefinitionData')).toBe(true)
  })
})

describe('materializeNeekoRootAtPhase', () => {
  it('acumula parâmetros na fase values', () => {
    const prepared = prepareNeekoTransform(bankUnitSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }
    const shell = materializeNeekoRootAtPhase(
      prepared.parseRegistry,
      prepared.rootParsedId,
      'neeko-1',
      'shell',
    )
    expect(shell?.schema.parameters).toHaveLength(0)

    const values = materializeNeekoRootAtPhase(
      prepared.parseRegistry,
      prepared.rootParsedId,
      'neeko-1',
      'values',
    )
    expect(values?.schema.parameters.some((p) => p.name === 'Name')).toBe(true)
  })
})

describe('buildNeekoSubtreePlan', () => {
  it('cria filho embed e ligação wireless', () => {
    const prepared = prepareNeekoTransform(embedChildSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const neekoId = 'neeko-test'
    const neeko = createNeekoCanvasNode(neekoId)
    const plan = buildNeekoSubtreePlan(
      prepared.parseRegistry,
      prepared.warnings,
      prepared.rootParsedId,
      neeko.position,
      neekoId,
      neeko,
    )

    expect(plan.nodes.length).toBeGreaterThanOrEqual(2)
    expect(plan.connections.length).toBeGreaterThanOrEqual(1)
    expect(plan.connections.every((c) => c.routing === 'wireless')).toBe(true)
    expect(plan.rootCanvasNodeId).toBe(neekoId)
  })

  it('VFX Jade materializa sistema no card Neeko e emitters como filhos', () => {
    const prepared = prepareNeekoTransform(vfxJadeSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const neekoId = 'neeko-vfx'
    const neeko = createNeekoCanvasNode(neekoId)
    const plan = buildNeekoSubtreePlan(
      prepared.parseRegistry,
      prepared.warnings,
      prepared.rootParsedId,
      neeko.position,
      neekoId,
      neeko,
    )

    const rootNode = plan.nodes.find((n) => n.id === neekoId)
    expect(rootNode?.node.schema.title).toBe('VfxSystemDefinitionData')
    expect(rootNode?.node.schema.parameters.some((p) => p.name === 'flags')).toBe(true)
    expect(rootNode?.node.schema.parameters.some((p) => p.name === 'particleName')).toBe(true)

    const childEmitters = plan.nodes.filter(
      (n) => n.id !== neekoId && n.node.schema.title === 'VfxEmitterDefinitionData',
    )
    expect(childEmitters.length).toBeGreaterThanOrEqual(2)
    expect(plan.connections.length).toBeGreaterThanOrEqual(2)
    expect(plan.connections.every((c) => c.routing === 'wireless')).toBe(true)
    expect(plan.connections.filter((c) => c.fromNodeId === neekoId).length).toBeGreaterThanOrEqual(2)
  })

  it('VFX com embed aninhado gera ValueFloat e ligação wireless', () => {
    const snippet = `
"K" = VfxSystemDefinitionData {
  complexEmitterDefinitionData: list[pointer] = {
    VfxEmitterDefinitionData {
      rate: embed = ValueFloat {
        constantValue: f32 = 3
      }
      emitterName: string = "Ring"
    }
  }
  flags: u16 = 1
}
`.trim()

    const prepared = prepareNeekoTransform(snippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const neekoId = 'neeko-embed'
    const neeko = createNeekoCanvasNode(neekoId)
    const plan = buildNeekoSubtreePlan(
      prepared.parseRegistry,
      prepared.warnings,
      prepared.rootParsedId,
      neeko.position,
      neekoId,
      neeko,
    )

    const valueFloat = plan.nodes.find((n) => n.node.schema.title === 'ValueFloat')
    const emitter = plan.nodes.find(
      (n) => n.id !== neekoId && n.node.schema.title === 'VfxEmitterDefinitionData',
    )
    expect(valueFloat).toBeDefined()
    expect(emitter).toBeDefined()
    expect(plan.connections.length).toBeGreaterThanOrEqual(2)
    expect(
      plan.connections.some(
        (c) => c.fromNodeId === emitter!.id && c.toNodeId === valueFloat!.id,
      ),
    ).toBe(true)
  })
})

describe('applyNeekoTransformToScene', () => {
  it('preserva ligação entrante no id do Neeko', () => {
    const prepared = prepareNeekoTransform(bankUnitSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }

    const neekoId = 'neeko-in'
    const parentId = createUniqueNodeId('parent', [])
    const neeko = createNeekoCanvasNode(neekoId)

    const scene = {
      ...emptyCanvasScene,
      nodes: [neeko],
      connections: [
        {
          id: 'parent:slot->neeko',
          fromNodeId: parentId,
          fromInternalStructureId: 'parent_slot',
          toNodeId: neekoId,
          routing: 'wireless' as const,
        },
      ],
    }

    const plan = buildNeekoSubtreePlan(
      prepared.parseRegistry,
      prepared.warnings,
      prepared.rootParsedId,
      neeko.position,
      neekoId,
      neeko,
    )

    const merged = applyNeekoTransformToScene(scene, neekoId, plan)
    const incoming = merged.connections.find((c) => c.toNodeId === neekoId)
    expect(incoming).toBeDefined()
    expect(incoming?.fromNodeId).toBe(parentId)
  })

  it('ritual entries: map usa filho, não main', () => {
    const prepared = prepareNeekoTransform(entriesMapSnippet)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) {
      return
    }
    expect(prepared.rootParsedId).not.toBe(MAIN_SCHEMA_ID)
  })
})

describe('stripNeekoTransientFromScene', () => {
  it('remove campos transitórios dos nós', () => {
    const scene = {
      ...emptyCanvasScene,
      nodes: [
        {
          ...createNeekoCanvasNode('n1'),
          neekoTransformPhase: 'shell' as const,
          neekoTransformError: 'x',
        },
      ],
    }
    const stripped = stripNeekoTransientFromScene(scene)
    expect(stripped.nodes[0]?.neekoTransformPhase).toBeUndefined()
    expect(stripped.nodes[0]?.neekoTransformError).toBeUndefined()
  })
})
