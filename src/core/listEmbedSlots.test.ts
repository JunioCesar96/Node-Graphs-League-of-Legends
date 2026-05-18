import { describe, expect, it } from 'vitest'

import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  listEmbedSlotId,
  migrateLegacyCatalogConnectionId,
  migrateSceneListEmbedConnections,
  populatedSlotsForListEmbed,
} from '@/core/listEmbedSlots'

const meshSchema: NodeSchemaDefinition = {
  id: 'skin-mesh-data-properties',
  title: 'SkinMeshDataProperties',
  parameters: [],
  listEmbed: [
    {
      id: 'skin-mesh-data-properties-material-override',
      title: 'materialOverride',
      internalStructures: [
        {
          id: 'skin-mesh-data-properties-material-override-0',
          name: 'SkinMeshDataProperties_MaterialOverride',
          schemaId: 'skin-mesh-data-properties-material-override',
        },
      ],
    },
  ],
  internalStructures: [],
}

describe('listEmbedSlots', () => {
  it('populatedSlotsForListEmbed não cria porta vazia por defeito', () => {
    const block = meshSchema.listEmbed![0]!
    expect(populatedSlotsForListEmbed(block)).toHaveLength(0)
  })

  it('populatedSlotsForListEmbed devolve apenas slots adicionados', () => {
    const block = meshSchema.listEmbed![0]!
    const withSlots = {
      ...block,
      slots: [
        {
          id: listEmbedSlotId(block.id, 0),
          name: 'SkinMeshDataProperties_MaterialOverride',
          schemaId: 'skin-mesh-data-properties-material-override',
        },
      ],
    }
    const slots = populatedSlotsForListEmbed(withSlots)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.id).toBe(listEmbedSlotId(block.id, 0))
  })

  it('migrateLegacyCatalogConnectionId mapeia catálogo para slot 0', () => {
    expect(
      migrateLegacyCatalogConnectionId(
        meshSchema,
        'skin-mesh-data-properties-material-override-0',
      ),
    ).toBe('skin-mesh-data-properties-material-override__slot__0')
  })

  it('migrateSceneListEmbedConnections actualiza conexões antigas', () => {
    const nodes: CanvasNode[] = [
      {
        id: 'node-1',
        position: { x: 0, y: 0 },
        node: {
          id: 'node-1',
          schema: meshSchema,
          values: [],
        },
      },
    ]
    const connections: CanvasConnection[] = [
      {
        id: 'node-1:skin-mesh-data-properties-material-override-0->child',
        fromNodeId: 'node-1',
        fromInternalStructureId: 'skin-mesh-data-properties-material-override-0',
        toNodeId: 'child',
      },
    ]

    const migrated = migrateSceneListEmbedConnections(nodes, connections)
    expect(migrated[0]!.fromInternalStructureId).toBe(
      'skin-mesh-data-properties-material-override__slot__0',
    )
  })
})
