import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { applyBlockSlashCommandToScene } from '@/core/blockSlashCommand'
import { resolveBlockHeaderSlotsForStructure } from '@/core/blockCardHeaderSlots'
import { makeVfxEmitterScene } from '@/core/blockTestFixtures'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'
import { isWorkspaceBundleValid, normalizeWorkspaceBundle } from '@/core/workspacePersistence'
import { parseSlashCommandDocument } from '@/core/slashCommandTypes'
import { parseSlashCommandsFromRawList } from '@/core/slashCommandRegistry'

describe('main.json slash command', () => {
  it('parseia o ficheiro gravado em slashCommands/blocks/', () => {
    const filePath = path.resolve(
      import.meta.dirname,
      '../blockStructures/slashCommands/blocks/main.json',
    )
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown
    const payload =
      typeof raw === 'object' && raw !== null && 'payload' in raw
        ? (raw as { payload: unknown }).payload
        : null

    const bundle = payload as {
      logic?: { nodes?: Record<string, unknown> }
      layout?: { nodes?: Record<string, unknown> }
      graph?: { connections?: unknown[] }
      blocks?: { blocks?: unknown[] }
    }
    const logicIds = Object.keys(bundle.logic?.nodes ?? {})
    const layoutIds = Object.keys(bundle.layout?.nodes ?? {})
    const onlyInLogic = logicIds.filter((id) => !layoutIds.includes(id))
    const onlyInLayout = layoutIds.filter((id) => !logicIds.includes(id))
    expect({ logicCount: logicIds.length, layoutCount: layoutIds.length, onlyInLogic, onlyInLayout }).toEqual({
      logicCount: layoutIds.length,
      layoutCount: logicIds.length,
      onlyInLogic: [],
      onlyInLayout: [],
    })

    expect(isWorkspaceBundleValid(payload)).toBe(true)
    expect(normalizeWorkspaceBundle(payload)).not.toBeNull()

    const parsed = parseSlashCommandDocument(raw)
    expect(parsed?.command).toBe('Main')

    const list = parseSlashCommandsFromRawList([raw])
    expect(list).toHaveLength(1)

    const parsedDoc = parseSlashCommandDocument(raw)
    expect(parsedDoc).not.toBeNull()
    if (!parsedDoc) {
      return
    }

    const applied = applyBlockSlashCommandToScene(makeVfxEmitterScene(), parsedDoc, { x: 100, y: 200 })
    expect(applied.ok).toBe(true)
    if (!applied.ok) {
      return
    }

    const root = applied.scene.nodes.find((node) => node.id === applied.rootNodeId)
    expect(root?.blockStructure?.blockName).toBe('Main')
    expect(root?.blockViewActive).toBe(true)

    const blockNodes = applied.scene.nodes.filter((node) => node.blockViewActive && node.blockStructure)
    expect(blockNodes.length).toBeGreaterThanOrEqual(3)

    const entriesParam = root?.blockStructure?.parameters.find(
      (param) => param.idParameter === 'entries_entries_mapHashEmbed',
    )
    expect(entriesParam?.typeParameter).toBe('mapHashEmbed')
    expect(entriesParam?.slotRules?.outputs).toContain('VfxSystemDefinitionData')

    const vfxSystem = blockNodes.find((node) => node.blockStructure?.blockType === 'VfxSystemDefinitionData')
    const vfxEmitter = blockNodes.find((node) => node.blockStructure?.blockType === 'VfxEmitterDefinitionData')
    expect(resolveBlockHeaderSlotsForStructure(vfxSystem!.blockStructure!).some((slot) => slot.includes('entries'))).toBe(
      true,
    )
    expect(
      resolveBlockHeaderSlotsForStructure(vfxEmitter!.blockStructure!).some((slot) =>
        slot.includes('complexEmitterDefinitionData'),
      ),
    ).toBe(true)

    const complexParam = vfxSystem?.blockStructure?.parameters.find(
      (param) => param.idParameter === 'complexEmitterDefinitionData_complexEmitterDefinitionData_pointe',
    )
    expect(complexParam?.slotRules?.outputs).toContain('VfxEmitterDefinitionData')

    const entriesValue =
      root && entriesParam
        ? readBlockParameterDisplayValue(applied.scene, root, root.blockStructure!, entriesParam.idParameter)
        : ''
    const embedEntries = parseMapHashEmbedString(entriesValue).filter((entry) => entry.schemaId.trim())
    expect(embedEntries.length).toBeGreaterThan(0)
    const embedSlotId = mapHashEmbedSlotId(entriesParam!.idParameter, embedEntries[0]!.key)
    expect(
      applied.scene.connections.some(
        (connection) =>
          connection.fromBlockSlotId === embedSlotId ||
          connection.fromInternalStructureId === `__block__:${embedSlotId}`,
      ),
    ).toBe(true)

    const blockConnections = applied.scene.connections.filter(
      (connection) => connection.fromBlockSlotId || connection.toBlockSlotId,
    )
    expect(blockConnections.length).toBe(2)
  })
})
