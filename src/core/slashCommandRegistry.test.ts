import { describe, expect, it } from 'vitest'

import {
  matchesSlashCommandQuery,
  registerSlashCommand,
  replaceSlashCommandRegistry,
  slashCommandByKey,
  slashCommandsList,
} from '@/core/slashCommandRegistry'
import { createBlockSlashCommandDocument } from '@/core/slashCommandTypes'
import { emptyWorkspaceBlocksFile, emptyWorkspaceGroupsFile, WORKSPACE_FORMAT_VERSION } from '@/core/workspacePersistence'

function sampleDocument(command: string) {
  return createBlockSlashCommandDocument({
    name: command,
    rootBlockName: 'Emitter',
    rootNodeId: 'n-vfx',
    payload: {
      logic: { version: WORKSPACE_FORMAT_VERSION, nodes: {} },
      layout: { version: WORKSPACE_FORMAT_VERSION, width: 1120, height: 760, nodes: {} },
      graph: { version: WORKSPACE_FORMAT_VERSION, connections: [] },
      blocks: emptyWorkspaceBlocksFile(),
      groups: emptyWorkspaceGroupsFile(),
    },
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
})
