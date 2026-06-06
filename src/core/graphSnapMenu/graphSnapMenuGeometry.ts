import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'

export type CanvasNodeBounds = {
  height: number
  width: number
  x: number
  y: number
}

export function graphPointAtViewportCenter(
  viewportWidth: number,
  viewportHeight: number,
  pan: CanvasPosition,
  scale: number,
): CanvasPosition {
  return {
    x: Math.round((viewportWidth / 2 - pan.x) / scale),
    y: Math.round((viewportHeight / 2 - pan.y) / scale),
  }
}

export function resolveSelectionPivotCenter(
  nodes: readonly CanvasNode[],
  selectedIds: readonly string[],
  measureBounds: (node: CanvasNode) => CanvasNodeBounds,
): CanvasPosition | null {
  const selected = nodes.filter((node) => selectedIds.includes(node.id))

  if (selected.length === 0) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of selected) {
    const bounds = measureBounds(node)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  return {
    x: Math.round((minX + maxX) / 2),
    y: Math.round((minY + maxY) / 2),
  }
}
