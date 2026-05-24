import { afterEach, describe, expect, it, vi } from 'vitest'

import { unhashRitualText } from './unhashRitualTextViaJade'

const propSnippet = `#PROP_text
entries: map[hash,embed] = {
    0x13caaf55 = 0x45cd899f {
        0x3d25b8ce: string = "Staff"
    }
}
`

describe('unhashRitualText', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('usa resposta do jade-http-bridge quando disponível', async () => {
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              provider: 'jade-http-bridge',
              features: { unhashText: true, hashPreload: true },
            }),
          })
        }
        if (url.includes('/hash/preload')) {
          return Promise.resolve({ ok: true, json: async () => ({ loaded: true }) })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            text: '#PROP_text\nemitterName: string = "Staff"\n',
            changed: true,
          }),
        })
      }),
    )

    const result = await unhashRitualText(propSnippet)
    expect(result.via).toBe('jade-bridge')
    expect(result.changed).toBe(true)
    expect(result.text).toContain('emitterName:')
  })

  it('cai para fallback FNV quando o bridge falha', async () => {
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')))

    const result = await unhashRitualText(propSnippet)
    expect(result.via).toBe('fnv-fallback')
    expect(result.changed).toBe(true)
    expect(result.text).toContain('emitterName:')
    expect(result.warning).toBeTruthy()
  })
})
