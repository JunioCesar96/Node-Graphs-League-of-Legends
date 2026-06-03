import { describe, expect, it } from 'vitest'

import {
  resolveSchemaPackFolder,
  schemaBelongsToPalettePack,
} from '@/core/nodeStructurePackFolders'
import { NEEKO_SCHEMA_ID } from '@/core/neekoNodeTransform'
import { schemaJsonRelativePathBySchemaId, schemaPackFolderBySchemaId, schemaRegistry } from '@/core/canvasScene'

describe('resolveSchemaPackFolder', () => {
  it('usa pasta do caminho JSON em vez de mapa desactualizado', () => {
    expect(
      resolveSchemaPackFolder('foo', {
        packFolderBySchemaId: { foo: 'wrong-pack' },
        jsonRelativePathBySchemaId: { foo: 'default/foo.json' },
      }),
    ).toBe('default')
  })

  it('Neeko no registo resolve para default', () => {
    const rel = schemaJsonRelativePathBySchemaId[NEEKO_SCHEMA_ID]
    if (!rel) {
      expect(schemaPackFolderBySchemaId[NEEKO_SCHEMA_ID]).toBe('default')
      return
    }
    expect(resolveSchemaPackFolder(NEEKO_SCHEMA_ID, {
      packFolderBySchemaId: schemaPackFolderBySchemaId,
      jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
    })).toBe('default')
  })
})

describe('schemaBelongsToPalettePack', () => {
  it('inclui schemas default quando a pasta default está seleccionada', () => {
    const defaultIds = Object.entries(schemaJsonRelativePathBySchemaId)
      .filter(([, path]) => path.replace(/\\/g, '/').startsWith('default/'))
      .map(([id]) => id)
      .slice(0, 5)

    expect(defaultIds.length).toBeGreaterThan(0)

    for (const id of defaultIds) {
      expect(
        schemaBelongsToPalettePack(id, 'default', {
          packFolderBySchemaId: schemaPackFolderBySchemaId,
          jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
          diskPackFolders: ['default', 'zac2'],
        }),
      ).toBe(true)
    }
  })

  it('modo Todos limita a pastas do disco e memória', () => {
    const anyId = Object.keys(schemaRegistry)[0]
    expect(anyId).toBeTruthy()

    expect(
      schemaBelongsToPalettePack(anyId!, null, {
        packFolderBySchemaId: { [anyId!]: 'fantasma' },
        jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
        diskPackFolders: ['default'],
        memoryPackFolders: [],
      }),
    ).toBe(
      schemaBelongsToPalettePack(anyId!, null, {
        packFolderBySchemaId: schemaPackFolderBySchemaId,
        jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
        diskPackFolders: ['default'],
        memoryPackFolders: [],
      }),
    )
  })
})
