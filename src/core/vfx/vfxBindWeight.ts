import type { VfxEmbedValue } from './vfxModel'

/** Peso 0–1: partícula segue o transform do emissor (sem deslocamento por velocidade). */
export function resolveBindWeight(embed: VfxEmbedValue | null): number {
  if (!embed) return 0
  const value = Number(embed.constant ?? 0)
  return Math.min(1, Math.max(0, value))
}

export function blendPositionWithBindWeight(
  freePosition: [number, number, number],
  attachedPosition: [number, number, number],
  bindWeight: number,
): [number, number, number] {
  const w = Math.min(1, Math.max(0, bindWeight))
  if (w <= 0) return freePosition
  if (w >= 1) return attachedPosition
  return [
    attachedPosition[0] * w + freePosition[0] * (1 - w),
    attachedPosition[1] * w + freePosition[1] * (1 - w),
    attachedPosition[2] * w + freePosition[2] * (1 - w),
  ]
}
