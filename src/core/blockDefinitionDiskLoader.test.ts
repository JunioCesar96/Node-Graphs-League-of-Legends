import { describe, expect, it, vi, afterEach } from 'vitest'

import { fetchBlockDefinitionsFromDisk } from './blockDefinitionDiskLoader'

describe('fetchBlockDefinitionsFromDisk', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devolve definições validadas e ordenadas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          definitions: [
            {
              id: 'B_b',
              block: 'parent',
              blockName: 'B',
              type: 'pointer',
              name: 'B',
              source: { kind: 'block', nodeId: 'b-node' },
              color: '#112233',
              headerSlots: ['in[parent]'],
              parameters: [],
            },
            {
              id: 'A_a',
              block: 'parent',
              blockName: 'A',
              type: 'pointer',
              name: 'A',
              source: { kind: 'block', nodeId: 'a-node' },
              color: '#445566',
              headerSlots: ['in[parent]'],
              parameters: ['x'],
            },
          ],
        }),
      }),
    )

    const result = await fetchBlockDefinitionsFromDisk()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.definitions.map((doc) => doc.id)).toEqual(['A_a', 'B_b'])
    }
  })

  it('propaga erro da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: 'falha' }),
      }),
    )

    const result = await fetchBlockDefinitionsFromDisk()
    expect(result).toEqual({ ok: false, error: 'falha' })
  })
})
