import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import {
  listPointerSlotId,
  migrateLegacyCatalogConnectionId,
  migrateSceneListPointerConnections,
} from '@/core/listPointerSlots'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

const listPointerId = 'VfxSystemDefinitionData_listPointer_complexEmitterDefinitionData'

const schema: NodeSchemaDefinition = {
  id: 'vfx-system',
  title: 'VfxSystemDefinitionData',
  parameters: [],
  listPointer: [
    {
      id: listPointerId,
      title: 'complexEmitterDefinitionData',
      internalStructures: Array.from({ length: 6 }, (_, index) => ({
        id: `catalog-${index}`,
        name: 'VfxEmitterDefinitionData',
        schemaId: `schema-${index}`,
      })),
      slots: Array.from({ length: 6 }, (_, index) => ({
        id: listPointerSlotId(listPointerId, index),
        name: 'VfxEmitterDefinitionData',
        schemaId: `schema-${index}`,
      })),
    },
  ],
}

describe('listPointerSlots migration', () => {
  it('migrateLegacyCatalogConnectionId mapeia catálogo para o índice correcto', () => {
    expect(migrateLegacyCatalogConnectionId(schema, 'catalog-5')).toBe(
      listPointerSlotId(listPointerId, 5),
    )
  })

  it('migrateSceneListPointerConnections actualiza conexões antigas', () => {
    const nodes: CanvasNode[] = [
      {
        id: 'system',
        position: { x: 0, y: 0 },
        node: {
          id: 'system',
          schema,
          values: [],
        },
      },
    ]
    const connections: CanvasConnection[] = [
      {
        id: 'legacy',
        fromNodeId: 'system',
        fromInternalStructureId: 'catalog-5',
        toNodeId: 'emitter',
      },
    ]

    const migrated = migrateSceneListPointerConnections(nodes, connections)
    expect(migrated[0]?.fromInternalStructureId).toBe(listPointerSlotId(listPointerId, 5))
  })
})
