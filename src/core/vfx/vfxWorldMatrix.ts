/**
 * Matriz mundial da partícula — TRS via P (leagueLocalToThree) ou decomposição Three (Fase 6).
 */

import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

import { leagueLocalToThree } from './lolCoords'
import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'
import { getPrimitiveBasisMatrix } from './vfxPrimitiveBasis'

/** Euler XYZ (rad) → quaternion. */
export function eulerRadiansToQuaternion(rotation: [number, number, number]): Quaternion {
  return new Quaternion().setFromEuler(
    new Euler(rotation[0], rotation[1], rotation[2], 'XYZ'),
  )
}
import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'

const _basis = new Matrix4()
const _local = new Matrix4()

export type ParticleWorldMatrixInput = {
  positionThree: [number, number, number]
  rotationEulerRad: [number, number, number]
  scaleThree: [number, number, number]
  planeBaseRotation: [number, number, number]
  pipeline: TransformPipelineDefinition
  primitiveKind: EmitterPrimitiveGeometryKind | string
  /** Posição LoL (pré-P), para compose via matriz P. */
  positionLol?: [number, number, number]
  rotationLolDeg?: [number, number, number]
  scaleLol?: [number, number, number]
  vfxScale?: number
}

export type DecomposedWorldTransform = {
  position: [number, number, number]
  quaternion: Quaternion
  scale: [number, number, number]
  /** Rotação mesh-local (ground: após planeBase). */
  meshQuaternion: Quaternion
}

function lolEulerToQuatXyzw(degrees: [number, number, number]): [number, number, number, number] {
  const euler = new Euler(
    degrees[0] * (Math.PI / 180),
    degrees[1] * (Math.PI / 180),
    degrees[2] * (Math.PI / 180),
    'XYZ',
  )
  const q = new Quaternion().setFromEuler(euler)
  return [q.x, q.y, q.z, q.w]
}

function matrixFromLeagueLocalToThree(
  positionLol: [number, number, number],
  rotationLolDeg: [number, number, number],
  scaleLol: [number, number, number],
  vfxScale: number,
  pipeline: TransformPipelineDefinition,
  primitiveKind: string,
): Matrix4 {
  const scaledPos: [number, number, number] = [
    positionLol[0] * vfxScale,
    positionLol[1] * vfxScale,
    positionLol[2] * vfxScale,
  ]
  const quatXyzw = lolEulerToQuatXyzw(rotationLolDeg)
  const converted = leagueLocalToThree(scaledPos, quatXyzw, scaleLol)

  const out = new Matrix4()
  const t = new Matrix4().makeTranslation(
    converted.translation[0],
    converted.translation[1],
    converted.translation[2],
  )
  const [qw, qx, qy, qz] = converted.rotation
  const r = new Matrix4().makeRotationFromQuaternion(new Quaternion(qx, qy, qz, qw))
  const s = new Matrix4().makeScale(converted.scale[0], converted.scale[1], converted.scale[2])

  if (pipeline.transformOrder !== 'GroundBasisFirst') {
    _basis.copy(getPrimitiveBasisMatrix(primitiveKind, pipeline))
    _local.copy(t).multiply(r).multiply(s)
    return out.copy(_basis).multiply(_local)
  }

  return out.copy(t).multiply(r).multiply(s)
}

/** Compõe matriz 4×4 mundial para a partícula. */
export function composeParticleWorldMatrix(input: ParticleWorldMatrixInput): Matrix4 {
  const {
    positionThree,
    rotationEulerRad,
    scaleThree,
    planeBaseRotation,
    pipeline,
    primitiveKind,
    positionLol,
    rotationLolDeg,
    scaleLol,
    vfxScale = 0.01,
  } = input

  const isGround = pipeline.transformOrder === 'GroundBasisFirst'

  if (
    pipeline.useLeagueMatrixP &&
    positionLol &&
    rotationLolDeg &&
    scaleLol &&
    !isGround
  ) {
    return matrixFromLeagueLocalToThree(
      positionLol,
      rotationLolDeg,
      scaleLol,
      vfxScale,
      pipeline,
      primitiveKind,
    )
  }

  const out = new Matrix4()
  const t = new Matrix4().makeTranslation(positionThree[0], positionThree[1], positionThree[2])
  const s = new Matrix4().makeScale(scaleThree[0], scaleThree[1], scaleThree[2])

  if (isGround) {
    return out.copy(t).multiply(s)
  }

  const meshQuat = eulerRadiansToQuaternion(rotationEulerRad)
  const r = new Matrix4().makeRotationFromQuaternion(meshQuat)
  return out.copy(t).multiply(r).multiply(s)
}

export function decomposeWorldMatrix(matrix: Matrix4): DecomposedWorldTransform {
  const position = new Vector3()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  matrix.decompose(position, quaternion, scale)
  return {
    position: [position.x, position.y, position.z],
    quaternion,
    scale: [scale.x, scale.y, scale.z],
    meshQuaternion: quaternion.clone(),
  }
}

export type ApplyParticleWorldTransformInput = {
  groupPosition: [number, number, number]
  groupScale: [number, number, number]
  meshQuaternion: Quaternion
  planeBaseRotation: [number, number, number]
  isGroundLayer: boolean
  isBillboard: boolean
  cameraQuaternion: Quaternion
  vfxCamLockEnabled: boolean
}

/** Aplica transform ao group (world) + mesh (local), sem double-apply de euler. */
export function buildMeshWorldQuaternion(input: ApplyParticleWorldTransformInput): Quaternion {
  const base = eulerRadiansToQuaternion(input.planeBaseRotation)
  const out = base.clone().multiply(input.meshQuaternion)
  if (input.isBillboard && input.vfxCamLockEnabled && !input.isGroundLayer) {
    return input.cameraQuaternion.clone().multiply(out)
  }
  return out
}

/** Euler rad Three a partir de graus LoL (reexport path matrix P). */
export function rotationLolDegToEulerRad(
  rotationLolDeg: [number, number, number],
  useMatrixP: boolean,
): [number, number, number] {
  return lolRotationDegreesToThreeEuler(rotationLolDeg, useMatrixP, [0, 0, 0])
}

export function worldMatrixToFlat16(matrix: Matrix4): number[] {
  return [...matrix.elements]
}

export function flat16ToMatrix4(flat: number[]): Matrix4 {
  const m = new Matrix4()
  if (flat.length >= 16) m.fromArray(flat)
  return m
}
