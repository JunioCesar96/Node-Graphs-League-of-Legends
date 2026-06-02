export const VFX_PLAYBACK_SPEED_MIN = 0.1
export const VFX_PLAYBACK_SPEED_MAX = 2
export const VFX_PLAYBACK_SPEED_DEFAULT = 1

import type { VfxPlaybackRange } from '@/core/vfx/vfxPlaybackRange'
import {
  clampPlaybackRange,
  clampTimeToPlaybackRange,
  isPlaybackRangeActive,
} from '@/core/vfx/vfxPlaybackRange'

export type { VfxPlaybackRange } from '@/core/vfx/vfxPlaybackRange'
export {
  clampPlaybackRange,
  clampTimeToPlaybackRange,
  defaultPlaybackRange,
  isFullPlaybackRange,
  isPlaybackRangeActive,
} from '@/core/vfx/vfxPlaybackRange'

export const VFX_STEP_PLAYBACK_TIMELINE_DEFAULT = 0.1
export const VFX_STEP_PLAYBACK_TIMELINE_MIN = 0.01
export const VFX_STEP_PLAYBACK_INTERVAL_DEFAULT = 1
export const VFX_STEP_PLAYBACK_INTERVAL_MIN = 0.01

export function clampStepPlaybackTimelineSeconds(seconds: number, lifetime: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return VFX_STEP_PLAYBACK_TIMELINE_DEFAULT
  const max = Math.max(lifetime, VFX_STEP_PLAYBACK_TIMELINE_MIN)
  return Math.min(max, Math.max(VFX_STEP_PLAYBACK_TIMELINE_MIN, seconds))
}

/** Intervalo real (s) entre cada salto no modo passo a passo. */
export function clampStepPlaybackIntervalSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return VFX_STEP_PLAYBACK_INTERVAL_DEFAULT
  return Math.max(VFX_STEP_PLAYBACK_INTERVAL_MIN, seconds)
}

/** Alinha o tempo aos múltiplos do passo na timeline. */
export function snapTimeToTimelineStep(time: number, stepSeconds: number, lifetime: number): number {
  const step = clampStepPlaybackTimelineSeconds(stepSeconds, lifetime)
  const snapped = Math.round(time / step) * step
  return Math.min(Math.max(snapped, 0), lifetime)
}

export function clampPlaybackSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return VFX_PLAYBACK_SPEED_DEFAULT
  return Math.min(VFX_PLAYBACK_SPEED_MAX, Math.max(VFX_PLAYBACK_SPEED_MIN, speed))
}

export function formatPlaybackSpeed(speed: number): string {
  return `${clampPlaybackSpeed(speed).toFixed(1)}x`
}

function resolvePlaybackBounds(
  lifetime: number,
  range: VfxPlaybackRange | null | undefined,
): { min: number; max: number; rangeActive: boolean } {
  if (!range || !isPlaybackRangeActive(range, lifetime)) {
    return { min: 0, max: lifetime, rangeActive: false }
  }
  const clamped = clampPlaybackRange(range, lifetime)
  return { min: clamped.start, max: clamped.end, rangeActive: true }
}

/** Tempo para o qual voltar ao parar sem loop (0 ou início do trecho). */
function resolvePlaybackRewindTime(rangeActive: boolean, min: number): number {
  return rangeActive ? min : 0
}

function isResetPointActive(
  resetAt: number | null,
  rangeActive: boolean,
  min: number,
  max: number,
): boolean {
  if (resetAt === null || resetAt <= 0) {
    return false
  }
  if (rangeActive) {
    return resetAt >= min && resetAt <= max
  }
  return true
}

/** Avança o relógio da timeline (inclui reset point e inversa). */
export function advanceTimelineTime(
  previous: number,
  step: number,
  lifetime: number,
  options: {
    reverse: boolean
    loop: boolean
    resetAt: number | null
    playbackRange?: VfxPlaybackRange | null
  },
): { time: number; stop: boolean } {
  const { reverse, loop, resetAt, playbackRange } = options
  const { min, max, rangeActive } = resolvePlaybackBounds(lifetime, playbackRange)
  const hasReset = isResetPointActive(resetAt, rangeActive, min, max)
  const resetTarget = resetAt!
  const rewindTime = resolvePlaybackRewindTime(rangeActive, min)
  let next = previous + step

  if (!reverse && hasReset && previous < resetTarget && next >= resetTarget) {
    return { time: rewindTime, stop: !loop }
  }
  if (reverse && hasReset && previous > resetTarget && next <= resetTarget) {
    next = resetTarget
  }

  if (reverse) {
    if (next <= min) {
      if (hasReset && !rangeActive) {
        return { time: resetTarget, stop: !loop }
      }
      if (loop) {
        return { time: max, stop: false }
      }
      return { time: rewindTime, stop: true }
    }
    return { time: next, stop: false }
  }

  if (next >= max) {
    if (loop) {
      return { time: min, stop: false }
    }
    return { time: rewindTime, stop: true }
  }
  return { time: next, stop: false }
}

/** Avanço discreto no modo passo a passo (sempre para a frente). */
export function advanceTimelineStep(
  previous: number,
  stepSeconds: number,
  lifetime: number,
  options: {
    loop: boolean
    resetAt: number | null
    playbackRange?: VfxPlaybackRange | null
  },
): { time: number; stop: boolean } {
  const { loop, resetAt, playbackRange } = options
  const { min, max, rangeActive } = resolvePlaybackBounds(lifetime, playbackRange)
  const hasReset = isResetPointActive(resetAt, rangeActive, min, max)
  const resetTarget = resetAt!
  const rewindTime = resolvePlaybackRewindTime(rangeActive, min)
  const next = previous + stepSeconds

  if (hasReset && previous < resetTarget && next >= resetTarget) {
    return { time: rewindTime, stop: !loop }
  }
  if (next >= max) {
    if (loop) {
      return { time: min, stop: false }
    }
    return { time: rewindTime, stop: true }
  }
  return { time: next, stop: false }
}
