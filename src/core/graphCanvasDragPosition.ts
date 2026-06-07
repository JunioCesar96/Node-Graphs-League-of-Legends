import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'

export type GraphCanvasDragPositionOverride = {
  nodeId: string
  x: number
  y: number
} | null

export function resolveGraphCanvasNodeRenderPosition(
  node: CanvasNode,
  dragOverride: GraphCanvasDragPositionOverride,
): CanvasPosition {
  if (dragOverride && dragOverride.nodeId === node.id) {
    return { x: dragOverride.x, y: dragOverride.y }
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

  return nodes.map((node) =>
    node.id === dragOverride.nodeId
      ? { ...node, position: { x: dragOverride.x, y: dragOverride.y } }
      : node,
  )
}
