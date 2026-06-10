import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { blockParameterSlotId } from '@/core/blockSchema'
import { resolveBlockParameterInputValue } from '@/core/blockParameterInputValue'
import { schemaRegistry } from '@/core/nodeStructureRegistry'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'
import { codeToBlockScene } from './codeToBlockScene'
import { emptyCanvasScene } from './canvasScene'
import type { NodeSchemaDefinition } from './nodeSchema'

const emitterSchema: NodeSchemaDefinition = {
  id: 'vfx-emitter-code-to-block',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'p-name', name: 'emitterName', type: 'string', defaultValue: '' },
    { id: 'p-lifetime', name: 'particleLifetime', type: 'pointer', defaultValue: '' },
  ],
  embed: [],
  pointer: [{ field: 'particleLifetime', schemaId: 'value-float-code-to-block' }],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

const valueFloatSchema: NodeSchemaDefinition = {
  id: 'value-float-code-to-block',
  title: 'ValueFloat',
  parameters: [{ id: 'p-constant', name: 'constantValue', type: 'f32', defaultValue: '0' }],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
  internalStructures: [],
}

const schemaLookup = {
  [emitterSchema.id]: emitterSchema,
  [valueFloatSchema.id]: valueFloatSchema,
}

describe('codeToBlockScene', () => {
  it('converte ritual Class Group em cena com block cards', () => {
    const ritual = `VfxEmitterDefinitionData {
  emitterName: string = "Teste"
}`

    const result = codeToBlockScene(ritual, schemaLookup)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.scene.nodes.length).toBeGreaterThan(0)
    const root = result.scene.nodes.find((node) => node.id === result.rootNodeId)
    expect(root?.blockViewActive).toBe(true)
    expect(root?.blockStructure?.blockType).toBe('VfxEmitterDefinitionData')
    const emitterParam = root?.blockStructure?.parameters.find(
      (entry) => entry.nameParameter === 'emitterName',
    )
    expect(emitterParam?.defaultValue).toContain('Teste')
  })

  it('monta hierarquia conectada com parâmetros em formato de bloco', () => {
    const ritual = `VfxEmitterDefinitionData {
  emitterName: string = "Emitter01"
  particleLifetime: pointer = ValueFloat {
    constantValue: f32 = 1.5
  }
}`

    const result = codeToBlockScene(ritual, schemaLookup)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const blockNodes = result.scene.nodes.filter((node) => node.blockViewActive && node.blockStructure)
    expect(blockNodes.length).toBeGreaterThanOrEqual(2)

    const root = blockNodes.find((node) => node.id === result.rootNodeId)
    expect(root?.blockStructure?.parameters.some((entry) => entry.nameParameter === 'emitterName')).toBe(
      true,
    )
    expect(root?.blockStructure?.parameters.some((entry) => entry.nameParameter === 'particleLifetime')).toBe(
      true,
    )

    const lifetimeParam = root?.blockStructure?.parameters.find(
      (entry) => entry.nameParameter === 'particleLifetime',
    )
    expect(lifetimeParam?.sourcePath.kind).toBe('pointerChild')

    const child = blockNodes.find((node) => node.id !== result.rootNodeId)
    expect(child?.blockStructure?.blockType).toBe('ValueFloat')
    expect(
      child?.blockStructure?.parameters.some((entry) => entry.nameParameter === 'constantValue'),
    ).toBe(true)

    const blockConnections = result.scene.connections.filter(
      (connection) => connection.fromBlockSlotId || connection.toBlockSlotId,
    )
    expect(blockConnections.length).toBeGreaterThanOrEqual(1)
    expect(
      blockConnections.some(
        (connection) =>
          connection.fromNodeId === result.rootNodeId &&
          lifetimeParam &&
          connection.fromBlockSlotId === blockParameterSlotId(lifetimeParam.idParameter, 'output'),
      ),
    ).toBe(true)
  })

  it('monta entradas map[hash,embed] e list[pointer] na hierarquia', () => {
    const mainSchema: NodeSchemaDefinition = {
      id: 'main-code-to-block',
      title: 'Main',
      parameters: [
        { id: 'p-type', name: 'type', type: 'string', defaultValue: '' },
        { id: 'p-entries', name: 'entries', type: 'mapHashEmbed', defaultValue: '' },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const systemSchema: NodeSchemaDefinition = {
      id: 'vfx-system-code-to-block',
      title: 'VfxSystemDefinitionData',
      parameters: [
        {
          id: 'p-list',
          name: 'complexEmitterDefinitionData',
          type: 'listPointer',
          defaultValue: '',
        },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [
        {
          id: 'lp-complex',
          title: 'complexEmitterDefinitionData',
          internalStructures: [
            { id: 'is-emitter', name: 'VfxEmitterDefinitionData', schemaId: emitterSchema.id },
          ],
        },
      ],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const ritual = `#PROP_text
type: string = "PROP"
version: u32 = 3
linked: list[string] = {}
entries: map[hash,embed] = {
  "path/a" = VfxSystemDefinitionData {
    complexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        emitterName: string = "E1"
      }
    }
  }
  "path/b" = VfxSystemDefinitionData {
    complexEmitterDefinitionData: list[pointer] = {
      VfxEmitterDefinitionData {
        emitterName: string = "E2"
      }
    }
  }
}`

    const lookup = {
      [mainSchema.id]: mainSchema,
      [systemSchema.id]: systemSchema,
      [emitterSchema.id]: emitterSchema,
      [valueFloatSchema.id]: valueFloatSchema,
    }

    const result = codeToBlockScene(ritual, lookup)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const blockNodes = result.scene.nodes.filter((node) => node.blockViewActive)
    expect(blockNodes.length).toBeGreaterThanOrEqual(5)
    expect(blockNodes.filter((node) => node.blockStructure?.blockType === 'VfxSystemDefinitionData').length).toBe(2)
    expect(blockNodes.filter((node) => node.blockStructure?.blockType === 'VfxEmitterDefinitionData').length).toBe(2)
    expect(result.scene.connections.filter((c) => c.fromBlockSlotId && c.toBlockSlotId).length).toBeGreaterThanOrEqual(4)

    const systems = blockNodes.filter((node) => node.blockStructure?.blockType === 'VfxSystemDefinitionData')
    expect(systems).toHaveLength(2)
    const [firstSystem, secondSystem] = systems.sort((left, right) => left.position.y - right.position.y)
    expect(firstSystem.position.x).toBe(secondSystem.position.x)
    expect(secondSystem.position.y - firstSystem.position.y).toBe(36)
  })

  it('preserva constantValue vec3 distinto em cada instância ValueVector3', () => {
    const valueVector3Schema: NodeSchemaDefinition = {
      id: 'value-vector3-code-to-block',
      title: 'ValueVector3',
      parameters: [{ id: 'p-constant', name: 'constantValue', type: 'vector3', defaultValue: '0, 0, 0' }],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const emitterWithScale: NodeSchemaDefinition = {
      id: 'vfx-emitter-scale-code-to-block',
      title: 'VfxEmitterDefinitionData',
      parameters: [
        { id: 'p-name', name: 'emitterName', type: 'string', defaultValue: '' },
        { id: 'p-scale', name: 'birthScale0', type: 'embed', defaultValue: '' },
      ],
      embed: [{ id: 'e-scale', title: 'birthScale0', internalStructures: [], slots: [{ id: 's-vv3', name: 'ValueVector3', schemaId: valueVector3Schema.id }] }],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const systemSchema: NodeSchemaDefinition = {
      id: 'vfx-system-scale-code-to-block',
      title: 'VfxSystemDefinitionData',
      parameters: [
        {
          id: 'p-list',
          name: 'complexEmitterDefinitionData',
          type: 'listPointer',
          defaultValue: '',
        },
      ],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [
        {
          id: 'lp-complex',
          title: 'complexEmitterDefinitionData',
          internalStructures: [
            { id: 'is-emitter', name: 'VfxEmitterDefinitionData', schemaId: emitterWithScale.id },
          ],
        },
      ],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    }

    const ritual = `VfxSystemDefinitionData {
  complexEmitterDefinitionData: list[pointer] = {
    VfxEmitterDefinitionData {
      emitterName: string = "emitter_a"
      birthScale0: embed = ValueVector3 {
        constantValue: vec3 = { 680, 680, 50 }
      }
    }
    VfxEmitterDefinitionData {
      emitterName: string = "emitter_b"
      birthScale0: embed = ValueVector3 {
        constantValue: vec3 = { 760, 760, 50 }
      }
    }
  }
}`

    const lookup = {
      [systemSchema.id]: systemSchema,
      [emitterWithScale.id]: emitterWithScale,
      [valueVector3Schema.id]: valueVector3Schema,
    }

    const result = codeToBlockScene(ritual, lookup)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const vectorBlocks = result.scene.nodes.filter(
      (node) => node.blockStructure?.blockType === 'ValueVector3',
    )
    expect(vectorBlocks).toHaveLength(2)

    const scaledValues = vectorBlocks.map((node) => {
      const structure = node.blockStructure!
      const param = structure.parameters.find((entry) => entry.nameParameter === 'constantValue')
      expect(param).toBeDefined()
      const raw = readBlockParameterDisplayValue(result.scene, node, structure, param!.idParameter)
      return resolveBlockParameterInputValue(raw, param!.typeParameter)
    })

    expect(scaledValues).toContain('680, 680, 50')
    expect(scaledValues).toContain('760, 760, 50')

    const emitters = result.scene.nodes.filter(
      (node) => node.blockStructure?.blockType === 'VfxEmitterDefinitionData',
    )
    expect(emitters).toHaveLength(2)
    const emitterNames = emitters.map((node) => {
      const structure = node.blockStructure!
      const param = structure.parameters.find((entry) => entry.nameParameter === 'emitterName')
      const raw = readBlockParameterDisplayValue(result.scene, node, structure, param!.idParameter)
      return resolveBlockParameterInputValue(raw, 'string')
    })
    expect(emitterNames).toContain('emitter_a')
    expect(emitterNames).toContain('emitter_b')
  })

  it('rejeita editor vazio', () => {
    const result = codeToBlockScene('   ', schemaLookup)
    expect(result.ok).toBe(false)
  })

  it('codigo teste.md instancia blocos da hierarquia ritual', { timeout: 120_000 }, () => {
    const ritual = readFileSync('src/blockStructures/codigo teste.md', 'utf8')
    const result = codeToBlockScene(ritual, schemaRegistry)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const blockNodes = result.scene.nodes.filter((node) => node.blockViewActive && node.blockStructure)
    expect(blockNodes.length).toBeGreaterThan(10)

    const notInstantiated = result.warnings.filter((warning) =>
      warning.includes('não instanciado na hierarquia'),
    )
    expect(notInstantiated).toEqual([])
  })

  it('mergeInto preserva nós existentes e adiciona blocos', () => {
    const existingNodeId = 'existing-addon-node'
    const baseScene = {
      ...emptyCanvasScene,
      nodes: [
        {
          id: existingNodeId,
          position: { x: 40, y: 80 },
          node: {
            id: existingNodeId,
            schema: emitterSchema,
            values: [],
          },
          addonViewActive: true,
          addonInstance: { addonId: 'addon-code-to-block', outputValues: {} },
        },
        ...emptyCanvasScene.nodes,
      ],
    }

    const ritual = `VfxEmitterDefinitionData {
  emitterName: string = "MergeTest"
}`

    const result = codeToBlockScene(ritual, schemaLookup, {
      mergeInto: {
        scene: baseScene,
        spawnPosition: { x: 480, y: 80 },
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.scene.nodes.some((node) => node.id === existingNodeId)).toBe(true)
    expect(result.scene.nodes.length).toBeGreaterThan(baseScene.nodes.length)
    const root = result.scene.nodes.find((node) => node.id === result.rootNodeId)
    expect(root?.blockViewActive).toBe(true)
  })
})
