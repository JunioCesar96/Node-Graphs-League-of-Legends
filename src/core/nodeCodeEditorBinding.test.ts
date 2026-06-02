import { describe, expect, it } from 'vitest'

import { canvasNodeSubtreeToRitual } from '@/core/canvasToClassGroupRitual'
import { codeToCanvasScene } from '@/core/codeToCanvasScene'
import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  buildNodeRitualViewCodeFidelity,
  editorRangeToBlockRange,
  emitNodeGroupViewCodeText,
  emitNodeRitualViewCodeText,
  syncNodeToBoundCodeRange,
} from './nodeCodeEditorBinding'
import {
  makeVfxEmitterCanvasNode,
  makeVfxEmitterScene,
  vfxEmitterSampleParameters,
  VFX_EMITTER_COLOR_TOKEN,
} from './groupTestFixtures'

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

describe('editorRangeToBlockRange', () => {
  it('converte intervalo Monaco em offsets de bloco', () => {
    const text = 'line1\n  flags: u16 = 1\nline3'
    const range = editorRangeToBlockRange(text, {
      startLineNumber: 2,
      startColumn: 3,
      endLineNumber: 2,
      endColumn: 17,
    })

    expect(range).not.toBeNull()
    expect(range?.startLine).toBe(1)
    expect(range?.openingLineIndent).toBe('  ')
    expect(text.slice(range!.start, range!.end)).toBe('flags: u16 = 1')
  })

  it('rejeita intervalo inválido', () => {
    const range = editorRangeToBlockRange('a\nb', {
      startLineNumber: 9,
      startColumn: 1,
      endLineNumber: 9,
      endColumn: 2,
    })
    expect(range).toBeNull()
  })
})

describe('emitNodeRitualViewCodeText', () => {
  it('equivale a canvasNodeSubtreeToRitual com a mesma fidelidade', () => {
    const built = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    const scene = built.scene
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    const child = scene.connections
      .filter((c) => c.fromNodeId === mainNode?.id)
      .map((c) => scene.nodes.find((n) => n.id === c.toNodeId))
      .find((n) => n?.node.schema.title === 'SampleType')

    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const fromView = emitNodeRitualViewCodeText(scene, registry, child.id)
    const fidelity = buildNodeRitualViewCodeFidelity(scene, child.id)
    const fromCanvas = canvasNodeSubtreeToRitual(scene, registry, child.id, fidelity)

    expect(fromView.ok).toBe(true)
    expect(fromCanvas.ok).toBe(true)
    if (!fromView.ok || !fromCanvas.ok) {
      return
    }

    expect(fromView.text).toBe(fromCanvas.text)
    expect(fromView.text).toContain('count: u32 = 42')
  })
})

describe('emitNodeGroupViewCodeText vs emitNodeRitualViewCodeText', () => {
  const vfxRegistry: Record<string, NodeSchemaDefinition> = {
    VfxEmitterDefinitionData: makeVfxEmitterCanvasNode().node.schema,
  }

  it('League bin expande tokens de grupo; código de grupo mantém tokens', () => {
    const canvasNode = makeVfxEmitterCanvasNode({
      groupViewActive: true,
      groupStructure: {
        groupType: 'VfxEmitterDefinitionData',
        groupName: 'Emitter',
        parameters: vfxEmitterSampleParameters.slice(0, 1),
        identification_codes: [],
      },
      node: {
        ...makeVfxEmitterCanvasNode().node,
        values: [
          { parameterId: 'p-emitter', value: 'circulo_magico_sparks' },
          { parameterId: 'p-color', value: VFX_EMITTER_COLOR_TOKEN },
          { parameterId: 'p-lifetime', value: '1.15' },
          { parameterId: 'p-texture', value: 'ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex' },
        ],
      },
    })
    const scene = makeVfxEmitterScene(canvasNode)

    const leagueBin = emitNodeRitualViewCodeText(scene, vfxRegistry, canvasNode.id)
    const groupCode = emitNodeGroupViewCodeText(scene, vfxRegistry, canvasNode.id)

    expect(leagueBin.ok).toBe(true)
    expect(groupCode.ok).toBe(true)
    if (!leagueBin.ok || !groupCode.ok) {
      return
    }

    expect(leagueBin.text).not.toContain('_groupType&')
    expect(leagueBin.text).toContain('0.55, 0.95, 1, 1')
    expect(groupCode.text).toContain('_groupType&')
    expect(groupCode.text).toContain('_endParameter')
  })
})

describe('syncNodeToBoundCodeRange', () => {
  it('apaga a área vinculada e cola o texto de Ver código', () => {
    const built = codeToCanvasScene(ritual, 'testpack', registry, packFolderBySchemaId)
    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    const scene = built.scene
    const mainNode = scene.nodes.find((n) => n.node.schema.id === MAIN_SCHEMA_ID)
    const child = scene.connections
      .filter((c) => c.fromNodeId === mainNode?.id)
      .map((c) => scene.nodes.find((n) => n.id === c.toNodeId))
      .find((n) => n?.node.schema.title === 'SampleType')

    expect(child).toBeDefined()
    if (!child) {
      return
    }

    const oldBlock = 'SampleType {\n    name: string = "old"\n    count: u32 = 0\n}\n'
    const editorText = `before\n${oldBlock}after\n`
    const blockRange = editorRangeToBlockRange(editorText, {
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 5,
      endColumn: 2,
    })
    expect(blockRange).not.toBeNull()
    if (!blockRange) {
      return
    }

    const binding = {
      canvasNodeId: child.id,
      codeDockTabId: 'tab-1',
      range: {
        startLineNumber: 2,
        startColumn: 1,
        endLineNumber: 5,
        endColumn: 2,
      },
    }

    const result = syncNodeToBoundCodeRange(scene, registry, child.id, editorText, binding)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const viewCode = emitNodeRitualViewCodeText(scene, registry, child.id)
    expect(viewCode.ok).toBe(true)
    if (!viewCode.ok) {
      return
    }

    expect(result.newText).toBe(
      editorText.slice(0, blockRange.start) + viewCode.text + editorText.slice(blockRange.end),
    )
    expect(result.newText).not.toContain('name: string = "old"')
    expect(result.newText).toContain('count: u32 = 42')
  })
})
