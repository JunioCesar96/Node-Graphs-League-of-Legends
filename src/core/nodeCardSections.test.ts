import { describe, expect, it } from 'vitest'

import type { CanvasNode } from '@/core/canvasScene'
import {
  allVisibleSectionsExpandedMap,
  defaultNewCanvasNodeLayout,
  isNodeCardBodyLayout,
  isNodeCardFreeform,
  isNodeCardSectionExpanded,
  resolveNodeCardBodyLayout,
} from '@/core/nodeCardSections'

function canvasNode(overlay: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: 'n1',
    position: { x: 0, y: 0 },
    node: {
      schema: {
        id: 'test',
        title: 'Test',
        parameters: [],
      },
      values: [],
    },
    ...overlay,
  }
}

describe('nodeCardSections layout', () => {
  it('defaults to bySectionType when cardBodyLayout is absent', () => {
    const node = canvasNode()
    expect(resolveNodeCardBodyLayout(node)).toBe('bySectionType')
    expect(isNodeCardFreeform(node)).toBe(false)
  })

  it('defaultNewCanvasNodeLayout sets freeform and expands visible sections', () => {
    const instance = canvasNode().node
    const overlay = defaultNewCanvasNodeLayout(instance)
    expect(overlay.cardBodyLayout).toBe('freeform')
    expect(overlay.cardSectionExpanded?.parameters).toBe(true)
    expect(overlay.cardSectionExpanded?.embed).toBe(true)
  })

  it('recognises freeform layout', () => {
    const node = canvasNode({ cardBodyLayout: 'freeform' })
    expect(resolveNodeCardBodyLayout(node)).toBe('freeform')
    expect(isNodeCardFreeform(node)).toBe(true)
  })

  it('treats all sections expanded in freeform', () => {
    const node = canvasNode({
      cardBodyLayout: 'freeform',
      cardSectionExpanded: { embed: false },
    })
    expect(isNodeCardSectionExpanded(node, 'embed')).toBe(true)
  })

  it('validates layout string', () => {
    expect(isNodeCardBodyLayout('freeform')).toBe(true)
    expect(isNodeCardBodyLayout('bySectionType')).toBe(true)
    expect(isNodeCardBodyLayout('other')).toBe(false)
  })

  it('allVisibleSectionsExpandedMap marks visible sections true', () => {
    const node = canvasNode({ cardBodyLayout: 'freeform' }).node
    const map = allVisibleSectionsExpandedMap(node)
    expect(map.parameters).toBe(true)
    expect(map.embed).toBe(true)
    expect(map.list2Embed).toBeUndefined()
  })
})
