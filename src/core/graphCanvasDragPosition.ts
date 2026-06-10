import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'

export type GraphCanvasDragPositionOverride = {
  positions: Readonly<Record<string, CanvasPosition>>
} | null

export function createGraphCanvasDragPositionOverride(
  positions: Readonly<Record<string, CanvasPosition>>,
): GraphCanvasDragPositionOverride {
  if (Object.keys(positions).length === 0) {
    return null
  }

  return { positions }
}

export function graphCanvasDragOverrideNodeIds(
  dragOverride: GraphCanvasDragPositionOverride,
): readonly string[] {
  return dragOverride ? Object.keys(dragOverride.positions) : []
}

export function resolveGraphCanvasNodeRenderPosition(
  node: CanvasNode,
  dragOverride: GraphCanvasDragPositionOverride,
): CanvasPosition {
  const overridePosition = dragOverride?.positions[node.id]

  if (overridePosition) {
    return overridePosition
  }

  return node.position
}

export function applyGraphCanvasDragPositionOverride(
  nodes: readonly CanvasNode[],
  dragOverride: GraphCanvasDragPositionOverride,
): readonly CanvasNode[] {
  if (!dragOverride) {
    return nodes
  }

  let changed = false
  const next = nodes.map((node) => {
    const overridePosition = dragOverride.positions[node.id]

    if (!overridePosition) {
      return node
    }

    changed = true
    return { ...node, position: overridePosition }
  })

  return changed ? next : nodes
}
