import { describe, expect, it } from 'vitest'

import {
  matchesSlashCommandQuery,
  registerSlashCommand,
  replaceSlashCommandRegistry,
  slashCommandByKey,
  slashCommandsList,
} from '@/core/slashCommandRegistry'
import {
  createBlockSlashCommandDocument,
  createMinimalCatalogSlashCommandPayload,
  parseSlashCommandDocument,
  slashCommandEffectiveAction,
} from '@/core/slashCommandTypes'

function sampleDocument(command: string) {
  return createBlockSlashCommandDocument({
    name: command,
    rootBlockName: 'Emitter',
    rootNodeId: 'n-vfx',
    payload: createMinimalCatalogSlashCommandPayload(),
  })
}

describe('slashCommandRegistry', () => {
  it('regista e lista comandos por feature', () => {
    replaceSlashCommandRegistry([])
    registerSlashCommand(sampleDocument('Alpha'))
    registerSlashCommand(sampleDocument('Beta'))

    expect(slashCommandsList('blocks').map((entry) => entry.command)).toEqual(['Alpha', 'Beta'])
    expect(slashCommandByKey('blocks', 'alpha')?.command).toBe('Alpha')
  })

  it('filtra query ignorando barra inicial', () => {
    const document = sampleDocument('EmitterPreset')
    expect(matchesSlashCommandQuery(document, 'emit')).toBe(true)
    expect(matchesSlashCommandQuery(document, '/emit')).toBe(true)
    expect(matchesSlashCommandQuery(document, 'zzz')).toBe(false)
  })

  it('parseia locale opcional', () => {
    const withLocale = {
      ...sampleDocument('Localized'),
      locale: 'pt-BR',
    }
    const parsed = parseSlashCommandDocument(withLocale)
    expect(parsed?.locale).toBe('pt-br')

    const invalidLocale = { ...withLocale, locale: '' }
    expect(parseSlashCommandDocument(invalidLocale)).toBeNull()
  })

  it('parseia action createBlock e createParameter', () => {
    const spawnDoc = sampleDocument('SpawnOnly')
    expect(slashCommandEffectiveAction(spawnDoc)).toBe('spawn')

    const withAction = createBlockSlashCommandDocument({
      name: 'CreateBlock',
      rootBlockName: '_catalog',
      rootNodeId: '_catalog',
      payload: createMinimalCatalogSlashCommandPayload(),
      action: 'createBlock',
    })
    const parsed = parseSlashCommandDocument(withAction)
    expect(parsed).not.toBeNull()
    expect(parsed?.action).toBe('createBlock')
    expect(slashCommandEffectiveAction(parsed!)).toBe('createBlock')

    const invalid = parseSlashCommandDocument({ ...withAction, action: 'invalid' })
    expect(invalid).toBeNull()
  })

  it('parseia actions editBlock, deleteBlock, editParameter e deleteParameter', () => {
    for (const action of ['editBlock', 'deleteBlock', 'editParameter', 'deleteParameter'] as const) {
      const doc = createBlockSlashCommandDocument({
        name: action,
        rootBlockName: '_catalog',
        rootNodeId: '_catalog',
        payload: createMinimalCatalogSlashCommandPayload(),
        action,
      })
      const parsed = parseSlashCommandDocument(doc)
      expect(parsed?.action).toBe(action)
      expect(slashCommandEffectiveAction(parsed!)).toBe(action)
    }
  })
})
