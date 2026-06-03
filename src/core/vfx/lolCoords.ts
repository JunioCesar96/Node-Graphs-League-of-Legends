/** Conversões de coordenadas LoL → Three.js (convenção Aventurine import_skl / import_skn). */

import { Matrix4, Quaternion, Vector3 } from 'three'

export const LOL_IMPORT_SCALE = 0.01

/**
 * Posição / vector LoL → Three:
 * - X LoL = X Three
 * - Y LoL (cima no jogo) = Z Three
 * - Z LoL = Y Three
 */
export function lolMeshToThreeCoords(x: number, y: number, z: number): [number, number, number] {
  return [x, z, y]
}

/** SKN bind pose — Aventurine: (-x, -z, y) × IMPORT_SCALE. */
export function sknPositionToThree(x: number, y: number, z: number): [number, number, number] {
  const scale = LOL_IMPORT_SCALE
  return [-x * scale, -z * scale, y * scale]
}

/**
 * Matriz P Aventurine (LoL → Three/Y-up):
 * X' = -x, Y' = -z, Z' = y
 */
export const LEAGUE_TO_THREE_P: number[] = [-1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]

export function leagueToThreeMatrix(): Matrix4 {
  return new Matrix4().set(-1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1)
}

export function multiplyMat4(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[row * 4 + col] =
        a[row * 4 + 0]! * b[0 * 4 + col]! +
        a[row * 4 + 1]! * b[1 * 4 + col]! +
        a[row * 4 + 2]! * b[2 * 4 + col]! +
        a[row * 4 + 3]! * b[3 * 4 + col]!
    }
  }
  return out
}

export function invertMat4(m: number[]): number[] | null {
  const inv = new Array<number>(16).fill(0)
  const a = m

  inv[0] =
    a[5]! * a[10]! * a[15]! -
    a[5]! * a[11]! * a[14]! -
    a[9]! * a[6]! * a[15]! +
    a[9]! * a[7]! * a[14]! +
    a[13]! * a[6]! * a[11]! -
    a[13]! * a[7]! * a[10]!

  inv[4] =
    -a[4]! * a[10]! * a[15]! +
    a[4]! * a[11]! * a[14]! +
    a[8]! * a[6]! * a[15]! -
    a[8]! * a[7]! * a[14]! -
    a[12]! * a[6]! * a[11]! +
    a[12]! * a[7]! * a[10]!

  inv[8] =
    a[4]! * a[9]! * a[15]! -
    a[4]! * a[11]! * a[13]! -
    a[8]! * a[5]! * a[15]! +
    a[8]! * a[7]! * a[13]! +
    a[12]! * a[5]! * a[11]! -
    a[12]! * a[7]! * a[9]!

  inv[12] =
    -a[4]! * a[9]! * a[14]! +
    a[4]! * a[10]! * a[13]! +
    a[8]! * a[5]! * a[14]! -
    a[8]! * a[6]! * a[13]! -
    a[12]! * a[5]! * a[10]! +
    a[12]! * a[6]! * a[9]!

  inv[1] =
    -a[1]! * a[10]! * a[15]! +
    a[1]! * a[11]! * a[14]! +
    a[9]! * a[2]! * a[15]! -
    a[9]! * a[3]! * a[14]! -
    a[13]! * a[2]! * a[11]! +
    a[13]! * a[3]! * a[10]!

  inv[5] =
    a[0]! * a[10]! * a[15]! -
    a[0]! * a[11]! * a[14]! -
    a[8]! * a[2]! * a[15]! +
    a[8]! * a[3]! * a[14]! +
    a[12]! * a[2]! * a[11]! -
    a[12]! * a[3]! * a[10]!

  inv[9] =
    -a[0]! * a[9]! * a[15]! +
    a[0]! * a[11]! * a[13]! +
    a[8]! * a[1]! * a[15]! -
    a[8]! * a[3]! * a[13]! -
    a[12]! * a[1]! * a[11]! +
    a[12]! * a[3]! * a[9]!

  inv[13] =
    a[0]! * a[9]! * a[14]! -
    a[0]! * a[10]! * a[13]! -
    a[8]! * a[1]! * a[14]! +
    a[8]! * a[2]! * a[13]! +
    a[12]! * a[1]! * a[10]! -
    a[12]! * a[2]! * a[9]!

  inv[2] =
    a[1]! * a[6]! * a[15]! -
    a[1]! * a[7]! * a[14]! -
    a[5]! * a[2]! * a[15]! +
    a[5]! * a[3]! * a[14]! +
    a[13]! * a[2]! * a[7]! -
    a[13]! * a[3]! * a[6]!

  inv[6] =
    -a[0]! * a[6]! * a[15]! +
    a[0]! * a[7]! * a[14]! +
    a[4]! * a[2]! * a[15]! -
    a[4]! * a[3]! * a[14]! -
    a[12]! * a[2]! * a[7]! +
    a[12]! * a[3]! * a[6]!

  inv[10] =
    a[0]! * a[5]! * a[15]! -
    a[0]! * a[7]! * a[13]! -
    a[4]! * a[1]! * a[15]! +
    a[4]! * a[3]! * a[13]! +
    a[12]! * a[1]! * a[7]! -
    a[12]! * a[3]! * a[5]!

  inv[14] =
    -a[0]! * a[5]! * a[14]! +
    a[0]! * a[6]! * a[13]! +
    a[4]! * a[1]! * a[14]! -
    a[4]! * a[2]! * a[13]! -
    a[12]! * a[1]! * a[6]! +
    a[12]! * a[2]! * a[5]!

  inv[3] =
    -a[1]! * a[6]! * a[11]! +
    a[1]! * a[7]! * a[10]! +
    a[5]! * a[2]! * a[11]! -
    a[5]! * a[3]! * a[10]! -
    a[9]! * a[2]! * a[7]! +
    a[9]! * a[3]! * a[6]!

  inv[7] =
    a[0]! * a[6]! * a[11]! -
    a[0]! * a[7]! * a[10]! -
    a[4]! * a[2]! * a[11]! +
    a[4]! * a[3]! * a[10]! +
    a[8]! * a[2]! * a[7]! -
    a[8]! * a[3]! * a[6]!

  inv[11] =
    -a[0]! * a[5]! * a[11]! +
    a[0]! * a[7]! * a[9]! +
    a[4]! * a[1]! * a[11]! -
    a[4]! * a[3]! * a[9]! -
    a[8]! * a[1]! * a[7]! +
    a[8]! * a[3]! * a[5]!

  inv[15] =
    a[0]! * a[5]! * a[10]! -
    a[0]! * a[6]! * a[9]! -
    a[4]! * a[1]! * a[10]! +
    a[4]! * a[2]! * a[9]! +
    a[8]! * a[1]! * a[6]! -
    a[8]! * a[2]! * a[5]!

  let det =
    a[0]! * inv[0]! + a[1]! * inv[4]! + a[2]! * inv[8]! + a[3]! * inv[12]!
  if (Math.abs(det) < 1e-12) return null
  det = 1 / det
  for (let i = 0; i < 16; i++) inv[i]! *= det
  return inv
}

export function translationMat4(x: number, y: number, z: number): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

export function scaleMat4(x: number, y: number, z: number): number[] {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]
}

export function quatToMat4(x: number, y: number, z: number, w: number): number[] {
  const xx = x * x
  const yy = y * y
  const zz = z * z
  const xy = x * y
  const xz = x * z
  const yz = y * z
  const wx = w * x
  const wy = w * y
  const wz = w * z

  return [
    1 - 2 * (yy + zz),
    2 * (xy + wz),
    2 * (xz - wy),
    0,
    2 * (xy - wz),
    1 - 2 * (xx + zz),
    2 * (yz + wx),
    0,
    2 * (xz + wy),
    2 * (yz - wx),
    1 - 2 * (xx + yy),
    0,
    0,
    0,
    0,
    1,
  ]
}

/** Converte transform local LoL (T*R*S) para espaço Three via matriz P (Aventurine import_skl). */
export function leagueLocalToThree(
  translation: [number, number, number],
  rotation: [number, number, number, number],
  scale: [number, number, number],
): {
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
} {
  const [tx, ty, tz] = translation
  const [rx, ry, rz, rw] = rotation
  const [sx, sy, sz] = scale

  const P = leagueToThreeMatrix()
  const Pinv = new Matrix4().copy(P).invert()

  const lMat = new Matrix4().compose(
    new Vector3(tx, ty, tz),
    new Quaternion(rx, ry, rz, rw),
    new Vector3(sx, sy, sz),
  )

  const bMat = new Matrix4().copy(P).multiply(lMat).multiply(Pinv)
  const bT = new Vector3()
  const bQ = new Quaternion()
  const bS = new Vector3()
  bMat.decompose(bT, bQ, bS)

  return {
    translation: [bT.x * LOL_IMPORT_SCALE, bT.y * LOL_IMPORT_SCALE, bT.z * LOL_IMPORT_SCALE],
    rotation: [bQ.w, bQ.x, bQ.y, bQ.z],
    scale: [bS.x, bS.y, bS.z],
  }
}

/** Matriz nativa LoL → Three: P @ T·R·S @ P⁻¹ (apply_anm N_target_B). */
export function nativeLeagueTargetMatrix(
  translationScaled: [number, number, number],
  rotationWxyz: [number, number, number, number],
  scale: [number, number, number],
): Matrix4 {
  const P = leagueToThreeMatrix()
  const Pinv = new Matrix4().copy(P).invert()
  const [qw, qx, qy, qz] = rotationWxyz
  const lMat = new Matrix4().compose(
    new Vector3(
      translationScaled[0] / LOL_IMPORT_SCALE,
      translationScaled[1] / LOL_IMPORT_SCALE,
      translationScaled[2] / LOL_IMPORT_SCALE,
    ),
    new Quaternion(qx, qy, qz, qw),
    new Vector3(scale[0], scale[1], scale[2]),
  )
  return new Matrix4().copy(P).multiply(lMat).multiply(Pinv)
}

/** Pose ANM nativa (trans já × IMPORT_SCALE, rot wxyz) → Three. */
export function nativeLeaguePoseToThree(
  translationScaled: [number, number, number],
  rotationWxyz: [number, number, number, number],
  scale: [number, number, number],
): {
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
} {
  const [qw, qx, qy, qz] = rotationWxyz
  return leagueLocalToThree(
    [
      translationScaled[0] / LOL_IMPORT_SCALE,
      translationScaled[1] / LOL_IMPORT_SCALE,
      translationScaled[2] / LOL_IMPORT_SCALE,
    ],
    [qx, qy, qz, qw],
    scale,
  )
}

