import { describe, expect, it } from 'vitest'

import { buildBlockParameterFromManualInput } from './blockParameterManualBuild'

const BASE = {
  blockName: 'Main',
  nodeId: 'main',
  parameterName: 'version',
}

describe('buildBlockParameterFromManualInput', () => {
  it('gera parâmetro simples', () => {
    const result = buildBlockParameterFromManualInput({
      ...BASE,
      type: 'u32',
      value: '3',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      id: 'version_version',
      type: 'u32',
      value: '3',
      slots: { in: ['u32'], out: ['u32'] },
    })
  })

  it('gera parâmetro pointer', () => {
    const result = buildBlockParameterFromManualInput({
      ...BASE,
      parameterName: 'dynamics',
      type: 'pointer',
      target: 'VfxAnimatedColorVariableData',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      type: 'pointer',
      pointer: 'VfxAnimatedColorVariableData',
      slots: { out: ['VfxAnimatedColorVariableData'] },
    })
  })

  it('gera parâmetro map', () => {
    const result = buildBlockParameterFromManualInput({
      ...BASE,
      parameterName: 'entries',
      type: 'mapHashEmbed',
      mapRawValue: 'key1\tTargetClass\tTargetClass',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document.type).toBe('mapHashEmbed')
    if ('entries' in result.document) {
      expect(result.document.entries.length).toBeGreaterThan(0)
    }
  })

  it('gera parâmetro list', () => {
    const result = buildBlockParameterFromManualInput({
      ...BASE,
      parameterName: 'linked',
      type: 'listString',
      listItemsRaw: 'path/a\npath/b',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      type: 'listString',
      items: ['path/a', 'path/b'],
    })
  })

  it('gera parâmetro option', () => {
    const result = buildBlockParameterFromManualInput({
      ...BASE,
      parameterName: 'scale',
      type: 'optionF32',
      optionItem: '2.5',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.document).toMatchObject({
      type: 'optionF32',
      item: '2.5',
    })
  })
})
