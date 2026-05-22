import { describe, expect, it } from 'vitest'

import { canvasToClassGroupRitual } from '@/core/canvasToClassGroupRitual'
import { codeToCanvasScene } from '@/core/codeToCanvasScene'
import { MAIN_SCHEMA_ID, parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

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
