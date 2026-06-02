import type { ParsedVfxEmitterFull } from './vfxModel'

/** Limite de partículas simultâneas por emitter na preview web. */
export const MAX_PREVIEW_PARTICLES_PER_EMITTER = 48

export type VfxParticleInstance = {
  index: number
  seed: number
  birthTime: number
  particleTime: number
}

/**
 * Lista partículas vivas no instante `sceneTimeSeconds`.
 * `rate` = partículas/segundo durante `lifetime` do emitter (após timeBeforeFirstEmission).
 */
export function computeParticleInstances(
  emitter: ParsedVfxEmitterFull,
  sceneTimeSeconds: number,
  baseSeed = 42,
): VfxParticleInstance[] {
  const particleLifetime = Math.max(emitter.particleLifetime, 0.001)
  const linger = emitter.particleLinger
  const maxAge = particleLifetime + linger

  if (emitter.isSingleParticle) {
    const birthTime = emitter.timeBeforeFirstEmission
    const particleTime = sceneTimeSeconds - birthTime
    if (particleTime < 0 || particleTime > maxAge) return []
    return [{ index: 0, seed: baseSeed, birthTime, particleTime }]
  }

  const rate = Math.max(emitter.rate, 0)
  if (rate <= 0) return []

  const emitStart = emitter.timeBeforeFirstEmission
  const emitDuration = Math.max(emitter.lifetime, 0)
  const emitEnd = emitStart + emitDuration
  const interval = 1 / rate

  const instances: VfxParticleInstance[] = []
  let birthTime = emitStart
  let index = 0

  while (birthTime <= emitEnd + 1e-6 && index < MAX_PREVIEW_PARTICLES_PER_EMITTER) {
    if (birthTime <= sceneTimeSeconds) {
      const particleTime = sceneTimeSeconds - birthTime
      if (particleTime >= 0 && particleTime <= maxAge) {
        instances.push({
          index,
          seed: baseSeed + index * 17,
          birthTime,
          particleTime,
        })
      }
    }
    birthTime += interval
    index += 1
  }

  return instances
}

export function countPreviewParticlesForEmitter(emitter: ParsedVfxEmitterFull): number {
  if (emitter.isSingleParticle) return 1
  const emitDuration = Math.max(emitter.lifetime, 0)
  const estimated = Math.ceil(Math.max(emitter.rate, 0) * emitDuration)
  return Math.min(Math.max(estimated, 1), MAX_PREVIEW_PARTICLES_PER_EMITTER)
}
