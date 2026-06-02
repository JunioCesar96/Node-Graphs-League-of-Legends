/**
 * Conversão birthRotation0 (graus LoL no ritual) ↔ rotação exibida na view 3D.
 *
 * Para quads no chão, o cliente LoL usa {-90,-90,0} como orientação neutra do decal.
 * Na view: rotationView = rotationLol - baseline  →  {-90,-90,0} LoL ≡ {0,0,0} view.
 */

import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'
import type { VfxPlaneFacing } from './vfxPrimitives'
import { isGroundLikeBirthRotation } from './vfxPrimitives'

/** Orientação ritual “plana” típica (Brand cracks, círculo mágico, etc.). */
export const GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL: [number, number, number] = [-90, -90, 0]

/** Shockwave no chão (ex. rx≈90, rz≈90). */
export const SHOCKWAVE_QUAD_ROTATION_BASELINE_LOL: [number, number, number] = [90, 0, 90]

export function normalizeAngleDegrees(degrees: number): number {
  let angle = degrees % 360
  if (angle > 180) angle -= 360
  if (angle < -180) angle += 360
  return angle
}

export function subtractAnglesDegrees(
  rotationLol: [number, number, number],
  baselineLol: [number, number, number],
): [number, number, number] {
  return [
    normalizeAngleDegrees(rotationLol[0] - baselineLol[0]),
    normalizeAngleDegrees(rotationLol[1] - baselineLol[1]),
    normalizeAngleDegrees(rotationLol[2] - baselineLol[2]),
  ]
}

export function addAnglesDegrees(
  viewRotation: [number, number, number],
  baselineLol: [number, number, number],
): [number, number, number] {
  return [
    normalizeAngleDegrees(viewRotation[0] + baselineLol[0]),
    normalizeAngleDegrees(viewRotation[1] + baselineLol[1]),
    normalizeAngleDegrees(viewRotation[2] + baselineLol[2]),
  ]
}

export type BirthRotationBaselineContext = {
  isGroundLayer: boolean
  planeFacing: VfxPlaneFacing
  /** Valor ritual (birthRotation0) antes de ω orbital / spin. */
  birthRotationRitual: [number, number, number] | null
}

/**
 * Baseline LoL subtraído para obter a rotação da view.
 * Dinâmico por facing; [0,0,0] para sprites verticais / billboard puro.
 */
export function resolveBirthRotationBaselineLol(
  context: BirthRotationBaselineContext,
): [number, number, number] {
  if (context.isGroundLayer) return GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
  if (context.planeFacing === 'shockwave') return SHOCKWAVE_QUAD_ROTATION_BASELINE_LOL
  if (context.planeFacing === 'ground') return GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
  if (
    context.birthRotationRitual &&
    isGroundLikeBirthRotation(context.birthRotationRitual)
  ) {
    return GROUND_LIKE_QUAD_ROTATION_BASELINE_LOL
  }
  return [0, 0, 0]
}

/** Graus LoL (ritual + spin) → graus mostrados na view 3D. */
export function birthRotationLolDegToViewDeg(
  rotationLolDeg: [number, number, number],
  baselineLol: [number, number, number],
): [number, number, number] {
  if (baselineLol.every((v) => Math.abs(v) < 1e-6)) {
    return [
      normalizeAngleDegrees(rotationLolDeg[0]),
      normalizeAngleDegrees(rotationLolDeg[1]),
      normalizeAngleDegrees(rotationLolDeg[2]),
    ]
  }
  return subtractAnglesDegrees(rotationLolDeg, baselineLol)
}

/** Graus da view 3D → graus LoL para o ritual / matriz P. */
export function birthRotationViewDegToLolDeg(
  viewRotationDeg: [number, number, number],
  baselineLol: [number, number, number],
): [number, number, number] {
  if (baselineLol.every((v) => Math.abs(v) < 1e-6)) {
    return [
      normalizeAngleDegrees(viewRotationDeg[0]),
      normalizeAngleDegrees(viewRotationDeg[1]),
      normalizeAngleDegrees(viewRotationDeg[2]),
    ]
  }
  return addAnglesDegrees(viewRotationDeg, baselineLol)
}

const DEG2RAD = Math.PI / 180

/** Graus view LoL → euler rad Three (após baseline / matriz P). */
export function birthRotationViewDegToMeshEulerRad(
  rotationViewLolDeg: [number, number, number],
  useLeagueMatrixP: boolean,
  isGroundLayer: boolean,
): [number, number, number] {
  if (isGroundLayer) {
    const spinDeg = rotationViewLolDeg[2]
    return [0, 0, spinDeg * DEG2RAD]
  }
  if (useLeagueMatrixP) {
    return lolRotationDegreesToThreeEuler(rotationViewLolDeg, true, [0, 0, 0])
  }
  return [
    rotationViewLolDeg[0] * DEG2RAD,
    rotationViewLolDeg[2] * DEG2RAD,
    rotationViewLolDeg[1] * DEG2RAD,
  ]
}
