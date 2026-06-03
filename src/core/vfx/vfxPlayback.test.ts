import { describe, expect, it } from 'vitest'

import {
  advanceTimelineTime,
  advanceTimelineStep,
  clampPlaybackSpeed,
  clampStepPlaybackIntervalSeconds,
  clampStepPlaybackTimelineSeconds,
  formatPlaybackSpeed,
  snapTimeToTimelineStep,
} from './vfxPlayback'

describe('clampPlaybackSpeed', () => {
  it('limita entre 0.1 e 2', () => {
    expect(clampPlaybackSpeed(0.05)).toBe(0.1)
    expect(clampPlaybackSpeed(3)).toBe(2)
    expect(clampPlaybackSpeed(1)).toBe(1)
  })
})

describe('formatPlaybackSpeed', () => {
  it('formata com sufixo x', () => {
    expect(formatPlaybackSpeed(1.5)).toBe('1.5x')
  })
})

describe('clampStepPlaybackTimelineSeconds', () => {
  it('limita entre 0.01 e lifetime', () => {
    expect(clampStepPlaybackTimelineSeconds(0.001, 10)).toBe(0.01)
    expect(clampStepPlaybackTimelineSeconds(0.1, 10)).toBe(0.1)
    expect(clampStepPlaybackTimelineSeconds(1, 10)).toBe(1)
    expect(clampStepPlaybackTimelineSeconds(20, 10)).toBe(10)
  })
})

describe('clampStepPlaybackIntervalSeconds', () => {
  it('limita mínimo 0.01', () => {
    expect(clampStepPlaybackIntervalSeconds(0)).toBe(1)
    expect(clampStepPlaybackIntervalSeconds(0.5)).toBe(0.5)
  })
})

describe('snapTimeToTimelineStep', () => {
  it('alinha ao passo na timeline', () => {
    expect(snapTimeToTimelineStep(0.014, 0.01, 10)).toBeCloseTo(0.01)
    expect(snapTimeToTimelineStep(1.4, 1, 10)).toBe(1)
  })
})

describe('advanceTimelineTime reverse + reset', () => {
  it('com loop: ao chegar a 0 salta para reset e continua', () => {
    const result = advanceTimelineTime(0.02, -0.05, 10, {
      reverse: true,
      loop: true,
      resetAt: 3,
    })
    expect(result.time).toBe(3)
    expect(result.stop).toBe(false)
  })

  it('sem loop: ao chegar a 0 salta para reset e para', () => {
    const result = advanceTimelineTime(0.02, -0.05, 10, {
      reverse: true,
      loop: false,
      resetAt: 3,
    })
    expect(result.time).toBe(3)
    expect(result.stop).toBe(true)
  })

  it('ao cruzar reset vindo de cima fica no reset point', () => {
    const result = advanceTimelineTime(4, -1.5, 10, {
      reverse: true,
      loop: true,
      resetAt: 3,
    })
    expect(result.time).toBe(3)
  })
})

describe('advanceTimelineStep', () => {
  it('avança pelo passo na timeline', () => {
    const result = advanceTimelineStep(0, 1, 10, { loop: false, resetAt: null })
    expect(result.time).toBe(1)
    expect(result.stop).toBe(false)
  })

  it('com passo 0.01', () => {
    const result = advanceTimelineStep(0, 0.01, 10, { loop: false, resetAt: null })
    expect(result.time).toBeCloseTo(0.01)
  })

  it('com loop: ao fim volta a 0', () => {
    const result = advanceTimelineStep(9.5, 1, 10, { loop: true, resetAt: null })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(false)
  })

  it('sem loop: ao fim volta a 0 e para', () => {
    const result = advanceTimelineStep(9.5, 1, 10, { loop: false, resetAt: null })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(true)
  })

  it('com trecho sem loop: ao fim volta ao start', () => {
    const result = advanceTimelineStep(5.5, 1, 10, {
      loop: false,
      resetAt: null,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(2)
    expect(result.stop).toBe(true)
  })

  it('com reset: ao cruzar volta a 0', () => {
    const result = advanceTimelineStep(2.5, 1, 10, { loop: true, resetAt: 3 })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(false)
  })
})

describe('advanceTimelineTime forward + reset', () => {
  it('com loop: ao atingir reset volta a 0 e continua', () => {
    const result = advanceTimelineTime(2.9, 0.2, 10, {
      reverse: false,
      loop: true,
      resetAt: 3,
    })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(false)
  })

  it('com trecho: loop volta ao início do trecho', () => {
    const result = advanceTimelineTime(5.9, 0.2, 10, {
      reverse: false,
      loop: true,
      resetAt: null,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(2)
    expect(result.stop).toBe(false)
  })

  it('com trecho sem loop: ao fim volta ao start e para', () => {
    const result = advanceTimelineTime(5.9, 0.2, 10, {
      reverse: false,
      loop: false,
      resetAt: null,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(2)
    expect(result.stop).toBe(true)
  })

  it('sem loop e sem reset: ao fim volta a 0 e para', () => {
    const result = advanceTimelineTime(9.9, 0.2, 10, {
      reverse: false,
      loop: false,
      resetAt: null,
    })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(true)
  })

  it('com trecho e reset dentro do trecho: ao cruzar reset volta ao start', () => {
    const result = advanceTimelineTime(3.9, 0.2, 10, {
      reverse: false,
      loop: true,
      resetAt: 4,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(2)
    expect(result.stop).toBe(false)
  })

  it('com trecho e reset dentro do trecho sem loop: para no start', () => {
    const result = advanceTimelineTime(3.9, 0.2, 10, {
      reverse: false,
      loop: false,
      resetAt: 4,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(2)
    expect(result.stop).toBe(true)
  })

  it('reset fora do trecho é ignorado', () => {
    const result = advanceTimelineTime(3.9, 0.2, 10, {
      reverse: false,
      loop: false,
      resetAt: 1,
      playbackRange: { start: 2, end: 6 },
    })
    expect(result.time).toBe(3.9 + 0.2)
    expect(result.stop).toBe(false)
  })

  it('sem loop: ao atingir reset volta a 0 e para', () => {
    const result = advanceTimelineTime(2.9, 0.2, 10, {
      reverse: false,
      loop: false,
      resetAt: 3,
    })
    expect(result.time).toBe(0)
    expect(result.stop).toBe(true)
  })
})
