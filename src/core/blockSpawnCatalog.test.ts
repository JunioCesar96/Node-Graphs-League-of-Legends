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

  it('mantém constantValue distinto por instância ritual (nodeId)', () => {
    const makeVec3 = (nodeId: string, value: string): BlockParameterJsonDocument => ({
      id: `constantValue_${nodeId}`,
      block: 'ValueVector3',
      parameterName: 'constantValue',
      name: 'constantValue',
      source: {
        kind: 'parameter',
        parameterId: `${nodeId}_parameter_constantValue`,
      },
      type: 'vec3',
      value,
      slots: { in: ['vec3'], out: ['vec3'] },
    })

    const catalog = buildBlockSpawnCatalog({
      blockDocuments: [],
      parameterDocuments: [
        makeVec3('emitter-a__value-vector3-birth-scale0', '680, 680, 50'),
        makeVec3('emitter-b__value-vector3-birth-scale0', '760, 760, 50'),
      ],
      warnings: [],
      errors: [],
    })

    expect(catalog.parameterByKey.size).toBe(2)
    expect(
      resolveSpawnCatalogParameterDocument(catalog, 'ValueVector3', 'constantValue', {
        instanceNodeId: 'emitter-a__value-vector3-birth-scale0',
      })?.value,
    ).toBe('680, 680, 50')
    expect(
      resolveSpawnCatalogParameterDocument(catalog, 'ValueVector3', 'constantValue', {
        instanceNodeId: 'emitter-b__value-vector3-birth-scale0',
      })?.value,
    ).toBe('760, 760, 50')
  })
})
