import { describe, expect, it } from 'vitest'
import { Mesh, PlaneGeometry, MeshBasicMaterial, Scene } from 'three'
import { Mesh, PlaneGeometry, MeshBasicMaterial } from 'three'
import { createDynamicMeshGroundHitResolver, raycastMeshGroundHit } from './vfxMeshGroundHit'
import { createDynamicMeshGroundHitResolver, raycastMeshGroundHit } from './vfxMeshGroundHit'

describe('raycastMeshGroundHit', () => {
  it('acerta plano horizontal em z=0 (XY)', () => {
    const mesh = new Mesh(new PlaneGeometry(20, 20), new MeshBasicMaterial())
    mesh.position.set(0, 0, 0)
    mesh.updateMatrixWorld(true)

    const hit = raycastMeshGroundHit([mesh], 1, 2)
    expect(hit).not.toBeNull()
    expect(hit!.z).toBeCloseTo(0, 2)
    expect(hit!.normal[2]).toBeGreaterThan(0.9)
  })

  it('resolver dinâmico usa plano quando não há malhas', () => {
    const rootsRef = { current: [] as import('three').Object3D[] }
    const resolve = createDynamicMeshGroundHitResolver(rootsRef, 0.5)
    const hit = resolve(0, 0)!
    expect(hit.z).toBe(0.5)
  })
})