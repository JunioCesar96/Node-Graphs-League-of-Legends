import { afterEach, describe, expect, it, vi } from 'vitest'

import { prepareRitualEditorText } from './prepareRitualEditorText'

const brandDanceSnippet = `"Characters/Brand/Skins/Skin0/Particles/Brand_Base_Dance" = VfxSystemDefinitionData {
            VfxEmitterDefinitionData {
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 680, 680, 50 }
                }
                0x65965391: embed = FlexValueVector3 {
                    constantValue: vec3 = { 1, 1, 1 }
                }
                alphaErosionDefinition: pointer = VfxAlphaErosionDefinitionData {
                    0x1e3f36a9: f32 = 0.18
                    erosionFeatherIn: f32 = 2.5
                }
            }
        }`

describe('prepareRitualEditorText', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('usa léxico FNV quando o motor nativo está offline', async () => {
    vi.stubEnv('VITE_RITOBIN_INVOKE_BRIDGE', '')

    const result = await prepareRitualEditorText(brandDanceSnippet)

    expect(result.changed).toBe(true)
    expect(result.via).toBe('fnv-lexicon')
    expect(result.text).toContain('flexBirthScale0: embed = FlexValueVector3')
    expect(result.text).toContain('erosionSliceWidth: f32 = 0.18')
  })

  it('não chama unhash nativo para ritual texto sem cabeçalho PROP/PTCH', async () => {
    vi.stubEnv('VITE_RITOBIN_INVOKE_BRIDGE', 'http://127.0.0.1:8791')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await prepareRitualEditorText(brandDanceSnippet)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.changed).toBe(true)
    expect(result.via).toBe('fnv-lexicon')
  })

  it('combina unhash nativo com léxico FNV para hashes restantes', async () => {
    vi.stubEnv('VITE_RITOBIN_INVOKE_BRIDGE', 'http://127.0.0.1:8791')
    const propWrapped = `#PROP_text\n${brandDanceSnippet}`
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              provider: 'ritual-bin-native',
              features: { unhashText: true },
            }),
          })
        }
        if (url.includes('/unhash-text')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              text: propWrapped,
              changed: false,
            }),
          })
        }
        return Promise.resolve({ ok: false, json: async () => null })
      }),
    )

    const result = await prepareRitualEditorText(propWrapped)

    expect(result.changed).toBe(true)
    expect(result.via).toBe('fnv-lexicon')
    expect(result.text).not.toMatch(/0x65965391:/)
  })

  it('marca native-unhash quando o bridge altera o texto', async () => {
    vi.stubEnv('VITE_RITOBIN_INVOKE_BRIDGE', 'http://127.0.0.1:8791')
    const propWrapped = `#PROP_text\n${brandDanceSnippet}`
    const resolved = propWrapped.replace(
      '0x65965391:',
      'flexBirthScale0:',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/capabilities')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              provider: 'ritual-bin-native',
              features: { unhashText: true },
            }),
          })
        }
        if (url.includes('/unhash-text')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              text: resolved,
              changed: true,
            }),
          })
        }
        return Promise.resolve({ ok: false, json: async () => null })
      }),
    )

    const result = await prepareRitualEditorText(propWrapped)

    expect(result.changed).toBe(true)
    expect(result.via).toBe('native-unhash')
    expect(result.text).toContain('erosionSliceWidth: f32 = 0.18')
  })
})
