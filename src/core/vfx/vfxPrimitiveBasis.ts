/** Basis e rotação semântica por primitivo (Fase 5). */

import { Matrix4, Vector3 } from 'three'

import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'
import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'

const DEG2RAD = Math.PI / 180
const _right = new Vector3()
const _up = new Vector3()
const _normal = new Vector3()

/**
 * Colunas = right / up / normal no espaço LoL (antes de leagueLocalToThree no render).
 */
export function getPrimitiveBasisMatrix(
  kind: EmitterPrimitiveGeometryKind | string,
  pipeline: TransformPipelineDefinition,
): Matrix4 {
  const m = new Matrix4()

  if (pipeline.orientationMode === 'GroundAligned') {
    _right.set(1, 0, 0)
    _up.set(0, 0, 1)
    _normal.set(0, 1, 0)
  } else if (pipeline.orientationMode === 'DirectionAligned' || kind === 'ray') {
    _right.set(1, 0, 0)
    _up.set(0, 1, 0)
    _normal.set(0, 0, 1)
  } else {
    _right.set(1, 0, 0)
    _up.set(0, 1, 0)
    _normal.set(0, 0, 1)
  }

  m.makeBasis(_right, _up, _normal)
  return m
}

/** Euler radianos Three mesh-local após planeBase (ground). */
export function groundMeshRotationEuler(
  birthRotLol: [number, number, number],
  rotVelocityLol: [number, number, number],
  motionTime: number,
  continuousRotLol: [number, number, number] | null,
): [number, number, number] {
  const spinDeg = birthRotLol[2] + rotVelocityLol[2] * motionTime
  const contX = continuousRotLol ? continuousRotLol[0] * motionTime : 0
  const contY = continuousRotLol ? continuousRotLol[1] * motionTime : 0
  const contZ = continuousRotLol ? continuousRotLol[2] * motionTime : 0
  return [contX * DEG2RAD, contY * DEG2RAD, (spinDeg + contZ) * DEG2RAD]
}

/** Rotação billboard / mesh (euler rad Three) a partir de graus LoL. */
export function billboardRotationEulerLol(
  birthRotLol: [number, number, number],
  rotVelocityLol: [number, number, number],
  motionTime: number,
  continuousRotLol: [number, number, number] | null,
  pipeline: TransformPipelineDefinition,
): [number, number, number] {
  const rot: [number, number, number] = [
    birthRotLol[0] + rotVelocityLol[0] * motionTime + (continuousRotLol?.[0] ?? 0) * motionTime,
    birthRotLol[1] + rotVelocityLol[1] * motionTime + (continuousRotLol?.[1] ?? 0) * motionTime,
    birthRotLol[2] + rotVelocityLol[2] * motionTime + (continuousRotLol?.[2] ?? 0) * motionTime,
  ]

  if (pipeline.orientationMode === 'GroundAligned') {
    return groundMeshRotationEuler(birthRotLol, rotVelocityLol, motionTime, continuousRotLol)
  }

  if (pipeline.useLeagueMatrixP) {
    return lolRotationDegreesToThreeEuler(rot, true, [0, 0, 0])
  }

  return [rot[0] * DEG2RAD, rot[2] * DEG2RAD, rot[1] * DEG2RAD]
}

/** Velocidade LoL no espaço local orientado (eixo Y LoL = up para sparks). */
export function velocityInOrientedSpace(
  velocityLol: [number, number, number],
  pipeline: TransformPipelineDefinition,
): [number, number, number] {
  if (pipeline.orientationMode === 'DirectionAligned') {
    const speed = Math.hypot(velocityLol[0], velocityLol[1], velocityLol[2])
    if (speed < 1e-6) return velocityLol
    return [0, speed, 0]
  }
  return velocityLol
}
