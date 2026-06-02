/**
 * birthOrbitalVelocity — Orbita X/Y/Z, graus por frame de simulação (30 Hz).
 * Cada componente ritual roda o offset (e spin da malha) em torno do eixo
 * perpendicular à face definida pelo painel Orbita.
 */

import type { ParsedVfxEmitterFull } from './vfxModel'
import { embedVec3, sampleDynamicsVec3 } from './vfxEmbedSample'
import { applyProbabilityToVec3 } from './vfxProbability'
import { DEFAULT_VFX_FPS } from './vfxWebAnimation'

/** Eixo de órbita LoL por componente ritual (índice = Orbita X/Y/Z). */
export const ORBITAL_ROTATION_AXIS_LOL: Record<0 | 1 | 2, [number, number, number]> = {
  0: [0, 1, 0],
  1: [0, 1, 0],
  2: [1, 0, 0],
}

/** Editor VFX serializa vetores como {X, Z, Y}. */
export function normalizeEditorVec3XzyToXyz(vec: [number, number, number]): [number, number, number] {
  return [vec[0], vec[2], vec[1]]
}

/** Índice do euler LoL (graus) que recebe spin acumulado por componente. */
const ORBITAL_SPIN_EULER_INDEX: Record<0 | 1 | 2, 0 | 1 | 2> = {
  0: 1,
  1: 1,
  2: 0,
}

/** Rotação de `v` em torno de `axis` (graus, sentido positivo). */
export function rotateVec3AroundAxis(
  v: [number, number, number],
  axis: [number, number, number],
  degrees: number,
): [number, number, number] {
  if (Math.abs(degrees) < 1e-6) return v

  const rad = (degrees * Math.PI) / 180
  const [vx, vy, vz] = v
  let [ax, ay, az] = axis
  const len = Math.hypot(ax, ay, az)
  if (len < 1e-6) return v
  ax /= len
  ay /= len
  az /= len

  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dot = ax * vx + ay * vy + az * vz
  const crossX = ay * vz - az * vy
  const crossY = az * vx - ax * vz
  const crossZ = ax * vy - ay * vx

  return [
    vx * cos + crossX * sin + ax * dot * (1 - cos),
    vy * cos + crossY * sin + ay * dot * (1 - cos),
    vz * cos + crossZ * sin + az * dot * (1 - cos),
  ]
}

export function dominantOrbitalComponentIndex(omega: [number, number, number]): 0 | 1 | 2 {
  const abs = omega.map((v) => Math.abs(Number(v)))
  if (abs[1]! >= abs[0]! && abs[1]! >= abs[2]!) return 1
  if (abs[0]! >= abs[2]!) return 0
  return 2
}

export function orbitalRotationAxisForComponent(componentIndex: 0 | 1 | 2): [number, number, number] {
  return ORBITAL_ROTATION_AXIS_LOL[componentIndex]
}

/** Orientação base LoL (graus) para alinhar a face da malha ao painel Orbita dominante. */
export function orbitalMeshBasisEulerLol(dominantIndex: 0 | 1 | 2): [number, number, number] {
  switch (dominantIndex) {
    case 0:
      return [-90, 0, 0]
    case 1:
      return [-90, 0, 0]
    case 2:
      return [0, 90, 0]
    default:
      return [0, 0, 0]
  }
}

export function resolveOrbitalOmegaLol(
  emitter: ParsedVfxEmitterFull,
  seed: number,
  particleNormalized: number,
  applyProbabilityTables = true,
): [number, number, number] {
  const embed = emitter.birthOrbitalVelocity
  if (!embed) return [0, 0, 0]

  let omegaEditorOrder: [number, number, number]
  if (embed.dynamics?.times?.length) {
    omegaEditorOrder = sampleDynamicsVec3(embed, particleNormalized, [0, 0, 0])
  } else {
    omegaEditorOrder = embedVec3(embed, [0, 0, 0])
  }

  if (applyProbabilityTables && embed.dynamics?.probabilityTables?.length) {
    omegaEditorOrder = applyProbabilityToVec3(omegaEditorOrder, embed.dynamics.probabilityTables, seed + 5)
  }
  return normalizeEditorVec3XzyToXyz(omegaEditorOrder)
}

export function orbitalHasMotion(emitter: ParsedVfxEmitterFull): boolean {
  const embed = emitter.birthOrbitalVelocity
  if (!embed) return false
  if (embed.dynamics?.times?.length) return true
  return normalizeEditorVec3XzyToXyz(embedVec3(embed, [0, 0, 0])).some((v) => Math.abs(v) > 1e-6)
}

/** Um passo de simulação: ω em °/frame por componente Orbita X→Y→Z. */
export function applyOrbitalStepLol(
  offset: [number, number, number],
  omegaDegreesPerFrame: [number, number, number],
): [number, number, number] {
  let out = offset
  const [ox, oy, oz] = omegaDegreesPerFrame
  if (Math.abs(ox) > 1e-6) out = rotateVec3AroundAxis(out, ORBITAL_ROTATION_AXIS_LOL[0], ox)
  if (Math.abs(oy) > 1e-6) out = rotateVec3AroundAxis(out, ORBITAL_ROTATION_AXIS_LOL[1], oy)
  if (Math.abs(oz) > 1e-6) out = rotateVec3AroundAxis(out, ORBITAL_ROTATION_AXIS_LOL[2], oz)
  return out
}

/** `deltaFrames` passos de ω °/frame (compat: 1 passo = 1 frame). */
export function applyOrbitalRotationLol(
  offset: [number, number, number],
  omegaDegreesPerFrame: [number, number, number],
  deltaFrames = 1,
): [number, number, number] {
  if (deltaFrames <= 0) return offset
  let out = offset
  const steps = Math.max(1, Math.round(deltaFrames))
  for (let i = 0; i < steps; i++) {
    out = applyOrbitalStepLol(out, omegaDegreesPerFrame)
  }
  return out
}

export function orbitalSimulationFrameCount(motionTime: number): number {
  if (motionTime <= 1e-9) return 0
  return Math.max(1, Math.floor(motionTime * DEFAULT_VFX_FPS))
}

/**
 * Integra órbita do offset desde o nascimento: um passo por frame, ω °/frame.
 */
export function integrateOrbitalRotationLol(
  baseOffset: [number, number, number],
  emitter: ParsedVfxEmitterFull,
  seed: number,
  motionTime: number,
): [number, number, number] {
  if (motionTime <= 1e-9 || !orbitalHasMotion(emitter)) return baseOffset

  const lifetime = Math.max(emitter.particleLifetime, 1e-6)
  const steps = orbitalSimulationFrameCount(motionTime)

  let out = baseOffset
  let probabilityApplied = false

  for (let step = 0; step < steps; step++) {
    const tMid = ((step + 0.5) / steps) * motionTime
    const normalized = Math.min(tMid / lifetime, 1)
    const omega = resolveOrbitalOmegaLol(emitter, seed, normalized, !probabilityApplied)
    if (!probabilityApplied && emitter.birthOrbitalVelocity?.dynamics?.probabilityTables?.length) {
      probabilityApplied = true
    }
    out = applyOrbitalStepLol(out, omega)
  }

  return out
}

/** Spin acumulado LoL (graus) por componente orbital activo. */
export function computeOrbitalSpinLol(
  emitter: ParsedVfxEmitterFull,
  seed: number,
  motionTime: number,
): [number, number, number] {
  const spin: [number, number, number] = [0, 0, 0]
  if (motionTime <= 1e-9 || !orbitalHasMotion(emitter)) return spin

  const lifetime = Math.max(emitter.particleLifetime, 1e-6)
  const steps = orbitalSimulationFrameCount(motionTime)
  let probabilityApplied = false

  for (let step = 0; step < steps; step++) {
    const tMid = ((step + 0.5) / steps) * motionTime
    const normalized = Math.min(tMid / lifetime, 1)
    const omega = resolveOrbitalOmegaLol(emitter, seed, normalized, !probabilityApplied)
    if (!probabilityApplied && emitter.birthOrbitalVelocity?.dynamics?.probabilityTables?.length) {
      probabilityApplied = true
    }
    for (let i = 0; i < 3; i++) {
      const idx = i as 0 | 1 | 2
      if (Math.abs(omega[i]) > 1e-6) {
        const eulerIdx = ORBITAL_SPIN_EULER_INDEX[idx]
        spin[eulerIdx] += omega[i]
      }
    }
  }

  return spin
}

/** ω acumulado (°) = ω °/frame × número de frames simulados. */
export function resolveOrbitalOmegaAccumulatedDeg(
  parsed: ParsedVfxEmitterFull,
  seed: number,
  particleTime: number,
  particleNormalized: number,
): [number, number, number] {
  const frames = orbitalSimulationFrameCount(particleTime)
  if (frames <= 0) return [0, 0, 0]
  const omega = resolveOrbitalOmegaLol(parsed, seed, particleNormalized, true)
  return [omega[0] * frames, omega[1] * frames, omega[2] * frames]
}
