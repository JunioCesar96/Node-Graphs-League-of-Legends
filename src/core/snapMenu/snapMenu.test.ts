import { describe, expect, it } from 'vitest'

import {
  buildSnapMenuLayout,
  buildSnapMenuPolygonPoints,
  listSnapMenuPolygonVertexIndices,
  resolveSnapMenuItemFromPointerDelta,
  resolveSnapMenuItemFromShortcut,
  resolveSnapMenuLayoutForActionCount,
  resolveSnapMenuOrbitRadiusPx,
  resolveSnapMenuPolygonVertexAngleDeg,
  SNAP_MENU_POLYGON_SKIP_VERTEX_INDEX,
  SNAP_MENU_POLYGON_VERTEX_COUNT,
  type SnapMenuActionDefinition,
} from '@/core/snapMenu/snapMenu'

const TEST_ACTIONS: readonly SnapMenuActionDefinition[] = [
  { id: 'a', label: 'A', shortcut: '1' },
  { id: 'b', label: 'B', shortcut: '2' },
  { id: 'c', label: 'C', shortcut: '3' },
  { id: 'd', label: 'D', shortcut: '4' },
  { id: 'e', label: 'E', shortcut: '5' },
  { id: 'f', label: 'F', shortcut: '6' },
  { id: 'g', label: 'G', shortcut: '7' },
  { id: 'h', label: 'H', shortcut: '8' },
  { id: 'i', label: 'I', shortcut: '9' },
]

describe('snapMenu', () => {
  it('distribui itens nos vértices de um decágono', () => {
    const layout = buildSnapMenuLayout(TEST_ACTIONS)

    expect(layout).toHaveLength(9)
    expect(listSnapMenuPolygonVertexIndices()).toHaveLength(9)
    expect(listSnapMenuPolygonVertexIndices()).not.toContain(SNAP_MENU_POLYGON_SKIP_VERTEX_INDEX)
    expect(layout[0]?.id).toBe('a')
    expect(layout[0]?.vertexIndex).toBe(0)
    expect(layout[5]?.vertexIndex).toBe(6)
    expect(resolveSnapMenuPolygonVertexAngleDeg(0)).toBe(-90)
    expect(buildSnapMenuPolygonPoints(100)).toHaveLength(SNAP_MENU_POLYGON_VERTEX_COUNT)
  })

  it('adapta o raio do decágono ao tamanho dos itens', () => {
    expect(resolveSnapMenuOrbitRadiusPx()).toBeGreaterThanOrEqual(135)
    expect(resolveSnapMenuOrbitRadiusPx({ vertexCount: 6 })).toBeLessThan(resolveSnapMenuOrbitRadiusPx())
  })

  it('resolve atalhos numéricos do menu Snap', () => {
    expect(resolveSnapMenuItemFromShortcut('1', TEST_ACTIONS)).toBe('a')
    expect(resolveSnapMenuItemFromShortcut('9', TEST_ACTIONS)).toBe('i')
  })

  it('resolve direcção do rato para item no layout do decágono', () => {
    const layout = buildSnapMenuLayout(TEST_ACTIONS)

    expect(resolveSnapMenuItemFromPointerDelta(0, -120, layout)).toBe('a')
    expect(resolveSnapMenuItemFromPointerDelta(0, 0, layout)).toBeNull()
  })

  it('adapta o polígono ao número de acções', () => {
    expect(resolveSnapMenuLayoutForActionCount(9)).toEqual({
      vertexCount: 10,
      skipVertexIndex: 5,
    })
    expect(resolveSnapMenuLayoutForActionCount(4)).toEqual({
      vertexCount: 5,
      skipVertexIndex: 2,
    })
    expect(resolveSnapMenuLayoutForActionCount(12)).toEqual({
      vertexCount: 13,
      skipVertexIndex: 6,
    })
    expect(buildSnapMenuLayout(Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index}`,
      label: `Item ${index}`,
      shortcut: String(index + 1),
    })))).toHaveLength(12)
    expect(buildSnapMenuLayout([
      { id: 'back', label: 'Voltar', shortcut: '0' },
      { id: 'a', label: 'A', shortcut: '1' },
      { id: 'b', label: 'B', shortcut: '2' },
      { id: 'c', label: 'C', shortcut: '3' },
    ])).toHaveLength(4)
  })
})
