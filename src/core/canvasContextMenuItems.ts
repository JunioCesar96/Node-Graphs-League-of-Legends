import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { canvasNodeHasBlockCode } from '@/core/blockRitualExport'
import { canvasNodeHasGroupCode } from '@/core/groupRitualExport'
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
  effectiveConnectionRouting,
  getConnectionRoutingLabel,
  setConnectionRoutingMenuId,
} from '@/core/connectionRoutingMenu'
import { findConnectionForBlockSlot } from '@/core/blockSlotConnections'
import { findConnectionForAddonSlot } from '@/core/addonSlotConnections'
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
import { CANVAS_TOOLBAR_LANG_IDS } from '@/core/language/canvasToolbarLangIds'
import { listRemovableNodeElements, type NodeElementListItem } from '@/core/listNodeElements'
import type { NodeParameterDefinition } from '@/core/nodeSchema'
import { LangId } from '@/core/language/languageIds'

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
  /** Exportar cena (Main) para ritual no CodeDock. */
  onGraphsToCode?: () => void
  /** Pré-visualizar subárvore do nó no CodeDock (League bin). */
  onViewNodeCode?: (nodeId: string) => void
  /** Pré-visualizar subárvore com tokens de bloco no CodeDock. */
  onViewNodeBlockCode?: (nodeId: string) => void
  /** Pré-visualizar código de bloco a partir do card de bloco seleccionado. */
  onPreviewBlockCardCode?: (nodeId: string) => void
  /** Pré-visualizar subárvore com tokens de grupo no CodeDock. */
  onViewNodeGroupCode?: (nodeId: string) => void
  onPreviewNodeVfx?: (nodeId: string) => void
  /** Sincronizar subárvore do nó seleccionado na aba activa do CodeDock. */
  onSyncNodeValueToCode?: (nodeId: string) => void
  /** CodeDock aberto com aba ritobin (.bin/.py) activa. */
  canSyncNodeToCode?: boolean
  /** Nó primário da selecção (sync só para este em selecção múltipla). */
  primarySelectedNodeId?: string
  /** Tradução UI (i18n). */
  tr?: (
    id: number,
    fallback: string,
    vars?: Readonly<Record<string, string | number>>,
  ) => string
  /** Abre o painel do menu Parâmetros do card de bloco (add / edit / remove). */
  onRequestBlockParameterPanel?: (
    nodeId: string,
    panel: 'add' | 'edit' | 'remove',
  ) => void
  blockParameterMenu?: {
    canAdd: boolean
    canEdit: boolean
    canRemove: boolean
  }
}

function trLabel(
  ctx: CanvasContextMenuBuildContext,
  id: number,
  fallback: string,
  vars?: Readonly<Record<string, string | number>>,
): string {
  return ctx.tr?.(id, fallback, vars) ?? fallback
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

  const langId = CANVAS_TOOLBAR_LANG_IDS[toolId]
  const fallback = CANVAS_TOOLBAR_TOOL_LABELS[toolId]

  return {
    id,
    label: trLabel(ctx, langId, fallback),
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
    {
      id: 'canvas.openGridControl',
      label: `${trLabel(ctx, LangId.CtxCanvasGrid, 'Grade')} ›`,
    },
    toolbarVisibilityItem('linkStatus', ctx, { contextLimited: !ctx.hasPendingLink }),
    toolbarVisibilityItem('navigateHint', ctx, { contextLimited: !ctx.viewportNavigateMode }),
  ]
}

function buildCanvasItems(ctx: CanvasContextMenuBuildContext): ContextMenuItem[] {
  const hasSelection = ctx.selectedNodeIds.length > 0
  const navigateLabel = ctx.viewportNavigateMode
    ? trLabel(ctx, LangId.CtxNavigateExit, 'Sair do modo mover na grade')
    : trLabel(ctx, LangId.CtxNavigateEnter, 'Mover na grade')

  const items: ContextMenuItem[] = [
    {
      id: 'canvas.addNode',
      label: trLabel(ctx, LangId.GraphCtxAddNode, 'Adicionar nó'),
      shortcut: 'Ctrl+K',
    },
    ...(ctx.onGraphsToCode
      ? [
          {
            id: 'canvas.graphsToCode' as const,
            label: trLabel(ctx, LangId.MenuGraphToCode, 'Node Graphs to Code'),
            separatorBefore: true,
          },
        ]
      : []),
    {
      id: 'canvas.undo',
      label: trLabel(ctx, LangId.GraphCtxUndo, 'Desfazer'),
      disabled: !ctx.canUndo,
      shortcut: 'Ctrl+Z',
      separatorBefore: true,
    },
    {
      id: 'canvas.redo',
      label: trLabel(ctx, LangId.GraphCtxRedo, 'Refazer'),
      disabled: !ctx.canRedo,
      shortcut: 'Ctrl+Y',
    },
    {
      id: 'canvas.focusSelection',
      label: trLabel(ctx, LangId.CtxFocusSelection, 'Focar seleção na vista'),
      disabled: !hasSelection,
      shortcut: '.',
      separatorBefore: true,
    },
    hasSelection
      ? {
          id: 'canvas.clearSelection',
          label: trLabel(ctx, LangId.CtxClearSelection, 'Limpar seleção'),
          shortcut: 'A',
        }
      : {
          id: 'canvas.selectAll',
          label: trLabel(ctx, LangId.CtxSelectAllNodes, 'Seleccionar todos os nós'),
          disabled: !ctx.hasSelectAll,
          shortcut: 'A',
        },
    ...(hasSelection
      ? [
          {
            id: 'canvas.collapseAllNodeBodies',
            label: trLabel(ctx, LangId.CtxCollapseAllBodies, 'Retrair corpo de todos os nós'),
            disabled: ctx.sceneAllNodesBodyCollapsed === true,
            separatorBefore: true,
          },
          {
            id: 'canvas.expandAllNodeBodies',
            label: trLabel(ctx, LangId.CtxExpandAllBodies, 'Expandir corpo de todos os nós'),
            disabled: ctx.sceneAnyNodeBodyCollapsed !== true,
          },
          {
            id: 'canvas.extractSceneNodesState',
            label: trLabel(
              ctx,
              LangId.CtxExtractSceneState,
              'Extrair estados de índice de listas em Estados',
            ),
            separatorBefore: true,
          },
        ]
      : []),
    { id: 'canvas.toggleNavigateMode', label: navigateLabel, separatorBefore: true },
    {
      id: 'canvas.exibir',
      label: trLabel(ctx, LangId.CtxExibir, 'Exibir'),
      separatorBefore: true,
      children: buildExibirSubmenuItems(ctx),
    },
  ]

  return items
}

function isStructureCardView(canvasNode: CanvasNode | undefined): boolean {
  if (!canvasNode) {
    return false
  }
  return Boolean(
    (canvasNode.groupViewActive && canvasNode.groupStructure) ||
      (canvasNode.blockViewActive && canvasNode.blockStructure),
  )
}

function buildStructureCardItems(
  ctx: CanvasContextMenuBuildContext,
  nodeId: string,
  canvasNode: CanvasNode,
): ContextMenuItem[] {
  const isGlued = ctx.glueNodeId === nodeId
  const isSelected = ctx.selectedNodeIds.includes(nodeId)
  const nodeLocked = isNodeLocked(canvasNode)
  const canDeleteNode = isNodeRemovableFromScene(canvasNode)
  const isBlockCard = Boolean(canvasNode.blockViewActive && canvasNode.blockStructure)
  const paramsExpanded = canvasNode.structureCardParamsExpanded === true

  if (isBlockCard) {
    const items: ContextMenuItem[] = [
      {
        id: 'node.focus',
        label: trLabel(ctx, LangId.CtxFocusNode, 'Focar nó na vista'),
        shortcut: '.',
      },
      {
        id: 'node.select',
        label: isSelected
          ? trLabel(ctx, LangId.CtxAlreadySelected, 'Já seleccionado')
          : trLabel(ctx, LangId.CtxSelectNode, 'Seleccionar nó'),
        disabled: isSelected,
      },
      {
        id: 'node.glue',
        label: isGlued
          ? trLabel(ctx, LangId.CtxGlueDisable, 'Desactivar modo cola')
          : trLabel(ctx, LangId.CtxGlueEnable, 'Modo cola (glue)'),
        shortcut: 'G',
      },
      ...(ctx.onRequestBlockParameterPanel && ctx.blockParameterMenu
        ? [
            {
              id: 'node.blockParameters' as const,
              label: trLabel(ctx, LangId.BlockCardParameterMenu, 'Parâmetros'),
              separatorBefore: true,
              children: [
                {
                  id: 'node.blockParameters.add' as const,
                  label: 'Adicionar',
                  disabled: nodeLocked || !ctx.blockParameterMenu.canAdd,
                },
                {
                  id: 'node.blockParameters.edit' as const,
                  label: 'Editar',
                  disabled:
                    nodeLocked ||
                    !ctx.blockParameterMenu.canEdit ||
                    (canvasNode.blockStructure?.parameters.length ?? 0) === 0,
                },
                {
                  id: 'node.blockParameters.remove' as const,
                  label: 'Remover',
                  disabled:
                    nodeLocked ||
                    !ctx.blockParameterMenu.canRemove ||
                    (canvasNode.blockStructure?.parameters.length ?? 0) === 0,
                },
              ],
            },
          ]
        : []),
      ...(ctx.onPreviewBlockCardCode
        ? [
            {
              id: 'node.codigo' as const,
              label: trLabel(ctx, LangId.CtxCodeSubmenu, 'Código'),
              separatorBefore: true,
              children: [
                {
                  id: 'node.codigoPreviewBlock' as const,
                  label: trLabel(ctx, LangId.GraphCtxBlockCodePreview, 'Código Preview Block'),
                },
              ],
            },
          ]
        : []),
      {
        id: 'node.delete',
        label: nodeLocked
          ? `${trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó')} (travado)`
          : trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó'),
        danger: true,
        disabled: !canDeleteNode,
        separatorBefore: true,
      },
    ]

    return items
  }

  const items: ContextMenuItem[] = [
    {
      id: 'node.toggleStructureCardParamsExpanded',
      label: paramsExpanded
        ? trLabel(ctx, LangId.CtxCollapseStructureCardParams, 'Reduzir parâmetros (linha única)')
        : trLabel(ctx, LangId.CtxExpandStructureCardParams, 'Expandir parâmetros (nome completo)'),
    },
    {
      id: 'node.structureCardResizeHint',
      label: trLabel(
        ctx,
        LangId.CtxStructureCardResizeHint,
        'Alargar card (bordas laterais)',
      ),
      shortcut: 'Ctrl+arrastar',
      disabled: true,
    },
  ]

  if (ctx.onViewNodeCode || ctx.onViewNodeBlockCode || ctx.onViewNodeGroupCode || ctx.onSyncNodeValueToCode) {
    const codeChildren: ContextMenuItem[] = []
    if (ctx.onViewNodeCode) {
      codeChildren.push({
        id: 'node.viewCode',
        label: trLabel(ctx, LangId.GraphCtxViewCode, 'Ver código League bin'),
      })
    }
    if (ctx.onViewNodeBlockCode && canvasNodeHasBlockCode(ctx.scene, nodeId)) {
      codeChildren.push({
        id: 'node.viewBlockCode',
        label: trLabel(ctx, LangId.GraphCtxViewBlockCode, 'Ver código de bloco'),
      })
    }
    if (ctx.onViewNodeGroupCode && canvasNodeHasGroupCode(ctx.scene, nodeId)) {
      codeChildren.push({
        id: 'node.viewGroupCode',
        label: trLabel(ctx, LangId.GraphCtxViewGroupCode, 'Ver código de grupo'),
      })
    }
    if (ctx.onSyncNodeValueToCode) {
      const isPrimarySelection =
        !ctx.primarySelectedNodeId || ctx.primarySelectedNodeId === nodeId
      codeChildren.push({
        id: 'node.syncValueToCode',
        label: trLabel(ctx, LangId.GraphCtxSyncToCode, 'Sincronizar valores para o código'),
        disabled: !isSelected || !ctx.canSyncNodeToCode || !isPrimarySelection,
      })
    }
    if (codeChildren.length > 0) {
      items.push({
        id: 'node.codigo',
        label: trLabel(ctx, LangId.CtxCodeSubmenu, 'Código'),
        separatorBefore: true,
        children: codeChildren,
      })
    }
  }

  items.push(
    {
      id: 'node.focus',
      label: trLabel(ctx, LangId.CtxFocusNode, 'Focar nó na vista'),
      shortcut: '.',
      separatorBefore: true,
    },
    {
      id: 'node.select',
      label: isSelected
        ? trLabel(ctx, LangId.CtxAlreadySelected, 'Já seleccionado')
        : trLabel(ctx, LangId.CtxSelectNode, 'Seleccionar nó'),
      disabled: isSelected,
    },
    {
      id: 'node.glue',
      label: isGlued
        ? trLabel(ctx, LangId.CtxGlueDisable, 'Desactivar modo cola')
        : trLabel(ctx, LangId.CtxGlueEnable, 'Modo cola (glue)'),
      shortcut: 'G',
      separatorBefore: true,
    },
    {
      id: 'node.delete',
      label: nodeLocked
        ? `${trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó')} (travado)`
        : trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó'),
      danger: true,
      disabled: !canDeleteNode,
      separatorBefore: true,
    },
  )

  return items
}

function buildNodeItems(
  ctx: CanvasContextMenuBuildContext,
  nodeId: string,
): ContextMenuItem[] {
  const canvasNode = findCanvasNode(ctx.scene, nodeId)
  if (isStructureCardView(canvasNode)) {
    return buildStructureCardItems(ctx, nodeId, canvasNode!)
  }

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
      label: bodyCollapsed
        ? trLabel(ctx, LangId.CtxExpandNodeBody, 'Expandir corpo do nó')
        : trLabel(ctx, LangId.CtxCollapseNodeBody, 'Retrair corpo do nó'),
    },
    {
      id: 'node.organization',
      label: trLabel(ctx, LangId.CtxOrganization, 'Organização'),
      separatorBefore: true,
      children: [
        {
          id: 'node.organization.bySectionType',
          label: trLabel(ctx, LangId.CtxOrgBySection, 'Separar por tipos de secções'),
          selected: cardBodyLayout === 'bySectionType',
        },
        {
          id: 'node.organization.freeform',
          label: trLabel(ctx, LangId.CtxOrgFreeform, 'Forma livre'),
          selected: cardBodyLayout === 'freeform',
        },
      ],
    },
  ]

  if (hasCardElements && !bodyCollapsed) {
    items.push({
      id: 'node.retractAllElements',
      label: trLabel(ctx, LangId.CtxRetractAllElements, 'Retrair todos os elementos'),
      disabled: allElementsRetracted,
      separatorBefore: true,
    })
    items.push({
      id: 'node.expandAllElements',
      label: trLabel(ctx, LangId.CtxExpandAllElements, 'Expandir todos os elementos'),
      disabled: !anyElementRetracted,
    })
  }

  items.push({
    id: 'node.extractSceneNodesState',
    label: trLabel(ctx, LangId.CtxExtractSceneState, 'Extrair estados de índice de listas em Estados'),
    separatorBefore: true,
  })

  if (ctx.onViewNodeCode || ctx.onViewNodeBlockCode || ctx.onViewNodeGroupCode || ctx.onPreviewNodeVfx || ctx.onSyncNodeValueToCode) {
    const codeChildren: ContextMenuItem[] = []
    if (ctx.onViewNodeCode) {
      codeChildren.push({
        id: 'node.viewCode',
        label: trLabel(ctx, LangId.GraphCtxViewCode, 'Ver código League bin'),
      })
    }
    if (ctx.onViewNodeBlockCode && canvasNodeHasBlockCode(ctx.scene, nodeId)) {
      codeChildren.push({
        id: 'node.viewBlockCode',
        label: trLabel(ctx, LangId.GraphCtxViewBlockCode, 'Ver código de bloco'),
      })
    }
    if (ctx.onViewNodeGroupCode && canvasNodeHasGroupCode(ctx.scene, nodeId)) {
      codeChildren.push({
        id: 'node.viewGroupCode',
        label: trLabel(ctx, LangId.GraphCtxViewGroupCode, 'Ver código de grupo'),
      })
    }
    if (
      ctx.onPreviewNodeVfx &&
      canvasNode?.node.schema.title === 'VfxSystemDefinitionData'
    ) {
      codeChildren.push({
        id: 'node.previewVfx',
        label: trLabel(ctx, LangId.CtxPreviewVfx, 'Pré-visualizar VFX'),
      })
    }
    if (ctx.onSyncNodeValueToCode) {
      const isPrimarySelection =
        !ctx.primarySelectedNodeId || ctx.primarySelectedNodeId === nodeId
      codeChildren.push({
        id: 'node.syncValueToCode',
        label: trLabel(ctx, LangId.GraphCtxSyncToCode, 'Sincronizar valores para o código'),
        disabled: !isSelected || !ctx.canSyncNodeToCode || !isPrimarySelection,
      })
    }
    items.push({
      id: 'node.codigo',
      label: trLabel(ctx, LangId.CtxCodeSubmenu, 'Código'),
      separatorBefore: true,
      children: codeChildren,
    })
  }

  if (ctx.onGraphsToCode && canvasNode?.node.schema.id === 'main') {
    items.push({
      id: 'node.graphsToCode',
      label: trLabel(ctx, LangId.MenuGraphToCode, 'Node Graphs to Code'),
    })
  }

  const linkedChildIds = collectLinkedChildNodeIds(ctx.scene, nodeId)

  if (linkedChildIds.size > 0) {
    items.push({
      id: 'node.hideLinkedChildNodes',
      label: trLabel(ctx, LangId.CtxHideLinkedChildren, 'Ocultar todos os nodes filhos'),
      disabled: !isSelected,
      separatorBefore: true,
    })
  }

  items.push(
    {
      id: 'node.focus',
      label: trLabel(ctx, LangId.CtxFocusNode, 'Focar nó na vista'),
      shortcut: '.',
    },
    {
      id: 'node.select',
      label: isSelected
        ? trLabel(ctx, LangId.CtxAlreadySelected, 'Já seleccionado')
        : trLabel(ctx, LangId.CtxSelectNode, 'Seleccionar nó'),
      disabled: isSelected,
    },
    {
      id: 'node.glue',
      label: isGlued
        ? trLabel(ctx, LangId.CtxGlueDisable, 'Desactivar modo cola')
        : trLabel(ctx, LangId.CtxGlueEnable, 'Modo cola (glue)'),
      shortcut: 'G',
      separatorBefore: true,
    },
    {
      id: 'node.addNode',
      label: trLabel(ctx, LangId.CtxAddNodeRoot, 'Adicionar nó (raiz)'),
      shortcut: 'Ctrl+K',
    },
    {
      id: 'node.delete',
      label: nodeLocked
        ? `${trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó')} (travado)`
        : trLabel(ctx, LangId.GraphCtxDeleteNode, 'Apagar nó'),
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
    label: trLabel(ctx, LangId.CtxWireForm, 'Forma de ligação'),
    separatorBefore,
    children: (['flex', 'rigid', 'wireless'] as const).map((routing) => ({
      id: setConnectionRoutingMenuId(connection.id, routing) as ContextMenuItemId,
      label: getConnectionRoutingLabel(routing, ctx.tr),
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
      label: trLabel(ctx, LangId.CtxCycleWireStyle, 'Alternar estilo do fio'),
      separatorBefore: items.length > 0,
    })
  }

  if (ctx.onRemoveConnection) {
    items.push({
      id: 'connection.remove',
      label: trLabel(ctx, LangId.CtxRemoveConnection, 'Remover ligação'),
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
      viewState.mode === 'compact'
        ? trLabel(ctx, LangId.CtxElementListView, 'Vista em lista')
        : trLabel(ctx, LangId.CtxElementCompactView, 'Vista compacta')

    items.push({ id: 'element.toggleCompact', label: compactLabel })

    const retracted = Boolean(viewState.retracted)
    items.push({
      id: 'element.toggleRetracted',
      label: retracted
        ? trLabel(ctx, LangId.CtxExpandElement, 'Expandir elemento')
        : trLabel(ctx, LangId.CtxRetractElement, 'Retrair elemento'),
      separatorBefore: true,
    })
  }

  if (isStructuralSlotContextKind(target.kind)) {
    items.push({
      id: 'element.showOnlyConnectedComponent',
      label: trLabel(ctx, LangId.CtxShowOnlyConnected, 'Mostrar apenas nós ligados'),
      separatorBefore: items.length > 0,
    })
    items.push({
      id: 'element.showOnlySlotSubtree',
      label: trLabel(ctx, LangId.CtxShowOnlySlotSubtree, 'Mostrar apenas nós ligados deste slot'),
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
        label: trLabel(ctx, LangId.CtxFocusInputSlot, 'Focar no slot de entrada'),
        separatorBefore: !routingMenu && items.length > 0,
      })
    }
  }

  if (target.kind === 'internalStructure') {
    items.push({
      id: 'element.relink',
      label: trLabel(ctx, LangId.CtxRelinkStructure, 'Religar estrutura…'),
      separatorBefore: true,
    })
    items.push({
      id: 'element.removeConnections',
      label: trLabel(ctx, LangId.CtxRemoveSlotConnections, 'Remover ligações do slot'),
    })
  }

  if (target.kind === 'list2EmbedInstance' || target.kind === 'list2PointerInstance') {
    items.push({
      id: 'element.removeInstance',
      label: trLabel(ctx, LangId.CtxRemoveInstance, 'Remover instância'),
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
        label: trLabel(ctx, LangId.CtxRemoveElement, 'Remover «{name}»', { name: removable.name }),
        danger: true,
        separatorBefore: items.length > 0,
      })
    }
  }

  items.push({
    id: 'element.openElementMenu',
    label: trLabel(ctx, LangId.CtxManageElements, 'Gerir elementos…'),
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
        label: trLabel(ctx, LangId.CtxFocusOutputSlot, 'Focar no slot de saída'),
        separatorBefore,
      },
    ]
  }

  return [
    {
      id: 'nodeInputPort.focusPeerOutputSlot',
      label: trLabel(ctx, LangId.CtxFocusOutputSlot, 'Focar no slot de saída'),
      separatorBefore,
      children: incoming.map((connection) => ({
        id: focusPeerOutputSlotMenuId(connection.id) as ContextMenuItemId,
        label: labelForPeerOutputConnection(ctx.scene, connection),
      })),
    },
  ]
}

function buildCanvasSlotItems(
  ctx: CanvasContextMenuBuildContext,
  target: {
    nodeId: string
    slotId: string
    direction: 'input' | 'output'
  },
  connection: CanvasConnection | undefined,
): ContextMenuItem[] {
  if (!connection) {
    return []
  }

  const items: ContextMenuItem[] = [
    {
      id: 'blockSlot.removeConnections',
      label: trLabel(ctx, LangId.CtxRemoveSlotConnections, 'Remover ligações do slot'),
      danger: true,
    },
    {
      id: 'blockSlot.focusPeerSlot',
      label:
        target.direction === 'output'
          ? trLabel(ctx, LangId.CtxFocusInputSlot, 'Focar no slot de entrada')
          : trLabel(ctx, LangId.CtxFocusOutputSlot, 'Focar no slot de saída'),
      separatorBefore: true,
    },
  ]

  const routingMenu = buildConnectionRoutingSubmenu(ctx, connection, true)
  if (routingMenu) {
    items.push(routingMenu)
  }

  return items
}

function buildBlockSlotItems(
  ctx: CanvasContextMenuBuildContext,
  target: Extract<CanvasContextTarget, { type: 'blockSlot' }>,
): ContextMenuItem[] {
  return buildCanvasSlotItems(
    ctx,
    target,
    findConnectionForBlockSlot(ctx.scene, target.nodeId, target.slotId, {
      connectionIndex: target.connectionIndex,
    }),
  )
}

function buildAddonSlotItems(
  ctx: CanvasContextMenuBuildContext,
  target: Extract<CanvasContextTarget, { type: 'addonSlot' }>,
): ContextMenuItem[] {
  return buildCanvasSlotItems(
    ctx,
    target,
    findConnectionForAddonSlot(ctx.scene, target.nodeId, target.slotId),
  )
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
    {
      id: 'element.showOnlyConnectedComponent',
      label: trLabel(ctx, LangId.CtxShowOnlyConnected, 'Mostrar apenas nós ligados'),
    },
    {
      id: 'element.showOnlySlotSubtree',
      label: trLabel(ctx, LangId.CtxShowOnlySlotSubtree, 'Mostrar apenas nós ligados deste slot'),
    },
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
    case 'blockSlot':
      return buildBlockSlotItems(ctx, target)
    case 'addonSlot':
      return buildAddonSlotItems(ctx, target)
    case 'element':
      return buildElementItems(ctx, target)
    default:
      return []
  }
}
