import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyDefaultCompactElementView,
  clampSelectedIndex,
  elementViewKeyForEmbed,
  elementViewKeyForOutputSlot,
  elementViewKeyForParameter,
  getElementViewState,
  areAllCardElementsRetracted,
  collectCardElementViewKeys,
  isEntriesParameter,
  isSlotInRetractedElementView,
  isSlotInWirelessElementView,
  patchAllCardElementsRetracted,
  patchElementRetracted,
  patchElementViewMode,
  resolveElementViewModeChange,
  slotIdsForElement,
} from '@/core/elementViewState'
import { embedSlotId } from '@/core/embedSlots'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import type { NodeInstance } from '@/core/nodeSchema'

function minimalNode(overrides: Partial<NodeInstance> = {}): NodeInstance {
  return {
    id: 'n1',
    schema: {
      id: 'schema',
      title: 'Test',
      parameters: [
        {
          id: 'param-map',
          name: 'mMap',
          type: 'mapU64Pointer',
          defaultValue: '1\tchild\tType\n2\tchild2\tType',
        },
      ],
      internalStructures: [],
    },
    values: [
      {
        parameterId: 'param-map',
        value: '574043308619688281\tblend-schema\tTimeBlendData',
      },
    ],
    ...overrides,
  }
}

describe('elementViewState', () => {
  it('clampSelectedIndex bounds index', () => {
    expect(clampSelectedIndex(5, 10)).toBe(4)
    expect(clampSelectedIndex(5, -1)).toBe(0)
    expect(clampSelectedIndex(0, 0)).toBe(0)
  })

  it('getElementViewState defaults to list', () => {
    const node = minimalNode()
    expect(getElementViewState(node, elementViewKeyForParameter('param-map'))).toEqual({
      mode: 'list',
    })
  })

  it('patchElementViewMode stores compact and index', () => {
    const node = minimalNode()
    const key = elementViewKeyForParameter('param-map')
    const next = patchElementViewMode(node, key, 'compact', 2)
    expect(getElementViewState(next, key)).toEqual({ mode: 'compact', selectedIndex: 2 })
  })

  it('patchAllCardElementsRetracted affects all parameters and blocks', () => {
    const node = minimalNode({
      schema: {
        id: 'schema',
        title: 'Test',
        parameters: [
          { id: 'p1', name: 'a', type: 'string', defaultValue: '' },
          { id: 'param-map', name: 'mMap', type: 'mapU64Pointer', defaultValue: '' },
        ],
        embed: [{ id: 'e1', title: 'Embed', internalStructures: [] }],
        internalStructures: [],
      },
    })
    const keys = collectCardElementViewKeys(node)
    expect(keys).toContain('param:p1')
    expect(keys).toContain('param:param-map')
    expect(keys).toContain('embed:e1')

    const retracted = patchAllCardElementsRetracted(node, true)
    expect(areAllCardElementsRetracted(retracted)).toBe(true)

    const expanded = patchAllCardElementsRetracted(retracted, false)
    expect(areAllCardElementsRetracted(expanded)).toBe(false)
  })

  it('patchElementRetracted toggles retracted and preserves mode', () => {
    const node = minimalNode()
    const key = elementViewKeyForParameter('param-map')
    const compact = patchElementViewMode(node, key, 'compact', 1)
    const retracted = patchElementRetracted(compact, key, true)
    expect(getElementViewState(retracted, key)).toEqual({
      mode: 'compact',
      selectedIndex: 1,
      retracted: true,
    })
    const expanded = patchElementRetracted(retracted, key, false)
    expect(getElementViewState(expanded, key)).toEqual({ mode: 'compact', selectedIndex: 1 })
  })

  it('applyDefaultCompactElementView sets compact on map parameters', () => {
    const node = applyDefaultCompactElementView(minimalNode())
    expect(getElementViewState(node, elementViewKeyForParameter('param-map'))).toEqual({
      mode: 'compact',
      selectedIndex: 0,
    })
  })

  it('slotIdsForElement returns map slot ids', () => {
    const node = minimalNode()
    const ids = slotIdsForElement(node, elementViewKeyForParameter('param-map'))
    expect(ids.length).toBe(1)
    expect(ids[0]).toContain('param-map')
    expect(ids[0]).toContain('574043308619688281')
  })

  it('slotIdsForElement em mapHashEmbed compacto devolve só o slot do índice activo', () => {
    const key = elementViewKeyForParameter('param-embed')
    const node = minimalNode({
      schema: {
        id: 'schema',
        title: 'Test',
        parameters: [
          {
            id: 'param-embed',
            name: 'entries',
            type: 'mapHashEmbed',
            defaultValue: '',
          },
        ],
        internalStructures: [],
      },
      values: [
        {
          parameterId: 'param-embed',
          value: '0xaaa\tschema-a\tTypeA\n0xbbb\tschema-b\tTypeB',
        },
      ],
      elementView: { [key]: { mode: 'compact', selectedIndex: 1 } },
    })
    const ids = slotIdsForElement(node, key)
    expect(ids.length).toBe(1)
    expect(ids[0]).toBe(mapHashEmbedSlotId('param-embed', parseMapHashEmbedString('0xbbb\tschema-b\tTypeB')[0]!.key))
    expect(ids[0]).not.toBe(mapHashEmbedSlotId('param-embed', parseMapHashEmbedString('0xaaa\tschema-a\tTypeA')[0]!.key))
  })

  it('elementViewKeyForOutputSlot resolves map parameter slot', () => {
    const node = minimalNode()
    const slotId = slotIdsForElement(node, elementViewKeyForParameter('param-map'))[0]!
    expect(elementViewKeyForOutputSlot(node, slotId)).toBe(
      elementViewKeyForParameter('param-map'),
    )
  })

  it('isSlotInRetractedElementView is true only when element is retracted', () => {
    const node = minimalNode()
    const key = elementViewKeyForParameter('param-map')
    const slotId = slotIdsForElement(node, key)[0]!
    expect(isSlotInRetractedElementView(node, slotId)).toBe(false)

    const retracted = patchElementRetracted(node, key, true)
    expect(isSlotInRetractedElementView(retracted, slotId)).toBe(true)
  })

  it('isSlotInWirelessElementView is true for compact or retracted', () => {
    const node = minimalNode()
    const key = elementViewKeyForParameter('param-map')
    const slotId = slotIdsForElement(node, key)[0]!
    expect(isSlotInWirelessElementView(node, slotId)).toBe(false)

    const compact = patchElementViewMode(node, key, 'compact', 0)
    expect(isSlotInWirelessElementView(compact, slotId)).toBe(true)

    const listRetracted = patchElementRetracted(node, key, true)
    expect(isSlotInWirelessElementView(listRetracted, slotId)).toBe(true)
  })

  it('isEntriesParameter matches entries map parameters only', () => {
    expect(
      isEntriesParameter({ name: 'entries', type: 'mapHashEmbed' }),
    ).toBe(true)
    expect(
      isEntriesParameter({ name: 'mMap', type: 'mapU64Pointer' }),
    ).toBe(false)
    expect(
      isEntriesParameter({ name: 'entries', type: 'string' }),
    ).toBe(false)
  })

  it('getElementViewState defaults entries to compact without stored state', () => {
    const key = elementViewKeyForParameter('param-embed')
    const node = minimalNode({
      schema: {
        id: 'schema',
        title: 'Test',
        parameters: [
          {
            id: 'param-embed',
            name: 'entries',
            type: 'mapHashEmbed',
            defaultValue: '',
          },
        ],
        internalStructures: [],
      },
    })
    expect(getElementViewState(node, key)).toEqual({ mode: 'compact', selectedIndex: 0 })
  })

  it('getElementViewState defaults non-entries map parameters to list', () => {
    const key = elementViewKeyForParameter('param-map')
    expect(getElementViewState(minimalNode(), key)).toEqual({ mode: 'list' })
  })

  it('resolveElementViewModeChange asks confirmation before entries list mode', () => {
    const key = elementViewKeyForParameter('param-embed')
    const node = minimalNode({
      schema: {
        id: 'schema',
        title: 'Test',
        parameters: [
          {
            id: 'param-embed',
            name: 'entries',
            type: 'mapHashEmbed',
            defaultValue: '',
          },
        ],
        internalStructures: [],
      },
    })
    const confirm = vi.fn(() => false)
    vi.stubGlobal('confirm', confirm)

    expect(resolveElementViewModeChange(node, key, 'list')).toBeNull()
    expect(confirm).toHaveBeenCalledOnce()

    vi.stubGlobal('confirm', vi.fn(() => true))
    expect(resolveElementViewModeChange(node, key, 'list')).toBe('list')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('elementViewKeyForOutputSlot resolves embed slot', () => {
    const embedId = 'emb1'
    const slotId = embedSlotId(embedId, 0)
    const node = minimalNode({
      schema: {
        id: 'schema',
        title: 'Test',
        parameters: [],
        internalStructures: [],
        embed: [
          {
            id: embedId,
            title: 'Embed',
            internalStructures: [{ id: 'slot-a', name: 'A', schemaId: 'c' }],
            slots: [{ id: slotId, name: 'A', schemaId: 'c' }],
          },
        ],
      },
    })
    expect(elementViewKeyForOutputSlot(node, slotId)).toBe(elementViewKeyForEmbed(embedId))
  })
})
