export type VfxCompositorClip = {
  effectId: string
  label: string
  lifetime: number
  offset: number
}

export type VfxCompositorTimelineLayer = {
  id: string
  effectId: string
  name: string
  duration: number
  clipStart: number
  clipEnd: number
  activeAtPlayhead: boolean
  visible: boolean
  focused: boolean
}

/** Tempo local de um clip: relógio global menos offset de início. */
export function localTimeForClip(globalTime: number, offset: number): number {
  return Math.max(0, globalTime - offset)
}

export function isTimeInsideClip(globalTime: number, clipStart: number, clipEnd: number): boolean {
  return globalTime >= clipStart && globalTime < clipEnd
}

export function computeCompositorLifetime(clips: Array<{ lifetime: number; offset: number }>): number {
  if (!clips.length) return 1
  return Math.max(1, ...clips.map((clip) => clip.offset + clip.lifetime))
}

export function clampClipOffset(
  offset: number,
  effectLifetime: number,
  compositorLifetime: number,
): number {
  const maxOffset = Math.max(0, compositorLifetime - effectLifetime)
  return Math.min(Math.max(offset, 0), maxOffset)
}

export function buildCompositorTimelineLayers(
  clips: VfxCompositorClip[],
  currentTime: number,
  focusedEffectId: string | null = null,
  visibility: Record<string, boolean> = {},
): VfxCompositorTimelineLayer[] {
  return clips.map((clip) => {
    const clipStart = clip.offset
    const clipEnd = clip.offset + clip.lifetime
    return {
      id: clip.effectId,
      effectId: clip.effectId,
      name: clip.label,
      duration: clip.lifetime,
      clipStart,
      clipEnd,
      activeAtPlayhead: isTimeInsideClip(currentTime, clipStart, clipEnd),
      visible: visibility[clip.effectId] !== false,
      focused: focusedEffectId === clip.effectId,
    }
  })
}

/** Chave namespaced para emitters no modo compositor. */
export function compositorEmitterKey(effectId: string, emitterId: string): string {
  return `${effectId}/${emitterId}`
}
