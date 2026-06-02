import { Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import type { ParsedLolSkl } from './lolSklParse'
import type { ParsedLolAnm } from './lolAnmParse'
import {
  countMatchedAnmTracks,
  deformPositionsWithSkinning,
  evaluateBoneWorldMatrices,
  evaluateSkinningMatrices,
  remapInfluenceToJointId,
} from './lolSkinnedMesh'

describe('remapInfluenceToJointId', () => {
  it('mapeia via tabela influences como Aventurine', () => {
    expect(remapInfluenceToJointId(2, [0, 5, 10], 20)).toBe(10)
    expect(remapInfluenceToJointId(0, [0, 5, 10], 20)).toBe(0)
  })

  it('usa índice directo quando não há tabela', () => {
    expect(remapInfluenceToJointId(3, [], 10)).toBe(3)
  })
})

describe('deformPositionsWithSkinning', () => {
  it('não remapeia boneIndices — já são joint ids', () => {
    const rest = new Float32Array([1, 0, 0])
    const boneIndices = new Uint16Array([5, 0, 0, 0])
    const boneWeights = new Float32Array([1, 0, 0, 0])
    const skinning = new Map<number, Matrix4>([
      [
        5,
        new Matrix4().makeTranslation(10, 0, 0),
      ],
    ])

    const out = deformPositionsWithSkinning(rest, boneIndices, boneWeights, skinning)
    expect(out[0]).toBeCloseTo(11, 4)
    expect(out[1]).toBeCloseTo(0, 4)
    expect(out[2]).toBeCloseTo(0, 4)
  })
})

describe('evaluateBoneWorldMatrices', () => {
  it('respeita hierarquia quando parent id > child id (Aventurine)', () => {
    const skl: ParsedLolSkl = {
      influences: [],
      hashToJointId: new Map(),
      joints: [
        {
          id: 0,
          name: 'root',
          parent: -1,
          localTranslation: [0, 0, 0],
          localRotation: [1, 0, 0, 0],
          localScale: [1, 1, 1],
          rawTranslation: [0, 0, 0],
          rawRotation: [0, 0, 0, 1],
          rawScale: [1, 1, 1],
          globalPosition: [0, 0, 0],
        },
        {
          id: 2,
          name: 'child',
          parent: 1,
          localTranslation: [0, 0, 1],
          localRotation: [1, 0, 0, 0],
          localScale: [1, 1, 1],
          rawTranslation: [0, 0, 100],
          rawRotation: [0, 0, 0, 1],
          rawScale: [1, 1, 1],
          globalPosition: [0, 0, 0],
        },
        {
          id: 1,
          name: 'mid',
          parent: 0,
          localTranslation: [0, 0, 0.5],
          localRotation: [1, 0, 0, 0],
          localScale: [1, 1, 1],
          rawTranslation: [0, 0, 50],
          rawRotation: [0, 0, 0, 1],
          rawScale: [1, 1, 1],
          globalPosition: [0, 0, 0],
        },
      ],
    }

    const world = evaluateBoneWorldMatrices(skl, null, 0)
    const child = new Vector3()
    world!.get(2)!.decompose(child, new Quaternion(), new Vector3())

    expect(child.z).toBeGreaterThan(1.4)
  })
})

describe('evaluateSkinningMatrices', () => {
  it('produz deformação quando ANM altera rotação do osso', () => {
    const skl: ParsedLolSkl = {
      influences: [],
      hashToJointId: new Map([[0xabc, 1]]),
      joints: [
        {
          id: 0,
          name: 'root',
          parent: -1,
          localTranslation: [0, 0, 0],
          localRotation: [1, 0, 0, 0],
          localScale: [1, 1, 1],
          rawTranslation: [0, 0, 0],
          rawRotation: [0, 0, 0, 1],
          rawScale: [1, 1, 1],
          globalPosition: [0, 0, 0],
        },
        {
          id: 1,
          name: 'arm',
          parent: 0,
          localTranslation: [0, 0, 0.5],
          localRotation: [1, 0, 0, 0],
          localScale: [1, 1, 1],
          rawTranslation: [0, 0, 50],
          rawRotation: [0, 0, 0, 1],
          rawScale: [1, 1, 1],
          globalPosition: [0, 0, 0],
        },
      ],
    }

    const anm: ParsedLolAnm = {
      fps: 30,
      duration: 1,
      frameCount: 2,
      tracks: [
        {
          jointHash: 0xabc,
          poses: new Map([
            [
              0,
              {
                translation: [0, 0, 0.5],
                rotation: [0.9238795, 0, 0.3826834, 0],
                scale: [1, 1, 1],
              },
            ],
            [
              1,
              {
                translation: [0, 0, 0.5],
                rotation: [0.7071067, 0, 0.7071067, 0],
                scale: [1, 1, 1],
              },
            ],
          ]),
        },
      ],
    }

    const bindSkin = evaluateSkinningMatrices(skl, null, 0)
    const animSkin = evaluateSkinningMatrices(skl, anm, 0.5)
    const bindM = bindSkin?.get(1)
    const animM = animSkin?.get(1)
    expect(bindM).toBeTruthy()
    expect(animM).toBeTruthy()

    const rest = new Float32Array([0, 0, 0.5])
    const boneIndices = new Uint16Array([1, 0, 0, 0])
    const boneWeights = new Float32Array([1, 0, 0, 0])
    const bindPos = deformPositionsWithSkinning(rest, boneIndices, boneWeights, bindSkin!)
    const animPos = deformPositionsWithSkinning(rest, boneIndices, boneWeights, animSkin!)

    const delta =
      Math.abs(animPos[0]! - bindPos[0]!) +
      Math.abs(animPos[1]! - bindPos[1]!) +
      Math.abs(animPos[2]! - bindPos[2]!)
    expect(delta).toBeGreaterThan(0.01)
  })
})

describe('countMatchedAnmTracks', () => {
  it('conta tracks com hash presente no SKL', () => {
    const skl: ParsedLolSkl = {
      influences: [],
      hashToJointId: new Map([[111, 0], [222, 1]]),
      joints: [],
    }
    const anm: ParsedLolAnm = {
      fps: 30,
      duration: 1,
      frameCount: 1,
      tracks: [{ jointHash: 111, poses: new Map() }, { jointHash: 999, poses: new Map() }],
    }
    expect(countMatchedAnmTracks(skl, anm)).toBe(1)
  })
})
