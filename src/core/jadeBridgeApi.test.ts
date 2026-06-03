import { describe, expect, it } from 'vitest'

import { computeJadeBridgeBase } from '@/core/jadeBinBridge'
import { base64ToUint8Array } from '@/core/jadeBridgeApi'

describe('jadeBridgeApi', () => {
  it('base64ToUint8Array round-trip', () => {
    const original = new Uint8Array([0, 1, 2, 255])
    const encoded = btoa(String.fromCharCode(...original))
    const decoded = base64ToUint8Array(encoded)
    expect(decoded).toEqual(original)
  })
})

describe('computeJadeBridgeBase', () => {
  it('proxy em dev quando VITE_JADE_USE_PROXY=true', () => {
    expect(
      computeJadeBridgeBase({
        dev: true,
        explicitBridgeUrl: undefined,
        useProxyRaw: 'true',
      }),
    ).toBe('/api/jade')
  })
})
