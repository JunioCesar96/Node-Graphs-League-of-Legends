export type VfxPlaybackRange = {
  start: number
  end: number
}

const RANGE_EPSILON = 0.0001

export function defaultPlaybackRange(lifetime: number): VfxPlaybackRange {
  return { start: 0, end: Math.max(lifetime, 0) }
}

export function clampPlaybackRange(range: VfxPlaybackRange, lifetime: number): VfxPlaybackRange {
  const maxLifetime = Math.max(lifetime, 0)
  const start = Math.min(Math.max(range.start, 0), maxLifetime)
  const end = Math.min(Math.max(range.end, start), maxLifetime)
  return { start, end }
}

export function isFullPlaybackRange(range: VfxPlaybackRange, lifetime: number): boolean {
  const clamped = clampPlaybackRange(range, lifetime)
  return clamped.start <= RANGE_EPSILON && clamped.end >= Math.max(lifetime, 0) - RANGE_EPSILON
}

export function isPlaybackRangeActive(range: VfxPlaybackRange, lifetime: number): boolean {
  return !isFullPlaybackRange(range, lifetime)
}

export function clampTimeToPlaybackRange(
  time: number,
  range: VfxPlaybackRange,
  lifetime: number,
): number {
  if (!isPlaybackRangeActive(range, lifetime)) {
    return Math.min(Math.max(time, 0), lifetime)
  }
  const clamped = clampPlaybackRange(range, lifetime)
  return Math.min(Math.max(time, clamped.start), clamped.end)
}
