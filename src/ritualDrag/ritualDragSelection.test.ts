import { describe, expect, it } from 'vitest'
import type * as MonacoType from 'monaco-editor'

import {
  isPositionInSelection,
  pointerDragDistance,
  RITUAL_DRAG_MOVE_THRESHOLD_PX,
} from '@/ritualDrag/ritualDragSelection'

function selection(
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
): MonacoType.Selection {
  return {
    isEmpty: () => startLine === endLine && startCol === endCol,
    containsPosition: (position: MonacoType.Position) => {
      if (position.lineNumber < startLine || position.lineNumber > endLine) {
        return false
      }
      if (position.lineNumber === startLine && position.column < startCol) {
        return false
      }
      if (position.lineNumber === endLine && position.column > endCol) {
        return false
      }
      return true
    },
  } as MonacoType.Selection
}

describe('ritualDragSelection', () => {
  it('detecta posição dentro da seleção', () => {
    const sel = selection(2, 4, 5, 10)
    expect(isPositionInSelection(sel, { lineNumber: 2, column: 4 })).toBe(true)
    expect(isPositionInSelection(sel, { lineNumber: 4, column: 1 })).toBe(true)
    expect(isPositionInSelection(sel, { lineNumber: 1, column: 1 })).toBe(false)
  })

  it('calcula distância de arrasto', () => {
    expect(pointerDragDistance(0, 0, 3, 4)).toBe(5)
    expect(RITUAL_DRAG_MOVE_THRESHOLD_PX).toBeGreaterThan(0)
  })
})
