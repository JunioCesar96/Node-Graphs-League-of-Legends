export type CanvasInteractionMode = 'tweak' | 'selectBox' | 'navigate'

export const DEFAULT_CANVAS_INTERACTION_MODE: CanvasInteractionMode = 'tweak'

export function isCanvasNavigateMode(mode: CanvasInteractionMode): boolean {
  return mode === 'navigate'
}

export function isCanvasSelectBoxMode(mode: CanvasInteractionMode): boolean {
  return mode === 'selectBox'
}

export function isCanvasPanCursorMode(mode: CanvasInteractionMode): boolean {
  return mode === 'navigate'
}
