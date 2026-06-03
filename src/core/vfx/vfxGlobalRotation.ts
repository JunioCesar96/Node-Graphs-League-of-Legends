import { Euler, Quaternion } from 'three'

import { leagueLocalToThree } from '@/core/vfx/lolCoords'

const DEG2RAD = Math.PI / 180

/** Permuta eixos LoL → Three (legado, sem matriz P). */
function lolToThreeEulerDegrees(vec: [number, number, number]): [number, number, number] {
  return [vec[0] * DEG2RAD, vec[2] * DEG2RAD, vec[1] * DEG2RAD]
}

/** Graus LoL (Euler XYZ) → quaternion league (x, y, z, w). */
function lolEulerDegreesToQuatXyzw(degrees: [number, number, number]): [number, number, number, number] {
  const euler = new Euler(
    degrees[0] * DEG2RAD,
    degrees[1] * DEG2RAD,
    degrees[2] * DEG2RAD,
    'XYZ',
  )
  const quat = new Quaternion().setFromEuler(euler)
  return [quat.x, quat.y, quat.z, quat.w]
}

/** Quaternion (w, x, y, z) → Euler XYZ radianos Three.js. */
function quatWxyzToThreeEuler(rotationWxyz: [number, number, number, number]): [number, number, number] {
  const [w, x, y, z] = rotationWxyz
  const quat = new Quaternion(x, y, z, w)
  const euler = new Euler().setFromQuaternion(quat, 'XYZ')
  return [euler.x, euler.y, euler.z]
}

/**
 * Converte rotação de partícula LoL para Three.js.
 * Com correção global, usa `leagueLocalToThree` (matriz P) em vez de permutar eixos.
 */
export function lolRotationDegreesToThreeEuler(
  rotationLolDegrees: [number, number, number],
  globalCorrection: boolean,
  globalOffsetDegrees: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const adjusted: [number, number, number] = [
    rotationLolDegrees[0] + globalOffsetDegrees[0],
    rotationLolDegrees[1] + globalOffsetDegrees[1],
    rotationLolDegrees[2] + globalOffsetDegrees[2],
  ]

  if (!globalCorrection) {
    return lolToThreeEulerDegrees(adjusted)
  }

  const quatXyzw = lolEulerDegreesToQuatXyzw(adjusted)
  const converted = leagueLocalToThree([0, 0, 0], quatXyzw, [1, 1, 1])
  return quatWxyzToThreeEuler(converted.rotation)
}
