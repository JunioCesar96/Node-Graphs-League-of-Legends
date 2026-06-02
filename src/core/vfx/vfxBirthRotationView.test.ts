import { describe, expect, it } from 'vitest'

import {
  birthRotationLolDegToViewDeg,
  birthRotationViewDegToLolDeg,
  GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL,
  resolveBirthRotationBaselineLol,
} from './vfxBirthRotationView'

describe('vfxBirthRotationView', () => {
  it('{-90,-90,0} LoL → {0,0,0} view (baseline ground-like)', () => {
    const baseline = GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
    expect(birthRotationLolDegToViewDeg([-90, -90, 0], baseline)).toEqual([0, 0, 0])
  })

  it('{0,0,0} view → {-90,-90,0} LoL', () => {
    const baseline = GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
    expect(birthRotationViewDegToLolDeg([0, 0, 0], baseline)).toEqual([-90, -90, 0])
  })

  it('spin +45° LoL Z aparece na view', () => {
    const baseline = GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
    const view = birthRotationLolDegToViewDeg([-90, -90, 45], baseline)
    expect(view[0]).toBeCloseTo(0, 5)
    expect(view[1]).toBeCloseTo(0, 5)
    expect(view[2]).toBeCloseTo(45, 5)
  })

  it('round-trip LoL → view → LoL', () => {
    const baseline = GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
    const lol: [number, number, number] = [-90, -45, 30]
    const view = birthRotationLolDegToViewDeg(lol, baseline)
    const back = birthRotationViewDegToLolDeg(view, baseline)
    expect(back[0]).toBeCloseTo(lol[0], 5)
    expect(back[1]).toBeCloseTo(lol[1], 5)
    expect(back[2]).toBeCloseTo(lol[2], 5)
  })

  it('resolveBirthRotationBaselineLol: planeFacing ground sem isGroundLayer', () => {
    expect(
      resolveBirthRotationBaselineLol({
        isGroundLayer: false,
        planeFacing: 'ground',
        birthRotationRitual: [-90, -90, 0],
      }),
    ).toEqual(GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL)
  })

  it('billboard puro: baseline zero', () => {
    expect(
      resolveBirthRotationBaselineLol({
        isGroundLayer: false,
        planeFacing: 'camera',
        birthRotationRitual: null,
      }),
    ).toEqual([0, 0, 0])
  })
})
