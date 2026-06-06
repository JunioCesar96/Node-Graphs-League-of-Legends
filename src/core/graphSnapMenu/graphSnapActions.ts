export type GraphSnapActionId =
  | 'cursorToWorldOrigin'
  | 'cursorToSelected'
  | 'cursorToCamera'
  | 'cameraFocusSelection'
  | 'cameraFocusCursor'
  | 'cameraFocusWorldOrigin'
  | 'selectionToCursor'
  | 'selectionToWorldOrigin'
  | 'selectionToCamera'

export type GraphSnapActionDefinition = {
  action: GraphSnapActionId
  shortcut: string
}

export const GRAPH_SNAP_ACTIONS: readonly GraphSnapActionDefinition[] = [
  { action: 'cursorToWorldOrigin', shortcut: '1' },
  { action: 'cursorToSelected', shortcut: '2' },
  { action: 'cursorToCamera', shortcut: '3' },
  { action: 'cameraFocusSelection', shortcut: '4' },
  { action: 'cameraFocusCursor', shortcut: '5' },
  { action: 'cameraFocusWorldOrigin', shortcut: '6' },
  { action: 'selectionToCursor', shortcut: '7' },
  { action: 'selectionToWorldOrigin', shortcut: '8' },
  { action: 'selectionToCamera', shortcut: '9' },
] as const

export function isGraphSnapActionDisabled(
  action: GraphSnapActionId,
  selectedNodeIds: readonly string[],
): boolean {
  switch (action) {
    case 'cursorToSelected':
    case 'cameraFocusSelection':
    case 'selectionToCursor':
    case 'selectionToWorldOrigin':
    case 'selectionToCamera':
      return selectedNodeIds.length === 0
    default:
      return false
  }
}
