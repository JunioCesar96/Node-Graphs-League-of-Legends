import { Vector3 } from 'three'
import type { Bone } from 'three'

import type { ParsedLolSkl } from './lolSklParse'

const _world = new Vector3()

/** Posição mundial do osso em coordenadas Three (após escala VFX). */
export function getBoneWorldPositionThree(
  bones: Bone[],
  boneName: string,
): [number, number, number] | null {
  const trimmed = boneName.trim()
  if (!trimmed) return null

  const bone =
    bones.find((entry) => entry.name === trimmed) ??
    bones.find((entry) => entry.name.toLowerCase() === trimmed.toLowerCase())
  if (!bone) return null

  bone.getWorldPosition(_world)
  return [_world.x, _world.y, _world.z]
}

/** Posição do osso em espaço LoL (antes de lolToThreeVec3). */
export function getBoneWorldPositionLol(bones: Bone[], boneName: string): [number, number, number] | null {
  const three = getBoneWorldPositionThree(bones, boneName)
  if (!three) return null
  const [tx, ty, tz] = three
  return [-tx, -tz, ty]
}

export function listSklBoneNames(skl: ParsedLolSkl): string[] {
  return skl.joints.map((joint) => joint.name).filter((name) => name.length > 0)
}

export function resolveEmitterAttachBoneName(
  attachBoneName: string | null | undefined,
  fallbackBone: string | null | undefined,
): string | null {
  const fromEmitter = attachBoneName?.trim()
  if (fromEmitter) return fromEmitter
  const fallback = fallbackBone?.trim()
  return fallback || null
}
