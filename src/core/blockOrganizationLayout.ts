import type { CanvasNode, CanvasPosition, CanvasScene } from '@/core/canvasScene'
import { estimateBlockCardHeight } from '@/core/blockSlotConnections'
import { resolveBlockCardWidth } from '@/core/structureCardLayout'
import type { ContextMenuItemId } from '@/core/canvasContextMenuTypes'

export type BlockOrganizationAlignMode =
  | 'left'
  | 'centerHorizontal'
  | 'right'
  | 'top'
  | 'centerVertical'
  | 'bottom'

export type BlockOrganizationDistributeMode =
  | 'left'
  | 'centerHorizontal'
  | 'right'
  | 'top'
  | 'centerVertical'
  | 'bottom'

export type BlockOrganizationOperation =
  | { kind: 'align'; mode: BlockOrganizationAlignMode }
  | { kind: 'distribute'; mode: BlockOrganizationDistributeMode }

type BlockNodeRect = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const BLOCK_ORGANIZATION_MENU_ACTIONS: Partial<Record<ContextMenuItemId, BlockOrganizationOperation>> = {
  'node.blockOrganization.align.left': { kind: 'align', mode: 'left' },
  'node.blockOrganization.align.centerHorizontal': { kind: 'align', mode: 'centerHorizontal' },
  'node.blockOrganization.align.right': { kind: 'align', mode: 'right' },
  'node.blockOrganization.align.top': { kind: 'align', mode: 'top' },
  'node.blockOrganization.align.centerVertical': { kind: 'align', mode: 'centerVertical' },
  'node.blockOrganization.align.bottom': { kind: 'align', mode: 'bottom' },
  'node.blockOrganization.distribute.left': { kind: 'distribute', mode: 'left' },
  'node.blockOrganization.distribute.centerHorizontal': { kind: 'distribute', mode: 'centerHorizontal' },
  'node.blockOrganization.distribute.right': { kind: 'distribute', mode: 'right' },
  'node.blockOrganization.distribute.top': { kind: 'distribute', mode: 'top' },
  'node.blockOrganization.distribute.centerVertical': { kind: 'distribute', mode: 'centerVertical' },
  'node.blockOrganization.distribute.bottom': { kind: 'distribute', mode: 'bottom' },
}

export function isBlockOrganizationMenuAction(id: ContextMenuItemId): boolean {
  return id in BLOCK_ORGANIZATION_MENU_ACTIONS
}

export function resolveBlockOrganizationOperationFromMenuId(
  id: ContextMenuItemId,
): BlockOrganizationOperation | null {
  return BLOCK_ORGANIZATION_MENU_ACTIONS[id] ?? null
}

export function isBlockCanvasNode(node: CanvasNode | undefined): node is CanvasNode & {
  blockViewActive: true
  blockStructure: NonNullable<CanvasNode['blockStructure']>
} {
  return Boolean(node?.blockViewActive && node.blockStructure)
}

export function measureBlockNodeRect(node: CanvasNode): BlockNodeRect {
  const structure = node.blockStructure
  if (!structure) {
    return {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: resolveBlockCardWidth(node),
      height: 0,
    }
  }

  return {
    id: node.id,
    x: node.position.x,
    y: node.position.y,
    width: resolveBlockCardWidth(node),
    height: estimateBlockCardHeight(structure, node.node),
  }
}

function alignBlockNodeRects(
  rects: readonly BlockNodeRect[],
  mode: BlockOrganizationAlignMode,
): Map<string, CanvasPosition> {
  const positions = new Map<string, CanvasPosition>()
  const minX = Math.min(...rects.map((rect) => rect.x))
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width))
  const minY = Math.min(...rects.map((rect) => rect.y))
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height))
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  for (const rect of rects) {
    let x = rect.x
    let y = rect.y

    switch (mode) {
      case 'left':
        x = minX
        break
      case 'right':
        x = maxX - rect.width
        break
      case 'centerHorizontal':
        x = centerX - rect.width / 2
        break
      case 'top':
        y = minY
        break
      case 'bottom':
        y = maxY - rect.height
        break
      case 'centerVertical':
        y = centerY - rect.height / 2
        break
    }

    positions.set(rect.id, { x, y })
  }

  return positions
}

function distributeBlockNodeRects(
  rects: readonly BlockNodeRect[],
  mode: BlockOrganizationDistributeMode,
): Map<string, CanvasPosition> {
  const positions = new Map<string, CanvasPosition>()
  if (rects.length < 3) {
    return positions
  }

  const sorted = [...rects]

  switch (mode) {
    case 'left':
    case 'centerHorizontal':
    case 'right': {
      if (mode === 'left') {
        sorted.sort((a, b) => a.x - b.x)
        const first = sorted[0]!
        const last = sorted[sorted.length - 1]!
        const totalWidth = sorted.reduce((sum, rect) => sum + rect.width, 0)
        const gap = (last.x + last.width - first.x - totalWidth) / (sorted.length - 1)
        let cursor = first.x
        for (const rect of sorted) {
          positions.set(rect.id, { x: cursor, y: rect.y })
          cursor += rect.width + gap
        }
        break
      }

      if (mode === 'right') {
        sorted.sort((a, b) => a.x + a.width - (b.x + b.width))
        const firstRight = sorted[0]!.x + sorted[0]!.width
        const lastRight = sorted[sorted.length - 1]!.x + sorted[sorted.length - 1]!.width
        const step = (lastRight - firstRight) / (sorted.length - 1)
        sorted.forEach((rect, index) => {
          const right = firstRight + step * index
          positions.set(rect.id, { x: right - rect.width, y: rect.y })
        })
        break
      }

      sorted.sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2))
      const firstCenter = sorted[0]!.x + sorted[0]!.width / 2
      const lastCenter = sorted[sorted.length - 1]!.x + sorted[sorted.length - 1]!.width / 2
      const step = (lastCenter - firstCenter) / (sorted.length - 1)
      sorted.forEach((rect, index) => {
        const center = firstCenter + step * index
        positions.set(rect.id, { x: center - rect.width / 2, y: rect.y })
      })
      break
    }
    case 'top':
    case 'centerVertical':
    case 'bottom': {
      if (mode === 'top') {
        sorted.sort((a, b) => a.y - b.y)
        const first = sorted[0]!
        const last = sorted[sorted.length - 1]!
        const totalHeight = sorted.reduce((sum, rect) => sum + rect.height, 0)
        const gap = (last.y + last.height - first.y - totalHeight) / (sorted.length - 1)
        let cursor = first.y
        for (const rect of sorted) {
          positions.set(rect.id, { x: rect.x, y: cursor })
          cursor += rect.height + gap
        }
        break
      }

      if (mode === 'bottom') {
        sorted.sort((a, b) => a.y + a.height - (b.y + b.height))
        const firstBottom = sorted[0]!.y + sorted[0]!.height
        const lastBottom = sorted[sorted.length - 1]!.y + sorted[sorted.length - 1]!.height
        const step = (lastBottom - firstBottom) / (sorted.length - 1)
        sorted.forEach((rect, index) => {
          const bottom = firstBottom + step * index
          positions.set(rect.id, { x: rect.x, y: bottom - rect.height })
        })
        break
      }

      sorted.sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2))
      const firstCenter = sorted[0]!.y + sorted[0]!.height / 2
      const lastCenter = sorted[sorted.length - 1]!.y + sorted[sorted.length - 1]!.height / 2
      const step = (lastCenter - firstCenter) / (sorted.length - 1)
      sorted.forEach((rect, index) => {
        const center = firstCenter + step * index
        positions.set(rect.id, { x: rect.x, y: center - rect.height / 2 })
      })
      break
    }
  }

  return positions
}

export function applyBlockOrganizationToScene(
  scene: CanvasScene,
  nodeIds: readonly string[],
  operation: BlockOrganizationOperation,
): CanvasScene {
  const rects = nodeIds
    .map((nodeId) => scene.nodes.find((node) => node.id === nodeId))
    .filter(isBlockCanvasNode)
    .map(measureBlockNodeRect)

  if (rects.length < 2) {
    return scene
  }

  if (operation.kind === 'distribute' && rects.length < 3) {
    return scene
  }

  const nextPositions =
    operation.kind === 'align'
      ? alignBlockNodeRects(rects, operation.mode)
      : distributeBlockNodeRects(rects, operation.mode)

  if (nextPositions.size === 0) {
    return scene
  }

  return {
    ...scene,
    nodes: scene.nodes.map((node) => {
      const nextPosition = nextPositions.get(node.id)
      if (!nextPosition) {
        return node
      }

      return { ...node, position: nextPosition }
    }),
  }
}
