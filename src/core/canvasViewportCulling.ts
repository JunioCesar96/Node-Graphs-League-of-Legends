import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'

export type GraphViewportRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasNodeBounds = {
  x: number
  y: number
  width: number
  height: number
}

/** Região visível do viewport em coordenadas do grafo (pan + scale do canvas). */
export function computeGraphViewportRect(
  viewportWidth: number,
  viewportHeight: number,
  pan: CanvasPosition,
  scale: number,
  paddingPx = 160,
): GraphViewportRect | null {
  if (viewportWidth <= 0 || viewportHeight <= 0 || scale <= 0) {
    return null
  }

  const padGraph = paddingPx / scale

  return {
    x: -pan.x / scale - padGraph,
    y: -pan.y / scale - padGraph,
    width: viewportWidth / scale + padGraph * 2,
    height: viewportHeight / scale + padGraph * 2,
  }
}

export function intersectsGraphRects(a: GraphViewportRect, b: CanvasNodeBounds): boolean {
  return !(
    a.x + a.width < b.x ||
    a.x > b.x + b.width ||
    a.y + a.height < b.y ||
    a.y > b.y + b.height
  )
}

export function isCanvasNodeInGraphViewport(
  node: CanvasNode,
  viewport: GraphViewportRect,
  measureBounds: (node: CanvasNode) => CanvasNodeBounds,
): boolean {
  return intersectsGraphRects(viewport, measureBounds(node))
}

export type CollectCanvasRenderNodeIdsOptions = {
  nodes: readonly CanvasNode[]
  viewport: GraphViewportRect | null
  measureBounds: (node: CanvasNode) => CanvasNodeBounds
  forceNodeIds?: ReadonlySet<string>
  isPolicyVisible: (node: CanvasNode) => boolean
}

/**
 * Nós a montar no DOM: visíveis pela política da cena e dentro do viewport
 * (ou forçados — selecção, glue, ligação pendente, etc.).
 */
export function collectCanvasRenderNodeIds(options: CollectCanvasRenderNodeIdsOptions): Set<string> {
  const { nodes, viewport, measureBounds, forceNodeIds, isPolicyVisible } = options
  const renderIds = new Set<string>()

  for (const node of nodes) {
    if (!isPolicyVisible(node)) {
      continue
    }

    if (forceNodeIds?.has(node.id)) {
      renderIds.add(node.id)
      continue
    }

    if (!viewport) {
      continue
    }

    if (isCanvasNodeInGraphViewport(node, viewport, measureBounds)) {
      renderIds.add(node.id)
    }
  }

  return renderIds
}

/** Lista ordenada de nós montados no DOM (mesma ordem de `nodes` na cena). */
export function collectVisibleCanvasNodes(
  nodes: readonly CanvasNode[],
  renderNodeIds: ReadonlySet<string>,
): CanvasNode[] {
  const visible: CanvasNode[] = []

  for (const node of nodes) {
    if (renderNodeIds.has(node.id)) {
      visible.push(node)
    }
  }

  return visible
}
