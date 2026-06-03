import type { CanvasPosition } from '@/core/canvasScene'

export function graphClientToPosition(
  canvasEl: HTMLElement,
  scale: number,
  clientX: number,
  clientY: number,
): CanvasPosition {
  const rect = canvasEl.getBoundingClientRect()
  return {
    x: Math.round((clientX - rect.left) / scale),
    y: Math.round((clientY - rect.top) / scale),
  }
}
