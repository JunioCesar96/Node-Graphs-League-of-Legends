import type { ParsedVfxEmitterFull, VfxEmbedValue, VfxSpawnShapeLegacy } from './vfxModel'
import { embedVec3 } from './vfxEmbedSample'
import {
  applyOrbitalRotationLol,
  applyOrbitalStepLol,
  orbitalHasMotion,
  resolveOrbitalOmegaLol,
  rotateVec3AroundAxis,
} from './vfxOrbitalMotion'
import {
  resolveFlexShapeEmitOffsetMultiplier,
  scaleVec3ByFactor,
} from './vfxFlexShape'
import { applyProbabilityToVec3, sampleProbabilityTable } from './vfxProbability'

export {
  applyOrbitalRotationLol,
  applyOrbitalStepLol,
  orbitalHasMotion,
  resolveOrbitalOmegaLol,
  rotateVec3AroundAxis,
}

export function sampleSpawnAngleDegrees(angleEmbed: VfxEmbedValue | null, seed: number): number {
  if (!angleEmbed) return 0

  const dynamics = angleEmbed.dynamics
  const table = dynamics?.probabilityTables[0]
  if (table?.keyTimes.length) {
    return sampleProbabilityTable(table, seed + 11)
  }

  if (dynamics?.values.length) {
    return Number(dynamics.values[0] ?? angleEmbed.constant ?? 0)
  }

  return Number(angleEmbed.constant ?? 0)
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function randomInBox(
  dimensions: [number, number, number],
  emitOffset: [number, number, number],
  seed: number,
): [number, number, number] {
  const u = seededUnit(seed + 17)
  const v = seededUnit(seed + 31)
  const w = seededUnit(seed + 47)
  return [
    emitOffset[0] + (u - 0.5) * dimensions[0],
    emitOffset[1] + (v - 0.5) * dimensions[1],
    emitOffset[2] + (w - 0.5) * dimensions[2],
  ]
}

function randomInCylinder(
  radius: number,
  height: number,
  emitOffset: [number, number, number],
  seed: number,
): [number, number, number] {
  const u = seededUnit(seed + 19)
  const v = seededUnit(seed + 37)
  const angle = u * Math.PI * 2
  const r = Math.sqrt(v) * radius
  const y = (seededUnit(seed + 53) - 0.5) * height
  return [emitOffset[0] + Math.cos(angle) * r, emitOffset[1] + y, emitOffset[2] + Math.sin(angle) * r]
}

export function computeLegacySpawnOffsetLol(shape: VfxSpawnShapeLegacy, seed: number): [number, number, number] {
  let offset = embedVec3(shape.emitOffset, [0, 0, 0])
  if (shape.emitOffset?.dynamics) {
    offset = applyProbabilityToVec3(offset, shape.emitOffset.dynamics.probabilityTables, seed + 9)
  }

  const angle = sampleSpawnAngleDegrees(shape.emitRotationAngle, seed)
  return rotateVec3AroundAxis(offset, shape.emitRotationAxis, angle)
}

/** Offset de spawn por partícula (espaço LoL, antes de lolToThreeVec3). */
export function computeParticleSpawnOffsetLol(
  emitter: ParsedVfxEmitterFull,
  seed: number,
  motionTime = 0,
  boundObjectSizeLol?: [number, number, number] | null,
  particleNormalized = 0,
): [number, number, number] {
  void particleNormalized
  let offset: [number, number, number]
  if (emitter.spawnShape?.kind === 'legacy') {
    offset = computeLegacySpawnOffsetLol(emitter.spawnShape, seed)
  } else if (emitter.spawnShape?.kind === 'box') {
    offset = randomInBox(emitter.spawnShape.dimensions, emitter.spawnShape.emitOffset, seed)
  } else if (emitter.spawnShape?.kind === 'cylinder') {
    offset = randomInCylinder(
      emitter.spawnShape.radius,
      emitter.spawnShape.height,
      emitter.spawnShape.emitOffset,
      seed,
    )
  } else if (emitter.spawnShape?.kind === 'offset') {
    offset = emitter.spawnShape.offset
  } else {
    offset = emitter.spawnOffset
  }

  // birthOrbitalVelocity temporariamente desactivado.
  void motionTime

  const emitFlex = resolveFlexShapeEmitOffsetMultiplier(emitter.flexShape, boundObjectSizeLol)
  return scaleVec3ByFactor(offset, emitFlex)
}
