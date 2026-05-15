import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

import {
  findConnectionTargetForSlot,
  getNodesByCollectionType,
  nodesShareCollectionType,
  resolveCollectionTypeForInternalStructure,
  resolveCollectionTypeForSlot,
  schemaMatchesCollectionType,
} from './collectionTypeLinking'

const registry: Record<string, NodeSchemaDefinition> = {
  Emitter: {
    id: 'Emitter',
    title: 'Emitter',
    parameters: [],
    internalStructures: [],
    nomenclature: {
      group: '#3',
      collection: '#3 Embed Block',
      collectionType: 'Emitter',
    },
  },
  'vfx-em-imported': {
    id: 'vfx-em-imported',
    title: 'Emitter · spark',
    parameters: [],
    internalStructures: [],
    nomenclature: {
      group: '#3',
      collection: '#3 Embed Block',
      collectionType: 'Emitter',
    },
  },
  VFX: {
    id: 'VFX',
    title: 'VFX',
    parameters: [],
    internalStructures: [],
    nomenclature: {
      group: '#2',
      collection: '#2 VFX Definition Root',
      collectionType: 'VFX',
    },
  },
}

function canvasNode(
  id: string,
  schemaId: string,
  collectionType?: string,
): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    node: {
      id,
      schema: {
        id: schemaId,
        title: schemaId,
        parameters: [],
        internalStructures: [],
        nomenclature: collectionType
          ? {
              group: '',
              collection: '',
              collectionType,
            }
          : undefined,
      },
      values: [],
    },
  }
}

describe('collectionTypeLinking', () => {
  it('resolveCollectionTypeForSlot lê nomenclatura do registry', () => {
    expect(resolveCollectionTypeForSlot('Emitter', registry)).toBe('Emitter')
    expect(resolveCollectionTypeForSlot('unknown', registry)).toBeUndefined()
  })

  it('getNodesByCollectionType filtra nós ativos por tipo', () => {
    const nodes = [
      canvasNode('VFX-01', 'VFX', 'VFX'),
      canvasNode('Emitter-01', 'Emitter', 'Emitter'),
      canvasNode('em-02', 'vfx-em-imported', 'Emitter'),
    ]

    expect(getNodesByCollectionType(nodes, 'Emitter').map((node) => node.id)).toEqual([
      'Emitter-01',
      'em-02',
    ])
    expect(
      getNodesByCollectionType(nodes, 'Emitter', { excludeNodeId: 'VFX-01' }).map((node) => node.id),
    ).toEqual(['Emitter-01', 'em-02'])
  })

  it('nodesShareCollectionType aceita schema.id diferente com mesmo collectionType', () => {
    const emitterNode = canvasNode('em-02', 'vfx-em-imported', 'Emitter')

    expect(nodesShareCollectionType('Emitter', emitterNode, registry)).toBe(true)
    expect(nodesShareCollectionType('Emitter', canvasNode('VFX-01', 'VFX', 'VFX'), registry)).toBe(
      false,
    )
  })

  it('nodesShareCollectionType faz fallback estrito sem nomenclatura', () => {
    const legacy = canvasNode('legacy-01', 'legacy-type')

    expect(nodesShareCollectionType('legacy-type', legacy, registry)).toBe(true)
    expect(nodesShareCollectionType('other-type', legacy, registry)).toBe(false)
  })

  it('resolveCollectionTypeForInternalStructure usa alvo conectado como fallback', () => {
    const structure = { id: 'slot-1', name: 'Emitter', schemaId: 'Emitter' }
    const connected = canvasNode('em-02', 'vfx-em-imported', 'Emitter')

    expect(resolveCollectionTypeForInternalStructure(structure, {}, connected)).toBe('Emitter')
  })

  it('schemaMatchesCollectionType compara nomenclatura ou id', () => {
    expect(schemaMatchesCollectionType(registry.Emitter, 'Emitter')).toBe(true)
    expect(schemaMatchesCollectionType(registry.VFX, 'Emitter')).toBe(false)
  })

  it('findConnectionTargetForSlot resolve alvo da conexão', () => {
    const nodes = [canvasNode('Emitter-01', 'Emitter', 'Emitter')]
    const target = findConnectionTargetForSlot(
      [{ fromNodeId: 'VFX-01', fromInternalStructureId: 'slot-1', toNodeId: 'Emitter-01' }],
      'VFX-01',
      'slot-1',
      nodes,
    )

    expect(target?.id).toBe('Emitter-01')
  })
})
