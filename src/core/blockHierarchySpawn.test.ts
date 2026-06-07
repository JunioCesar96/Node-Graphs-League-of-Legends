import { describe, expect, it } from 'vitest'

import type { RitualBlockInstanceContext } from './blockAutoBuildFromRitualCode'
import {
  createBlockSpawnLayoutState,
  recordBlockInstanceSpawnPosition,
  resolveBlockInstanceSpawnPosition,
  resolveBlockInstanceStackGroupKey,
} from './blockHierarchySpawn'
import { STRUCTURE_CARD_HEADER_HEIGHT } from './structureCardLayout'

function makeInstance(
  partial: Partial<RitualBlockInstanceContext> & Pick<RitualBlockInstanceContext, 'nodeId'>,
): RitualBlockInstanceContext {
  return {
    schemaId: 'schema',
    schema: {
      id: 'schema',
      title: partial.blockName ?? 'Block',
      parameters: [],
      embed: [],
      pointer: [],
      listEmbed: [],
      listPointer: [],
      list2Embed: [],
      list2Pointer: [],
      internalStructures: [],
    },
    blockName: partial.blockName ?? 'Block',
    displayName: partial.displayName ?? partial.blockName ?? 'Block',
    parentContext: partial.parentContext ?? { block: '', type: 'embed' },
    parentNodeId: partial.parentNodeId ?? null,
    linkFieldName: partial.linkFieldName ?? null,
    parentParameterName: partial.parentParameterName ?? null,
  }
}

describe('blockHierarchySpawn layout', () => {
  it('empilha irmãos list[pointer] abaixo do cabeçalho anterior', () => {
    const rootPosition = { x: 120, y: 120 }
    const layout = createBlockSpawnLayoutState()

    const parent = makeInstance({ nodeId: 'main', blockName: 'Main' })
    recordBlockInstanceSpawnPosition('main', rootPosition, parent, layout)

    const first = makeInstance({
      nodeId: 'entry-0',
      blockName: 'VfxSystemDefinitionData',
      parentNodeId: 'main',
      parentParameterName: 'entries',
      linkFieldName: 'entries__slot__0',
    })
    const firstPos = resolveBlockInstanceSpawnPosition(first, 1, rootPosition, layout)
    recordBlockInstanceSpawnPosition('entry-0', firstPos, first, layout)

    const second = makeInstance({
      nodeId: 'entry-1',
      blockName: 'VfxSystemDefinitionData',
      parentNodeId: 'main',
      parentParameterName: 'entries',
      linkFieldName: 'entries__slot__1',
    })
    const secondPos = resolveBlockInstanceSpawnPosition(second, 1, rootPosition, layout)

    expect(firstPos).toEqual({ x: 120 + 420, y: 120 })
    expect(secondPos).toEqual({
      x: firstPos.x,
      y: firstPos.y + STRUCTURE_CARD_HEADER_HEIGHT,
    })
    expect(resolveBlockInstanceStackGroupKey(first)).toBe('list:main::entries::entries')
  })

  it('empilha entradas map[hash,embed] do mesmo parâmetro', () => {
    const rootPosition = { x: 80, y: 80 }
    const layout = createBlockSpawnLayoutState()

    const parent = makeInstance({ nodeId: 'main', blockName: 'Main' })
    recordBlockInstanceSpawnPosition('main', rootPosition, parent, layout)

    const pathA = makeInstance({
      nodeId: 'path-a',
      blockName: 'VfxSystemDefinitionData',
      parentNodeId: 'main',
      parentParameterName: 'entries',
      linkFieldName: 'path/a',
    })
    const pathAPos = resolveBlockInstanceSpawnPosition(pathA, 1, rootPosition, layout)
    recordBlockInstanceSpawnPosition('path-a', pathAPos, pathA, layout)

    const pathB = makeInstance({
      nodeId: 'path-b',
      blockName: 'VfxSystemDefinitionData',
      parentNodeId: 'main',
      parentParameterName: 'entries',
      linkFieldName: 'path/b',
    })
    const pathBPos = resolveBlockInstanceSpawnPosition(pathB, 1, rootPosition, layout)

    expect(pathAPos).toEqual({ x: 80 + 420, y: 80 })
    expect(pathBPos).toEqual({
      x: pathAPos.x,
      y: pathAPos.y + STRUCTURE_CARD_HEADER_HEIGHT,
    })
    expect(resolveBlockInstanceStackGroupKey(pathA)).toBe('map:main::entries')
  })

  it('coloca filhos não indexados à direita do pai', () => {
    const rootPosition = { x: 0, y: 0 }
    const layout = createBlockSpawnLayoutState()

    const parent = makeInstance({ nodeId: 'emitter', blockName: 'VfxEmitterDefinitionData' })
    recordBlockInstanceSpawnPosition('emitter', { x: 500, y: 200 }, parent, layout)

    const child = makeInstance({
      nodeId: 'value-float',
      blockName: 'ValueFloat',
      parentNodeId: 'emitter',
      parentParameterName: 'particleLifetime',
      linkFieldName: 'particleLifetime',
    })

    const childPos = resolveBlockInstanceSpawnPosition(child, 2, rootPosition, layout)

    expect(childPos).toEqual({ x: 500 + 420, y: 200 })
  })
})
