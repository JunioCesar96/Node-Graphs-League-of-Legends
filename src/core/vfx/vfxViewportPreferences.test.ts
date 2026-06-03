import { describe, expect, it } from 'vitest'

import { applyVfxPositionOffset } from './vfxViewportPreferences'

describe('applyVfxPositionOffset', () => {
  it('não altera quando desactivado', () => {
    const pos: [number, number, number] = [1, 2, 3]
    expect(applyVfxPositionOffset(pos, false, [0, -1, 0])).toEqual([1, 2, 3])
  })

  it('soma offset quando activo', () => {
    const pos: [number, number, number] = [1, 2, 3]
    expect(applyVfxPositionOffset(pos, true, [0, 1.5, 0])).toEqual([1, 3.5, 3])
  })
})
