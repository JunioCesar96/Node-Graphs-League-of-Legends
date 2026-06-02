import { describe, expect, it } from 'vitest'

import { canvasToClassGroupRitual } from '@/core/canvasToClassGroupRitual'
import { codeToCanvasScene } from '@/core/codeToCanvasScene'
import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  buildRitualPathToNode,
  locateRitualBlockRange,
  syncCanvasNodeToCode,
} from '@/core/syncCanvasNodeToCode'

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

function buildSceneFromRitual(ritualText: string): CanvasScene {
  const built = codeToCanvasScene(ritualText, 'testpack', registry, packFolderBySchemaId)
  expect(built.ok).toBe(true)
  if (!built.ok) {
    throw new Error(built.error)
  }
  return built.scene
}

function findSampleTypeNode(scene: CanvasScene) {
  const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
  const child = scene.connections
    .filter((c) => c.fromNodeId === mainNode?.id)
    .map((c) => scene.nodes.find((n) => n.id === c.toNodeId))
    .find((n) => n?.node.schema.title === 'SampleType')
  return child
}

describe('buildRitualPathToNode', () => {
  it('constrói caminho para Main', () => {
    const scene = buildSceneFromRitual(ritual)
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    expect(mainNode).toBeDefined()
    if (!mainNode) {
      return
    }

    const result = buildRitualPathToNode(scene, mainNode.id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.path.isMain).toBe(true)
    expect(result.path.segments).toEqual([{ kind: 'main' }])
  })

  it('constrói caminho para filho map entry', () => {
    const scene = buildSceneFromRitual(ritual)
    const child = findSampleTypeNode(scene)
    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const result = buildRitualPathToNode(scene, child.id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.path.segments).toEqual([
      { kind: 'main' },
      { kind: 'mapEntry', entryKey: 'key1', typeTitle: 'SampleType' },
    ])
  })
})

describe('locateRitualBlockRange', () => {
  it('localiza bloco map entry no texto', () => {
    const scene = buildSceneFromRitual(ritual)
    const child = findSampleTypeNode(scene)
    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const exported = canvasToClassGroupRitual(scene, registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const path = buildRitualPathToNode(scene, child.id)
    expect(path.ok).toBe(true)
    if (!path.ok) {
      return
    }

    const range = locateRitualBlockRange(exported.text, path.path)
    expect(range).not.toBeNull()
    if (!range) {
      return
    }

    const slice = exported.text.slice(range.start, range.end)
    expect(slice).toContain('"key1" = SampleType {')
    expect(slice).toContain('Count: u32 = 42')
  })
})

describe('syncCanvasNodeToCode', () => {
  it('round-trip: altera valor escalar no grafo e sincroniza no editor', () => {
    const scene = buildSceneFromRitual(ritual)
    const child = findSampleTypeNode(scene)
    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const exported = canvasToClassGroupRitual(scene, registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const countParam = child.node.values.find((v) => v.parameterId === 'sample-type_parameter_count')
    if (countParam) {
      countParam.value = '99'
    } else {
      child.node.values.push({ parameterId: 'sample-type_parameter_count', value: '99' })
    }

    const synced = syncCanvasNodeToCode(scene, registry, child.id, exported.text)
    expect(synced.ok).toBe(true)
    if (!synced.ok) {
      return
    }

    expect(synced.newText).toContain('Count: u32 = 99')
    expect(synced.newText).not.toContain('Count: u32 = 42')
    expect(synced.newText).toContain('#PROP_text')
  })

  it('substitui documento completo para Main', () => {
    const scene = buildSceneFromRitual(ritual)
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    expect(mainNode).toBeDefined()
    if (!mainNode) {
      return
    }

    const exported = canvasToClassGroupRitual(scene, registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const typeParam = mainNode.node.values.find((v) => v.parameterId === 'main_parameter_type')
    if (typeParam) {
      typeParam.value = 'PROP'
    }

    const child = findSampleTypeNode(scene)
    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const countParam = child.node.values.find((v) => v.parameterId === 'sample-type_parameter_count')
    if (countParam) {
      countParam.value = '55'
    }

    const synced = syncCanvasNodeToCode(scene, registry, mainNode.id, exported.text)
    expect(synced.ok).toBe(true)
    if (!synced.ok) {
      return
    }

    expect(synced.newText).toContain('Count: u32 = 55')
    expect(synced.startLine).toBe(0)
  })

  it('rejeita nó inexistente', () => {
    const scene = buildSceneFromRitual(ritual)
    const exported = canvasToClassGroupRitual(scene, registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const synced = syncCanvasNodeToCode(scene, registry, 'missing-node', exported.text)
    expect(synced.ok).toBe(false)
    if (synced.ok) {
      return
    }

    expect(synced.error).toMatch(/não encontrado/i)
  })

  it('rejeita quando bloco não existe no editor', () => {
    const scene = buildSceneFromRitual(ritual)
    const child = findSampleTypeNode(scene)
    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const synced = syncCanvasNodeToCode(scene, registry, child.id, '#PROP_text\nentries: map[hash,embed] = {\n}\n')
    expect(synced.ok).toBe(false)
    if (synced.ok) {
      return
    }

    expect(synced.error).toMatch(/localizar/i)
  })

  it('rejeita nó órfão sem ligação', () => {
    const scene = buildSceneFromRitual(ritual)
    const orphan = scene.nodes.find((n) => n.node.schema.title === 'SampleType')
    expect(orphan).toBeDefined()
    if (!orphan) {
      return
    }

    scene.connections = []

    const exported = canvasToClassGroupRitual(buildSceneFromRitual(ritual), registry)
    expect(exported.ok).toBe(true)
    if (!exported.ok) {
      return
    }

    const synced = syncCanvasNodeToCode(scene, registry, orphan.id, exported.text)
    expect(synced.ok).toBe(false)
    if (synced.ok) {
      return
    }

    expect(synced.error).toMatch(/localizar/i)
  })

  it('localiza map entry por hash quando chave do grafo é caminho string', () => {
    const vfxSchema: NodeSchemaDefinition = {
      id: 'vfx-system',
      title: 'VfxSystemDefinitionData',
      parameters: [
        { id: 'vfx_parameter_particleName', name: 'particleName', type: 'string', defaultValue: '' },
        { id: 'vfx_parameter_flags', name: 'flags', type: 'u16', defaultValue: '0' },
      ],
      internalStructures: [],
      nomenclature: { group: '', collection: '', collectionType: 'VfxSystemDefinitionData' },
    }

    const vfxRegistry: Record<string, NodeSchemaDefinition> = {
      main: minimalMainSchema,
      'vfx-system': vfxSchema,
    }

    const vfxPack: Record<string, string> = {
      main: 'testpack',
      'vfx-system': 'testpack',
    }

    const ritualWithHash = `
entries: map[hash,embed] = {
  0xa2fa6a01 = VfxSystemDefinitionData {
    particleName: string = "Zac_Base_Q_tar"
    flags: u16 = 198
  }
  0xb2fa6a02 = VfxSystemDefinitionData {
    particleName: string = "Other_Particle"
    flags: u16 = 1
  }
}
`

    const built = codeToCanvasScene(ritualWithHash, 'testpack', vfxRegistry, vfxPack)
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    const scene = built.scene
    const vfxNode = scene.nodes.find((n) => n.node.schema.title === 'VfxSystemDefinitionData')
    expect(vfxNode).toBeDefined()
    if (!vfxNode) {
      return
    }

    const flagsParam = vfxNode.node.values.find((v) => v.parameterId === 'vfx_parameter_flags')
    if (flagsParam) {
      flagsParam.value = '200'
    } else {
      vfxNode.node.values.push({ parameterId: 'vfx_parameter_flags', value: '200' })
    }

    const editorText = ritualWithHash
    const synced = syncCanvasNodeToCode(scene, vfxRegistry, vfxNode.id, editorText)
    expect(synced.ok).toBe(true)
    if (!synced.ok) {
      return
    }

    expect(synced.newText).toMatch(/flags:\s*u16\s*=\s*200/i)
    expect(synced.newText).toMatch(/particleName:\s*string\s*=\s*"Zac_Base_Q_tar"/i)
    expect(synced.newText).toMatch(/0xa2fa6a01\s*=\s*VfxSystemDefinitionData/)
    expect(synced.newText).toMatch(/0xb2fa6a02\s*=\s*VfxSystemDefinitionData[\s\S]*flags:\s*u16\s*=\s*1/i)
  })
})
