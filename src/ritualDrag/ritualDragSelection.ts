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

export function readSelectionRitualText(editor: MonacoType.editor.IStandaloneCodeEditor): string {
  const model = editor.getModel()
  const selection = editor.getSelection()
  if (!model || !selection || selection.isEmpty()) {
    return ''
  }
  return model.getValueInRange(selection).trim()
}

export function pointerDragDistance(
  originX: number,
  originY: number,
  x: number,
  y: number,
): number {
  return Math.hypot(x - originX, y - originY)
}
