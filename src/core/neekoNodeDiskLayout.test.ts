import { describe, expect, it } from 'vitest'

import {
  neekoFileName,
  neekoSubfolderName,
  neekoTitleSlug,
  prepareNeekoSchemasForDisk,
  resolveNeekoDiskWriteTarget,
} from '@/core/neekoNodeDiskLayout'
import type { CanvasNode } from '@/core/canvasScene'
import { NEEKO_CARD_SCHEMA_ID } from '@/core/neekoNodeDiskLayout'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

function stubSchema(id: string, title: string): NodeSchemaDefinition {
  return {
    id,
    title,
    parameters: [],
    internalStructures: [],
  }
}

function stubCanvasNode(schema: NodeSchemaDefinition, nodeId = schema.id): CanvasNode {
  return {
    id: nodeId,
    position: { x: 0, y: 0 },
    node: {
      schema,
      parameters: [],
      internalStructures: [],
    },
  }
}

describe('neekoNodeDiskLayout', () => {
  it('neekoTitleSlug normaliza título', () => {
    expect(neekoTitleSlug('VfxSystemDefinitionData')).toBe('vfxsystemdefinitiondata')
    expect(neekoTitleSlug('  Value-Float  ')).toBe('valuefloat')
  })

  it('neekoSubfolderName usa pack e segmento do título', () => {
    expect(neekoSubfolderName('default', 'VfxEmitterDefinitionData')).toBe(
      'default_VfxEmitterDefinitionData',
    )
  })

  it('neekoFileName resolve colisão de três emitters', () => {
    const used = new Set<string>()
    const title = 'VfxEmitterDefinitionData'

    const a = neekoFileName(
      { id: 'vfx-emitter-definition-data__complex-emitter-definition-data-0', title },
      used,
    )
    const b = neekoFileName(
      { id: 'vfx-emitter-definition-data__complex-emitter-definition-data-1', title },
      used,
    )
    const c = neekoFileName(
      { id: 'vfx-emitter-definition-data__complex-emitter-definition-data-2', title },
      used,
    )

    expect(a).toBe('neekonode_vfxemitterdefinitiondata.json')
    expect(b).toBe(
      'neekonode_vfxemitterdefinitiondata__vfx-emitter-definition-data__complex-emitter-definition-data-1.json',
    )
    expect(c).toBe(
      'neekonode_vfxemitterdefinitiondata__vfx-emitter-definition-data__complex-emitter-definition-data-2.json',
    )
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('prepareNeekoSchemasForDisk exclui card neeko e deduplica por id', () => {
    const nodes = [
      stubCanvasNode(stubSchema(NEEKO_CARD_SCHEMA_ID, 'Neeko Node'), 'neeko-1'),
      stubCanvasNode(stubSchema('value-float-a', 'ValueFloat'), 'vf-1'),
      stubCanvasNode(stubSchema('value-float-a', 'ValueFloat'), 'vf-2'),
    ]

    const payloads = prepareNeekoSchemasForDisk(nodes)

    expect(payloads).toHaveLength(1)
    expect(payloads[0]?.id).toBe('value-float-a')
    expect(payloads[0]?.tag).toBe('neeko')
  })

  it('resolveNeekoDiskWriteTarget produz label relativo', () => {
    const used = new Set<string>()
    const target = resolveNeekoDiskWriteTarget(
      { id: 'vfx-system-definition-data', title: 'VfxSystemDefinitionData' },
      used,
    )

    expect(target.subfolderName).toBe('default_VfxSystemDefinitionData')
    expect(target.fileName).toBe('neekonode_vfxsystemdefinitiondata.json')
    expect(target.relativeLabel).toBe(
      'default_VfxSystemDefinitionData/neekonode_vfxsystemdefinitiondata.json',
    )
  })
})
