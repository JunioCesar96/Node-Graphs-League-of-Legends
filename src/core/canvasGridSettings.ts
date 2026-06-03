export const DEFAULT_CANVAS_GRID_SIZE = 32
export const DEFAULT_CANVAS_GRID_OPACITY = 7
export const MIN_CANVAS_GRID_SIZE = 16
export const MAX_CANVAS_GRID_SIZE = 80
export const MIN_CANVAS_GRID_OPACITY = 0
export const MAX_CANVAS_GRID_OPACITY = 40

export type CanvasGridChrome = {
  showCanvasGrid?: boolean
  canvasGridSize?: number
  canvasGridOpacity?: number
}

export function resolveCanvasGridSize(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CANVAS_GRID_SIZE
  }
  return Math.min(MAX_CANVAS_GRID_SIZE, Math.max(MIN_CANVAS_GRID_SIZE, Math.round(parsed)))
}

export function resolveCanvasGridOpacity(raw: unknown): number {
  const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CANVAS_GRID_OPACITY
  }
  return Math.min(MAX_CANVAS_GRID_OPACITY, Math.max(MIN_CANVAS_GRID_OPACITY, Math.round(parsed)))
}

export function parseCanvasGridChrome(raw: unknown): CanvasGridChrome | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined
  }
  const record = raw as Record<string, unknown>
  const showCanvasGrid = record.showCanvasGrid === false ? false : undefined
  const canvasGridSize =
    record.canvasGridSize !== undefined
      ? resolveCanvasGridSize(record.canvasGridSize)
      : undefined
  const canvasGridOpacity =
    record.canvasGridOpacity !== undefined
      ? resolveCanvasGridOpacity(record.canvasGridOpacity)
      : undefined

  if (
    showCanvasGrid === undefined &&
    canvasGridSize === undefined &&
    canvasGridOpacity === undefined
  ) {
    return undefined
  }

  return {
    ...(showCanvasGrid === false ? { showCanvasGrid: false } : {}),
    ...(canvasGridSize !== undefined &&
    canvasGridSize !== DEFAULT_CANVAS_GRID_SIZE
      ? { canvasGridSize }
      : {}),
    ...(canvasGridOpacity !== undefined &&
    canvasGridOpacity !== DEFAULT_CANVAS_GRID_OPACITY
      ? { canvasGridOpacity }
      : {}),
  }
}
