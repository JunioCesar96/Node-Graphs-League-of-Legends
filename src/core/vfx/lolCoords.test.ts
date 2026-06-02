import { describe, expect, it } from 'vitest'

import {
  LEAGUE_TO_THREE_P,
  leagueLocalToThree,
  lolMeshToThreeCoords,
  sknPositionToThree,
} from './lolCoords'

describe('lolMeshToThreeCoords', () => {
  it('X LoL = X Three; Y LoL = Z Three; Z LoL = Y Three', () => {
    expect(lolMeshToThreeCoords(10, 20, 30)).toEqual([10, 30, 20])
  })

  it('sknPositionToThree segue Aventurine (-x, -z, y) × IMPORT_SCALE', () => {
    expect(sknPositionToThree(100, 200, 300)).toEqual([-1, -3, 2])
  })
})

describe('leagueLocalToThree', () => {
  it('translação só em Y LoL alinha com sknPositionToThree', () => {
    const { translation } = leagueLocalToThree([0, 100, 0], [0, 0, 0, 1], [1, 1, 1])
    const mesh = sknPositionToThree(0, 100, 0)
    expect(translation[0]).toBeCloseTo(mesh[0], 5)
    expect(translation[1]).toBeCloseTo(mesh[1], 5)
    expect(translation[2]).toBeCloseTo(mesh[2], 5)
  })
})

describe('LEAGUE_TO_THREE_P', () => {
  it('espelha X e Z como Aventurine import_skl', () => {
    expect(LEAGUE_TO_THREE_P[0]).toBe(-1)
    expect(LEAGUE_TO_THREE_P[6]).toBe(1)
    expect(LEAGUE_TO_THREE_P[9]).toBe(-1)
  })
})
