export type ViewportToolbarDockId =
  | 'block'
  | 'group'
  | 'node'
  | 'scene'
  | 'camera'
  | 'zoom'

export function toggleViewportToolbarDock(
  current: ViewportToolbarDockId | null,
  next: ViewportToolbarDockId,
): ViewportToolbarDockId | null {
  return current === next ? null : next
}
