import { describe, expect, it } from 'vitest'
import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three'

import { orientLoadedMeshAlongZ } from './lolMeshGeometry'

function dominantExtentZ(geometry: BufferGeometry): number {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const extentX = box.max.x - box.min.x
  const extentY = box.max.y - box.min.y
  const extentZ = box.max.z - box.min.z
  return Math.max(extentX, extentY, extentZ) === extentZ ? extentZ : -1
}

describe('orientLoadedMeshAlongZ', () => {
  it('malha já alongada em Z: sem alteração', () => {
    const geometry = new BoxGeometry(0.2, 0.2, 2)
    const oriented = orientLoadedMeshAlongZ(geometry)
    expect(oriented).toBe(geometry)
    geometry.dispose()
  })

  it('malha alongada em Y: roda para +Z', () => {
    const geometry = new BoxGeometry(0.2, 2, 0.2)
    const oriented = orientLoadedMeshAlongZ(geometry)
    oriented.computeBoundingBox()
    const box = oriented.boundingBox!
    const extentZ = box.max.z - box.min.z
    const extentY = box.max.y - box.min.y
    expect(extentZ).toBeGreaterThan(extentY)
    expect(dominantExtentZ(oriented)).toBeGreaterThan(0)
    geometry.dispose()
    oriented.dispose()
  })

  it('malha alongada em X: roda para +Z', () => {
    const geometry = new BoxGeometry(2, 0.2, 0.2)
    const oriented = orientLoadedMeshAlongZ(geometry)
    oriented.computeBoundingBox()
    const box = oriented.boundingBox!
    const extentZ = box.max.z - box.min.z
    const extentX = box.max.x - box.min.x
    expect(extentZ).toBeGreaterThan(extentX)
    geometry.dispose()
    oriented.dispose()
  })

  it('bbox X≈Z mas vértices alongados em X: alinha +Z', () => {
    const positions = new Float32Array([
      -1, 0, 0, 1, 0, 0, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5,
    ])
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.computeBoundingBox()

    const oriented = orientLoadedMeshAlongZ(geometry)
    oriented.computeBoundingBox()
    const box = oriented.boundingBox!
    const extentZ = box.max.z - box.min.z
    const extentX = box.max.x - box.min.x
    expect(extentZ).toBeGreaterThan(extentX)
    geometry.dispose()
    oriented.dispose()
  })

  it('placa fina em Y: menor eixo passa a Z (normal +Z)', () => {
    const geometry = new BoxGeometry(2, 0.05, 2)
    const oriented = orientLoadedMeshAlongZ(geometry)
    oriented.computeBoundingBox()
    const box = oriented.boundingBox!
    const extentZ = box.max.z - box.min.z
    const extentX = box.max.x - box.min.x
    const extentY = box.max.y - box.min.y
    expect(extentZ).toBeLessThan(extentX)
    expect(extentZ).toBeLessThan(extentY)
    geometry.dispose()
    oriented.dispose()
  })
})
