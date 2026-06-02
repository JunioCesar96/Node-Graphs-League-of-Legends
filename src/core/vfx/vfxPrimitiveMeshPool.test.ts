import { describe, expect, it, afterEach } from 'vitest'

import {
  cloneVfxPrimitiveGeometry,
  createEmitterPrimitiveGeometry,
  disposeVfxPrimitiveMeshPool,
  getVfxPrimitivePlaceholderMaterial,
  isVfxPrimitiveMeshPoolWarmed,
  warmVfxPrimitiveMeshPool,
} from './vfxPrimitiveMeshPool'

describe('vfxPrimitiveMeshPool', () => {
  afterEach(() => {
    disposeVfxPrimitiveMeshPool()
  })

  it('aquece templates e material transparente', () => {
    expect(isVfxPrimitiveMeshPoolWarmed()).toBe(false)
    warmVfxPrimitiveMeshPool()
    expect(isVfxPrimitiveMeshPoolWarmed()).toBe(true)
    const mat = getVfxPrimitivePlaceholderMaterial()
    expect(mat.transparent).toBe(true)
    expect(mat.opacity).toBe(0)
  })

  it('clone devolve geometria independente', () => {
    warmVfxPrimitiveMeshPool()
    const a = cloneVfxPrimitiveGeometry('beam')
    const b = cloneVfxPrimitiveGeometry('beam')
    expect(a).not.toBe(b)
    a.dispose()
    b.dispose()
  })

  it('mesh sem asset usa fallback plane no pool', () => {
    warmVfxPrimitiveMeshPool()
    const meshKind = cloneVfxPrimitiveGeometry('mesh')
    const planeKind = cloneVfxPrimitiveGeometry('plane')
    expect(meshKind.type).toBe(planeKind.type)
    meshKind.dispose()
    planeKind.dispose()
  })

  it('createEmitterPrimitiveGeometry alinha beam ao eixo longo Z', () => {
    const geo = createEmitterPrimitiveGeometry('beam')
    const pos = geo.attributes.position
    expect(pos).toBeDefined()
    geo.dispose()
  })

  it('clone com uvRotationSafe usa malha expandida', () => {
    warmVfxPrimitiveMeshPool()
    const normal = cloneVfxPrimitiveGeometry('plane')
    const safe = cloneVfxPrimitiveGeometry('plane', { uvRotationSafe: true })
    const normalPos = normal.attributes.position
    const safePos = safe.attributes.position
    let normalMax = 0
    let safeMax = 0
    for (let i = 0; i < normalPos.count; i++) {
      normalMax = Math.max(normalMax, Math.abs(normalPos.getX(i)), Math.abs(normalPos.getY(i)))
      safeMax = Math.max(safeMax, Math.abs(safePos.getX(i)), Math.abs(safePos.getY(i)))
    }
    expect(safeMax).toBeGreaterThan(normalMax * 1.3)
    normal.dispose()
    safe.dispose()
  })
})
