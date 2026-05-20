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
  | 'canvas.exibir'
  | 'canvas.toolbar.addNode'
  | 'canvas.toolbar.undo'
  | 'canvas.toolbar.redo'
  | 'canvas.toolbar.camera'
  | 'canvas.toolbar.zoom'
  | 'canvas.toolbar.resetViewport'
  | 'canvas.toolbar.resetScene'
  | 'canvas.toolbar.inspector'
  | 'canvas.toolbar.legend'
  | 'canvas.toolbar.linkStatus'
  | 'canvas.toolbar.navigateHint'
  | 'canvas.toolbar.sceneNodes'
  | 'node.focus'
  | 'node.select'
  | 'node.glue'
  | 'node.delete'
  | 'node.addNode'
  | 'node.toggleBodyCollapse'
  | 'node.organization'
  | 'node.organization.bySectionType'
  | 'node.organization.freeform'
  | 'node.retractAllElements'
  | 'node.expandAllElements'
  | 'connection.cycleRouting'
  | 'connection.remove'
  | 'element.toggleCompact'
  | 'element.toggleRetracted'
  | 'element.relink'
  | 'element.removeConnections'
  | 'element.remove'
  | 'element.openElementMenu'
  | 'element.removeInstance'

export type ContextMenuItem = {
  id: ContextMenuItemId
  label: string
  disabled?: boolean
  /** Item do submenu Exibir: ferramenta visível na barra (destaque) vs oculta (esmaecido). */
  toolbarToolVisible?: boolean
  /** Contexto actual não usa a ferramenta (ex.: undo indisponível); atenua só o rótulo. */
  contextLimited?: boolean
  danger?: boolean
  shortcut?: string
  separatorBefore?: boolean
  /** Submenu lateral (ex.: «Exibir», «Organização»). */
  children?: ContextMenuItem[]
  /** Opção activa (ex.: modo de organização do card). */
  selected?: boolean
}
