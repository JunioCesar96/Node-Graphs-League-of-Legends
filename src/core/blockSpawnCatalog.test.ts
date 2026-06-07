import { describe, expect, it } from 'vitest'

import type { BlockParameterJsonDocument } from './blockParameterJson'
import {
  blockParameterCatalogKey,
  buildBlockSpawnCatalog,
  resolveSpawnCatalogParameterDocument,
} from './blockSpawnCatalog'

function pointerDoc(pointer: string): BlockParameterJsonDocument {
  return {
    id: `SpawnShape_${pointer}`,
    block: 'VfxEmitterDefinitionData',
    parameterName: 'SpawnShape',
    name: 'SpawnShape',
    source: { kind: 'parameter', parameterId: 'test' },
    type: 'pointer',
    pointer,
    slots: { out: [pointer] },
  }
}

describe('blockSpawnCatalog', () => {
  it('mantém documentos SpawnShape distintos por tipo pointer', () => {
    const catalog = buildBlockSpawnCatalog({
      blockDocuments: [],
      parameterDocuments: [pointerDoc('VfxShapeCylinder'), pointerDoc('VfxShapeSphere')],
      warnings: [],
      errors: [],
    })

    expect(catalog.parameterByKey.size).toBe(2)
    expect(
      resolveSpawnCatalogParameterDocument(catalog, 'VfxEmitterDefinitionData', 'SpawnShape', {
        pointerType: 'VfxShapeSphere',
      })?.pointer,
    ).toBe('VfxShapeSphere')
    expect(
      resolveSpawnCatalogParameterDocument(catalog, 'VfxEmitterDefinitionData', 'SpawnShape', {
        pointerType: 'VfxShapeCylinder',
      })?.pointer,
    ).toBe('VfxShapeCylinder')
  })

  it('blockParameterCatalogKey inclui tipo pointer', () => {
    expect(blockParameterCatalogKey(pointerDoc('VfxShapeSphere'))).toBe(
      'VfxEmitterDefinitionData::SpawnShape::pointer::VfxShapeSphere',
    )
  })
})
