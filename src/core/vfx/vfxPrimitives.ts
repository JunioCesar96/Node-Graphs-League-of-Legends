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

/** Ritual típico de decal no chão (ex. {-90,-90,0}) sem `isGroundLayer`. */
export function isGroundLikeBirthRotation(birthRotation: [number, number, number]): boolean {
  const [rx, ry, rz] = birthRotation
  const tiltX = Math.abs(Math.abs(rx) - 90) < 45
  const tiltY = Math.abs(Math.abs(ry) - 90) < 45
  if (tiltX && tiltY) return true
  if (Math.abs(rx - 270) < 45) return true
  if (Math.abs(rx - 90) < 45 && Math.abs(rz) < 45) return true
  return false
}

export function resolvePlaneFacing(
  birthRotation: [number, number, number] | null,
  isGroundLayer: boolean,
  birthOrbitalVelocity?: [number, number, number] | null,
): VfxPlaneFacing {
  if (isGroundLayer) return 'ground'
  if (birthRotation && isGroundLikeBirthRotation(birthRotation)) return 'ground'
  if (birthOrbitalVelocity) {
    const [vx, vy, vz] = birthOrbitalVelocity
    const absX = Math.abs(vx)
    const absY = Math.abs(vy)
    const absZ = Math.abs(vz)
    if (absZ >= absX && absZ >= absY && absZ > 1e-6) return 'ground'
    if (absX > 1e-6 || absY > 1e-6) return 'camera'
  }
  if (!birthRotation) return 'camera'

  const [rx, , rz] = birthRotation
  if (Math.abs(rx - 90) < 45 && Math.abs(rz - 90) < 45) return 'shockwave'
  if (Math.abs(rx - 270) < 45 || (Math.abs(rx - 90) < 45 && Math.abs(rz) < 45)) return 'ground'
  return 'camera'
}

/**
 * Converte vetor orbital em rotação base LoL (graus) para orientar o plano:
 * - eixo Z dominante: plano de chão (facing ground), sem yaw adicional.
 * - eixo X/Y dominante: plano vertical (facing camera), yaw aponta normal para X/Y.
 */
export function orbitalFacingBirthRotationLol(
  birthOrbitalVelocity: [number, number, number] | null,
): [number, number, number] {
  if (!birthOrbitalVelocity) return [0, 0, 0]
  const [vx, vy, vz] = birthOrbitalVelocity
  const absX = Math.abs(vx)
  const absY = Math.abs(vy)
  const absZ = Math.abs(vz)
  if (absZ >= absX && absZ >= absY && absZ > 1e-6) return [0, 0, 0]
  if (absX <= 1e-6 && absY <= 1e-6) return [0, 0, 0]
  const yawDeg = (Math.atan2(vy, vx) * 180) / Math.PI
  return [0, yawDeg, 0]
}

/** Rotação Euler XYZ aplicada à geometria antes do billboard / birthRotation. */
export function planeBaseRotation(facing: VfxPlaneFacing): [number, number, number] {
  const halfPi = Math.PI / 2
  /** Ground: plano XY com normal +Z (cima LoL = Z Three). */
  if (facing === 'ground') return [0, 0, 0]
  if (facing === 'shockwave') return [-halfPi, 0, halfPi]
  /** Vertical / câmara: base no `primitiveLocalRotation` (plano XZ, normal LoL Z). */
  return [0, 0, 0]
}

/**
 * Com `isGroundLayer`, birthRotation0 orienta o quad ao chão (ex. {-90,-90,0}).
 * `planeBaseRotation` já deita o plano; aqui só aplica giro no plano (eixo Z Three, LoL Z).
 */
export function birthRotationGroundInPlaneEuler(
  birthRotLol: [number, number, number],
  rotVelocityLol: [number, number, number],
  motionTime: number,
): [number, number, number] {
  const spinDeg = birthRotLol[2] + rotVelocityLol[2] * motionTime
  return [0, 0, spinDeg * DEG2RAD]
}
