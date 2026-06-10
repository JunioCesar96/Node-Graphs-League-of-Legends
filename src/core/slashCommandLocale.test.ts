import { describe, expect, it } from 'vitest'

import {
  filterSlashCommandsByLocale,
  matchesSlashCommandLocale,
  normalizeSlashCommandLocale,
} from '@/core/slashCommandLocale'
import {
  createBlockSlashCommandDocument,
  createMinimalCatalogSlashCommandPayload,
} from '@/core/slashCommandTypes'

function sampleCommand(command: string, locale?: string) {
  return createBlockSlashCommandDocument({
    name: command,
    rootBlockName: 'Main',
    rootNodeId: 'main',
    payload: createMinimalCatalogSlashCommandPayload(),
    ...(locale ? { locale } : {}),
  })
}

describe('slashCommandLocale', () => {
  it('normaliza locale para minúsculas', () => {
    expect(normalizeSlashCommandLocale('pt-BR')).toBe('pt-br')
  })

  it('comandos sem locale aparecem em qualquer idioma', () => {
    const universal = sampleCommand('Main')
    expect(matchesSlashCommandLocale(universal, 'en')).toBe(true)
    expect(matchesSlashCommandLocale(universal, 'pt-br')).toBe(true)
  })

  it('comandos com locale só aparecem no idioma correspondente', () => {
    const pt = sampleCommand('criarNovoBloco', 'pt-br')
    const en = sampleCommand('createNewBlock', 'en')

    expect(matchesSlashCommandLocale(pt, 'pt-br')).toBe(true)
    expect(matchesSlashCommandLocale(pt, 'en')).toBe(false)
    expect(matchesSlashCommandLocale(en, 'en')).toBe(true)
    expect(matchesSlashCommandLocale(en, 'pt-br')).toBe(false)
  })

  it('filtra lista pelo locale activo', () => {
    const filtered = filterSlashCommandsByLocale(
      [
        sampleCommand('Main'),
        sampleCommand('criarNovoBloco', 'pt-br'),
        sampleCommand('createNewBlock', 'en'),
      ],
      'pt-br',
    )

    expect(filtered.map((entry) => entry.command)).toEqual(['Main', 'criarNovoBloco'])
  })
})
