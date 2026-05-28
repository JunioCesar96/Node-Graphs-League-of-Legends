import { describe, expect, it } from 'vitest'

import { formatLanguageText, parseLanguagePackJson, resolveLanguageText } from './languagePack'

describe('languagePack', () => {
  it('parses numeric string keys into a pack', () => {
    const pack = parseLanguagePackJson({
      '0': 'File',
      '1': 'Open',
      bad: 'skip',
      '2.5': 'skip',
      '3': 12,
    })

    expect(pack[0]).toBe('File')
    expect(pack[1]).toBe('Open')
    expect(pack[2]).toBeUndefined()
    expect(pack[3]).toBeUndefined()
  })

  it('formats template placeholders', () => {
    expect(formatLanguageText('Nós ({count})', { count: 3 })).toBe('Nós (3)')
  })

  it('resolves text with fallback and missing marker', () => {
    const pack = parseLanguagePackJson({ '0': 'Arquivo' })

    expect(resolveLanguageText(pack, 0)).toBe('Arquivo')
    expect(resolveLanguageText(pack, 9, 'fallback')).toBe('fallback')
    expect(resolveLanguageText(pack, 9)).toBe('[9]')
  })
})
