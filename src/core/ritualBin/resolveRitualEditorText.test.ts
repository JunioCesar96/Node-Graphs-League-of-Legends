import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveRitualEditorText } from './resolveRitualEditorText'

const brandDanceSnippet = `"Characters/Brand/Skins/Skin0/Particles/Brand_Base_Dance" = VfxSystemDefinitionData {
            VfxEmitterDefinitionData {
                0x65965391: embed = FlexValueVector3 {
                    constantValue: vec3 = { 1, 1, 1 }
                }
            }
        }`

describe('resolveRitualEditorText', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('roteia para modo nativo quando VITE_DEV_BIN_BACKEND=native', async () => {
    vi.stubEnv('VITE_DEV_BIN_BACKEND', 'native')
    vi.stubEnv('VITE_RITOBIN_INVOKE_BRIDGE', '')

    const result = await resolveRitualEditorText(brandDanceSnippet)

    expect(result.mode).toBe('native')
    expect(result.changed).toBe(true)
    expect(result.text).toContain('flexBirthScale0:')
  })

  it('roteia para modo jade quando VITE_DEV_BIN_BACKEND=jade', async () => {
    vi.stubEnv('VITE_DEV_BIN_BACKEND', 'jade')
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              provider: 'mock-bridge',
              features: { unhashText: false },
            }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({ loaded: true }) })
      }),
    )

    const result = await resolveRitualEditorText(brandDanceSnippet)

    expect(result.mode).toBe('jade')
    expect(result.changed).toBe(true)
    expect(result.via).toBe('fnv-fallback')
  })
})
