/** Orientação base de primitivos VFX (port de primitive_meshes.py). */

const DEG2RAD = Math.PI / 180

export type VfxPlaneFacing = 'camera' | 'ground' | 'shockwave'

export function birthRotationConstant(
  birthRotation0: { constant?: unknown } | null,
): [number, number, number] | null {
  if (!birthRotation0?.constant || !Array.isArray(birthRotation0.constant)) return null
  const value = birthRotation0.constant
  if (value.length < 3) return null
  return [Number(value[0]), Number(value[1]), Number(value[2])]
}

export function resolvePlaneFacing(
  birthRotation: [number, number, number] | null,
  isGroundLayer: boolean,
): VfxPlaneFacing {
  if (isGroundLayer) return 'ground'
  if (!birthRotation) return 'camera'

  const [rx, , rz] = birthRotation
  if (Math.abs(rx - 90) < 45 && Math.abs(rz - 90) < 45) return 'shockwave'
  if (Math.abs(rx - 270) < 45 || (Math.abs(rx - 90) < 45 && Math.abs(rz) < 45)) return 'ground'
  return 'camera'
}

/** Rotação Euler XYZ aplicada à geometria antes do billboard / birthRotation. */
export function planeBaseRotation(facing: VfxPlaneFacing): [number, number, number] {
  const halfPi = Math.PI / 2
  /** +90° X: plano no XZ com normal +Y (frente visível de cima, como decal no chão). */
  if (facing === 'ground') return [halfPi, 0, 0]
  if (facing === 'shockwave') return [-halfPi, 0, halfPi]
  return [0, 0, 0]
}

/**
 * Com `isGroundLayer`, birthRotation0 orienta o quad ao chão (ex. {-90,-90,0}).
 * `planeBaseRotation` já deita o plano; aqui só aplica giro no plano (eixo Y Three, LoL Z).
 */
export function birthRotationGroundInPlaneEuler(
  birthRotLol: [number, number, number],
  rotVelocityLol: [number, number, number],
  motionTime: number,
): [number, number, number] {
  const spinDeg = birthRotLol[2] + rotVelocityLol[2] * motionTime
  return [0, spinDeg * DEG2RAD, 0]
}
