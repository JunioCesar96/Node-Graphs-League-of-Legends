import type * as MonacoType from 'monaco-editor'

export const RITUAL_DRAG_MOVE_THRESHOLD_PX = 4

export function isPositionInSelection(
  selection: MonacoType.Selection,
  position: MonacoType.Position,
): boolean {
  if (selection.isEmpty()) {
    return false
  }
  return selection.containsPosition(position)
}

export type RitualDragTextRange = {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export function readSelectionRitualText(editor: MonacoType.editor.IStandaloneCodeEditor): string {
  const model = editor.getModel()
  const selection = editor.getSelection()
  if (!model || !selection || selection.isEmpty()) {
    return ''
  }
  return model.getValueInRange(selection).trim()
}

export function readSelectionRitualRange(
  editor: MonacoType.editor.IStandaloneCodeEditor,
): RitualDragTextRange | null {
  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) {
    return null
  }

  return {
    startLineNumber: selection.startLineNumber,
    startColumn: selection.startColumn,
    endLineNumber: selection.endLineNumber,
    endColumn: selection.endColumn,
  }
}

export function pointerDragDistance(
  originX: number,
  originY: number,
  x: number,
  y: number,
): number {
  return Math.hypot(x - originX, y - originY)
}
