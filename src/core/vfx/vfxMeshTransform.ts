import type { Group, Mesh } from 'three'
import { Matrix4, Quaternion, Vector3 } from 'three'

import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import { primitiveLocalRotation } from './vfxPrimitiveGeometry'
import type { VfxPlaneFacing } from './vfxPrimitives'
import { decomposeWorldMatrix, eulerRadiansToQuaternion } from './vfxWorldMatrix'

export { eulerRadiansToQuaternion }

/** Rotação final do plano: base (deitar no chão) × birth (giro no plano). */
export function composePlaneMeshQuaternion(
  planeBaseRotation: [number, number, number],
  birthRotation: [number, number, number],
): Quaternion {
  const base = eulerRadiansToQuaternion(planeBaseRotation)
  const birth = eulerRadiansToQuaternion(birthRotation)
  return base.multiply(birth)
}

export type ComposeEmitterMeshQuaternionArgs = {
  geometryKind: EmitterPrimitiveGeometryKind
  planeFacing: VfxPlaneFacing
  isGroundLayer: boolean
  planeBaseRotation: [number, number, number]
  rotationEulerRad: [number, number, number]
  isBillboard: boolean
  cameraQuaternion: Quaternion
  vfxCamLockEnabled: boolean
}

/**
 * Orientação da malha primitiva: alinhamento LoL (geometria) × planeBase × birth.
 * Ground: só spin no plano (Z Three); ignora inclinação X/Y do motion/navmesh.
 */
export function composeEmitterMeshQuaternion(args: ComposeEmitterMeshQuaternionArgs): Quaternion {
  const facing: VfxPlaneFacing = args.isGroundLayer ? 'ground' : args.planeFacing

  const primitive = eulerRadiansToQuaternion(primitiveLocalRotation(args.geometryKind, facing))
  const base = eulerRadiansToQuaternion(
    args.isGroundLayer ? ([0, 0, 0] as [number, number, number]) : args.planeBaseRotation,
  )

  const birthEuler: [number, number, number] = args.isGroundLayer
    ? [0, 0, args.rotationEulerRad[2]]
    : args.rotationEulerRad
  const birth = eulerRadiansToQuaternion(birthEuler)

  const out = primitive.clone().multiply(base).multiply(birth)

  if (args.isBillboard && args.vfxCamLockEnabled && !args.isGroundLayer) {
    return args.cameraQuaternion.clone().multiply(out)
  }
  return out
}

export type ApplyParticleWorldTransformArgs = {
  group: Group
  mesh: Mesh
  position: [number, number, number]
  scale: [number, number, number]
  rotationEulerRad: [number, number, number]
  geometryKind: EmitterPrimitiveGeometryKind
  planeFacing: VfxPlaneFacing
  planeBaseRotation: [number, number, number]
  isGroundLayer: boolean
  isBillboard: boolean
  cameraQuaternion: Quaternion
  vfxCamLockEnabled: boolean
  /** Matriz mundial 4×4 do transform engine (fonte única quando `useLeagueMatrixP`). */
  worldMatrix?: number[]
  useLeagueMatrixP?: boolean
}

const _worldMatrix = new Matrix4()
const _decompPos = new Vector3()
const _decompQuat = new Quaternion()
const _decompScl = new Vector3()
const _identityQuat = new Quaternion()

/**
 * Group = posição + escala; mesh = orientação local (legacy / ground).
 * Com `useLeagueMatrixP`: rotação da `worldMatrix` + escala de `frame.scale` (regras LoL /
 * fixBillboard / remap) no mesmo nó → T×R×S sem losango.
 */
export function applyParticleWorldTransform(args: ApplyParticleWorldTransformArgs): void {
  const { group, mesh, position, scale } = args

  const useMatrixOrient =
    args.worldMatrix != null &&
    args.worldMatrix.length >= 16 &&
    args.useLeagueMatrixP === true &&
    !args.isGroundLayer

  if (useMatrixOrient) {
    _worldMatrix.fromArray(args.worldMatrix!)
    _worldMatrix.decompose(_decompPos, _decompQuat, _decompScl)

    group.position.set(position[0], position[1], position[2])
    group.scale.set(scale[0], scale[1], scale[2])
    group.rotation.set(0, 0, 0)

    const faceCamera =
      args.isBillboard && args.vfxCamLockEnabled && args.planeFacing === 'camera'
    if (faceCamera) {
      group.quaternion.copy(args.cameraQuaternion).multiply(_decompQuat)
    } else {
      group.quaternion.copy(_decompQuat)
    }

    mesh.position.set(0, 0, 0)
    mesh.scale.set(1, 1, 1)
    mesh.rotation.set(0, 0, 0)
    mesh.quaternion.copy(_identityQuat)
    return
  }

  group.position.set(position[0], position[1], position[2])
  group.scale.set(scale[0], scale[1], scale[2])
  group.rotation.set(0, 0, 0)
  group.quaternion.copy(_identityQuat)
  mesh.position.set(0, 0, 0)
  mesh.scale.set(1, 1, 1)
  mesh.quaternion.copy(composeEmitterMeshQuaternion(args))
}
