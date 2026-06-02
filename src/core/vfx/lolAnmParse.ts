/** Parser ANM — port simplificado de Aventurine import_anm.read_anm */

import { LolBinaryStream } from './lolBinaryStream'
import { LOL_IMPORT_SCALE } from './lolCoords'
import { lolElfHash } from './lolElfHash'

export type ParsedLolAnmPose = {
  translation: [number, number, number] | null
  rotation: [number, number, number, number] | null
  scale: [number, number, number] | null
}

export type ParsedLolAnmTrack = {
  jointHash: number
  poses: Map<number, ParsedLolAnmPose>
}

export type ParsedLolAnm = {
  fps: number
  duration: number
  frameCount: number
  tracks: ParsedLolAnmTrack[]
}

export function decompressAnmQuat(bytes: Uint8Array): [number, number, number, number] {
  const first = bytes[0]! | (bytes[1]! << 8)
  const second = bytes[2]! | (bytes[3]! << 8)
  const third = bytes[4]! | (bytes[5]! << 8)
  const bits = first | (second << 16) | (third << 24)

  const maxIndex = (bits >>> 45) & 3
  const oneDivSqrt2 = 0.70710678118
  const sqrt2Div32767 = 0.00004315969

  const a = (((bits >>> 30) & 32767) * sqrt2Div32767 - oneDivSqrt2)
  const b = (((bits >>> 15) & 32767) * sqrt2Div32767 - oneDivSqrt2)
  const c = ((bits & 32767) * sqrt2Div32767 - oneDivSqrt2)
  const d = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)))

  if (maxIndex === 0) return [c, d, a, b]
  if (maxIndex === 1) return [c, a, d, b]
  if (maxIndex === 2) return [c, a, b, d]
  return [d, a, b, c]
}

function readLegacyAnm(bs: LolBinaryStream, anm: ParsedLolAnm) {
  bs.skip(4)
  bs.readUint32()
  bs.skip(4)
  const trackCount = bs.readUint32() as number
  const frameCount = bs.readUint32() as number
  anm.fps = bs.readUint32() as number
  if (anm.fps === 0) anm.fps = 30
  anm.frameCount = frameCount
  anm.duration = frameCount / anm.fps

  for (let i = 0; i < trackCount; i++) {
    const jointName = bs.readPaddedAscii(32).replace(/\0/g, '').trim()
    const jointHash = lolElfHash(jointName)
    bs.skip(4)
    const track: ParsedLolAnmTrack = { jointHash, poses: new Map() }
    for (let f = 0; f < frameCount; f++) {
      const q = bs.readFloat(4) as number[]
      const t = bs.readFloat(3) as number[]
      track.poses.set(f, {
        rotation: [q[3]!, q[0]!, q[1]!, q[2]!],
        translation: [t[0]! * LOL_IMPORT_SCALE, t[1]! * LOL_IMPORT_SCALE, t[2]! * LOL_IMPORT_SCALE],
        scale: [1, 1, 1],
      })
    }
    anm.tracks.push(track)
  }
}

function readAnmdV5(bs: LolBinaryStream, anm: ParsedLolAnm) {
  bs.skip(16)
  const trackCount = bs.readUint32() as number
  const frameCount = bs.readUint32() as number
  const frameDuration = bs.readFloat() as number
  anm.fps = frameDuration > 0 ? 1 / frameDuration : 30
  anm.duration = frameCount * frameDuration
  anm.frameCount = frameCount

  const jointHashesOffset = bs.readInt32() as number
  bs.skip(8)
  const vecsOffset = bs.readInt32() as number
  const quatsOffset = bs.readInt32() as number
  const framesOffset = bs.readInt32() as number

  bs.seek(jointHashesOffset + 12)
  const jointHashes = bs.readUint32(trackCount) as number[]

  bs.seek(vecsOffset + 12)
  const vecCount = Math.floor((quatsOffset - vecsOffset) / 12)
  const vecPalette: Array<[number, number, number]> = []
  for (let i = 0; i < vecCount; i++) {
    const v = bs.readFloat(3) as number[]
    vecPalette.push([v[0]!, v[1]!, v[2]!])
  }

  bs.seek(quatsOffset + 12)
  const quatCount = Math.floor((jointHashesOffset - quatsOffset) / 6)
  const quatPalette: Array<[number, number, number, number]> = []
  for (let i = 0; i < quatCount; i++) {
    quatPalette.push(decompressAnmQuat(bs.readBytes(6)))
  }

  anm.tracks = jointHashes.map((hash) => ({ jointHash: hash, poses: new Map() }))

  bs.seek(framesOffset + 12)
  for (let f = 0; f < frameCount; f++) {
    for (let t = 0; t < trackCount; t++) {
      const transIdx = bs.readUint16() as number
      const scaleIdx = bs.readUint16() as number
      const rotIdx = bs.readUint16() as number
      const trans = vecPalette[transIdx] ?? [0, 0, 0]
      const scale = vecPalette[scaleIdx] ?? [1, 1, 1]
      const rot = quatPalette[rotIdx] ?? [1, 0, 0, 0]
      anm.tracks[t]!.poses.set(f, {
        translation: [trans[0] * LOL_IMPORT_SCALE, trans[1] * LOL_IMPORT_SCALE, trans[2] * LOL_IMPORT_SCALE],
        scale,
        rotation: rot,
      })
    }
  }
}

function readCompressedAnm(bs: LolBinaryStream, anm: ParsedLolAnm) {
  bs.skip(12)
  const jointCount = bs.readUint32() as number
  const fileFrameCount = bs.readUint32() as number
  bs.skip(4)
  const maxTime = bs.readFloat() as number
  anm.fps = bs.readFloat() as number
  if (anm.fps <= 0) anm.fps = 30
  anm.duration = maxTime + 1 / anm.fps
  anm.frameCount = Math.max(1, Math.round(anm.duration * anm.fps))

  bs.skip(24)
  const translationMin = bs.readVec3()
  const translationMax = bs.readVec3()
  const scaleMin = bs.readVec3()
  const scaleMax = bs.readVec3()

  const framesOffset = bs.readInt32() as number
  bs.skip(4)
  const jointHashesOffset = bs.readInt32() as number

  bs.seek(jointHashesOffset + 12)
  const jointHashes = bs.readUint32(jointCount) as number[]
  anm.tracks = jointHashes.map((hash) => ({ jointHash: hash, poses: new Map() }))

  bs.seek(framesOffset + 12)
  for (let i = 0; i < fileFrameCount; i++) {
    const compressedTime = bs.readUint16() as number
    const bits = bs.readUint16() as number
    const transform = bs.readBytes(6)

    const jointIdx = bits & 16383
    if (jointIdx >= jointCount) continue

    const track = anm.tracks[jointIdx]!
    const time = (compressedTime / 65535) * maxTime
    const frameId = Math.round(time * anm.fps)

    let pose = track.poses.get(frameId)
    if (!pose) {
      pose = { translation: null, rotation: null, scale: null }
      track.poses.set(frameId, pose)
    }

    const transformType = bits >> 14
    if (transformType === 0) {
      pose.rotation = decompressAnmQuat(transform)
    } else if (transformType === 1) {
      const tx =
        ((translationMax[0] - translationMin[0]) / 65535) * (transform[0]! | (transform[1]! << 8)) +
        translationMin[0]
      const ty =
        ((translationMax[1] - translationMin[1]) / 65535) * (transform[2]! | (transform[3]! << 8)) +
        translationMin[1]
      const tz =
        ((translationMax[2] - translationMin[2]) / 65535) * (transform[4]! | (transform[5]! << 8)) +
        translationMin[2]
      pose.translation = [tx * LOL_IMPORT_SCALE, ty * LOL_IMPORT_SCALE, tz * LOL_IMPORT_SCALE]
    } else if (transformType === 2) {
      const sx = ((scaleMax[0] - scaleMin[0]) / 65535) * (transform[0]! | (transform[1]! << 8)) + scaleMin[0]
      const sy = ((scaleMax[1] - scaleMin[1]) / 65535) * (transform[2]! | (transform[3]! << 8)) + scaleMin[1]
      const sz = ((scaleMax[2] - scaleMin[2]) / 65535) * (transform[4]! | (transform[5]! << 8)) + scaleMin[2]
      pose.scale = [sx, sy, sz]
    }
  }
}

export function parseAnmBytes(bytes: Uint8Array): ParsedLolAnm | null {
  const bs = LolBinaryStream.fromBuffer(bytes)
  const magic = bs.readAscii(8)

  const anm: ParsedLolAnm = {
    fps: 30,
    duration: 0,
    frameCount: 0,
    tracks: [],
  }

  try {
    if (magic === 'r3d2canm') {
      bs.readUint32()
      readCompressedAnm(bs, anm)
    } else if (magic === 'r3d2anmd') {
      const version = bs.readUint32() as number
      if (version === 5) readAnmdV5(bs, anm)
      else if (version === 4) {
        return null
      } else {
        readLegacyAnm(bs, anm)
      }
    } else {
      readLegacyAnm(bs, anm)
    }
  } catch {
    return null
  }

  if (!anm.tracks.length || anm.frameCount <= 0) return null
  return anm
}

export function isAnmFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.anm')
}

export function anmPathFromSkn(sknPath: string, explicitAnmPath?: string | null): string | null {
  if (explicitAnmPath?.trim()) return explicitAnmPath
  return sknPath.replace(/\.skn$/i, '.anm')
}
