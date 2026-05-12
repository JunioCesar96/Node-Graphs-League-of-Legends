import { computeJadeBridgeBase } from '@/core/jadeBinBridge'
import { describe, expect, it } from 'vitest'

describe('computeJadeBridgeBase', () => {
  it('prefere URL explícito sobre proxy', () => {
    expect(
      computeJadeBridgeBase({
        dev: true,
        explicitBridgeUrl: 'http://127.0.0.1:9999/',
        useProxyRaw: 'true',
      }),
    ).toBe('http://127.0.0.1:9999')
  })

  it('em dev com proxy ligado usa /api/jade', () => {
    expect(
      computeJadeBridgeBase({
        dev: true,
        explicitBridgeUrl: undefined,
        useProxyRaw: 'true',
      }),
    ).toBe('/api/jade')
  })

  it('prod com só proxy verdadeiro não activa (/api/jade só em dev)', () => {
    expect(
      computeJadeBridgeBase({
        dev: false,
        explicitBridgeUrl: undefined,
        useProxyRaw: 'true',
      }),
    ).toBeNull()
  })

  it('trim de URL explícita', () => {
    expect(
      computeJadeBridgeBase({
        dev: false,
        explicitBridgeUrl: '  http://a.test/x/  ',
        useProxyRaw: undefined,
      }),
    ).toBe('http://a.test/x')
  })
})
