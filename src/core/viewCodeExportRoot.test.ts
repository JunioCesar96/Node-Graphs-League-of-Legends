import { describe, expect, it } from 'vitest'

import type { CanvasScene } from '@/core/canvasScene'
import { emitNodeRitualViewCodeText } from '@/core/nodeCodeEditorBinding'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { listPointerSlotId } from '@/core/listPointerSlots'
import { elementViewKeyForListPointer } from '@/core/elementViewState'
import { resolveViewCodeExportNodeId } from '@/core/viewCodeExportRoot'

const listPointerId = 'VfxSystem_listPointer_emitters'

const vfxSystemSchema: NodeSchemaDefinition = {
  id: 'vfx-system-test',
  title: 'VfxSystemDefinitionData',
  parameters: [
    { id: 'p-name', name: 'particleName', type: 'string', defaultValue: 'test_vfx' },
  ],
  internalStructures: [],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [
    {
      id: listPointerId,
      title: 'complexEmitterDefinitionData',
      templateBlockId: listPointerId,
      internalStructures: [
        { id: 'cat-0', name: 'VfxEmitterDefinitionData', schemaId: 'emitter-a' },
        { id: 'cat-1', name: 'VfxEmitterDefinitionData', schemaId: 'emitter-b' },
        { id: 'cat-2', name: 'VfxEmitterDefinitionData', schemaId: 'emitter-c' },
      ],
      slots: [
        {
          id: listPointerSlotId(listPointerId, 0),
          name: 'VfxEmitterDefinitionData',
          schemaId: 'emitter-a',
        },
        {
          id: listPointerSlotId(listPointerId, 1),
          name: 'VfxEmitterDefinitionData',
          schemaId: 'emitter-b',
        },
        {
          id: listPointerSlotId(listPointerId, 2),
          name: 'VfxEmitterDefinitionData',
          schemaId: 'emitter-c',
        },
      ],
    },
  ],
  list2Embed: [],
  list2Pointer: [],
}

const emitterSchema: NodeSchemaDefinition = {
  id: 'emitter-a',
  title: 'VfxEmitterDefinitionData',
  parameters: [
    { id: 'p-emitter', name: 'emitterName', type: 'string', defaultValue: '' },
  ],
  internalStructures: [],
  embed: [],
  pointer: [],
  listEmbed: [],
  listPointer: [],
  list2Embed: [],
  list2Pointer: [],
}

const registry: Record<string, NodeSchemaDefinition> = {
  'vfx-system-test': vfxSystemSchema,
  'emitter-a': emitterSchema,
  'emitter-b': { ...emitterSchema, id: 'emitter-b' },
  'emitter-c': { ...emitterSchema, id: 'emitter-c' },
}

function buildListScene(): CanvasScene {
  return {
    width: 1200,
    height: 800,
    nodes: [
      {
        id: 'vfx',
        position: { x: 0, y: 0 },
        node: {
          schema: vfxSystemSchema,
          values: [{ parameterId: 'p-name', value: 'test_vfx' }],
          elementView: {
            [elementViewKeyForListPointer(listPointerId)]: {
              mode: 'compact',
              selectedIndex: 1,
            },
          },
        },
      },
      {
        id: 'em-1',
        position: { x: 400, y: 0 },
        node: {
          schema: emitterSchema,
          values: [{ parameterId: 'p-emitter', value: 'emitter_slot_1' }],
        },
      },
    ],
    connections: [
      {
        id: 'link-1',
        fromNodeId: 'vfx',
        fromInternalStructureId: listPointerSlotId(listPointerId, 1),
        toNodeId: 'em-1',
        toInternalStructureId: '',
      },
    ],
  }
}

describe('resolveViewCodeExportNodeId', () => {
  it('sobe ao pai quando o nó é filho directo de list[pointer]', () => {
    expect(resolveViewCodeExportNodeId(buildListScene(), 'em-1')).toBe('vfx')
    expect(resolveViewCodeExportNodeId(buildListScene(), 'vfx')).toBe('vfx')
  })
})

describe('emitNodeRitualViewCodeText — listas compactas', () => {
  it('exporta todos os slots da lista, não só o índice seleccionado na UI', () => {
    const result = emitNodeRitualViewCodeText(buildListScene(), registry, 'vfx')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const block = result.text.match(
      /complexEmitterDefinitionData: list\[pointer\] = \{([\s\S]*?)\n    \}/,
    )?.[1]
    expect(block).toBeDefined()
    expect(block!.match(/VfxEmitterDefinitionData \{\}/g)?.length ?? 0).toBe(2)
    expect(block).toContain('emitterName: string = "emitter_slot_1"')
  })

  it('a partir do filho list[pointer] exporta o pai com a lista completa', () => {
    const result = emitNodeRitualViewCodeText(buildListScene(), registry, 'em-1')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.text).toContain('VfxSystemDefinitionData {')
    expect(result.text).toContain('complexEmitterDefinitionData: list[pointer] = {')
    const block = result.text.match(
      /complexEmitterDefinitionData: list\[pointer\] = \{([\s\S]*?)\n    \}/,
    )?.[1]
    expect(block).toBeDefined()
    expect(block!.match(/VfxEmitterDefinitionData/g)?.length ?? 0).toBe(3)
  })
})
