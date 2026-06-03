/** Amostragem densa de tracks ANM (espelha buildDenseTrackFrames do Quartz). */

import { Quaternion } from 'three'
import { LOL_IMPORT_SCALE } from './lolCoords'

import type { ParsedLolAnm, ParsedLolAnmPose, ParsedLolAnmTrack } from './lolAnmParse'
import type { ParsedLolSkl } from './lolSklParse'

export type AnmDensePose = {
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
  /** Canais presentes no ficheiro ANM (Aventurine só aplica o que existir). */
  hasTranslation: boolean
  hasRotation: boolean
  hasScale: boolean
}

type KeyVec = { time: number; value: [number, number, number] }
type KeyQuat = { time: number; value: [number, number, number, number] }

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function sampleVecKeys(keys: KeyVec[], frame: number, fallback: [number, number, number]): [number, number, number] {
  if (!keys.length) return fallback
  if (frame <= keys[0]!.time) return keys[0]!.value
  if (frame >= keys[keys.length - 1]!.time) return keys[keys.length - 1]!.value
  for (let i = 0; i < keys.length - 1; i++) {
    const left = keys[i]!
    const right = keys[i + 1]!
    if (frame < left.time || frame > right.time) continue
    const dt = right.time - left.time
    if (dt <= 1e-6) return left.value
    const t = (frame - left.time) / dt
    return lerp3(left.value, right.value, t)
  }
  return keys[keys.length - 1]!.value
}

function sampleQuatKeys(
  keys: KeyQuat[],
  frame: number,
  fallback: [number, number, number, number],
): [number, number, number, number] {
  if (!keys.length) return fallback
  const toThreeQuat = (value: [number, number, number, number]) =>
    new Quaternion(value[1], value[2], value[3], value[0])
  const fromThreeQuat = (q: Quaternion): [number, number, number, number] => [q.w, q.x, q.y, q.z]

  if (frame <= keys[0]!.time) return keys[0]!.value
  if (frame >= keys[keys.length - 1]!.time) return keys[keys.length - 1]!.value
  for (let i = 0; i < keys.length - 1; i++) {
    const left = keys[i]!
    const right = keys[i + 1]!
    if (frame < left.time || frame > right.time) continue
    const dt = right.time - left.time
    if (dt <= 1e-6) return left.value
    const t = (frame - left.time) / dt
    const q0 = toThreeQuat(left.value)
    const q1 = toThreeQuat(right.value)
    const q = new Quaternion().slerpQuaternions(q0, q1, t).normalize()
    return fromThreeQuat(q)
  }
  return keys[keys.length - 1]!.value
}

function poseToKeys(pose: ParsedLolAnmPose, frame: number) {
  const keys: {
    translation: KeyVec[]
    rotation: KeyQuat[]
    scale: KeyVec[]
  } = { translation: [], rotation: [], scale: [] }

  if (pose.translation) {
    keys.translation.push({ time: frame, value: pose.translation })
  }
  if (pose.rotation) {
    keys.rotation.push({ time: frame, value: pose.rotation })
  }
  if (pose.scale) {
    keys.scale.push({ time: frame, value: pose.scale })
  }
  return keys
}

function mergeKeys(
  target: { translation: KeyVec[]; rotation: KeyQuat[]; scale: KeyVec[] },
  source: { translation: KeyVec[]; rotation: KeyQuat[]; scale: KeyVec[] },
) {
  target.translation.push(...source.translation)
  target.rotation.push(...source.rotation)
  target.scale.push(...source.scale)
}

function buildDenseFramesForTrack(
  track: ParsedLolAnmTrack,
  frameCount: number,
  fallback: AnmDensePose,
): AnmDensePose[] {
  const merged = { translation: [] as KeyVec[], rotation: [] as KeyQuat[], scale: [] as KeyVec[] }
  for (const [timeKey, pose] of track.poses) {
    mergeKeys(merged, poseToKeys(pose, timeKey))
  }
  merged.translation.sort((a, b) => a.time - b.time)
  merged.rotation.sort((a, b) => a.time - b.time)
  merged.scale.sort((a, b) => a.time - b.time)

  const hasTranslation = merged.translation.length > 0
  const hasRotation = merged.rotation.length > 0
  const hasScale = merged.scale.length > 0

  const frames: AnmDensePose[] = []
  for (let frame = 0; frame < frameCount; frame++) {
    frames.push({
      translation: sampleVecKeys(merged.translation, frame, fallback.translation),
      rotation: sampleQuatKeys(merged.rotation, frame, fallback.rotation),
      scale: sampleVecKeys(merged.scale, frame, fallback.scale),
      hasTranslation,
      hasRotation,
      hasScale,
    })
  }
  return frames
}

export type DenseAnmClip = {
  frameCount: number
  fps: number
  durationSeconds: number
  /** jointHash → poses por frame */
  trackPoses: Map<number, AnmDensePose[]>
}

function bindFallbackForTrack(track: ParsedLolAnmTrack, skl?: ParsedLolSkl): AnmDensePose {
  if (skl) {
    const jointId = skl.hashToJointId.get(track.jointHash)
    const joint = jointId != null ? skl.joints[jointId] : undefined
    if (joint) {
      const [rx, ry, rz, rw] = joint.rawRotation
      return {
        translation: [
          joint.rawTranslation[0] * LOL_IMPORT_SCALE,
          joint.rawTranslation[1] * LOL_IMPORT_SCALE,
          joint.rawTranslation[2] * LOL_IMPORT_SCALE,
        ],
        rotation: [rw, rx, ry, rz],
        scale: [...joint.rawScale],
        hasTranslation: true,
        hasRotation: true,
        hasScale: true,
      }
    }
  }
  return {
    translation: [0, 0, 0],
    rotation: [1, 0, 0, 0],
    scale: [1, 1, 1],
    hasTranslation: false,
    hasRotation: false,
    hasScale: false,
  }
}

export function buildDenseAnmClip(anm: ParsedLolAnm, skl?: ParsedLolSkl): DenseAnmClip {
  const frameCount = Math.max(1, anm.frameCount)
  const fps = anm.fps > 0 ? anm.fps : 30
  const trackPoses = new Map<number, AnmDensePose[]>()

  for (const track of anm.tracks) {
    trackPoses.set(track.jointHash, buildDenseFramesForTrack(track, frameCount, bindFallbackForTrack(track, skl)))
  }

  return {
    frameCount,
    fps,
    durationSeconds: frameCount / fps,
    trackPoses,
  }
}

export function resolveAnmFrameIndex(anm: ParsedLolAnm, timeSeconds: number, loop = true): number {
  const frameCount = Math.max(1, anm.frameCount)
  const fps = anm.fps > 0 ? anm.fps : 30
  const raw = Math.floor(timeSeconds * fps)
  if (loop) {
    return ((raw % frameCount) + frameCount) % frameCount
  }
  return Math.max(0, Math.min(frameCount - 1, raw))
}
