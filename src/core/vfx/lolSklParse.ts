/** Parser SKL — port de Aventurine / Quartz jsritofile skl.js */

import { LolBinaryStream } from './lolBinaryStream'
import { leagueLocalToThree } from './lolCoords'
import { lolElfHash } from './lolElfHash'

const SKL_MAGIC = 0x22fd4fc3

export type ParsedLolSklJoint = {
  /** Índice no array de joints (Aventurine: native_bone_index). */
  id: number
  name: string
  parent: number
  localTranslation: [number, number, number]
  /** Quaternion (w, x, y, z) em espaço Three. */
  localRotation: [number, number, number, number]
  localScale: [number, number, number]
  /** Componentes nativos do ficheiro (antes de P), para fallback ANM. */
  rawTranslation: [number, number, number]
  rawRotation: [number, number, number, number]
  rawScale: [number, number, number]
  globalPosition: [number, number, number]
}

export type ParsedLolSkl = {
  joints: ParsedLolSklJoint[]
  influences: number[]
  hashToJointId: Map<number, number>
}

export function parseSklBytes(bytes: Uint8Array): ParsedLolSkl | null {
  const bs = LolBinaryStream.fromBuffer(bytes)
  bs.skip(4)
  const magic = bs.readUint32() as number
  if (magic !== SKL_MAGIC) return null

  const version = bs.readUint32() as number
  if (version !== 0) return null

  bs.skip(2)
  const jointCount = bs.readUint16() as number
  const influenceCount = bs.readUint32() as number
  const jointsOffset = bs.readInt32() as number
  bs.skip(4)
  const influencesOffset = bs.readInt32() as number
  bs.skip(32)

  const joints: ParsedLolSklJoint[] = []

  if (jointsOffset > 0 && jointCount > 0) {
    bs.seek(jointsOffset)
    for (let i = 0; i < jointCount; i++) {
      bs.skip(4)
      const parent = bs.readInt16() as number
      bs.skip(10)

      const trans = bs.readVec3()
      const scale = bs.readVec3()
      const rotRaw = bs.readQuat()
      const converted = leagueLocalToThree(trans, rotRaw, scale)

      bs.skip(40)

      const nameOffset = bs.readInt32() as number
      const returnOffset = bs.position
      bs.seek(returnOffset - 4 + nameOffset)
      let name = bs.readCharUntilZero().replace(/\0/g, '').trim()
      if (i === 0 && !name) {
        bs.skip(1)
        name = bs.readCharUntilZero().replace(/\0/g, '').trim()
      }
      bs.seek(returnOffset)

      joints.push({
        id: i,
        name: name || `bone_${i}`,
        parent,
        localTranslation: converted.translation,
        localRotation: converted.rotation,
        localScale: converted.scale,
        rawTranslation: trans,
        rawRotation: rotRaw,
        rawScale: scale,
        globalPosition: [0, 0, 0],
      })
    }
  }

  const influences: number[] = []
  if (influencesOffset > 0 && influenceCount > 0) {
    bs.seek(influencesOffset)
    influences.push(...bs.readUint16Array(influenceCount))
  }

  computeGlobalPositions(joints)

  const hashToJointId = new Map<number, number>()
  for (const joint of joints) {
    hashToJointId.set(lolElfHash(joint.name), joint.id)
  }

  if (!joints.length) return null
  return { joints, influences, hashToJointId }
}

function multiplyMat4Simple(a: number[], b: number[]): number[] {
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

function multiplyTRS(
  tx: number,
  ty: number,
  tz: number,
  qw: number,
  qx: number,
  qy: number,
  qz: number,
  sx: number,
  sy: number,
  sz: number,
): number[] {
  const xx = qx * qx
  const yy = qy * qy
  const zz = qz * qz
  const xy = qx * qy
  const xz = qx * qz
  const yz = qy * qz
  const wx = qw * qx
  const wy = qw * qy
  const wz = qw * qz

  const r00 = 1 - 2 * (yy + zz)
  const r01 = 2 * (xy + wz)
  const r02 = 2 * (xz - wy)
  const r10 = 2 * (xy - wz)
  const r11 = 1 - 2 * (xx + zz)
  const r12 = 2 * (yz + wx)
  const r20 = 2 * (xz + wy)
  const r21 = 2 * (yz - wx)
  const r22 = 1 - 2 * (xx + yy)

  return [
    r00 * sx,
    r01 * sx,
    r02 * sx,
    0,
    r10 * sy,
    r11 * sy,
    r12 * sy,
    0,
    r20 * sz,
    r21 * sz,
    r22 * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

function computeGlobalPositions(joints: ParsedLolSklJoint[]) {
  const mats: Array<number[] | null> = new Array(joints.length).fill(null)

  const computeMat = (index: number): number[] => {
    if (index < 0 || index >= joints.length) return multiplyTRS(0, 0, 0, 1, 0, 0, 0, 1, 1, 1)
    if (mats[index]) return mats[index]!

    const joint = joints[index]!
    const [tx, ty, tz] = joint.localTranslation
    const [qw, qx, qy, qz] = joint.localRotation
    const [sx, sy, sz] = joint.localScale

    const local = multiplyTRS(tx, ty, tz, qw, qx, qy, qz, sx, sy, sz)
    if (joint.parent >= 0) {
      mats[index] = multiplyMat4Simple(computeMat(joint.parent), local)
    } else {
      mats[index] = local
    }
    return mats[index]!
  }

  for (let i = 0; i < joints.length; i++) {
    const mat = computeMat(i)
    joints[i]!.globalPosition = [mat[12]!, mat[13]!, mat[14]!]
  }
}

export function isSklFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.skl')
}

export function sklPathForSkn(sknPath: string): string {
  return sknPath.replace(/\.skn$/i, '.skl')
}
