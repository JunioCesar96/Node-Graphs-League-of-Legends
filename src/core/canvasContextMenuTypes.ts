import type { NodeElementKind } from '@/core/listNodeElements'

export type CanvasContextMenuAnchor = {
  left: number
  top: number
}

export type CanvasContextTarget =
  | { type: 'canvas' }
  | { type: 'node'; nodeId: string }
  | { type: 'connection'; connectionId: string }
  | {
      type: 'element'
      nodeId: string
      kind: NodeElementKind | 'list2EmbedBlock' | 'list2PointerBlock' | 'list2EmbedInstance' | 'list2PointerInstance'
      elementId: string
      embedId?: string
      pointerId?: string
      listEmbedId?: string
      listPointerId?: string
      list2EmbedId?: string
      list2PointerId?: string
      instanceId?: string
    }

export type ContextMenuItemId =
  | 'canvas.addNode'
  | 'canvas.zoomIn'
  | 'canvas.zoomOut'
  | 'canvas.resetViewport'
  | 'canvas.undo'
  | 'canvas.redo'
  | 'canvas.focusSelection'
  | 'canvas.selectAll'
  | 'canvas.clearSelection'
  | 'canvas.toggleNavigateMode'
  | 'canvas.toggleLegend'
  | 'node.focus'
  | 'node.select'
  | 'node.glue'
  | 'node.delete'
  | 'node.addNode'
  | 'node.toggleBodyCollapse'
  | 'connection.cycleRouting'
  | 'connection.remove'
  | 'element.toggleCompact'
  | 'element.relink'
  | 'element.removeConnections'
  | 'element.remove'
  | 'element.openElementMenu'
  | 'element.removeInstance'

export type ContextMenuItem = {
  id: ContextMenuItemId
  label: string
  disabled?: boolean
  danger?: boolean
  shortcut?: string
  separatorBefore?: boolean
}
