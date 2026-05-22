import { describe, expect, it } from 'vitest'

import { listPalettePackFolders, PALETTE_PACK_FOLDER_DEFAULT } from '@/core/paletteSchemaUtils'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { schemaPackFolderBySchemaId, schemaRegistry } from '@/core/canvasScene'
import { NEEKO_SCHEMA_ID } from '@/core/neekoNodeTransform'

function stubSchema(id: string): NodeSchemaDefinition {
  return {
    id,
    title: id,
    parameters: [],
    internalStructures: [],
  }
}

describe('listPalettePackFolders', () => {
  it('com pastas do disco, ignora mapa antigo do registo', () => {
    const packMap = {
      'removed-pack': 'removed-pack',
      'alfa-only': 'alfa',
      x: 'hotel',
    }

    expect(
      listPalettePackFolders(['default', 'zac2'], {
        packFolderBySchemaId: packMap,
        schemas: [stubSchema('alfa-only')],
      }),
    ).toEqual(['default', 'zac2'])
  })

  it('com disco, funde packs só em memória', () => {
    expect(
      listPalettePackFolders(['default'], {
        memoryPackFolders: ['meu-pack-importado'],
      }),
    ).toEqual(['default', 'meu-pack-importado'])
  })

  it('sem disco, fallback só a pastas dos schemas na lista', () => {
    const folders = listPalettePackFolders([], {
      schemas: [stubSchema('a'), stubSchema('b')],
      packFolderBySchemaId: {
        a: 'alfa',
        b: 'alfa',
        c: 'fantasma',
      },
    })
    expect(folders).toEqual(['alfa'])
  })

  it('disco real inclui default para Neeko no registo', () => {
    expect(schemaRegistry[NEEKO_SCHEMA_ID]).toBeDefined()
    expect(schemaPackFolderBySchemaId[NEEKO_SCHEMA_ID]).toBe(PALETTE_PACK_FOLDER_DEFAULT)

    const folders = listPalettePackFolders(['default', 'zac2'], {
      schemas: Object.values(schemaRegistry),
      packFolderBySchemaId: schemaPackFolderBySchemaId,
    })
    expect(folders).toContain(PALETTE_PACK_FOLDER_DEFAULT)
    expect(folders).not.toContain('importado')
  })
})
