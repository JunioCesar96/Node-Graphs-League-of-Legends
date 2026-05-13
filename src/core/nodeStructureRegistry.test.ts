import { describe, expect, it } from 'vitest'

import { schemaBaseInternalStructureCatalogBySchemaId, schemaRegistry } from '@/core/nodeStructureRegistry'

describe('schemaBaseInternalStructureCatalogBySchemaId (VFX → Emitter)', () => {
  it('lista nós #3 aninháveis sob raiz VFX no mesmo pack', () => {
    const vfx = schemaRegistry.VFX
    const emitter = schemaRegistry.Emitter

    if (!vfx || !emitter) {
      // Pack «importado» opcional no checkout
      return
    }

    expect(vfx.nomenclature?.collection?.trim()).toBe('#2 VFX Definition Root')
    expect(emitter.nomenclature?.collection?.trim()).toBe('#3 Embed Block')

    const catalog = schemaBaseInternalStructureCatalogBySchemaId.VFX ?? []
    const targetIds = catalog.map((c) => c.schemaId)
    expect(targetIds).toContain('Emitter')
  })
})
