import { describe, expect, it } from 'vitest'

import {
  applyDefaultCompactElementView,
  clampSelectedIndex,
  elementViewKeyForParameter,
  getElementViewState,
  patchElementRetracted,
  patchElementViewMode,
  slotIdsForElement,
} from '@/core/elementViewState'
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
})
