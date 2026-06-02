import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchBlockParametersFromDisk } from './blockParameterDiskLoader'

describe('fetchBlockParametersFromDisk', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista parâmetros válidos da API', async () => {
    const doc = {
      id: 'blendMode_blendMode',
      block: 'VfxEmitterDefinitionData',
      parameterName: 'blendMode',
      name: 'blendMode',
      source: { kind: 'parameter', parameterId: 'pid_blendMode' },
      type: 'u8',
      value: '1',
      slots: { in: ['u8'], out: ['u8'] },
    }

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, parameters: [doc] }),
    } as Response)

    const result = await fetchBlockParametersFromDisk('VfxEmitterDefinitionData')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.parameters).toHaveLength(1)
      expect(result.parameters[0]?.parameterName).toBe('blendMode')
    }
  })

  it('rejeita nome de bloco inválido', async () => {
    const result = await fetchBlockParametersFromDisk('../evil')
    expect(result.ok).toBe(false)
  })
})
