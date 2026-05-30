import { BoxGeometry, Mesh, Object3D } from 'three'
import { describe, expect, it } from 'vitest'

import { getBoundObjectSizeLolFromObject3D } from './vfxCharacterBounds'

describe('getBoundObjectSizeLolFromObject3D', () => {
  it('converts Three AABB to LoL size using engineScale and axis remap', () => {
    const root = new Object3D()
    const mesh = new Mesh(new BoxGeometry(2, 4, 6))
    root.add(mesh)

    const sizeLol = getBoundObjectSizeLolFromObject3D(root, 0.01)

    expect(sizeLol[0]).toBeCloseTo(200, 5)
    expect(sizeLol[1]).toBeCloseTo(600, 5)
    expect(sizeLol[2]).toBeCloseTo(400, 5)
  })

  it('returns default when bounding box is empty', () => {
    const root = new Object3D()
    expect(getBoundObjectSizeLolFromObject3D(root, 0.01)).toEqual([100, 100, 100])
  })
})
