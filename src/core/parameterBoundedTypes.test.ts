import { describe, expect, it } from 'vitest'

import {
  INTEGER_TYPE_BOUNDS,
  normalizeBoundedIntegerForCommit,
} from '@/core/parameterBoundedTypes'

describe('normalizeBoundedIntegerForCommit', () => {
  it('i8: clamp abaixo e acima', () => {
    expect(normalizeBoundedIntegerForCommit('i8', '-200')).toBe('-128')
    expect(normalizeBoundedIntegerForCommit('i8', '200')).toBe('127')
    expect(normalizeBoundedIntegerForCommit('i8', '42')).toBe('42')
  })

  it('u8: só dígitos e clamp', () => {
    expect(normalizeBoundedIntegerForCommit('u8', '300')).toBe('255')
    expect(normalizeBoundedIntegerForCommit('u8', '10')).toBe('10')
  })

  it('u32: valores grandes', () => {
    expect(normalizeBoundedIntegerForCommit('u32', '5000000000')).toBe(
      INTEGER_TYPE_BOUNDS.u32.max.toString(),
    )
  })

  it('i64: limites', () => {
    expect(normalizeBoundedIntegerForCommit('i64', '0')).toBe('0')
    expect(normalizeBoundedIntegerForCommit('i64', '99999999999999999999')).toBe(
      INTEGER_TYPE_BOUNDS.i64.max.toString(),
    )
  })

  it('u64: clamp superior', () => {
    const over = '999999999999999999999999999999999999999'
    expect(normalizeBoundedIntegerForCommit('u64', over)).toBe(INTEGER_TYPE_BOUNDS.u64.max.toString())
  })

  it('vazio permanece vazio', () => {
    expect(normalizeBoundedIntegerForCommit('i32', '')).toBe('')
    expect(normalizeBoundedIntegerForCommit('u16', '-')).toBe('')
  })
})
