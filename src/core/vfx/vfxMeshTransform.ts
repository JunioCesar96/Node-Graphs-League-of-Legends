import { Euler, Quaternion } from 'three'

/** Euler XYZ (rad) → quaternion para composição de rotação do mesh VFX. */
export function eulerRadiansToQuaternion(rotation: [number, number, number]): Quaternion {
  return new Quaternion().setFromEuler(new Euler(rotation[0], rotation[1], rotation[2], 'XYZ'))
}

/** Rotação final do plano: base (deitar no chão) × birth (giro no plano). */
export function composePlaneMeshQuaternion(
  planeBaseRotation: [number, number, number],
  birthRotation: [number, number, number],
): Quaternion {
  const base = eulerRadiansToQuaternion(planeBaseRotation)
  const birth = eulerRadiansToQuaternion(birthRotation)
  return base.multiply(birth)
}

/** Converte quaternion composto para Euler XYZ (rad) — fallback se mesh.rotation for necessário. */
export function quaternionToEulerXyz(quaternion: Quaternion): [number, number, number] {
  const euler = new Euler().setFromQuaternion(quaternion, 'XYZ')
  return [euler.x, euler.y, euler.z]
}
