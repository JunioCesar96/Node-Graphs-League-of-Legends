import type { NodeElementKind } from '@/core/listNodeElements'

export type CanvasContextMenuAnchor = {
  left: number
  top: number
}

export type CanvasContextTarget =
  | { type: 'canvas' }
  | { type: 'node'; nodeId: string }
  | { type: 'nodeInputPort'; nodeId: string }
  | { type: 'connection'; connectionId: string }
  | {
      type: 'blockSlot'
      nodeId: string
      slotId: string
      direction: 'input' | 'output'
      /** Ligação activa quando a saída tem fan-out (0-based). */
      connectionIndex?: number
      connectionId?: string
    }
  | {
      type: 'addonSlot'
      nodeId: string
      slotId: string
      direction: 'input' | 'output'
    }
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
  | 'canvas.addNode.node'
  | 'canvas.addNode.block'
  | 'canvas.addNode.addon'
  | 'canvas.createLabel'
  | 'canvas.zoomIn'
  | 'canvas.zoomOut'
  | 'canvas.resetViewport'
  | 'canvas.undo'
  | 'canvas.redo'
  | 'canvas.focusSelection'
  | 'canvas.selectAll'
  | 'canvas.clearSelection'
  | 'canvas.extractSceneNodesState'
  | 'canvas.graphsToCode'
  | 'canvas.collapseAllNodeBodies'
  | 'canvas.expandAllNodeBodies'
  | 'canvas.toggleNavigateMode'
  | 'canvas.navegacao'
  | 'canvas.setInteractionMode.tweak'
  | 'canvas.setInteractionMode.selectBox'
  | 'canvas.setInteractionMode.navigate'
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
  | 'canvas.showGrid'
  | 'canvas.openGridControl'
  | 'node.focus'
  | 'node.select'
  | 'node.glue'
  | 'node.delete'
  | 'node.addNode'
  | 'node.toggleBodyCollapse'
  | 'node.toggleStructureCardParamsExpanded'
  | 'node.structureCardResizeHint'
  | 'node.organization'
  | 'node.organization.bySectionType'
  | 'node.organization.freeform'
  | 'node.retractAllElements'
  | 'node.expandAllElements'
  | 'node.extractSceneNodesState'
  | 'node.graphsToCode'
  | 'node.codigo'
  | 'node.viewCode'
  | 'node.viewBlockCode'
  | 'node.codigoPreviewBlock'
  | 'node.rebuildBlockVfx'
  | 'node.blockParameters'
  | 'node.blockParameters.add'
  | 'node.blockParameters.edit'
  | 'node.blockParameters.remove'
  | 'node.createLabel'
  | 'node.editLabel'
  | 'node.slashCommands'
  | 'node.slashCommands.add'
  | 'node.slashCommands.remove'
  | 'node.viewGroupCode'
  | 'node.previewVfx'
  | 'node.syncValueToCode'
  | 'surface.toggleJadeTheme'
  | 'surface.toggleJadeSyntax'
  | 'surface.toggleJadeBackground'
  | 'surface.toggleJadeFonts'
  | 'node.hideLinkedChildNodes'
  | 'node.showLinkedChildNodes'
  | 'node.hideInactiveBlockIndexBranches'
  | 'node.blockOrganization'
  | 'node.blockOrganization.align'
  | 'node.blockOrganization.align.left'
  | 'node.blockOrganization.align.centerHorizontal'
  | 'node.blockOrganization.align.right'
  | 'node.blockOrganization.align.top'
  | 'node.blockOrganization.align.centerVertical'
  | 'node.blockOrganization.align.bottom'
  | 'node.blockOrganization.distribute'
  | 'node.blockOrganization.distribute.left'
  | 'node.blockOrganization.distribute.centerHorizontal'
  | 'node.blockOrganization.distribute.right'
  | 'node.blockOrganization.distribute.top'
  | 'node.blockOrganization.distribute.centerVertical'
  | 'node.blockOrganization.distribute.bottom'
  | 'connection.cycleRouting'
  | 'connection.remove'
  | 'element.toggleCompact'
  | 'element.toggleRetracted'
  | 'element.showOnlyConnectedComponent'
  | 'element.showOnlySlotSubtree'
  | 'element.focusPeerInputSlot'
  | 'slot.connectionRoutingMenu'
  | 'nodeInputPort.focusPeerOutputSlot'
  | 'element.relink'
  | 'element.removeConnections'
  | 'blockSlot.removeConnections'
  | 'blockSlot.focusPeerSlot'
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
  /** Interruptor visual (`AppToggleCheckbox`) em vez de marca ✓. */
  toggleCheckbox?: boolean
}
