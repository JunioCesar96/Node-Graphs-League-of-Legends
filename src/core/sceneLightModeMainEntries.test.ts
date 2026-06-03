import { describe, expect, it } from 'vitest'

import { emptyCanvasScene } from '@/core/canvasScene'
import {
  elementViewKeyForParameter,
  getElementViewState,
} from '@/core/elementViewState'
import {
  applyLightModeMainEntriesVfxIndexToNode,
  applyLightModeMainEntriesVfxIndexToScene,
  firstPopulatedMapHashEmbedIndexByTypeName,
} from '@/core/sceneLightModeMainEntries'
import { applyLightModeToScene } from '@/core/sceneLightMode'
import type { NodeInstance } from '@/core/nodeSchema'

const ENTRIES_VALUE =
  'path/a\tschema-a\tSkinCharacterDataProperties\npath/b\tschema-b\tVfxSystemDefinitionData\npath/c\tschema-c\tVfxSystemDefinitionData'

function mainNodeInstance(): NodeInstance {
  return {
    id: 'main-01',
    schema: {
      id: 'main',
      title: 'Main',
      parameters: [
        {
          id: 'Main_parameter_entries',
          name: 'entries',
          type: 'mapHashEmbed',
          defaultValue: ENTRIES_VALUE,
        },
      ],
      internalStructures: [],
    },
    values: [{ parameterId: 'Main_parameter_entries', value: ENTRIES_VALUE }],
  }
}

describe('sceneLightModeMainEntries', () => {
  it('firstPopulatedMapHashEmbedIndexByTypeName finds first matching type', () => {
    expect(
      firstPopulatedMapHashEmbedIndexByTypeName(ENTRIES_VALUE, 'VfxSystemDefinitionData'),
    ).toBe(1)
    expect(
      firstPopulatedMapHashEmbedIndexByTypeName(ENTRIES_VALUE, 'SkinCharacterDataProperties'),
    ).toBe(0)
  })

  it('applyLightModeMainEntriesVfxIndexToNode sets compact index on Main entries', () => {
    const key = elementViewKeyForParameter('Main_parameter_entries')
    const next = applyLightModeMainEntriesVfxIndexToNode(mainNodeInstance())
    expect(getElementViewState(next, key)).toEqual({ mode: 'compact', selectedIndex: 1 })
  })

  it('applyLightModeMainEntriesVfxIndexToNode ignores non-main nodes', () => {
    const other: NodeInstance = {
      id: 'x',
      schema: { id: 'other', title: 'Other', parameters: [], internalStructures: [] },
      values: [],
    }
    expect(applyLightModeMainEntriesVfxIndexToNode(other)).toBe(other)
  })

  it('applyLightModeToScene with init applies Main Vfx index', () => {
    const scene = {
      ...emptyCanvasScene,
      nodes: [{ id: 'c1', x: 0, y: 0, node: mainNodeInstance() }],
    }
    const key = elementViewKeyForParameter('Main_parameter_entries')
    const next = applyLightModeToScene(scene, { initMainEntriesVfxIndex: true })
    expect(getElementViewState(next.nodes[0]!.node, key).selectedIndex).toBe(1)
  })

  it('applyLightModeToScene without init keeps default entries index', () => {
    const scene = {
      ...emptyCanvasScene,
      nodes: [{ id: 'c1', x: 0, y: 0, node: mainNodeInstance() }],
    }
    const key = elementViewKeyForParameter('Main_parameter_entries')
    const next = applyLightModeToScene(scene)
    expect(getElementViewState(next.nodes[0]!.node, key).selectedIndex).toBe(0)
  })

  it('applyLightModeMainEntriesVfxIndexToScene updates canvas node', () => {
    const scene = {
      ...emptyCanvasScene,
      nodes: [{ id: 'c1', x: 0, y: 0, node: mainNodeInstance() }],
    }
    const next = applyLightModeMainEntriesVfxIndexToScene(scene)
    const key = elementViewKeyForParameter('Main_parameter_entries')
    expect(getElementViewState(next.nodes[0]!.node, key).selectedIndex).toBe(1)
  })
})
