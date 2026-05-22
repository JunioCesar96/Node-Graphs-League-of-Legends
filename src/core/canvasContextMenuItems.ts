import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { isNodeLocked, isNodeRemovableFromScene } from '@/core/canvasNodePresentation'
import {
  areAllCardElementsRetracted,
  collectCardElementViewKeys,
  getElementViewState,
  isAnyCardElementRetracted,
} from '@/core/elementViewState'
import {
  elementViewKeyForEmbed,
  elementViewKeyForList2Embed,
  elementViewKeyForList2Pointer,
  elementViewKeyForListEmbed,
  elementViewKeyForListPointer,
  elementViewKeyForParameter,
  elementViewKeyForPointer,
} from '@/core/elementViewState'
import type {
  CanvasContextTarget,
  ContextMenuItem,
  ContextMenuItemId,
} from '@/core/canvasContextMenuTypes'
import { findOutputSlotInNode } from '@/core/listEmbedSlots'
import {
  findConnectionFromOutputSlot,
  findIncomingConnections,
  focusPeerOutputSlotMenuId,
  outputSlotIdFromElementTarget,
} from '@/core/slotPeerFocus'
import {
  CONNECTION_ROUTING_LABELS,
  effectiveConnectionRouting,
  setConnectionRoutingMenuId,
} from '@/core/connectionRoutingMenu'
import {
  collectLinkedChildNodeIds,
  isStructuralSlotContextKind,
} from '@/core/sceneNodeLinkVisibility'
import { resolveNodeCardBodyLayout } from '@/core/nodeCardSections'
import {
  CANVAS_TOOLBAR_TOOL_LABELS,
  type CanvasToolbarToolId,
  type CanvasToolbarVisibility,
} from '@/core/canvasToolbarVisibility'
import { listRemovableNodeElements, type NodeElementListItem } from '@/core/listNodeElements'
import type { NodeParameterDefinition } from '@/core/nodeSchema'

export type CanvasContextMenuBuildContext = {
  canRedo: boolean
  canUndo: boolean
  glueNodeId: string | null
  hasSelectAll: boolean
  isNodeBodyCollapsed?: boolean
  onCycleConnectionRouting?: (connectionId: string) => void
  onSetConnectionRouting?: (connectionId: string, routing: import('@/core/canvasScene').ConnectionRouting) => void
  onRemoveConnection?: (connectionId: string) => void
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  scene: CanvasScene
  selectedNodeIds: string[]
  viewportNavigateMode: boolean
  toolbarVisibility: CanvasToolbarVisibility
  hasPendingLink: boolean
  hasInspectorSlot: boolean
  /** Todos os nós da cena com corpo efectivamente retraído (menu da grade). */
  sceneAllNodesBodyCollapsed?: boolean
  /** Pelo menos um nó da cena com corpo efectivamente retraído. */
  sceneAnyNodeBodyCollapsed?: boolean
}

function findCanvasNode(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((node) => node.id === nodeId)
}

function removableItemForTarget(
  node: CanvasNode,
  target: Extract<CanvasContextTarget, { type: 'element' }>,
  stubCatalog: readonly NodeParameterDefinition[] | undefined,
  scene: CanvasScene,
): NodeElementListItem | undefined {
  const removables = listRemovableNodeElements(node.node, stubCatalog, {
    canvasNodeId: node.id,
    connections: scene.connections,
  })

  return removables.find((item) => {
    if (item.kind !== target.kind) {
      return false
    }

    if (item.id !== target.elementId) {
      return false
    }

    if (target.embedId && item.embedId !== target.embedId) {
      return false
    }

    if (target.pointerId && item.pointerId !== target.pointerId) {
      return false
    }

    if (target.listEmbedId && item.listEmbedId !== target.listEmbedId) {
      return false
    }

    if (target.listPointerId && item.listPointerId !== target.listPointerId) {
      return false
    }

    return true
  })
}

function elementViewKeyForTarget(target: Extract<CanvasContextTarget, { type: 'element' }>) {
  switch (target.kind) {
    case 'parameter':
      return elementViewKeyForParameter(target.elementId)
    case 'embedBlock':
    case 'embedSlot':
      return target.embedId ? elementViewKeyForEmbed(target.embedId) : null
    case 'pointerBlock':
    case 'pointerSlot':
      return target.pointerId ? elementViewKeyForPointer(target.pointerId) : null
    case 'listEmbedBlock':
    case 'listEmbedSlot':
      return target.listEmbedId ? elementViewKeyForListEmbed(target.listEmbedId) : null
    case 'listPointerBlock':
    case 'listPointerSlot':
      return target.listPointerId ? elementViewKeyForListPointer(target.listPointerId) : null
    case 'list2EmbedBlock':
    case 'list2EmbedInstance':
      return target.list2EmbedId ? elementViewKeyForList2Embed(target.list2EmbedId) : null
    case 'list2PointerBlock':
    case 'list2PointerInstance':
      return target.list2PointerId ? elementViewKeyForList2Pointer(target.list2PointerId) : null
    default:
      return null
  }
}

function toolbarVisibilityItem(
  toolId: CanvasToolbarToolId,
  ctx: CanvasContextMenuBuildContext,
  options?: { contextLimited?: boolean },
): ContextMenuItem {
  const id = `canvas.toolbar.${toolId}` as ContextMenuItem['id']
  const toolbarToolVisible = ctx.toolbarVisibility[toolId]

  return {
    id,
    label: CANVAS_TOOLBAR_TOOL_LABELS[toolId],
    toolbarToolVisible,
    contextLimited: options?.contextLimited,
  }
}

function buildExibirSubmenuItems(ctx: CanvasContextMenuBuildContext): ContextMenuItem[] {
  return [
    toolbarVisibilityItem('addNode', ctx),
    toolbarVisibilityItem('undo', ctx, { contextLimited: !ctx.canUndo }),
    toolbarVisibilityItem('redo', ctx, { contextLimited: !ctx.canRedo }),
    toolbarVisibilityItem('camera', ctx),
    toolbarVisibilityItem('zoom', ctx),
    toolbarVisibilityItem('resetViewport', ctx),
    toolbarVisibilityItem('resetScene', ctx),
    toolbarVisibilityItem('inspector', ctx, { contextLimited: !ctx.hasInspectorSlot }),
    toolbarVisibilityItem('sceneNodes', ctx),
    toolbarVisibilityItem('legend', ctx),
    toolbarVisibilityItem('linkStatus', ctx, { contextLimited: !ctx.hasPendingLink }),
    toolbarVisibilityItem('navigateHint', ctx, { contextLimited: !ctx.viewportNavigateMode }),
  ]
}

function buildCanvasItems(ctx: CanvasContextMenuBuildContext): ContextMenuItem[] {
  const hasSelection = ctx.selectedNodeIds.length > 0
  const navigateLabel = ctx.viewportNavigateMode ? 'Sair do modo mover na grade' : 'Mover na grade'

  return [
    { id: 'canvas.addNode', label: 'Adicionar nó', shortcut: 'Ctrl+K' },
    { id: 'canvas.undo', label: 'Desfazer', disabled: !ctx.canUndo, shortcut: 'Ctrl+Z', separatorBefore: true },
    { id: 'canvas.redo', label: 'Refazer', disabled: !ctx.canRedo, shortcut: 'Ctrl+Y' },
    {
      id: 'canvas.focusSelection',
      label: 'Focar seleção na vista',
      disabled: !hasSelection,
      shortcut: '.',
      separatorBefore: true,
    },
    hasSelection
      ? { id: 'canvas.clearSelection', label: 'Limpar seleção', shortcut: 'A' }
      : { id: 'canvas.selectAll', label: 'Seleccionar todos os nós', disabled: !ctx.hasSelectAll, shortcut: 'A' },
    ...(hasSelection
      ? [
          {
            id: 'canvas.collapseAllNodeBodies',
            label: 'Retrair corpo de todos os nós',
            disabled: ctx.sceneAllNodesBodyCollapsed === true,
            separatorBefore: true,
          },
          {
            id: 'canvas.expandAllNodeBodies',
            label: 'Expandir corpo de todos os nós',
            disabled: ctx.sceneAnyNodeBodyCollapsed !== true,
          },
          {
            id: 'canvas.extractSceneNodesState',
            label: 'Extrair estados de índice de listas em Estados',
            separatorBefore: true,
          },
        ]
      : []),
    { id: 'canvas.toggleNavigateMode', label: navigateLabel, separatorBefore: true },
    {
      id: 'canvas.exibir',
      label: 'Exibir',
      separatorBefore: true,
      children: buildExibirSubmenuItems(ctx),
    },
  ]
}

function buildNodeItems(
  ctx: CanvasContextMenuBuildContext,
  nodeId: string,
): ContextMenuItem[] {
  const canvasNode = findCanvasNode(ctx.scene, nodeId)
  const isGlued = ctx.glueNodeId === nodeId
  const isSelected = ctx.selectedNodeIds.includes(nodeId)
  const bodyCollapsed = ctx.isNodeBodyCollapsed === true
  const nodeLocked = canvasNode ? isNodeLocked(canvasNode) : false
  const canDeleteNode = canvasNode ? isNodeRemovableFromScene(canvasNode) : false
  const cardBodyLayout = canvasNode ? resolveNodeCardBodyLayout(canvasNode) : 'bySectionType'
  const cardElementKeys = canvasNode ? collectCardElementViewKeys(canvasNode.node) : []
  const hasCardElements = cardElementKeys.length > 0
  const allElementsRetracted = canvasNode ? areAllCardElementsRetracted(canvasNode.node) : false
  const anyElementRetracted = canvasNode ? isAnyCardElementRetracted(canvasNode.node) : false

  const items: ContextMenuItem[] = [
    {
      id: 'node.toggleBodyCollapse',
      label: bodyCollapsed ? 'Expandir corpo do nó' : 'Retrair corpo do nó',
    },
    {
      id: 'node.organization',
      label: 'Organização',
      separatorBefore: true,
      children: [
        {
          id: 'node.organization.bySectionType',
          label: 'Separar por tipos de secções',
          selected: cardBodyLayout === 'bySectionType',
        },
        {
          id: 'node.organization.freeform',
          label: 'Forma livre',
          selected: cardBodyLayout === 'freeform',
        },
      ],
    },
  ]

  if (hasCardElements && !bodyCollapsed) {
    items.push({
      id: 'node.retractAllElements',
      label: 'Retrair todos os elementos',
      disabled: allElementsRetracted,
      separatorBefore: true,
    })
    items.push({
      id: 'node.expandAllElements',
      label: 'Expandir todos os elementos',
      disabled: !anyElementRetracted,
    })
  }

  items.push({
    id: 'node.extractSceneNodesState',
    label: 'Extrair estados de índice de listas em Estados',
    separatorBefore: true,
  })

  const linkedChildIds = collectLinkedChildNodeIds(ctx.scene, nodeId)

  if (linkedChildIds.size > 0) {
    items.push({
      id: 'node.hideLinkedChildNodes',
      label: 'Ocultar todos os nodes filhos',
      disabled: !isSelected,
      separatorBefore: true,
    })
  }

  items.push(
    { id: 'node.focus', label: 'Focar nó na vista', shortcut: '.' },
    { id: 'node.select', label: isSelected ? 'Já seleccionado' : 'Seleccionar nó', disabled: isSelected },
    { id: 'node.glue', label: isGlued ? 'Desactivar modo cola' : 'Modo cola (glue)', shortcut: 'G', separatorBefore: true },
    { id: 'node.addNode', label: 'Adicionar nó (raiz)', shortcut: 'Ctrl+K' },
    {
      id: 'node.delete',
      label: nodeLocked ? 'Apagar nó (travado)' : 'Apagar nó',
      danger: true,
      disabled: !canDeleteNode,
      separatorBefore: true,
    },
  )

  return items
}

function buildConnectionRoutingSubmenu(
  ctx: CanvasContextMenuBuildContext,
  connection: CanvasConnection,
  separatorBefore = false,
): ContextMenuItem | null {
  if (!ctx.onSetConnectionRouting) {
    return null
  }

  const current = effectiveConnectionRouting(connection.routing)

  return {
    id: 'slot.connectionRoutingMenu',
    label: 'Forma de ligação',
    separatorBefore,
    children: (['flex', 'rigid', 'wireless'] as const).map((routing) => ({
      id: setConnectionRoutingMenuId(connection.id, routing) as ContextMenuItemId,
      label: CONNECTION_ROUTING_LABELS[routing],
      selected: current === routing,
    })),
  }
}

function buildConnectionItems(
  ctx: CanvasContextMenuBuildContext,
  connectionId: string,
  scene: CanvasScene,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = []
  const connection = scene.connections.find((entry) => entry.id === connectionId)

  if (connection) {
    const routingMenu = buildConnectionRoutingSubmenu(ctx, connection, false)
    if (routingMenu) {
      items.push(routingMenu)
    }
  }

  if (ctx.onCycleConnectionRouting) {
    items.push({
      id: 'connection.cycleRouting',
      label: 'Alternar estilo do fio',
      separatorBefore: items.length > 0,
    })
  }

  if (ctx.onRemoveConnection) {
    items.push({
      id: 'connection.remove',
      label: 'Remover ligação',
      danger: true,
      separatorBefore: items.length > 0,
    })
  }

  return items
}

function buildElementItems(
  ctx: CanvasContextMenuBuildContext,
  target: Extract<CanvasContextTarget, { type: 'element' }>,
): ContextMenuItem[] {
  const canvasNode = findCanvasNode(ctx.scene, target.nodeId)

  if (!canvasNode) {
    return []
  }

  const items: ContextMenuItem[] = []
  const viewKey = elementViewKeyForTarget(target)

  if (viewKey) {
    const viewState = getElementViewState(canvasNode.node, viewKey)
    const compactLabel =
      viewState.mode === 'compact' ? 'Vista em lista' : 'Vista compacta'

    items.push({ id: 'element.toggleCompact', label: compactLabel })

    const retracted = Boolean(viewState.retracted)
    items.push({
      id: 'element.toggleRetracted',
      label: retracted ? 'Expandir elemento' : 'Retrair elemento',
      separatorBefore: true,
    })
  }

  if (isStructuralSlotContextKind(target.kind)) {
    items.push({
      id: 'element.showOnlyConnectedComponent',
      label: 'Mostrar apenas nós ligados',
      separatorBefore: items.length > 0,
    })
    items.push({
      id: 'element.showOnlySlotSubtree',
      label: 'Mostrar apenas nós ligados deste slot',
    })

    const slotId = outputSlotIdFromElementTarget(target)
    const outgoing =
      slotId !== null ? findConnectionFromOutputSlot(ctx.scene, target.nodeId, slotId) : undefined

    if (outgoing) {
      const routingMenu = buildConnectionRoutingSubmenu(ctx, outgoing, items.length > 0)
      if (routingMenu) {
        items.push(routingMenu)
      }

      items.push({
        id: 'element.focusPeerInputSlot',
        label: 'Focar no slot de entrada',
        separatorBefore: !routingMenu && items.length > 0,
      })
    }
  }

  if (target.kind === 'internalStructure') {
    items.push({ id: 'element.relink', label: 'Religar estrutura…', separatorBefore: true })
    items.push({ id: 'element.removeConnections', label: 'Remover ligações do slot' })
  }

  if (target.kind === 'list2EmbedInstance' || target.kind === 'list2PointerInstance') {
    items.push({
      id: 'element.removeInstance',
      label: 'Remover instância',
      danger: true,
      separatorBefore: items.length > 0,
    })
  } else {
    const removable = removableItemForTarget(
      canvasNode,
      target,
      ctx.parameterStubCatalog,
      ctx.scene,
    )

    if (removable) {
      items.push({
        id: 'element.remove',
        label: `Remover «${removable.name}»`,
        danger: true,
        separatorBefore: items.length > 0,
      })
    }
  }

  items.push({
    id: 'element.openElementMenu',
    label: 'Gerir elementos…',
    separatorBefore: items.length > 0,
  })

  return items
}

function labelForPeerOutputConnection(
  scene: CanvasScene,
  connection: { fromNodeId: string; fromInternalStructureId: string },
): string {
  const parent = findCanvasNode(scene, connection.fromNodeId)
  const slot = parent
    ? findOutputSlotInNode(parent, connection.fromInternalStructureId, scene.connections)
    : null
  const parentTitle = parent?.node.schema.title ?? connection.fromNodeId
  const slotName = slot?.name ?? connection.fromInternalStructureId

  return `${parentTitle} · ${slotName}`
}

function buildPeerOutputFocusItems(
  ctx: CanvasContextMenuBuildContext,
  nodeId: string,
): ContextMenuItem[] {
  const incoming = findIncomingConnections(ctx.scene, nodeId)

  if (incoming.length === 0) {
    return []
  }

  const separatorBefore = true

  if (incoming.length === 1) {
    return [
      {
        id: 'nodeInputPort.focusPeerOutputSlot',
        label: 'Focar no slot de saída',
        separatorBefore,
      },
    ]
  }

  return [
    {
      id: 'nodeInputPort.focusPeerOutputSlot',
      label: 'Focar no slot de saída',
      separatorBefore,
      children: incoming.map((connection) => ({
        id: focusPeerOutputSlotMenuId(connection.id) as ContextMenuItemId,
        label: labelForPeerOutputConnection(ctx.scene, connection),
      })),
    },
  ]
}

function buildNodeInputPortItems(
  ctx: CanvasContextMenuBuildContext,
  nodeId: string,
): ContextMenuItem[] {
  const canvasNode = findCanvasNode(ctx.scene, nodeId)

  if (!canvasNode) {
    return []
  }

  const hasIncoming = ctx.scene.connections.some((connection) => connection.toNodeId === nodeId)

  if (!hasIncoming) {
    return []
  }

  const items: ContextMenuItem[] = [
    { id: 'element.showOnlyConnectedComponent', label: 'Mostrar apenas nós ligados' },
    { id: 'element.showOnlySlotSubtree', label: 'Mostrar apenas nós ligados deste slot' },
    ...buildPeerOutputFocusItems(ctx, nodeId),
  ]

  const primaryIncoming = findIncomingConnections(ctx.scene, nodeId)[0]

  if (primaryIncoming) {
    const routingMenu = buildConnectionRoutingSubmenu(ctx, primaryIncoming, true)
    if (routingMenu) {
      items.push(routingMenu)
    }
  }

  return items
}

export function buildContextMenuItems(
  target: CanvasContextTarget,
  ctx: CanvasContextMenuBuildContext,
): ContextMenuItem[] {
  switch (target.type) {
    case 'canvas':
      return buildCanvasItems(ctx)
    case 'node':
      return buildNodeItems(ctx, target.nodeId)
    case 'nodeInputPort':
      return buildNodeInputPortItems(ctx, target.nodeId)
    case 'connection':
      return buildConnectionItems(ctx, target.connectionId, ctx.scene)
    case 'element':
      return buildElementItems(ctx, target)
    default:
      return []
  }
}
