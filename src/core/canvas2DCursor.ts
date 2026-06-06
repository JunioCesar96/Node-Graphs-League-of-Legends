import type { CanvasPosition } from '@/core/canvasScene'

export const DEFAULT_CANVAS_2D_CURSOR_POSITION: CanvasPosition = { x: 0, y: 0 }

export const CANVAS_2D_CURSOR_RESET_HOLD_MS = 2000

export type CameraPanPoint = { x: number; y: number }

export function computePanCenteredOnGraphPoint(
  point: CanvasPosition,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): CameraPanPoint {
  return {
    x: Math.round(viewportWidth / 2 - point.x * scale),
    y: Math.round(viewportHeight / 2 - point.y * scale),
  }
}
