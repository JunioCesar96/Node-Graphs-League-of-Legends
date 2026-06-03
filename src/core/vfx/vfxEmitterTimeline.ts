import type { ParsedVfxEmitterFull } from './vfxModel'

export type VfxEmitterActiveWindow = {
  start: number
  end: number
}

/** Intervalo em que pelo menos uma partícula deste emitter pode estar visível. */
export function computeEmitterActiveWindow(emitter: ParsedVfxEmitterFull): VfxEmitterActiveWindow {
  const start = emitter.timeBeforeFirstEmission
  const tail = emitter.particleLifetime + emitter.particleLinger

  if (emitter.isSingleParticle) {
    return {
      start,
      end: Math.max(start + tail, start + 0.001),
    }
  }

  const emitEnd = start + Math.max(emitter.lifetime, 0)
  return {
    start,
    end: Math.max(emitEnd + tail, start + 0.001),
  }
}

export function isTimeInsideActiveWindow(time: number, window: VfxEmitterActiveWindow): boolean {
  return time >= window.start && time <= window.end
}
