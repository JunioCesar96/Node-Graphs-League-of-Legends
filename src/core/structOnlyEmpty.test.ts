import { describe, expect, it } from 'vitest'

import { canvasNodeSubtreeToRitual } from '@/core/canvasToClassGroupRitual'
import { parseClassGroupRitualWithStack } from '@/core/classGroupRitualStackParser'
import { codeToCanvasScene, collectChildLinks } from '@/core/codeToCanvasScene'
import type { CanvasScene } from '@/core/canvasScene'
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
  nomenclature: { group: '', collection: '', collectionType: 'main' },
}

const probabilityTableSchema: NodeSchemaDefinition = {
  id: 'vfx-probability-table-data',
  title: 'VfxProbabilityTableData',
  parameters: [
    {
      id: 'vfx-probability-table-data_parameter_keyTimes',
      name: 'keyTimes',
      type: 'listF32',
      defaultValue: '',
    },
    {
      id: 'vfx-probability-table-data_parameter_keyValues',
      name: 'keyValues',
      type: 'listF32',
      defaultValue: '',
    },
  ],
  internalStructures: [],
  nomenclature: { group: '', collection: '', collectionType: 'VfxProbabilityTableData' },
}

const animatedFloatSchema: NodeSchemaDefinition = {
  id: 'vfx-animated-float-variable-data',
  title: 'VfxAnimatedFloatVariableData',
  parameters: [
    {
      id: 'vfx-animated-float-variable-data_parameter_times',
      name: 'times',
      type: 'listF32',
      defaultValue: '0',
    },
    {
      id: 'vfx-animated-float-variable-data_parameter_values',
      name: 'values',
      type: 'listF32',
      defaultValue: '0.6',
    },
  ],
  internalStructures: [],
  listPointer: [
    {
      id: 'VfxAnimatedFloatVariableData_listPointer_probabilityTables',
      title: 'probabilityTables',
      internalStructures: [
        {
          id: 'vfx-animated-float-variable-data-probability-tables-0',
          name: 'VfxProbabilityTableData',
          schemaId: 'vfx-probability-table-data',
        },
      ],
      slots: [],
    },
  ],
  nomenclature: { group: '', collection: '', collectionType: 'VfxAnimatedFloatVariableData' },
}

const valueFloatSchema: NodeSchemaDefinition = {
  id: 'value-float',
  title: 'ValueFloat',
  parameters: [
    {
      id: 'value-float_parameter_constantValue',
      name: 'constantValue',
      type: 'f32',
      defaultValue: '0',
    },
  ],
  internalStructures: [],
  pointer: [
    {
      id: 'ValueFloat_pointer_dynamics',
      title: 'dynamics',
      internalStructures: [
        {
          id: 'value-float-dynamics-0',
          name: 'VfxAnimatedFloatVariableData',
          schemaId: 'vfx-animated-float-variable-data',
        },
      ],
      slots: [],
    },
  ],
  nomenclature: { group: '', collection: '', collectionType: 'ValueFloat' },
}

const registry: Record<string, NodeSchemaDefinition> = {
  main: minimalMainSchema,
  'value-float': valueFloatSchema,
  'vfx-animated-float-variable-data': animatedFloatSchema,
  'vfx-probability-table-data': probabilityTableSchema,
}

const packFolderBySchemaId: Record<string, string> = {
  main: 'testpack',
  'value-float': 'testpack',
  'vfx-animated-float-variable-data': 'testpack',
  'vfx-probability-table-data': 'testpack',
}

describe('collectChildLinks com structOnlyEmpty', () => {
  it('ignora slots Type {} e mantém blocos com corpo', () => {
    const ritual = `
ValueFloat {
    constantValue: f32 = 0.6
    dynamics: pointer = VfxAnimatedFloatVariableData {
        probabilityTables: list[pointer] = {
            VfxProbabilityTableData {}
            VfxProbabilityTableData {
                keyTimes: list[f32] = { 0, 1 }
                keyValues: list[f32] = { 1, 1.5 }
            }
        }
    }
}
`
    const parsed = parseClassGroupRitualWithStack(ritual)
    const valueFloat = [...parsed.registry.values()].find((s) => s.title === 'ValueFloat')
    const animated = [...parsed.registry.values()].find((s) => s.title === 'VfxAnimatedFloatVariableData')
    expect(valueFloat).toBeDefined()
    expect(animated).toBeDefined()

    const valueLinks = collectChildLinks(valueFloat!)
    expect(valueLinks.some((l) => l.kind === 'pointer' && l.fieldName === 'dynamics')).toBe(true)

    const probLinks = collectChildLinks(animated!).filter((l) => l.kind === 'listPointer')
    expect(probLinks).toHaveLength(1)
    expect(probLinks[0]?.index).toBe(1)

    const listBlock = animated!.listPointer.find((b) => b.title === 'probabilityTables')
    expect(listBlock?.slots).toHaveLength(2)
    expect(listBlock?.slots?.[0]?.structOnlyEmpty).toBe(true)
    expect(listBlock?.slots?.[1]?.structOnlyEmpty).toBeFalsy()
  })
})

describe('codeToCanvasScene struct-only vazio', () => {
  it('cria slots sem nós ligados para Type {}', () => {
    const ritual = `
entries: map[hash,embed] = {
  "test" = ValueFloat {
    constantValue: f32 = 0.6
    dynamics: pointer = VfxAnimatedFloatVariableData {
      probabilityTables: list[pointer] = {
        VfxProbabilityTableData {}
        VfxProbabilityTableData {
          keyTimes: list[f32] = { 0, 1 }
          keyValues: list[f32] = { 1, 1.5 }
        }
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

    const probNodes = result.scene.nodes.filter((n) => n.node.schema.id === 'vfx-probability-table-data')
    expect(probNodes).toHaveLength(1)

    const animatedNodes = result.scene.nodes.filter(
      (n) => n.node.schema.id === 'vfx-animated-float-variable-data',
    )
    expect(animatedNodes).toHaveLength(1)

    const animated = animatedNodes[0]!
    const listBlock = animated.node.schema.listPointer?.find((b) => b.title === 'probabilityTables')
    expect(listBlock?.slots?.length).toBe(2)

    const probConnections = result.scene.connections.filter((c) => c.fromNodeId === animated.id)
    expect(probConnections).toHaveLength(1)
  })
})

describe('canvasNodeSubtreeToRitual struct-only vazio', () => {
  it('exporta slot sem ligação como Type {}', () => {
    const scene: CanvasScene = {
      nodes: [
        {
          id: 'animated-1',
          position: { x: 0, y: 0 },
          node: {
            schema: {
              ...animatedFloatSchema,
              listPointer: [
                {
                  id: 'VfxAnimatedFloatVariableData_listPointer_probabilityTables',
                  title: 'probabilityTables',
                  internalStructures: animatedFloatSchema.listPointer![0]!.internalStructures,
                  slots: [
                    {
                      id: 'VfxAnimatedFloatVariableData_listPointer_probabilityTables__slot__0',
                      name: 'VfxProbabilityTableData',
                      schemaId: 'vfx-probability-table-data',
                      structOnlyEmpty: true,
                    },
                    {
                      id: 'VfxAnimatedFloatVariableData_listPointer_probabilityTables__slot__1',
                      name: 'VfxProbabilityTableData',
                      schemaId: 'vfx-probability-table-data',
                    },
                  ],
                },
              ],
            },
            values: animatedFloatSchema.parameters.map((p) => ({
              parameterId: p.id,
              value: p.defaultValue,
            })),
          },
        },
        {
          id: 'prob-1',
          position: { x: 200, y: 0 },
          node: {
            schema: probabilityTableSchema,
            values: [
              { parameterId: 'vfx-probability-table-data_parameter_keyTimes', value: '0\n1' },
              { parameterId: 'vfx-probability-table-data_parameter_keyValues', value: '1\n1.5' },
            ],
          },
        },
      ],
      connections: [
        {
          id: 'c1',
          fromNodeId: 'animated-1',
          toNodeId: 'prob-1',
          fromInternalStructureId:
            'VfxAnimatedFloatVariableData_listPointer_probabilityTables__slot__1',
          routing: 'wireless',
        },
      ],
    }

    const result = canvasNodeSubtreeToRitual(scene, registry, 'animated-1')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('VfxProbabilityTableData {}')
    expect(result.text).toContain('keyTimes: list[f32]')
    expect(result.text).toContain('keyValues: list[f32]')
    const emptyIndex = result.text.indexOf('VfxProbabilityTableData {}')
    const fullIndex = result.text.indexOf('keyTimes: list[f32]')
    expect(emptyIndex).toBeGreaterThanOrEqual(0)
    expect(fullIndex).toBeGreaterThan(emptyIndex)
  })

  it('exporta pointer vazio como Type {} numa linha', () => {
    const scene: CanvasScene = {
      nodes: [
        {
          id: 'value-1',
          position: { x: 0, y: 0 },
          node: {
            schema: {
              ...valueFloatSchema,
              pointer: [
                {
                  id: 'ValueFloat_pointer_dynamics',
                  title: 'dynamics',
                  internalStructures: valueFloatSchema.pointer![0]!.internalStructures,
                  slots: [
                    {
                      id: 'ValueFloat_pointer_dynamics__slot__0',
                      name: 'VfxAnimatedFloatVariableData',
                      schemaId: 'vfx-animated-float-variable-data',
                      structOnlyEmpty: true,
                    },
                  ],
                },
              ],
            },
            values: [{ parameterId: 'value-float_parameter_constantValue', value: '0.6' }],
          },
        },
      ],
      connections: [],
    }

    const result = canvasNodeSubtreeToRitual(scene, registry, 'value-1')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toMatch(/dynamics:\s*pointer\s*=\s*VfxAnimatedFloatVariableData\s*\{\}/)
  })
})
