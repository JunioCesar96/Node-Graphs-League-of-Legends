import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  collectNeekoRitualDropTargetIds,
  resolveRitualDropTargetFromPoint,
} from '@/ritualDrag/resolveRitualDropTarget'
import { NEEKO_SCHEMA_ID } from '@/core/neekoNodeTransform'

describe('resolveRitualDropTargetFromPoint', () => {
  const originalElementFromPoint = document.elementFromPoint

  beforeEach(() => {
    document.elementFromPoint = vi.fn() as typeof document.elementFromPoint
  })

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint
  })

  it('detecta zona Neeko por data-neeko-drop-zone', () => {
    const viewport = document.createElement('div')
    const dropZone = document.createElement('div')
    dropZone.dataset.neekoDropZone = ''
    dropZone.dataset.canvasNodeId = 'neeko-1'
    viewport.appendChild(dropZone)

    vi.mocked(document.elementFromPoint).mockReturnValue(dropZone)

    const target = resolveRitualDropTargetFromPoint(50, 30, {
      viewportBodyEl: viewport,
      neekoNodeIds: new Set(['neeko-1']),
    })

    expect(target).toEqual({ kind: 'neeko', canvasNodeId: 'neeko-1' })
  })

  it('detecta grade vazia quando o alvo está no viewport', () => {
    const viewport = document.createElement('div')
    const canvasBg = document.createElement('div')
    viewport.appendChild(canvasBg)

    vi.mocked(document.elementFromPoint).mockReturnValue(canvasBg)

    const target = resolveRitualDropTargetFromPoint(10, 10, {
      viewportBodyEl: viewport,
      neekoNodeIds: new Set(),
    })

    expect(target).toEqual({ kind: 'emptyCanvas' })
  })

  it('collectNeekoRitualDropTargetIds inclui Neeko shell', () => {
    const ids = collectNeekoRitualDropTargetIds([
      {
        id: 'n1',
        node: { schema: { id: NEEKO_SCHEMA_ID } },
      },
    ])

    expect(ids.has('n1')).toBe(true)
  })
})
