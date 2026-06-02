/** Parâmetros de debug visual para órbita de spawn (viewport 3D). */

import type { ParsedVfxEmitterFull } from './vfxModel'
import { lolMeshToThreeCoords } from './lolCoords'
import {
  dominantOrbitalComponentIndex,
  orbitalRotationAxisForComponent,
  resolveOrbitalOmegaLol,
} from './vfxOrbitalMotion'
import { computeParticleSpawnOffsetLol } from './vfxSpawnShape'

export type OrbitalDebugRingParams = {
  /** Raio do anel em unidades Three (após vfxScale). */
  radius: number
  /** Euler rad local para alinhar ringGeometry (XY) ao plano orbital. */
  ringRotation: [number, number, number]
}

/** Plano do anel perpendicular ao eixo de órbita mapeado (LoL → Three). */
function ringRotationForOrbitAxisLoL(axis: [number, number, number]): [number, number, number] {
  const [ax, ay, az] = axis
  if (Math.abs(ay) > 0.9) return [-Math.PI / 2, 0, 0]
  if (Math.abs(ax) > 0.9) return [0, Math.PI / 2, 0]
  return [0, 0, 0]
}

export function computeOrbitalDebugRingParams(
  emitter: ParsedVfxEmitterFull,
  seed: number,
  vfxScale: number,
): OrbitalDebugRingParams | null {
  const omega = resolveOrbitalOmegaLol(emitter, seed, 0, true)
  if (!omega.some((v) => Math.abs(Number(v)) > 1e-6)) return null

  const baseSpawn = computeParticleSpawnOffsetLol(emitter, seed, 0, null, 0)
  const radiusLol = Math.hypot(baseSpawn[0], baseSpawn[1], baseSpawn[2])
  if (radiusLol < 1e-3) return null

  const [tx, ty, tz] = lolMeshToThreeCoords(baseSpawn[0], baseSpawn[1], baseSpawn[2])
  const radius = Math.hypot(tx, ty, tz) * vfxScale

  const dominant = dominantOrbitalComponentIndex(omega)
  const orbitAxis = orbitalRotationAxisForComponent(dominant)
  const ringRotation = ringRotationForOrbitAxisLoL(orbitAxis)

  return { radius: Math.max(radius, 0.05), ringRotation }
}
