import { describe, expect, it } from 'vitest'

import {
  CANVAS_NODE_ID_ATTR,
  resolveCanvasNodeIdFromPointerEvent,
} from '@/core/graphCanvasEventDelegation'

describe('resolveCanvasNodeIdFromPointerEvent', () => {
  it('returns node id from a descendant click via delegation', () => {
    const root = document.createElement('div')
    const node = document.createElement('div')
    node.setAttribute(CANVAS_NODE_ID_ATTR, 'node-a')
    const button = document.createElement('button')
    node.append(button)
    root.append(node)

    const id = resolveCanvasNodeIdFromPointerEvent({ target: button }, root)

    expect(id).toBe('node-a')
  })

  it('returns null when target is outside the root subtree', () => {
    const root = document.createElement('div')
    const outside = document.createElement('div')
    outside.setAttribute(CANVAS_NODE_ID_ATTR, 'outside')

    const id = resolveCanvasNodeIdFromPointerEvent({ target: outside }, root)

    expect(id).toBeNull()
  })
})
