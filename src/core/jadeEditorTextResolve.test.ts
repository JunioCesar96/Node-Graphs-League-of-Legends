import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  resolveBinFileForEditor,
  resolveRitualTextForEditor,
} from './jadeEditorTextResolve'

const propSnippet = `#PROP_text
entries: map[hash,embed] = {
    0x13caaf55 = 0x45cd899f {
        0x3d25b8ce: string = "Staff"
    }
}
`

describe('jadeEditorTextResolve', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolveRitualTextForEditor usa /unhash-text quando o bridge responde', async () => {
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/hash/preload')) {
        return Promise.resolve({ ok: true, json: async () => ({ loaded: true }) })
      }
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
      if (url.includes('/unhash-text')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            text: '#PROP_text\nemitterName: string = "Staff"\n',
            changed: true,
          }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => null })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveRitualTextForEditor(propSnippet)
    expect(result.via).toBe('jade-bridge')
    expect(result.changed).toBe(true)
    expect(result.text).toContain('emitterName:')
  })

  it('resolveRitualTextForEditor unchanged quando o texto já está legível', async () => {
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    const legivel = '#PROP_text\nemitterName: string = "Staff"\n'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, provider: 'jade-http-bridge', features: { unhashText: true } }),
      }),
    )

    const result = await resolveRitualTextForEditor(legivel)
    expect(result.via).toBe('unchanged')
    expect(result.changed).toBe(false)
  })

  it('resolveRitualTextForEditor cai para FNV quando o bridge falha', async () => {
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
        if (url.includes('/unhash-text')) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ ok: false, message: 'not found' }),
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({ loaded: true }) })
      }),
    )

    const result = await resolveRitualTextForEditor(propSnippet)
    expect(result.via).toBe('fnv-fallback')
    expect(result.changed).toBe(true)
    expect(result.text).toContain('emitterName:')
  })

  it('resolveBinFileForEditor chama POST /convert', async () => {
    vi.stubEnv('VITE_JADE_BIN_BRIDGE', 'http://127.0.0.1:8788')
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/convert') && !url.includes('convert-tree')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true, text: '#PROP_text\nresolved: true\n' }),
        })
      }
      if (url.includes('/hash/preload')) {
        return Promise.resolve({ ok: true, json: async () => ({ loaded: true }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = {
      name: 'test.bin',
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as unknown as File
    const result = await resolveBinFileForEditor(file)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).toContain('resolved')
    }
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/convert'))).toBe(true)
  })
})
