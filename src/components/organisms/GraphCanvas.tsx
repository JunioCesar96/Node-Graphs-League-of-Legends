import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react'

import { CanvasContextMenu } from '@/components/molecules/CanvasContextMenu'
import { CollectionTypeLinkMenu } from '@/components/molecules/CollectionTypeLinkMenu'
import { SceneCameraPanel } from '@/components/molecules/SceneCameraPanel'
import { AddNodePalette } from '@/components/organisms/AddNodePalette'
import { RitualNeekoStagingPreview } from '@/components/molecules/RitualNeekoStagingPreview'
import { NodeCard } from '@/components/organisms/NodeCard'
import { BlockCard } from '@/components/organisms/BlockCard'
import { GroupCard } from '@/components/organisms/GroupCard'
import { useRitualDragOptional } from '@/ritualDrag/RitualDragContext'
import { useRitualDragCanvasDrop } from '@/hooks/useRitualDragCanvasDrop'
import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene, SceneCamera } from '@/core/canvasScene'
import { isCanvasNodeBodyCollapsed } from '@/core/canvasScene'
import {
  canvasNodeBodyStyle,
  canvasNodeCardStyle,
  canvasNodeInputPortStyle,
  createCompactElementCanvasVisibility,
  getNodeDisplayTitle,
  isNodeBodyEffectivelyCollapsed,
  isNodeLocked,
  isNodeVisibleOnCanvas,
} from '@/core/canvasNodePresentation'
import {
  buildWirelessDisplayByNode,
  type WirelessPortPulseTarget,
  type WirelessPeerHoverPayload,
} from '@/core/connectionDisplay'
import {
  buildBlockWirelessDisplayByNode,
  type BlockSlotWirelessLink,
} from '@/core/blockConnectionDisplay'
import {
  buildGroupWirelessDisplayByNode,
  type GroupSlotWirelessLink,
} from '@/core/groupConnectionDisplay'
import { resolveBlockCardWidth, resolveGroupCardWidth } from '@/core/structureCardLayout'
import {
  createBlockDraftConnectionPath,
  estimateBlockCardHeight,
  findBlockSlotAtPoint,
  isBlockSlotConnection,
  resolveBlockConnectionPath,
  resolveBlockSlotCanvasPoint,
} from '@/core/blockSlotConnections'
import {
  createGroupDraftConnectionPath,
  estimateGroupCardHeight,
  findGroupSlotAtPoint,
  isGroupSlotConnection,
  resolveGroupConnectionPath,
  resolveGroupSlotCanvasPoint,
} from '@/core/groupSlotConnections'
import {
  findConnectionTargetForSlot,
  getNodesByCollectionType,
  nodesShareCollectionTypeForOutputSlot,
  resolveCollectionTypeForInternalStructure,
  schemaMatchesCollectionType,
} from '@/core/collectionTypeLinking'
import {
  findSlotInEmbedSchema,
  populatedSlotsForEmbed,
  resolveCollectionTypeForEmbedSlot,
} from '@/core/embedSlots'
import {
  findSlotInPointerSchema,
  resolveCollectionTypeForPointerSlot,
} from '@/core/pointerSlots'
import {
  findOutputSlotInNode,
  findSlotInSchema as findSlotInListEmbedSchema,
  resolveCollectionTypeForListEmbedSlot,
  populatedSlotsForListEmbed,
} from '@/core/listEmbedSlots'
import {
  findSlotInSchema as findSlotInListPointerSchema,
  resolveCollectionTypeForListPointerSlot,
} from '@/core/listPointerSlots'
import {
  estimateMapHashEmbedParameterHeight,
  findMapHashEmbedEntryBySlotId,
  getMapHashEmbedStructurePortYOffset,
  isMapHashEmbedSlotId,
  mapHashEmbedSlotsForParameter,
  resolveCollectionTypeForMapHashEmbedSlot,
} from '@/core/mapHashEmbedSlots'
import { parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import {
  estimateMapHashPointerParameterHeight,
  findMapHashPointerEntryBySlotId,
  getMapHashPointerStructurePortYOffset,
  isMapHashPointerSlotId,
  mapHashPointerSlotsForParameter,
  resolveCollectionTypeForMapHashPointerSlot,
} from '@/core/mapHashPointerSlots'
import { parseMapHashPointerString } from '@/core/mapHashPointerValue'
import {
  estimateMapU64PointerParameterHeight,
  findMapU64PointerEntryBySlotId,
  getMapU64PointerStructurePortYOffset,
  isMapU64PointerSlotId,
  mapU64PointerSlotsForParameter,
  resolveCollectionTypeForMapU64PointerSlot,
} from '@/core/mapU64PointerSlots'
import { parseMapU64PointerString } from '@/core/mapU64PointerValue'
import {
  ELEMENT_RETRACTED_ROW_HEIGHT,
  isElementCompact,
  isElementRetracted,
  listSlotsCompactHeight,
  mapHashStructureCompactHeight,
  parameterMapCompact,
} from '@/core/elementViewLayout'
import {
  elementViewKeyForEmbed,
  elementViewKeyForList2Embed,
  elementViewKeyForList2Pointer,
  elementViewKeyForListEmbed,
  elementViewKeyForListPointer,
  elementViewKeyForOutputSlot,
  elementViewKeyForParameter,
  elementViewKeyForPointer,
  getElementViewState,
} from '@/core/elementViewState'
import type { ElementViewKey } from '@/core/nodeSchema'
import { listRemovableNodeElements } from '@/core/listNodeElements'
import { populatedSlotsForPointer } from '@/core/pointerSlots'
import { populatedSlotsForListPointer } from '@/core/listPointerSlots'
import type { NodeElementListItem } from '@/core/listNodeElements'
import type { InternalStructureDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  isNodeCardFreeform,
  isNodeCardSectionExpanded,
  NODE_CARD_SECTION_CONTENT_GAP,
  NODE_CARD_SECTION_HEADER_HEIGHT,
  NODE_CARD_WIDTH,
  nodeCardSectionChromeHeight,
  resolveNodeCardBodyLayout,
  resolveNodeCardSectionOrderForCanvasNode,
  type NodeCardBodyLayout,
  type NodeCardSectionId,
} from '@/core/nodeCardSections'
import { isParameterPickerOpen } from '@/core/parameterPickerModal'
import { shouldIgnoreCanvasWheelShortcut } from '@/core/canvasKeyboardGuard'
import {
  GRAPH_CANVAS_SCOPE_ATTR,
  GRAPH_CANVAS_SCOPE_ID,
  useGraphCanvasShortcutHandlers,
  type GraphCanvasShortcutRefs,
} from '@/shortcuts/useGraphCanvasShortcutHandlers'
import { schemaJsonRelativePathBySchemaId } from '@/core/nodeStructureRegistry'
import { schemaRegistry } from '@/core/nodeStructureRegistry'
import {
  CANVAS_CONNECTION_ID_ATTR,
  CANVAS_CONTEXT_ELEMENT_ID_ATTR,
  CANVAS_CONTEXT_KIND_ATTR,
  CANVAS_CONTEXT_NODE_ID_ATTR,
  ELEMENT_MENU_TRIGGER_ATTR,
} from '@/core/canvasContextMenuAttributes'
import { buildContextMenuItems } from '@/core/canvasContextMenuItems'
import { useJadeSurfaceTheme } from '@/hooks/useJadeSurfaceTheme'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'
import {
  DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
  toggleToolbarVisibility,
  type CanvasToolbarToolId,
  type CanvasToolbarVisibility,
} from '@/core/canvasToolbarVisibility'
import { resolveContextTarget } from '@/core/canvasContextMenuResolve'
import {
  collectGraphPortAnchors,
  emptyPortAnchorMaps,
  graphPointFromElementCenter,
  outputAnchorKey,
  type PortAnchorMaps,
} from '@/core/graphPortAnchors'
import { parseSetConnectionRoutingMenuId } from '@/core/connectionRoutingMenu'
import {
  buildPortFocusPulseTarget,
  findConnectionFromOutputSlot,
  findIncomingConnections,
  outputSlotIdFromElementTarget,
  parseFocusPeerOutputSlotMenuId,
  peerInputFromConnection,
  peerOutputFromConnection,
} from '@/core/slotPeerFocus'
import type { OutputSlotPeerActions } from '@/core/outputSlotPeerActions'
import {
  peerVisibilityOverlayPatch,
  peerVisibilityState,
  resolveOutputSlotPeer,
} from '@/core/outputSlotPeerState'
import { isStructuralSlotContextKind } from '@/core/sceneNodeLinkVisibility'
import type {
  CanvasContextMenuAnchor,
  CanvasContextTarget,
  ContextMenuItemId,
} from '@/core/canvasContextMenuTypes'

import styles from './GraphCanvas.module.css'

const CARD_WIDTH = NODE_CARD_WIDTH
const HEADER_HEIGHT = 56
/** Alinhado a `--node-card-body-padding-y` no NodeCard (só eixo vertical). */
const BODY_PADDING = 20
const SECTION_TITLE_HEIGHT = 16
const SECTION_TITLE_GAP = 8
/** Altura por linha na secção Internal_Structures (layout compacto). */
const INTERNAL_STRUCTURE_ITEM_HEIGHT = 44
/** Cabeçalho de cada bloco EMBED / LIST_EMBED (título + botões). */
const EMBED_BLOCK_HEADER_HEIGHT = 42
const LIST_EMBED_BLOCK_HEADER_HEIGHT = EMBED_BLOCK_HEADER_HEIGHT
/** Altura por parâmetro: pilha nome (hint+label) + valor + tipo (cards). */
const PARAMETER_ITEM_HEIGHT = 128
/** Alinhado a `--node-card-list-gap`. */
const ITEM_GAP = 12
/** Alinhado a `--node-card-section-gap`. */
const SECTION_GAP = 16
const PORT_OVERLAP = 6
const RIGID_SEGMENT_LENGTH = 44
const BUTTON_HEIGHT = 46
const MIN_SCALE = 0.15
const MAX_SCALE = 1.25
const SCALE_STEP = 0.1
const SNAP_GRID_PX = 24

const DROP_TO_OPEN_LINK_PALETTE_PX = 12
const NAVIGATE_MODE_RELEASE_PX = 4

export type GraphCanvasHandle = {
  focusSelectionIntoView(nodeIds: string[]): void
  openPalette: () => void
}

type GraphCanvasProps = {
  availableSchemas: NodeSchemaDefinition[]
  /** Nome da pasta sob `src/nodeStructures/` por id de schema (filtro 📂 na paleta). */
  schemaPackFolderBySchemaId?: Record<string, string>
  schemaJsonRelativePathBySchemaId?: Record<string, string>
  /** Subpasta imediata dentro do pack (`''` = raiz); `temp` não aparece como etiqueta. */
  schemaStructureSubfolderBySchemaId?: Record<string, string>
  /** Módulo = JSON na raiz do pack; base = subpasta `pack_Type/Type.json` (exceto temp). */
  schemaNodeKindBySchemaId?: Record<string, 'module' | 'base'>
  /** Catálogo de parâmetros-stub na mesma pasta (só sentido para nó base). */
  schemaBaseParameterCatalogBySchemaId?: Record<string, NodeParameterDefinition[]>
  /** Outros nós base do mesmo pack com mesmo `#N` em nomenclature.group. */
  schemaBaseInternalStructureCatalogBySchemaId?: Record<string, InternalStructureDefinition[]>
  canRedo: boolean
  canUndo: boolean
  paletteRequestSignal?: number
  onCloseCodePanelShortcut?: () => void
  onConnectNodes: (connection: CanvasConnection) => void
  onRelinkInternalStructure?: (
    fromNodeId: string,
    structureId: string,
    targetNodeId: string,
  ) => void
  onCycleConnectionRouting?: (connectionId: string) => void
  onSetConnectionRouting?: (
    connectionId: string,
    routing: import('@/core/canvasScene').ConnectionRouting,
  ) => void
  onCreateChildNode: (
    fromNodeId: string,
    structure: InternalStructureDefinition,
    position?: CanvasPosition,
  ) => void
  onCreateRootNode: (schema: NodeSchemaDefinition, position?: CanvasPosition) => void
  onDeleteNodeIds?: (nodeIds: string[]) => void
  onToggleNodeBodyCollapsed?: (nodeId: string) => void
  onToggleStructureCardParamsExpanded?: (nodeId: string) => void
  onSetStructureCardWidth?: (nodeId: string, width: number, positionX?: number) => void
  onSetAllNodesBodyCollapsed?: (collapsed: boolean) => void
  onToggleNodeCardSection?: (nodeId: string, sectionId: NodeCardSectionId) => void
  onSetNodeCardSectionOrder?: (nodeId: string, sectionId: NodeCardSectionId, oneBasedIndex: number) => void
  onSetNodeCardBodyLayout?: (nodeId: string, layout: NodeCardBodyLayout) => void
  onMarqueeCommit: (payload: { additive: boolean; nodeIds: string[] }) => void
  onMoveNode: (
    nodeId: string,
    position: CanvasPosition,
    modifiers: { axisLock: '' | 'x' | 'y'; snapGrid: boolean },
  ) => void
  onRedo: () => void
  onRemoveConnection?: (connectionId: string) => void
  onResetScene: () => void
  hints?: Record<string, string>
  onAppendEmbedCatalogItem?: (
    canvasNodeId: string,
    embedId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendListEmbedCatalogItem?: (
    canvasNodeId: string,
    listEmbedId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendPointerCatalogItem?: (
    canvasNodeId: string,
    pointerId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendListPointerCatalogItem?: (
    canvasNodeId: string,
    listPointerId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendList2EmbedCatalogItem?: (
    canvasNodeId: string,
    list2EmbedId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendList2PointerCatalogItem?: (
    canvasNodeId: string,
    list2PointerId: string,
    structure: InternalStructureDefinition,
  ) => void
  onRemoveList2EmbedInstance?: (
    canvasNodeId: string,
    list2EmbedId: string,
    instanceId: string,
  ) => void
  onRemoveList2PointerInstance?: (
    canvasNodeId: string,
    list2PointerId: string,
    instanceId: string,
  ) => void
  onCatalogParameterAppend?: (canvasNodeId: string, definition: NodeParameterDefinition) => void
  onRequestRemoveElement?: (canvasNodeId: string, item: NodeElementListItem) => void
  /** Com seleção: limpa todos os nós. Sem seleção: delega seleccionar todos. */
  onClearSelection?: () => void
  onSelectAllNodesShortcut?: () => void
  onSelectNode: (nodeId: string, options?: { additive?: boolean }) => void
  onUndo: () => void
  /** Actualiza o valor de um parâmetro directamente no card do nó. */
  onUpdateNodeParameter?: (canvasNodeId: string, parameterId: string, value: string) => void
  onSetElementViewMode?: (
    canvasNodeId: string,
    elementKey: import('@/core/nodeSchema').ElementViewKey,
    mode: import('@/core/nodeSchema').ElementViewMode,
  ) => void
  onSetElementRetracted?: (
    canvasNodeId: string,
    elementKey: import('@/core/nodeSchema').ElementViewKey,
    retracted: boolean,
  ) => void
  onSetAllNodeElementsRetracted?: (canvasNodeId: string, retracted: boolean) => void
  onSetElementSelectedIndex?: (
    canvasNodeId: string,
    elementKey: import('@/core/nodeSchema').ElementViewKey,
    index: number,
  ) => void
  onRemoveConnectionsFromOutputSlot?: (canvasNodeId: string, structureId: string) => void
  onShowOnlyConnectedComponent?: (canvasNodeId: string) => void
  onShowOnlySlotSubtree?: (canvasNodeId: string, slotId: string) => void
  onShowOnlyIncomingSlotBranch?: (canvasNodeId: string) => void
  /** Oculta (`sceneHidden`) todos os descendentes ligados por saídas do nó. */
  onHideLinkedChildNodes?: (canvasNodeId: string) => void
  /** Reordena parâmetros no card (índice 1-based na lista actual). */
  onSetNodeParameterOrder?: (
    canvasNodeId: string,
    parameterId: string,
    oneBasedIndex: number,
  ) => void
  onSetNodeCardSectionOrder?: (
    canvasNodeId: string,
    sectionId: NodeCardSectionId,
    oneBasedIndex: number,
  ) => void
  onSetNodeCardBodyLayout?: (
    canvasNodeId: string,
    layout: import('@/core/nodeCardSections').NodeCardBodyLayout,
  ) => void
  scene: CanvasScene
  /** Persiste pan/zoom da câmera na cena (sem histórico undo). */
  onSceneCameraChange?: (camera: SceneCamera) => void
  selectedNodeIds: string[]
  selectedNodeId: string
  /** Conteúdo extra dentro da régua aria-label «Canvas viewport controls» (ex.: inspector acoplado). */
  viewportControlsSlot?: ReactNode
  /** Inspetor de Bloco acoplado à barra da vista. */
  blockInspectorControlsSlot?: ReactNode
  /** Inspetor de Grupo acoplado à barra da vista. */
  groupInspectorControlsSlot?: ReactNode
  /** Painel «Nodes em cena» acoplado à barra (cápsula / chrome). */
  sceneNodesControlsSlot?: ReactNode
  onUpdateBlockParameter?: (canvasNodeId: string, paramId: string, value: string) => void
  onConnectBlockSlots?: (
    fromNodeId: string,
    fromBlockSlotId: string,
    fromBlockParameterId: string | undefined,
    toNodeId: string,
    toBlockSlotId: string,
    toBlockParameterId: string | undefined,
  ) => void
  onUpdateGroupParameter?: (canvasNodeId: string, paramId: string, value: string) => void
  onConnectGroupSlots?: (
    fromNodeId: string,
    fromGroupSlotId: string,
    fromGroupParameterId: string | undefined,
    toNodeId: string,
    toGroupSlotId: string,
    toGroupParameterId: string | undefined,
  ) => void
  /** Toast quando o utilizador tenta editar um nó travado. */
  onNodeLockedInteraction?: () => void
  /** Overlay de visibilidade/lock (sincronizado com «Nodes em cena»). */
  onPatchNodeSceneOverlay?: (
    nodeId: string,
    patch: Partial<
      Pick<import('@/core/canvasScene').CanvasNode, 'sceneHidden' | 'branchForceVisible' | 'locked'>
    >,
  ) => void
  /** Abre/expande o painel «Nodes em cena» (ex.: ao activar no submenu Exibir). */
  onSceneNodesPanelRequest?: () => void
  /** Drop/colar ritual Class Group num Neeko Node. */
  onNeekoDropCode?: (canvasNodeId: string, text: string) => void
  /** Vincular área do editor ao nó (Shift+arrasto). */
  onBindCodeRangeToNode?: (
    canvasNodeId: string,
    payload: {
      text: string
      textRange: {
        startLineNumber: number
        startColumn: number
        endLineNumber: number
        endColumn: number
      }
    },
  ) => void
  /** Ritual drag: cria Neeko na grade após staging (posição canvas). */
  onBuildNeekoAtPosition?: (position: CanvasPosition) => string | null
  onNeekoBuildFailed?: () => void
  neekoTransformingNodeId?: string | null
  /** Packs só em memória (localStorage), sem pasta em nodeStructures. */
  memoryPackFolders?: readonly string[]
  /** Grava preset de estados da cena (atalho no menu do card). */
  onExtractSceneNodesStatePreset?: (nodeId: string) => void
  /** Serializa Main → ritual Class Group e abre no CodeDock. */
  onGraphsToCode?: () => void
  /** Pré-visualiza subárvore do nó no CodeDock. */
  onViewNodeCode?: (nodeId: string) => void
  onViewNodeBlockCode?: (nodeId: string) => void
  onViewNodeGroupCode?: (nodeId: string) => void
  /** Abre VFX Dock com ritual da subárvore do nó. */
  onPreviewNodeVfx?: (nodeId: string) => void
  /** Sincroniza subárvore do nó seleccionado na aba activa do CodeDock. */
  onSyncNodeValueToCode?: (nodeId: string) => void
  /** CodeDock aberto com aba ritobin activa. */
  canSyncNodeToCode?: boolean
  /** Visibilidade dos botões da barra do canvas (persistida em `scene.sceneChrome`). */
  toolbarVisibility?: CanvasToolbarVisibility
  onToolbarVisibilityChange?: (next: CanvasToolbarVisibility) => void
  /** Junta visualmente ao bloco de abas «Cenas de trabalho» (sem borda/cantos no topo). */
  attachedViewport?: boolean
}

type ConnectionPath = {
  d: string
  id: string
  routing?: 'flex' | 'rigid'
}

type CanvasStyle = CSSProperties & {
  '--canvas-height': string
  '--canvas-width': string
}

type PanPoint = {
  x: number
  y: number
}

type PanGesture = {
  origin: PanPoint
  pan: PanPoint
  pointerId: number
}

type NodeDragGesture = {
  axisConstraint: '' | 'horizontal' | 'pending' | 'vertical'
  element: HTMLElement
  nodeId: string
  origin: PanPoint
  pointerId: number
  position: CanvasPosition
  snapGrid: boolean
}

type PendingLink = {
  draftAnchor: { sx: number; sy: number }
  fromInternalStructureId: string
  fromNodeId: string
  targetCollectionType: string
  targetSchemaId: string
}

type CollectionTypeLinkMenuState = {
  anchor: { left: number; top: number }
  fromNodeId: string
  structure: InternalStructureDefinition
}

type OutputWireDragSession = {
  entity: InternalStructureDefinition
  fromNodeId: string
  maxScreenDelta: number
  originClientX: number
  originClientY: number
  pointerId: number
}

type PendingBlockLink = {
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
  draftAnchor: { sx: number; sy: number }
}

type PendingGroupLink = {
  fromNodeId: string
  fromGroupSlotId: string
  fromGroupParameterId?: string
  draftAnchor: { sx: number; sy: number }
}

type GraphDropLinkContext = {
  entity: InternalStructureDefinition
  fromNodeId: string
  position: CanvasPosition
}

type CanvasBounds = {
  height: number
  width: number
}

function getParameterValueFromNode(
  node: CanvasNode,
  parameterId: string,
  defaultValue: string,
): string {
  return node.node.values.find((entry) => entry.parameterId === parameterId)?.value ?? defaultValue
}

function mapParameterRowHeight(
  node: CanvasNode,
  parameter: NodeParameterDefinition,
  stored: string,
  estimateList: (parameter: NodeParameterDefinition, value: string) => number,
  parseEntries: (raw: string) => Array<{ schemaId: string; typeName: string }>,
  hasStructure: (entry: { schemaId: string; typeName: string }) => boolean,
): number {
  if (!parameterMapCompact(node.node, parameter)) {
    return estimateList(parameter, stored)
  }
  const entries = parseEntries(stored)
  const viewState = getElementViewState(node.node, elementViewKeyForParameter(parameter.id))
  const index = Math.min(
    Math.max(0, viewState.selectedIndex ?? 0),
    Math.max(0, entries.length - 1),
  )
  const entry = entries[index]
  return mapHashStructureCompactHeight(Boolean(entry && hasStructure(entry)))
}

function elementViewKeyForContextElementTarget(
  target: Extract<CanvasContextTarget, { type: 'element' }>,
): ElementViewKey | null {
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

function getParameterRowHeight(node: CanvasNode, parameter: NodeParameterDefinition): number {
  if (isElementRetracted(node.node, elementViewKeyForParameter(parameter.id))) {
    return ELEMENT_RETRACTED_ROW_HEIGHT
  }
  const stored = getParameterValueFromNode(node, parameter.id, parameter.defaultValue)
  if (parameter.type === 'mapHashPointer') {
    return mapParameterRowHeight(
      node,
      parameter,
      stored,
      estimateMapHashPointerParameterHeight,
      parseMapHashPointerString,
      (entry) => Boolean(entry.schemaId?.trim() && entry.typeName?.trim()),
    )
  }
  if (parameter.type === 'mapHashEmbed') {
    return mapParameterRowHeight(
      node,
      parameter,
      stored,
      estimateMapHashEmbedParameterHeight,
      parseMapHashEmbedString,
      (entry) => Boolean(entry.schemaId?.trim() && entry.typeName?.trim()),
    )
  }
  if (parameter.type === 'mapU64Pointer') {
    return mapParameterRowHeight(
      node,
      parameter,
      stored,
      estimateMapU64PointerParameterHeight,
      parseMapU64PointerString,
      (entry) => Boolean(entry.schemaId?.trim() && entry.typeName?.trim()),
    )
  }
  return PARAMETER_ITEM_HEIGHT
}

function getParameterSectionContentHeight(node: CanvasNode) {
  const params = node.node.schema.parameters
  let listHeight = 0
  for (let i = 0; i < params.length; i += 1) {
    listHeight += getParameterRowHeight(node, params[i]!)
    if (i < params.length - 1) {
      listHeight += ITEM_GAP
    }
  }
  return listHeight
}

function getParameterSectionHeight(node: CanvasNode) {
  if (!isNodeCardSectionExpanded(node, 'parameters')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  return nodeCardSectionChromeHeight(true, getParameterSectionContentHeight(node))
}

function getSectionContentHeight(
  node: CanvasNode,
  connections: readonly CanvasConnection[],
  sectionId: NodeCardSectionId,
): number {
  switch (sectionId) {
    case 'parameters':
      return getParameterSectionContentHeight(node)
    case 'embed':
      return getEmbedBlocksHeight(node)
    case 'pointer':
      return getPointerBlocksHeight(node)
    case 'listEmbed':
      return getListEmbedBlocksHeight(node, connections)
    case 'listPointer':
      return getListPointerBlocksHeight(node)
    case 'list2Embed':
      return getList2EmbedBlocksHeight(node)
    case 'list2Pointer':
      return getList2PointerBlocksHeight(node)
    default:
      return 0
  }
}

function nodeCardSectionHeightById(
  node: CanvasNode,
  connections: readonly CanvasConnection[],
  sectionId: NodeCardSectionId,
): number {
  if (isNodeCardFreeform(node)) {
    return getSectionContentHeight(node, connections, sectionId)
  }

  switch (sectionId) {
    case 'parameters':
      return getParameterSectionHeight(node)
    case 'embed':
      return getEmbedSectionHeight(node)
    case 'pointer':
      return getPointerSectionHeight(node)
    case 'listEmbed':
      return getListEmbedSectionHeight(node, connections)
    case 'listPointer':
      return getListPointerSectionHeight(node)
    case 'list2Embed':
      return getList2EmbedSectionHeight(node)
    case 'list2Pointer':
      return getList2PointerSectionHeight(node)
    default:
      return 0
  }
}

function nodeCardSectionContentTopY(
  node: CanvasNode,
  connections: readonly CanvasConnection[],
  sectionId: NodeCardSectionId,
): number {
  const sectionStart = nodeCardSectionStartY(node, connections, sectionId)
  if (isNodeCardFreeform(node)) {
    return sectionStart
  }
  if (!isNodeCardSectionExpanded(node, sectionId)) {
    return sectionStart + NODE_CARD_SECTION_HEADER_HEIGHT / 2
  }
  return sectionStart + NODE_CARD_SECTION_HEADER_HEIGHT + NODE_CARD_SECTION_CONTENT_GAP
}

function nodeCardSectionStartY(
  node: CanvasNode,
  connections: readonly CanvasConnection[],
  sectionId: NodeCardSectionId,
): number {
  let y = node.position.y + HEADER_HEIGHT + BODY_PADDING
  for (const id of resolveNodeCardSectionOrderForCanvasNode(node)) {
    if (id === sectionId) {
      break
    }
    const h = nodeCardSectionHeightById(node, connections, id)
    if (h > 0) {
      y += h + SECTION_GAP
    }
  }
  return y
}

function getMapHashStructurePortY(node: CanvasNode, structureId: string): number | null {
  let cursor = nodeCardSectionContentTopY(node, [], 'parameters')

  for (let i = 0; i < node.node.schema.parameters.length; i += 1) {
    const param = node.node.schema.parameters[i]!
    const value = getParameterValueFromNode(node, param.id, param.defaultValue)
    if (param.type === 'mapHashPointer') {
      const entries = parseMapHashPointerString(value)
      const offset = getMapHashPointerStructurePortYOffset(param.id, entries, structureId)
      if (offset !== null) {
        return cursor + offset
      }
    }
    if (param.type === 'mapHashEmbed') {
      const entries = parseMapHashEmbedString(value)
      const offset = getMapHashEmbedStructurePortYOffset(param.id, entries, structureId)
      if (offset !== null) {
        return cursor + offset
      }
    }
    if (param.type === 'mapU64Pointer') {
      const entries = parseMapU64PointerString(value)
      const offset = getMapU64PointerStructurePortYOffset(param.id, entries, structureId)
      if (offset !== null) {
        return cursor + offset
      }
    }
    cursor += getParameterRowHeight(node, param) + ITEM_GAP
  }

  return null
}

function getEmbedBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.embed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForEmbed(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForEmbed(block.id))) {
      height += listSlotsCompactHeight(EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    const slots = populatedSlotsForEmbed(block)
    const slotsHeight =
      slots.length > 0
        ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, slots.length - 1) * ITEM_GAP + ITEM_GAP
        : 0
    height += EMBED_BLOCK_HEADER_HEIGHT + slotsHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getEmbedSectionHeight(node: CanvasNode) {
  if (!isNodeCardSectionExpanded(node, 'embed')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  const blocksHeight = getEmbedBlocksHeight(node)
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

function getPointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.pointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForPointer(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForPointer(block.id))) {
      height += listSlotsCompactHeight(EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    const slots = populatedSlotsForPointer(block)
    const slotsHeight =
      slots.length > 0
        ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, slots.length - 1) * ITEM_GAP + ITEM_GAP
        : 0
    height += EMBED_BLOCK_HEADER_HEIGHT + slotsHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getPointerSectionHeight(node: CanvasNode) {
  if (!isNodeCardSectionExpanded(node, 'pointer')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  const blocksHeight = getPointerBlocksHeight(node)
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

function getListEmbedBlocksHeight(node: CanvasNode, connections: readonly CanvasConnection[]) {
  const blocks = node.node.schema.listEmbed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForListEmbed(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForListEmbed(block.id))) {
      height += listSlotsCompactHeight(LIST_EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    const slots = populatedSlotsForListEmbed(block)
    const slotsHeight =
      slots.length > 0
        ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, slots.length - 1) * ITEM_GAP + ITEM_GAP
        : 0
    height += LIST_EMBED_BLOCK_HEADER_HEIGHT + slotsHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getListEmbedSectionHeight(node: CanvasNode, connections: readonly CanvasConnection[]) {
  if (!isNodeCardSectionExpanded(node, 'listEmbed')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  const blocksHeight = getListEmbedBlocksHeight(node, connections)
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

function getListPointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.listPointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForListPointer(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForListPointer(block.id))) {
      height += listSlotsCompactHeight(LIST_EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    const slots = populatedSlotsForListPointer(block)
    const slotsHeight =
      slots.length > 0
        ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, slots.length - 1) * ITEM_GAP + ITEM_GAP
        : 0
    height += LIST_EMBED_BLOCK_HEADER_HEIGHT + slotsHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getListPointerSectionHeight(node: CanvasNode) {
  if (!isNodeCardSectionExpanded(node, 'listPointer')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  const blocksHeight = getListPointerBlocksHeight(node)
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

function getList2EmbedBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.list2Embed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForList2Embed(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForList2Embed(block.id))) {
      height += listSlotsCompactHeight(LIST_EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    let instancesHeight = 0
    for (const instance of block.instances) {
      const slots = instance.slots ?? []
      instancesHeight +=
        LIST_EMBED_BLOCK_HEADER_HEIGHT +
        (slots.length > 0
          ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
            Math.max(0, slots.length - 1) * ITEM_GAP +
            ITEM_GAP
          : 0)
    }
    height += LIST_EMBED_BLOCK_HEADER_HEIGHT + instancesHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getList2EmbedSectionHeight(node: CanvasNode) {
  const blocksHeight = getList2EmbedBlocksHeight(node)
  if (blocksHeight === 0) {
    return 0
  }
  if (!isNodeCardSectionExpanded(node, 'list2Embed')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

function getList2PointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.list2Pointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
    if (isElementRetracted(node.node, elementViewKeyForList2Pointer(block.id))) {
      height += ELEMENT_RETRACTED_ROW_HEIGHT
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    if (isElementCompact(node.node, elementViewKeyForList2Pointer(block.id))) {
      height += listSlotsCompactHeight(LIST_EMBED_BLOCK_HEADER_HEIGHT)
      if (i < blocks.length - 1) {
        height += ITEM_GAP
      }
      continue
    }
    let instancesHeight = 0
    for (const instance of block.instances) {
      const slots = instance.slots ?? []
      instancesHeight +=
        LIST_EMBED_BLOCK_HEADER_HEIGHT +
        (slots.length > 0
          ? slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
            Math.max(0, slots.length - 1) * ITEM_GAP +
            ITEM_GAP
          : 0)
    }
    height += LIST_EMBED_BLOCK_HEADER_HEIGHT + instancesHeight
    if (i < blocks.length - 1) {
      height += ITEM_GAP
    }
  }

  return height
}

function getList2PointerSectionHeight(node: CanvasNode) {
  const blocksHeight = getList2PointerBlocksHeight(node)
  if (blocksHeight === 0) {
    return 0
  }
  if (!isNodeCardSectionExpanded(node, 'list2Pointer')) {
    return NODE_CARD_SECTION_HEADER_HEIGHT
  }
  return nodeCardSectionChromeHeight(true, blocksHeight)
}

/** Top-level `internalStructures` não têm secção no card; altura 0 no layout. */
function getInternalStructureSectionHeight(_node: CanvasNode) {
  return 0
}

function getNodeCardHeight(node: CanvasNode, connections: readonly CanvasConnection[]) {
  if (node.groupViewActive && node.groupStructure) {
    return estimateGroupCardHeight(node.groupStructure)
  }

  if (node.blockViewActive && node.blockStructure) {
    return estimateBlockCardHeight(node.blockStructure)
  }

  if (isCanvasNodeBodyCollapsed(node)) {
    return HEADER_HEIGHT
  }

  const order = resolveNodeCardSectionOrderForCanvasNode(node)
  let sectionsHeight = 0
  let visibleSections = 0
  for (const id of order) {
    const h = nodeCardSectionHeightById(node, connections, id)
    if (h > 0) {
      sectionsHeight += h
      visibleSections += 1
    }
  }

  return (
    HEADER_HEIGHT +
    BODY_PADDING * 2 +
    sectionsHeight +
    Math.max(0, visibleSections - 1) * SECTION_GAP +
    SECTION_GAP +
    BUTTON_HEIGHT
  )
}

/** Tamanho fixo da grade — não expande com nós grandes (usa `scene.width` / `scene.height` do layout). */
function getCanvasBounds(scene: CanvasScene): CanvasBounds {
  return {
    width: scene.width,
    height: scene.height,
  }
}

function getEmbedPortY(node: CanvasNode, structureId: string) {
  let cursor = nodeCardSectionContentTopY(node, [], 'embed')

  for (const block of node.node.schema.embed ?? []) {
    cursor += EMBED_BLOCK_HEADER_HEIGHT
    const slots = populatedSlotsForEmbed(block)
    const slotIndex = slots.findIndex((slot) => slot.id === structureId)
    if (slotIndex >= 0) {
      return (
        cursor +
        slotIndex * (INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP) +
        INTERNAL_STRUCTURE_ITEM_HEIGHT / 2
      )
    }
    if (slots.length > 0) {
      cursor +=
        ITEM_GAP +
        slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
        Math.max(0, slots.length - 1) * ITEM_GAP
    }
    cursor += ITEM_GAP
  }

  return cursor
}

function getPointerPortY(node: CanvasNode, structureId: string) {
  let cursor = nodeCardSectionContentTopY(node, [], 'pointer')

  for (const block of node.node.schema.pointer ?? []) {
    cursor += EMBED_BLOCK_HEADER_HEIGHT
    const slots = populatedSlotsForPointer(block)
    const slotIndex = slots.findIndex((slot) => slot.id === structureId)
    if (slotIndex >= 0) {
      return (
        cursor +
        slotIndex * (INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP) +
        INTERNAL_STRUCTURE_ITEM_HEIGHT / 2
      )
    }
    if (slots.length > 0) {
      cursor +=
        ITEM_GAP +
        slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
        Math.max(0, slots.length - 1) * ITEM_GAP
    }
    cursor += ITEM_GAP
  }

  return cursor
}

function getListEmbedPortY(
  node: CanvasNode,
  structureId: string,
  connections: readonly CanvasConnection[],
) {
  let cursor = nodeCardSectionContentTopY(node, connections, 'listEmbed')

  for (const block of node.node.schema.listEmbed ?? []) {
    cursor += LIST_EMBED_BLOCK_HEADER_HEIGHT
    const slots = populatedSlotsForListEmbed(block)
    const slotIndex = slots.findIndex((slot) => slot.id === structureId)
    if (slotIndex >= 0) {
      return (
        cursor +
        slotIndex * (INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP) +
        INTERNAL_STRUCTURE_ITEM_HEIGHT / 2
      )
    }
    if (slots.length > 0) {
      cursor +=
        ITEM_GAP +
        slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
        Math.max(0, slots.length - 1) * ITEM_GAP
    }
    cursor += ITEM_GAP
  }

  return cursor
}

function getListPointerPortY(node: CanvasNode, structureId: string, connections: readonly CanvasConnection[]) {
  let cursor = nodeCardSectionContentTopY(node, connections, 'listPointer')

  for (const block of node.node.schema.listPointer ?? []) {
    cursor += LIST_EMBED_BLOCK_HEADER_HEIGHT
    const slots = populatedSlotsForListPointer(block)
    const slotIndex = slots.findIndex((slot) => slot.id === structureId)
    if (slotIndex >= 0) {
      return (
        cursor +
        slotIndex * (INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP) +
        INTERNAL_STRUCTURE_ITEM_HEIGHT / 2
      )
    }
    if (slots.length > 0) {
      cursor +=
        ITEM_GAP +
        slots.length * INTERNAL_STRUCTURE_ITEM_HEIGHT +
        Math.max(0, slots.length - 1) * ITEM_GAP
    }
    cursor += ITEM_GAP
  }

  return cursor
}

function getInternalStructurePortY(
  node: CanvasNode,
  structureId: string,
  connections: readonly CanvasConnection[],
) {
  if (isCanvasNodeBodyCollapsed(node)) {
    return node.position.y + HEADER_HEIGHT - PORT_OVERLAP
  }

  const mapHashStructureY = getMapHashStructurePortY(node, structureId)
  if (mapHashStructureY !== null) {
    return mapHashStructureY
  }

  const embedBlocks = node.node.schema.embed ?? []
  const inEmbed = embedBlocks.some((block) =>
    populatedSlotsForEmbed(block).some((slot) => slot.id === structureId),
  )
  if (inEmbed) {
    return getEmbedPortY(node, structureId)
  }

  const pointerBlocks = node.node.schema.pointer ?? []
  const inPointer = pointerBlocks.some((block) =>
    populatedSlotsForPointer(block).some((slot) => slot.id === structureId),
  )
  if (inPointer) {
    return getPointerPortY(node, structureId)
  }

  const listEmbedY = getListEmbedPortY(node, structureId, connections)
  const blocks = node.node.schema.listEmbed ?? []
  const inListEmbed = blocks.some((block) =>
    populatedSlotsForListEmbed(block).some((slot) => slot.id === structureId),
  )
  if (inListEmbed) {
    return listEmbedY
  }

  const listPointerBlocks = node.node.schema.listPointer ?? []
  const inListPointer = listPointerBlocks.some((block) =>
    populatedSlotsForListPointer(block).some((slot) => slot.id === structureId),
  )
  if (inListPointer) {
    return getListPointerPortY(node, structureId, connections)
  }

  const structureIndex = node.node.schema.internalStructures.findIndex((s) => s.id === structureId)
  if (structureIndex < 0) {
    return node.position.y + HEADER_HEIGHT + BODY_PADDING
  }

  const baseY =
    node.position.y +
    HEADER_HEIGHT +
    BODY_PADDING +
    getParameterSectionHeight(node) +
    SECTION_GAP +
    getEmbedSectionHeight(node) +
    SECTION_GAP +
    getPointerSectionHeight(node) +
    SECTION_GAP +
    getListEmbedSectionHeight(node, connections) +
    SECTION_GAP +
    getListPointerSectionHeight(node) +
    SECTION_GAP +
    getList2EmbedSectionHeight(node) +
    SECTION_GAP +
    getList2PointerSectionHeight(node) +
    SECTION_GAP

  const itemCount = node.node.schema.internalStructures.length
  const slotSpan = Math.max(itemCount, 1)
  const slotPitch = Math.min(
    INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP,
    BUTTON_HEIGHT / slotSpan,
  )

  return baseY + structureIndex * slotPitch + slotPitch / 2
}

function getOutputPortY(node: CanvasNode, structureId: string, connections: readonly CanvasConnection[]) {
  return getInternalStructurePortY(node, structureId, connections)
}

function createOrthoAnchoredConnectionPath(id: string, sx: number, sy: number, ix: number, iy: number): ConnectionPath {
  const bendX = (sx + ix) / 2

  return {
    id,
    routing: 'rigid',
    d: [`M ${sx} ${sy}`, `L ${bendX} ${sy}`, `L ${bendX} ${iy}`, `L ${ix} ${iy}`].join(' '),
  }
}

function createConnectionPath(
  connection: CanvasConnection,
  nodes: CanvasNode[],
  connections: readonly CanvasConnection[],
): ConnectionPath | null {
  const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
  const toNode = nodes.find((node) => node.id === connection.toNodeId)

  if (!fromNode || !toNode) {
    return null
  }

  const startX = fromNode.position.x + CARD_WIDTH - PORT_OVERLAP
  const startY = getOutputPortY(fromNode, connection.fromInternalStructureId, connections)
  const exitX = fromNode.position.x + CARD_WIDTH + RIGID_SEGMENT_LENGTH
  const endX = toNode.position.x + CARD_WIDTH / 2
  const endY = toNode.position.y
  const entryY = endY - RIGID_SEGMENT_LENGTH
  const curveOffset = Math.max(96, Math.abs(endX - exitX) * 0.45)

  if (connection.routing === 'rigid') {
    const bendX = (startX + endX) / 2

    return {
      id: connection.id,
      routing: 'rigid',
      d: [`M ${startX} ${startY}`, `L ${bendX} ${startY}`, `L ${bendX} ${endY}`, `L ${endX} ${endY}`].join(
        ' ',
      ),
    }
  }

  return {
    id: connection.id,
    routing: 'flex',
    d: [
      `M ${startX} ${startY}`,
      `L ${exitX} ${startY}`,
      `C ${exitX + curveOffset} ${startY}, ${endX} ${entryY + curveOffset}, ${endX} ${entryY}`,
      `L ${endX} ${endY}`,
    ].join(' '),
  }
}

function createAnchoredConnectionPath(id: string, sx: number, sy: number, ix: number, iy: number): ConnectionPath {
  const exitX = sx + RIGID_SEGMENT_LENGTH
  const entryY = iy - RIGID_SEGMENT_LENGTH
  const curveOffset = Math.max(96, Math.abs(ix - exitX) * 0.45)

  return {
    id,
    routing: 'flex',
    d: [
      `M ${sx} ${sy}`,
      `L ${exitX} ${sy}`,
      `C ${exitX + curveOffset} ${sy}, ${ix} ${entryY + curveOffset}, ${ix} ${entryY}`,
      `L ${ix} ${iy}`,
    ].join(' '),
  }
}

function resolveConnectionPath(
  connection: CanvasConnection,
  nodes: CanvasNode[],
  connections: readonly CanvasConnection[],
  anchors: PortAnchorMaps,
): ConnectionPath | null {
  const fromNode = nodes.find((node) => node.id === connection.fromNodeId)
  const toNode = nodes.find((node) => node.id === connection.toNodeId)

  if (!fromNode || !toNode) {
    return null
  }

  const outPt = anchors.outputs.get(outputAnchorKey(connection.fromNodeId, connection.fromInternalStructureId))
  const inPt = anchors.inputs.get(connection.toNodeId)

  const rigidRouting = connection.routing === 'rigid'

  if (outPt && inPt && rigidRouting) {
    return createOrthoAnchoredConnectionPath(connection.id, outPt.x, outPt.y, inPt.x, inPt.y)
  }

  if (outPt && inPt && !rigidRouting) {
    return createAnchoredConnectionPath(connection.id, outPt.x, outPt.y, inPt.x, inPt.y)
  }

  return createConnectionPath(connection, nodes, connections)
}

function createDraftConnectionPath(sx: number, sy: number, ex: number, ey: number): string {
  const exitX = sx + RIGID_SEGMENT_LENGTH
  const deltaX = Math.abs(ex - exitX)
  const curveOffset = Math.max(96, deltaX * 0.45)
  const c2x = ex - curveOffset

  return [
    `M ${sx} ${sy}`,
    `L ${exitX} ${sy}`,
    `C ${exitX + curveOffset} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`,
  ].join(' ')
}

function graphClientToPosition(canvasEl: HTMLElement, scale: number, clientX: number, clientY: number): CanvasPosition {
  const rect = canvasEl.getBoundingClientRect()

  return {
    x: Math.round((clientX - rect.left) / scale),
    y: Math.round((clientY - rect.top) / scale),
  }
}

function normalizeMarqueeRect(start: CanvasPosition, end: CanvasPosition) {
  return {
    height: Math.max(0, Math.abs(end.y - start.y)),
    width: Math.max(0, Math.abs(end.x - start.x)),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  }
}

function getCanvasNodeWidth(node: CanvasNode): number {
  if (node.groupViewActive && node.groupStructure) {
    return resolveGroupCardWidth(node)
  }
  return node.blockViewActive && node.blockStructure ? resolveBlockCardWidth(node) : CARD_WIDTH
}

function intersectsCanvasNodeRect(
  marquee: { height: number; width: number; x: number; y: number },
  node: CanvasNode,
  connections: readonly CanvasConnection[],
): boolean {
  const nodeRect = {
    height: getNodeCardHeight(node, connections),
    width: getCanvasNodeWidth(node),
    x: node.position.x,
    y: node.position.y,
  }

  return !(
    marquee.x + marquee.width < nodeRect.x ||
    marquee.x > nodeRect.x + nodeRect.width ||
    marquee.y + marquee.height < nodeRect.y ||
    marquee.y > nodeRect.y + nodeRect.height
  )
}

function collectNodesInMarquee(
  scene: CanvasScene,
  start: CanvasPosition,
  end: CanvasPosition,
  compactElementVisibility?: ReturnType<typeof createCompactElementCanvasVisibility>,
): string[] {
  const marquee = normalizeMarqueeRect(start, end)

  if (marquee.width < 4 && marquee.height < 4) {
    return []
  }

  return scene.nodes
    .filter((node) => isNodeVisibleOnCanvas(node, compactElementVisibility, scene))
    .filter((node) => intersectsCanvasNodeRect(marquee, node, scene.connections))
    .map((node) => node.id)
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  {
    availableSchemas,
    schemaPackFolderBySchemaId,
    schemaJsonRelativePathBySchemaId,
    schemaStructureSubfolderBySchemaId,
    schemaNodeKindBySchemaId,
    schemaBaseParameterCatalogBySchemaId,
    schemaBaseInternalStructureCatalogBySchemaId,
    canRedo,
    canUndo,
    paletteRequestSignal = 0,
    onCloseCodePanelShortcut,
    onConnectNodes,
    onRelinkInternalStructure,
    onCycleConnectionRouting,
    onSetConnectionRouting,
    onCreateChildNode,
    onCreateRootNode,
    onDeleteNodeIds,
    onToggleNodeBodyCollapsed,
    onToggleStructureCardParamsExpanded,
    onSetStructureCardWidth,
    onSetAllNodesBodyCollapsed,
    onToggleNodeCardSection,
    onSetNodeCardSectionOrder,
    onSetNodeCardBodyLayout,
    onMarqueeCommit,
    onMoveNode,
    onRedo,
    onRemoveConnection,
    onResetScene,
    hints,
    onAppendEmbedCatalogItem,
    onAppendPointerCatalogItem,
    onAppendListEmbedCatalogItem,
    onAppendListPointerCatalogItem,
    onAppendList2EmbedCatalogItem,
    onAppendList2PointerCatalogItem,
    onRemoveList2EmbedInstance,
    onRemoveList2PointerInstance,
    onCatalogParameterAppend,
    onRequestRemoveElement,
    onClearSelection,
    onSelectAllNodesShortcut,
    onSelectNode,
    onSetNodeParameterOrder,
    onUndo,
    onUpdateNodeParameter,
    onSetElementViewMode,
    onSetElementRetracted,
    onSetAllNodeElementsRetracted,
    onSetElementSelectedIndex,
    onRemoveConnectionsFromOutputSlot,
    onShowOnlyConnectedComponent,
    onShowOnlySlotSubtree,
    onShowOnlyIncomingSlotBranch,
    onHideLinkedChildNodes,
    scene,
    onSceneCameraChange,
    selectedNodeIds,
    selectedNodeId,
    viewportControlsSlot,
    blockInspectorControlsSlot,
    groupInspectorControlsSlot,
    sceneNodesControlsSlot,
    onUpdateBlockParameter,
    onConnectBlockSlots,
    onUpdateGroupParameter,
    onConnectGroupSlots,
    onNodeLockedInteraction,
    onPatchNodeSceneOverlay,
    onSceneNodesPanelRequest,
    onExtractSceneNodesStatePreset,
    onGraphsToCode,
    onViewNodeCode,
    onViewNodeBlockCode,
    onViewNodeGroupCode,
    onPreviewNodeVfx,
    onSyncNodeValueToCode,
    canSyncNodeToCode = false,
    onNeekoDropCode,
    onBindCodeRangeToNode,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
    neekoTransformingNodeId = null,
    memoryPackFolders = [],
    toolbarVisibility: toolbarVisibilityProp,
    onToolbarVisibilityChange,
    attachedViewport = false,
  },
  ref,
) {
  const { t } = useLanguage()
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [pendingBlockLink, setPendingBlockLink] = useState<PendingBlockLink | null>(null)
  const pendingBlockLinkRef = useRef<PendingBlockLink | null>(null)
  const [blockLinkDraftPoint, setBlockLinkDraftPoint] = useState<PanPoint | null>(null)
  const [blockWirelessPulse, setBlockWirelessPulse] = useState<{ nodeId: string; slotId: string } | null>(null)
  const [pendingGroupLink, setPendingGroupLink] = useState<PendingGroupLink | null>(null)
  const pendingGroupLinkRef = useRef<PendingGroupLink | null>(null)
  const [groupLinkDraftPoint, setGroupLinkDraftPoint] = useState<PanPoint | null>(null)
  const [groupWirelessPulse, setGroupWirelessPulse] = useState<{ nodeId: string; slotId: string } | null>(null)
  const [collectionTypeLinkMenu, setCollectionTypeLinkMenu] = useState<CollectionTypeLinkMenuState | null>(
    null,
  )
  const [linkDraftPoint, setLinkDraftPoint] = useState<PanPoint | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const linkDraftClientRef = useRef<{ cx: number; cy: number } | null>(null)
  const outputWireDragRef = useRef<OutputWireDragSession | null>(null)
  const outputWireWindowMoveRef = useRef<((event: PointerEvent) => void) | null>(null)
  const pendingLinkRef = useRef<PendingLink | null>(null)
  const [linkDropContext, setLinkDropContext] = useState<GraphDropLinkContext | null>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [pan, setPan] = useState<PanPoint>(() => scene.camera?.pan ?? { x: 0, y: 0 })
  const [scale, setScale] = useState(() => scene.camera?.scale ?? 1)
  const nodeDragGesture = useRef<NodeDragGesture | null>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const middlePanGestureRef = useRef<PanGesture | null>(null)
  const marqueeGestureRef = useRef<{ additive: boolean; pointerId: number; start: CanvasPosition } | null>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const viewportBodyRef = useRef<HTMLDivElement | null>(null)
  const ritualDrag = useRitualDragOptional()

  useRitualDragCanvasDrop({
    ritualDrag,
    scale,
    sceneNodes: scene.nodes,
    canvasRef,
    viewportBodyRef,
    onNeekoDropCode,
    onBindCodeRangeToNode,
    onBuildNeekoAtPosition,
    onNeekoBuildFailed,
  })

  const ritualDropHoverNeekoId =
    ritualDrag?.phase === 'dragging' ||
    ritualDrag?.phase === 'buildingNeeko' ||
    ritualDrag?.phase === 'readyNeeko'
      ? ritualDrag.hoveredNeekoCanvasNodeId
      : null

  const ritualLinkDropHoverNodeId =
    ritualDrag?.phase === 'linkDragging' ? ritualDrag.hoveredLinkCanvasNodeId : null

  const [marqueeOverlay, setMarqueeOverlay] = useState<null | { current: CanvasPosition; start: CanvasPosition }>(
    null,
  )
  const [glueNodeId, setGlueNodeId] = useState<string | null>(null)
  const [structureCardResizeModifierActive, setStructureCardResizeModifierActive] = useState(false)
  const [wirelessHighlightNodeId, setWirelessHighlightNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    anchor: CanvasContextMenuAnchor
    target: CanvasContextTarget
  } | null>(null)
  const { themeEnabled: jadeThemeEnabled, syntaxEnabled: jadeSyntaxEnabled, toggleTheme, toggleSyntax } =
    useJadeSurfaceTheme()
  const [viewportNavigateMode, setViewportNavigateMode] = useState(false)
  const [localToolbarVisibility, setLocalToolbarVisibility] = useState<CanvasToolbarVisibility>(
    () => DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
  )
  const toolbarVisibility = toolbarVisibilityProp ?? localToolbarVisibility
  const setToolbarVisibility = useCallback(
    (updater: CanvasToolbarVisibility | ((current: CanvasToolbarVisibility) => CanvasToolbarVisibility)) => {
      const next =
        typeof updater === 'function' ? updater(toolbarVisibility) : updater
      if (onToolbarVisibilityChange) {
        onToolbarVisibilityChange(next)
      } else {
        setLocalToolbarVisibility(next)
      }
    },
    [onToolbarVisibilityChange, toolbarVisibility],
  )
  const [paletteSpawnPosition, setPaletteSpawnPosition] = useState<CanvasPosition | null>(null)
  const navigatePanOriginRef = useRef<{ x: number; y: number } | null>(null)
  const [wirelessPortPulse, setWirelessPortPulse] = useState<WirelessPortPulseTarget | null>(null)
  const portFocusPulseTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const panRef = useRef(pan)
  const scaleRef = useRef(scale)
  const wheelPersistTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    const nextPan = scene.camera?.pan ?? { x: 0, y: 0 }
    const nextScale = scene.camera?.scale ?? 1

    setPan((current) =>
      current.x === nextPan.x && current.y === nextPan.y ? current : { x: nextPan.x, y: nextPan.y },
    )
    setScale((current) => (current === nextScale ? current : nextScale))
  }, [scene.camera])

  const persistSceneCamera = useCallback(
    (camera: { pan: PanPoint; scale: number }) => {
      onSceneCameraChange?.(camera)
    },
    [onSceneCameraChange],
  )

  const persistSceneCameraFromRefs = useCallback(() => {
    persistSceneCamera({ pan: panRef.current, scale: scaleRef.current })
  }, [persistSceneCamera])

  useEffect(
    () => () => {
      if (wheelPersistTimerRef.current !== null) {
        window.clearTimeout(wheelPersistTimerRef.current)
      }
    },
    [],
  )
  const glueTargetId =
    selectedNodeIds.length > 0
      ? selectedNodeIds.includes(selectedNodeId)
        ? selectedNodeId
        : selectedNodeIds[0]
      : null

  useEffect(() => {
    if (selectedNodeIds.length === 0) {
      setGlueNodeId(null)
    }
  }, [selectedNodeIds.length])

  const canvasBounds = getCanvasBounds(scene)
  const [portAnchors, setPortAnchors] = useState<PortAnchorMaps>(emptyPortAnchorMaps)

  useLayoutEffect(() => {
    const el = canvasRef.current

    if (!el) {
      return
    }

    setPortAnchors(collectGraphPortAnchors(el, scale))
  }, [
    canvasBounds.height,
    canvasBounds.width,
    pan.x,
    pan.y,
    scale,
    scene.connections,
    scene.nodes,
  ])

  const wirelessDisplayByNode = useMemo(
    () => buildWirelessDisplayByNode(scene.connections, scene.nodes),
    [scene.connections, scene.nodes],
  )

  const blockWirelessDisplayByNode = useMemo(
    () => buildBlockWirelessDisplayByNode(scene.connections, scene.nodes),
    [scene.connections, scene.nodes],
  )

  const groupWirelessDisplayByNode = useMemo(
    () => buildGroupWirelessDisplayByNode(scene.connections, scene.nodes),
    [scene.connections, scene.nodes],
  )

  const handleWirelessPeerHoverStart = useCallback(
    (payload: WirelessPeerHoverPayload) => {
      setWirelessHighlightNodeId(payload.peerNodeId)

      const peerNode = scene.nodes.find((node) => node.id === payload.peerNodeId)
      let retractedElementViewKey: ElementViewKey | undefined

      if (
        peerNode &&
        payload.pulseOnPeer.portKind === 'output' &&
        payload.pulseOnPeer.outputSlotId
      ) {
        const elementKey = elementViewKeyForOutputSlot(
          peerNode.node,
          payload.pulseOnPeer.outputSlotId,
        )
        if (elementKey && isElementRetracted(peerNode.node, elementKey)) {
          retractedElementViewKey = elementKey
        }
      }

      setWirelessPortPulse({
        connectionId: payload.pulseOnPeer.connectionId,
        nodeId: payload.peerNodeId,
        portKind: payload.pulseOnPeer.portKind,
        outputSlotId: payload.pulseOnPeer.outputSlotId,
        retractedElementViewKey,
      })
    },
    [scene.nodes],
  )

  const handleWirelessPeerHoverEnd = useCallback(() => {
    setWirelessHighlightNodeId(null)
    setWirelessPortPulse(null)
  }, [])

  const compactElementVisibility = useMemo(
    () => createCompactElementCanvasVisibility(scene),
    [scene],
  )

  const visibleNodeIds = useMemo(
    () =>
      new Set(
        scene.nodes
          .filter((node) => isNodeVisibleOnCanvas(node, compactElementVisibility, scene))
          .map((node) => node.id),
      ),
    [compactElementVisibility, scene.nodes],
  )

  const connectionPaths = useMemo(() => {
    return scene.connections
      .filter(
        (connection) =>
          !isBlockSlotConnection(connection) &&
          !isGroupSlotConnection(connection) &&
          connection.routing !== 'wireless' &&
          visibleNodeIds.has(connection.fromNodeId) &&
          visibleNodeIds.has(connection.toNodeId),
      )
      .map((connection) => resolveConnectionPath(connection, scene.nodes, scene.connections, portAnchors))
      .filter((path): path is ConnectionPath => path !== null)
  }, [portAnchors, scene.connections, scene.nodes, visibleNodeIds])

  const blockConnectionPaths = useMemo(() => {
    return scene.connections
      .filter(
        (connection) =>
          isBlockSlotConnection(connection) &&
          visibleNodeIds.has(connection.fromNodeId) &&
          visibleNodeIds.has(connection.toNodeId),
      )
      .map((connection) => resolveBlockConnectionPath(connection, scene.nodes))
      .filter((path): path is NonNullable<ReturnType<typeof resolveBlockConnectionPath>> => path !== null)
  }, [scene.connections, scene.nodes, visibleNodeIds])

  const groupConnectionPaths = useMemo(() => {
    return scene.connections
      .filter(
        (connection) =>
          isGroupSlotConnection(connection) &&
          visibleNodeIds.has(connection.fromNodeId) &&
          visibleNodeIds.has(connection.toNodeId),
      )
      .map((connection) => resolveGroupConnectionPath(connection, scene.nodes))
      .filter((path): path is NonNullable<ReturnType<typeof resolveGroupConnectionPath>> => path !== null)
  }, [scene.connections, scene.nodes, visibleNodeIds])

  const paletteSchemas = useMemo(() => {
    if (!linkDropContext) {
      return availableSchemas
    }

    const connectedTarget = findConnectionTargetForSlot(
      scene.connections,
      linkDropContext.fromNodeId,
      linkDropContext.entity.id,
      scene.nodes,
    )
    const collectionType = resolveCollectionTypeForInternalStructure(
      linkDropContext.entity,
      schemaRegistry,
      connectedTarget,
    )

    if (!collectionType) {
      return availableSchemas.filter((schema) => schema.id === linkDropContext.entity.schemaId)
    }

    return availableSchemas.filter((schema) => schemaMatchesCollectionType(schema, collectionType))
  }, [availableSchemas, linkDropContext, scene.connections, scene.nodes])

  const updateLinkDraftFromClient = useCallback((clientX: number, clientY: number) => {
    const el = canvasRef.current

    if (!pendingLinkRef.current) {
      return
    }

    linkDraftClientRef.current = { cx: clientX, cy: clientY }

    if (!el) {
      return
    }

    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left) / scale
    const y = (clientY - rect.top) / scale

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      setLinkDraftPoint({ x, y })
      return
    }

    setLinkDraftPoint(null)
  }, [scale])

  useLayoutEffect(() => {
    if (!pendingLink) {
      return
    }

    const last = linkDraftClientRef.current
    if (!last) {
      return
    }

    updateLinkDraftFromClient(last.cx, last.cy)
  }, [pan.x, pan.y, pendingLink, scale, updateLinkDraftFromClient])

  const endLinkDraft = useCallback(() => {
    linkDraftClientRef.current = null
    pendingLinkRef.current = null
    setPendingLink(null)
    setLinkDraftPoint(null)
  }, [])

  const endBlockLinkDraft = useCallback(() => {
    pendingBlockLinkRef.current = null
    setPendingBlockLink(null)
    setBlockLinkDraftPoint(null)
  }, [])

  const endGroupLinkDraft = useCallback(() => {
    pendingGroupLinkRef.current = null
    setPendingGroupLink(null)
    setGroupLinkDraftPoint(null)
  }, [])

  const beginBlockOutputLink = useCallback(
    (fromNodeId: string, fromBlockSlotId: string, fromBlockParameterId?: string) => {
      endLinkDraft()
      endGroupLinkDraft()
      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
      const fromWidth = fromNode ? resolveBlockCardWidth(fromNode) : undefined
      const anchor = fromNode
        ? resolveBlockSlotCanvasPoint(
            fromNode,
            fromBlockSlotId,
            'output',
            fromWidth,
          )
        : null
      const next: PendingBlockLink = {
        fromNodeId,
        fromBlockSlotId,
        fromBlockParameterId,
        draftAnchor: { sx: anchor?.x ?? 0, sy: anchor?.y ?? 0 },
      }
      pendingBlockLinkRef.current = next
      setPendingBlockLink(next)
      setBlockLinkDraftPoint(anchor ? { x: anchor.x, y: anchor.y } : null)
    },
    [endGroupLinkDraft, endLinkDraft, scene.nodes],
  )

  const beginGroupOutputLink = useCallback(
    (fromNodeId: string, fromGroupSlotId: string, fromGroupParameterId?: string) => {
      endLinkDraft()
      endBlockLinkDraft()
      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
      const fromWidth = fromNode ? resolveGroupCardWidth(fromNode) : undefined
      const anchor = fromNode
        ? resolveGroupSlotCanvasPoint(
            fromNode,
            fromGroupSlotId,
            'output',
            fromWidth,
          )
        : null
      const next: PendingGroupLink = {
        fromNodeId,
        fromGroupSlotId,
        fromGroupParameterId,
        draftAnchor: { sx: anchor?.x ?? 0, sy: anchor?.y ?? 0 },
      }
      pendingGroupLinkRef.current = next
      setPendingGroupLink(next)
      setGroupLinkDraftPoint(anchor ? { x: anchor.x, y: anchor.y } : null)
    },
    [endBlockLinkDraft, endLinkDraft, scene.nodes],
  )

  const resolveBlockLinkDrop = useCallback(
    (clientX: number, clientY: number) => {
      const pending = pendingBlockLinkRef.current
      if (!pending || !onConnectBlockSlots) {
        return
      }

      const canvasEl = canvasRef.current
      let toNodeId: string | null = null
      let toBlockSlotId: string | null = null

      if (canvasEl) {
        const point = graphClientToPosition(canvasEl, scale, clientX, clientY)
        const hit = findBlockSlotAtPoint(scene.nodes, point)
        if (hit && hit.direction === 'input' && hit.nodeId !== pending.fromNodeId) {
          toNodeId = hit.nodeId
          toBlockSlotId = hit.slotId
        }
      }

      if (!toNodeId || !toBlockSlotId) {
        const el = document.elementFromPoint(clientX, clientY)
        const slotEl = el instanceof Element ? el.closest('[data-block-slot-id]') : null
        if (slotEl instanceof HTMLElement) {
          const direction = slotEl.getAttribute('data-block-slot-direction')
          toNodeId = slotEl.getAttribute('data-block-slot-node-id')
          toBlockSlotId = slotEl.getAttribute('data-block-slot-id')
          if (direction !== 'input' || !toNodeId || !toBlockSlotId || toNodeId === pending.fromNodeId) {
            endBlockLinkDraft()
            return
          }
        } else {
          endBlockLinkDraft()
          return
        }
      }

      const paramMatch = /^block-param:(.+):input$/.exec(toBlockSlotId)
      onConnectBlockSlots(
        pending.fromNodeId,
        pending.fromBlockSlotId,
        pending.fromBlockParameterId,
        toNodeId,
        toBlockSlotId,
        paramMatch?.[1],
      )
      endBlockLinkDraft()
      onSelectNode(toNodeId)
    },
    [endBlockLinkDraft, onConnectBlockSlots, onSelectNode, scale, scene.nodes],
  )

  const resolveGroupLinkDrop = useCallback(
    (clientX: number, clientY: number) => {
      const pending = pendingGroupLinkRef.current
      if (!pending || !onConnectGroupSlots) {
        return
      }

      const canvasEl = canvasRef.current
      let toNodeId: string | null = null
      let toGroupSlotId: string | null = null

      if (canvasEl) {
        const point = graphClientToPosition(canvasEl, scale, clientX, clientY)
        const hit = findGroupSlotAtPoint(scene.nodes, point)
        if (hit && hit.direction === 'input' && hit.nodeId !== pending.fromNodeId) {
          toNodeId = hit.nodeId
          toGroupSlotId = hit.slotId
        }
      }

      if (!toNodeId || !toGroupSlotId) {
        const el = document.elementFromPoint(clientX, clientY)
        const slotEl = el instanceof Element ? el.closest('[data-group-slot-id]') : null
        if (slotEl instanceof HTMLElement) {
          const direction = slotEl.getAttribute('data-group-slot-direction')
          toNodeId = slotEl.getAttribute('data-group-slot-node-id')
          toGroupSlotId = slotEl.getAttribute('data-group-slot-id')
          if (direction !== 'input' || !toNodeId || !toGroupSlotId || toNodeId === pending.fromNodeId) {
            endGroupLinkDraft()
            return
          }
        } else {
          endGroupLinkDraft()
          return
        }
      }

      const paramMatch = /^group-param:(.+):input$/.exec(toGroupSlotId)
      onConnectGroupSlots(
        pending.fromNodeId,
        pending.fromGroupSlotId,
        pending.fromGroupParameterId,
        toNodeId,
        toGroupSlotId,
        paramMatch?.[1],
      )
      endGroupLinkDraft()
      onSelectNode(toNodeId)
    },
    [endGroupLinkDraft, onConnectGroupSlots, onSelectNode, scale, scene.nodes],
  )

  useEffect(() => {
    if (!pendingBlockLink) {
      return
    }

    const onMove = (event: globalThis.PointerEvent) => {
      const canvasEl = canvasRef.current
      if (!canvasEl) {
        return
      }
      setBlockLinkDraftPoint(graphClientToPosition(canvasEl, scale, event.clientX, event.clientY))
    }

    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [pendingBlockLink, scale])

  useEffect(() => {
    if (!pendingGroupLink) {
      return
    }

    const onMove = (event: globalThis.PointerEvent) => {
      const canvasEl = canvasRef.current
      if (!canvasEl) {
        return
      }
      setGroupLinkDraftPoint(graphClientToPosition(canvasEl, scale, event.clientX, event.clientY))
    }

    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [pendingGroupLink, scale])

  const handleBlockSlotWirelessHoverStart = useCallback(
    (_slotId: string, link: BlockSlotWirelessLink) => {
      setWirelessHighlightNodeId(link.peerNodeId)
      setBlockWirelessPulse({ nodeId: link.peerNodeId, slotId: link.peerSlotId })
    },
    [],
  )

  const handleBlockSlotWirelessHoverEnd = useCallback(() => {
    setWirelessHighlightNodeId(null)
    setBlockWirelessPulse(null)
  }, [])

  const handleGroupSlotWirelessHoverStart = useCallback(
    (_slotId: string, link: GroupSlotWirelessLink) => {
      setWirelessHighlightNodeId(link.peerNodeId)
      setGroupWirelessPulse({ nodeId: link.peerNodeId, slotId: link.peerSlotId })
    },
    [],
  )

  const handleGroupSlotWirelessHoverEnd = useCallback(() => {
    setWirelessHighlightNodeId(null)
    setGroupWirelessPulse(null)
  }, [])

  useEffect(() => {
    pendingBlockLinkRef.current = pendingBlockLink
  }, [pendingBlockLink])

  useEffect(() => {
    pendingGroupLinkRef.current = pendingGroupLink
  }, [pendingGroupLink])

  useEffect(() => {
    pendingLinkRef.current = pendingLink
  }, [pendingLink])

  const canvasStyle: CanvasStyle = {
    '--canvas-height': `${canvasBounds.height}px`,
    '--canvas-width': `${canvasBounds.width}px`,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  }

  const zoomIn = () => {
    setScale((currentScale) => {
      const nextScale = Math.min(MAX_SCALE, Number((currentScale + SCALE_STEP).toFixed(2)))
      scaleRef.current = nextScale
      persistSceneCamera({ pan: panRef.current, scale: nextScale })
      return nextScale
    })
  }

  const zoomOut = () => {
    setScale((currentScale) => {
      const nextScale = Math.max(MIN_SCALE, Number((currentScale - SCALE_STEP).toFixed(2)))
      scaleRef.current = nextScale
      persistSceneCamera({ pan: panRef.current, scale: nextScale })
      return nextScale
    })
  }

  const resetViewport = () => {
    const nextPan = { x: 0, y: 0 }
    const nextScale = 1
    panRef.current = nextPan
    scaleRef.current = nextScale
    setPan(nextPan)
    setScale(nextScale)
    persistSceneCamera({ pan: nextPan, scale: nextScale })
  }

  const beginPendingLink = useCallback(
    (fromNodeId: string, entity: InternalStructureDefinition, anchorEl: HTMLElement | null) => {
      const canvasEl = canvasRef.current
      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
      let sx: number
      let sy: number

      if (canvasEl && anchorEl) {
        const anchor = graphPointFromElementCenter(canvasEl, scale, anchorEl)
        sx = anchor.x
        sy = anchor.y
      } else if (fromNode) {
        sx = fromNode.position.x + CARD_WIDTH - PORT_OVERLAP
        sy = getOutputPortY(fromNode, entity.id, scene.connections)
      } else {
        return
      }

      const connectedTarget = findConnectionTargetForSlot(
        scene.connections,
        fromNodeId,
        entity.id,
        scene.nodes,
      )
      const valuesByParameterId: Record<string, string> = {}
      if (fromNode) {
        for (const param of fromNode.node.schema.parameters) {
          if (
            param.type === 'mapHashPointer' ||
            param.type === 'mapHashEmbed' ||
            param.type === 'mapU64Pointer'
          ) {
            valuesByParameterId[param.id] = getParameterValueFromNode(
              fromNode,
              param.id,
              param.defaultValue,
            )
          }
        }
      }
      const mapHashPointerHit =
        fromNode && isMapHashPointerSlotId(entity.id)
          ? findMapHashPointerEntryBySlotId(fromNode.node.schema, entity.id, valuesByParameterId)
          : null
      const mapHashEmbedHit =
        fromNode && !mapHashPointerHit && isMapHashEmbedSlotId(entity.id)
          ? findMapHashEmbedEntryBySlotId(fromNode.node.schema, entity.id, valuesByParameterId)
          : null
      const mapU64PointerHit =
        fromNode && !mapHashPointerHit && !mapHashEmbedHit && isMapU64PointerSlotId(entity.id)
          ? findMapU64PointerEntryBySlotId(fromNode.node.schema, entity.id, valuesByParameterId)
          : null
      const embedHit =
        !mapHashPointerHit && !mapHashEmbedHit && !mapU64PointerHit && fromNode
          ? findSlotInEmbedSchema(fromNode.node.schema, entity.id)
          : null
      const pointerHit =
        !mapHashPointerHit && !mapHashEmbedHit && !mapU64PointerHit && !embedHit && fromNode
          ? findSlotInPointerSchema(fromNode.node.schema, entity.id)
          : null
      const listEmbedHit =
        !mapHashPointerHit &&
        !mapHashEmbedHit &&
        !mapU64PointerHit &&
        !embedHit &&
        !pointerHit &&
        fromNode
          ? findSlotInListEmbedSchema(fromNode.node.schema, entity.id)
          : null
      const listPointerHit =
        !mapHashPointerHit &&
        !mapHashEmbedHit &&
        !mapU64PointerHit &&
        !embedHit &&
        !pointerHit &&
        !listEmbedHit &&
        fromNode
          ? findSlotInListPointerSchema(fromNode.node.schema, entity.id)
          : null
      const targetCollectionType = mapHashPointerHit
        ? resolveCollectionTypeForMapHashPointerSlot(
            mapHashPointerHit.slot,
            schemaRegistry,
            connectedTarget,
          ) ?? ''
        : mapHashEmbedHit
          ? resolveCollectionTypeForMapHashEmbedSlot(
              mapHashEmbedHit.slot,
              schemaRegistry,
              connectedTarget,
            ) ?? ''
          : mapU64PointerHit
            ? resolveCollectionTypeForMapU64PointerSlot(
                mapU64PointerHit.slot,
                schemaRegistry,
                connectedTarget,
              ) ?? ''
          : embedHit
          ? resolveCollectionTypeForEmbedSlot(entity, embedHit.embed, schemaRegistry, connectedTarget) ?? ''
          : pointerHit
            ? resolveCollectionTypeForPointerSlot(
                entity,
                pointerHit.pointer,
                schemaRegistry,
                connectedTarget,
              ) ?? ''
            : listEmbedHit
              ? resolveCollectionTypeForListEmbedSlot(
                  entity,
                  listEmbedHit.listEmbed,
                  schemaRegistry,
                  connectedTarget,
                ) ?? ''
              : listPointerHit
                ? resolveCollectionTypeForListPointerSlot(
                    entity,
                    listPointerHit.listPointer,
                    schemaRegistry,
                    connectedTarget,
                  ) ?? ''
                : resolveCollectionTypeForInternalStructure(entity, schemaRegistry, connectedTarget) ?? ''

      const nextPending: PendingLink = {
        draftAnchor: { sx, sy },
        fromInternalStructureId: entity.id,
        fromNodeId,
        targetCollectionType,
        targetSchemaId: entity.schemaId,
      }

      pendingLinkRef.current = nextPending
      linkDraftClientRef.current = null
      setLinkDraftPoint(null)
      setPendingLink(nextPending)
    },
    [scale, scene.connections, scene.nodes],
  )

  const resolveOutputWireDrop = useCallback(
    (drag: OutputWireDragSession, clientX: number, clientY: number) => {
      const canvasEl = canvasRef.current
      const el = document.elementFromPoint(clientX, clientY)
      const pending = pendingLinkRef.current

      if (!canvasEl || !pending || pending.fromInternalStructureId !== drag.entity.id || pending.fromNodeId !== drag.fromNodeId) {
        return
      }

      if (el instanceof Element) {
        const inputPort = el.closest('[data-graph-port="input"]')
        const nodeWrap = el.closest('[data-canvas-node="true"]')

        if (inputPort && nodeWrap) {
          const id = nodeWrap.getAttribute('data-canvas-node-id')

          if (id) {
            const targetNode = scene.nodes.find((node) => node.id === id)

            const fromNode = scene.nodes.find((node) => node.id === pending.fromNodeId)
            const outputSlot =
              fromNode ? findOutputSlotInNode(fromNode, pending.fromInternalStructureId, scene.connections) : null

            if (
              targetNode &&
              fromNode &&
              outputSlot &&
              targetNode.id !== pending.fromNodeId &&
              nodesShareCollectionTypeForOutputSlot(fromNode, outputSlot, targetNode, schemaRegistry)
            ) {
              onConnectNodes({
                id: `${pending.fromNodeId}:${pending.fromInternalStructureId}->${targetNode.id}`,
                fromInternalStructureId: pending.fromInternalStructureId,
                fromNodeId: pending.fromNodeId,
                toNodeId: targetNode.id,
              })
              endLinkDraft()
              onSelectNode(targetNode.id)
              return
            }
          }
        }
      }

      const control = el instanceof Element ? el.closest('[data-canvas-control="true"]') : null
      const nodeWrap = el instanceof Element ? el.closest('[data-canvas-node="true"]') : null
      const nodeWrapId = nodeWrap?.getAttribute('data-canvas-node-id') ?? null
      const blocksLinkPalette =
        nodeWrap !== null && nodeWrapId !== null && nodeWrapId !== drag.fromNodeId
      const inCanvas = el instanceof Node && canvasEl.contains(el)

      if (
        drag.maxScreenDelta >= DROP_TO_OPEN_LINK_PALETTE_PX &&
        inCanvas &&
        !blocksLinkPalette &&
        !control
      ) {
        const position = graphClientToPosition(canvasEl, scale, clientX, clientY)
        endLinkDraft()
        setLinkDropContext({ entity: drag.entity, fromNodeId: drag.fromNodeId, position })
        setIsPaletteOpen(true)
        return
      }

      endLinkDraft()
    },
    [endLinkDraft, onConnectNodes, onSelectNode, scene.nodes, scale],
  )

  const openCollectionTypeLinkMenu = useCallback(
    (
      fromNodeId: string,
      structure: InternalStructureDefinition,
      anchorEl: HTMLElement,
    ) => {
      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)

      if (!fromNode) {
        return
      }

      const connectedTarget = findConnectionTargetForSlot(
        scene.connections,
        fromNodeId,
        structure.id,
        scene.nodes,
      )
      const valuesByParameterId: Record<string, string> = {}
      for (const param of fromNode.node.schema.parameters) {
        if (
          param.type === 'mapHashPointer' ||
          param.type === 'mapHashEmbed' ||
          param.type === 'mapU64Pointer'
        ) {
          valuesByParameterId[param.id] = getParameterValueFromNode(
            fromNode,
            param.id,
            param.defaultValue,
          )
        }
      }
      const mapHashPointerHit = isMapHashPointerSlotId(structure.id)
        ? findMapHashPointerEntryBySlotId(fromNode.node.schema, structure.id, valuesByParameterId)
        : null
      const mapHashEmbedHit =
        !mapHashPointerHit && isMapHashEmbedSlotId(structure.id)
          ? findMapHashEmbedEntryBySlotId(fromNode.node.schema, structure.id, valuesByParameterId)
          : null
      const mapU64PointerHit =
        !mapHashPointerHit && !mapHashEmbedHit && isMapU64PointerSlotId(structure.id)
          ? findMapU64PointerEntryBySlotId(fromNode.node.schema, structure.id, valuesByParameterId)
          : null
      const embedHit =
        !mapHashPointerHit && !mapHashEmbedHit && !mapU64PointerHit
          ? findSlotInEmbedSchema(fromNode.node.schema, structure.id)
          : null
      const pointerHit =
        !mapHashPointerHit && !mapHashEmbedHit && !mapU64PointerHit && !embedHit
          ? findSlotInPointerSchema(fromNode.node.schema, structure.id)
          : null
      const listEmbedHit =
        !mapHashPointerHit &&
        !mapHashEmbedHit &&
        !mapU64PointerHit &&
        !embedHit &&
        !pointerHit
          ? findSlotInListEmbedSchema(fromNode.node.schema, structure.id)
          : null
      const listPointerHit =
        !mapHashPointerHit &&
        !mapHashEmbedHit &&
        !mapU64PointerHit &&
        !embedHit &&
        !pointerHit &&
        !listEmbedHit
          ? findSlotInListPointerSchema(fromNode.node.schema, structure.id)
          : null
      const collectionType = mapHashPointerHit
        ? resolveCollectionTypeForMapHashPointerSlot(
            mapHashPointerHit.slot,
            schemaRegistry,
            connectedTarget,
          )
        : mapHashEmbedHit
          ? resolveCollectionTypeForMapHashEmbedSlot(
              mapHashEmbedHit.slot,
              schemaRegistry,
              connectedTarget,
            )
          : mapU64PointerHit
            ? resolveCollectionTypeForMapU64PointerSlot(
                mapU64PointerHit.slot,
                schemaRegistry,
                connectedTarget,
              )
          : embedHit
          ? resolveCollectionTypeForEmbedSlot(
              structure,
              embedHit.embed,
              schemaRegistry,
              connectedTarget,
            )
          : pointerHit
            ? resolveCollectionTypeForPointerSlot(
                structure,
                pointerHit.pointer,
                schemaRegistry,
                connectedTarget,
              )
            : listEmbedHit
              ? resolveCollectionTypeForListEmbedSlot(
                  structure,
                  listEmbedHit.listEmbed,
                  schemaRegistry,
                  connectedTarget,
                )
              : listPointerHit
                ? resolveCollectionTypeForListPointerSlot(
                    structure,
                    listPointerHit.listPointer,
                    schemaRegistry,
                    connectedTarget,
                  )
              : resolveCollectionTypeForInternalStructure(structure, schemaRegistry, connectedTarget)

      if (!collectionType) {
        return
      }

      const rect = anchorEl.getBoundingClientRect()
      setCollectionTypeLinkMenu({
        anchor: { left: rect.right + 8, top: rect.top },
        fromNodeId,
        structure,
      })
    },
    [scene.connections, scene.nodes],
  )

  const detachOutputWireWindowMove = useCallback(() => {
    const handler = outputWireWindowMoveRef.current
    if (handler) {
      window.removeEventListener('pointermove', handler)
      outputWireWindowMoveRef.current = null
    }
  }, [])

  const attachOutputWireWindowMove = useCallback(
    (pointerId: number) => {
      detachOutputWireWindowMove()
      const onWindowPointerMove = (event: PointerEvent) => {
        const drag = outputWireDragRef.current
        if (!drag || drag.pointerId !== pointerId) {
          return
        }

        const delta = Math.hypot(event.clientX - drag.originClientX, event.clientY - drag.originClientY)
        drag.maxScreenDelta = Math.max(drag.maxScreenDelta, delta)
        updateLinkDraftFromClient(event.clientX, event.clientY)
      }
      outputWireWindowMoveRef.current = onWindowPointerMove
      window.addEventListener('pointermove', onWindowPointerMove)
    },
    [detachOutputWireWindowMove, updateLinkDraftFromClient],
  )

  useEffect(() => () => detachOutputWireWindowMove(), [detachOutputWireWindowMove])

  const handleOutputWirePointerDown = useCallback(
    (fromNodeId: string, entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return
      }

      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)

      if (fromNode && isNodeLocked(fromNode)) {
        return
      }

      event.preventDefault()
      beginPendingLink(fromNodeId, entity, event.currentTarget)
      outputWireDragRef.current = {
        entity,
        fromNodeId,
        maxScreenDelta: 0,
        originClientX: event.clientX,
        originClientY: event.clientY,
        pointerId: event.pointerId,
      }
      updateLinkDraftFromClient(event.clientX, event.clientY)
      attachOutputWireWindowMove(event.pointerId)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [attachOutputWireWindowMove, beginPendingLink, scene.nodes, updateLinkDraftFromClient],
  )

  const handleOutputWirePointerMove = useCallback(
    (_entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      const drag = outputWireDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      const delta = Math.hypot(event.clientX - drag.originClientX, event.clientY - drag.originClientY)
      drag.maxScreenDelta = Math.max(drag.maxScreenDelta, delta)
      updateLinkDraftFromClient(event.clientX, event.clientY)
    },
    [updateLinkDraftFromClient],
  )

  const handleOutputWirePointerUp = useCallback(
    (fromNodeId: string, entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      const drag = outputWireDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      outputWireDragRef.current = null
      detachOutputWireWindowMove()

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (drag.maxScreenDelta < DROP_TO_OPEN_LINK_PALETTE_PX) {
        const existing = findConnectionFromOutputSlot(scene, fromNodeId, entity.id)

        if (existing) {
          onCycleConnectionRouting?.(existing.id)
          endLinkDraft()
          return
        }

        openCollectionTypeLinkMenu(fromNodeId, entity, event.currentTarget)
        endLinkDraft()
        return
      }

      resolveOutputWireDrop(drag, event.clientX, event.clientY)
    },
    [
      detachOutputWireWindowMove,
      endLinkDraft,
      onCycleConnectionRouting,
      openCollectionTypeLinkMenu,
      resolveOutputWireDrop,
      scene.connections,
    ],
  )

  const handleOutputWirePointerCancel = useCallback(
    (_entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      const drag = outputWireDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      outputWireDragRef.current = null
      detachOutputWireWindowMove()

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      endLinkDraft()
    },
    [detachOutputWireWindowMove, endLinkDraft],
  )

  const handleOutputWireKeyboard = useCallback(
    (fromNodeId: string, entity: InternalStructureDefinition) => {
      beginPendingLink(fromNodeId, entity, null)
    },
    [beginPendingLink],
  )

  const completeLink = (toNode: CanvasNode) => {
    const fromNode = pendingLink
      ? scene.nodes.find((node) => node.id === pendingLink.fromNodeId)
      : undefined
    const outputSlot =
      pendingLink && fromNode
        ? findOutputSlotInNode(fromNode, pendingLink.fromInternalStructureId, scene.connections)
        : null

    if (
      !pendingLink ||
      !fromNode ||
      !outputSlot ||
      !nodesShareCollectionTypeForOutputSlot(fromNode, outputSlot, toNode, schemaRegistry)
    ) {
      return
    }

    onConnectNodes({
      id: `${pendingLink.fromNodeId}:${pendingLink.fromInternalStructureId}->${toNode.id}`,
      fromInternalStructureId: pendingLink.fromInternalStructureId,
      fromNodeId: pendingLink.fromNodeId,
      toNodeId: toNode.id,
    })
    endLinkDraft()
    onSelectNode(toNode.id)
  }

  const openPalette = useCallback((spawnPosition?: CanvasPosition) => {
    setLinkDropContext(null)
    setPaletteSpawnPosition(spawnPosition ?? null)
    setIsPaletteOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false)
    setLinkDropContext(null)
    setPaletteSpawnPosition(null)
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handlePalettePick = useCallback(
    (schema: NodeSchemaDefinition) => {
      if (linkDropContext) {
        const connectedTarget = findConnectionTargetForSlot(
          scene.connections,
          linkDropContext.fromNodeId,
          linkDropContext.entity.id,
          scene.nodes,
        )
        const collectionType = resolveCollectionTypeForInternalStructure(
          linkDropContext.entity,
          schemaRegistry,
          connectedTarget,
        )
        const isCompatible = collectionType
          ? schemaMatchesCollectionType(schema, collectionType)
          : schema.id === linkDropContext.entity.schemaId

        if (!isCompatible) {
          closePalette()
          return
        }

        onCreateChildNode(
          linkDropContext.fromNodeId,
          { ...linkDropContext.entity, schemaId: schema.id },
          linkDropContext.position,
        )
        closePalette()
        return
      }

      onCreateRootNode(schema, paletteSpawnPosition ?? undefined)
      endLinkDraft()
      closePalette()
    },
    [
      closePalette,
      endLinkDraft,
      linkDropContext,
      onCreateChildNode,
      onCreateRootNode,
      paletteSpawnPosition,
      scene.connections,
      scene.nodes,
    ],
  )

  const handleViewportPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isParameterPickerOpen()) {
      return
    }

    closeContextMenu()

    const target = event.target as HTMLElement

    if (
      target.closest('[data-canvas-node="true"]') ||
      target.closest('[data-canvas-control="true"]') ||
      target.closest('[data-canvas-wire="true"]')
    ) {
      return
    }

    if (pendingLink && event.button === 0) {
      event.preventDefault()
      endLinkDraft()
      return
    }

    const isMiddleMouse = event.pointerType === 'mouse' && event.button === 1

    if (isMiddleMouse) {
      event.preventDefault()
      middlePanGestureRef.current = {
        origin: { x: event.clientX, y: event.clientY },
        pan,
        pointerId: event.pointerId,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (event.button !== 0) {
      return
    }

    const canvasEl = canvasRef.current

    if (!canvasEl) {
      return
    }

    if (viewportNavigateMode) {
      event.preventDefault()
      navigatePanOriginRef.current = { x: event.clientX, y: event.clientY }
      panGesture.current = {
        origin: { x: event.clientX, y: event.clientY },
        pan,
        pointerId: event.pointerId,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (event.shiftKey) {
      event.preventDefault()
      const additive = event.ctrlKey || event.metaKey
      const start = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)

      marqueeGestureRef.current = { additive, pointerId: event.pointerId, start }

      setMarqueeOverlay({
        current: start,
        start,
      })

      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    panGesture.current = {
      origin: {
        x: event.clientX,
        y: event.clientY,
      },
      pan,
      pointerId: event.pointerId,
    }
    if (selectedNodeIds.length > 0) {
      onClearSelection?.()
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleViewportPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isParameterPickerOpen()) {
      return
    }

    const shouldAdvanceDraftLink =
      !nodeDragGesture.current &&
      pendingLink &&
      !panGesture.current &&
      !middlePanGestureRef.current &&
      !marqueeGestureRef.current

    if (shouldAdvanceDraftLink) {
      updateLinkDraftFromClient(event.clientX, event.clientY)
    }

    const marqueeGest = marqueeGestureRef.current

    if (marqueeGest && marqueeGest.pointerId === event.pointerId) {
      const canvasEl = canvasRef.current

      if (!canvasEl) {
        return
      }

      const current = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)
      setMarqueeOverlay({
        current,
        start: marqueeGest.start,
      })
      return
    }

    const middleGest = middlePanGestureRef.current

    if (middleGest && middleGest.pointerId === event.pointerId) {
      setPan({
        x: middleGest.pan.x + event.clientX - middleGest.origin.x,
        y: middleGest.pan.y + event.clientY - middleGest.origin.y,
      })

      return
    }

    const gesturePan = panGesture.current

    if (!gesturePan) {
      return
    }

    setPan({
      x: gesturePan.pan.x + event.clientX - gesturePan.origin.x,
      y: gesturePan.pan.y + event.clientY - gesturePan.origin.y,
    })
  }

  const handleViewportPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const marqueeGest = marqueeGestureRef.current

    if (marqueeGest && marqueeGest.pointerId === event.pointerId) {
      marqueeGestureRef.current = null

      const canvasEl = canvasRef.current

      if (canvasEl) {
        const end = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)
        const hits = collectNodesInMarquee(scene, marqueeGest.start, end, compactElementVisibility)

        onMarqueeCommit({
          additive: marqueeGest.additive,
          nodeIds: hits,
        })
      }

      setMarqueeOverlay(null)

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      return
    }

    if (middlePanGestureRef.current?.pointerId === event.pointerId) {
      middlePanGestureRef.current = null

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      persistSceneCameraFromRefs()
      return
    }

    if (panGesture.current?.pointerId !== event.pointerId) {
      return
    }

    const navigateOrigin = navigatePanOriginRef.current
    panGesture.current = null
    navigatePanOriginRef.current = null

    if (viewportNavigateMode && navigateOrigin) {
      const delta = Math.hypot(event.clientX - navigateOrigin.x, event.clientY - navigateOrigin.y)

      if (delta < NAVIGATE_MODE_RELEASE_PX) {
        setViewportNavigateMode(false)
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    persistSceneCameraFromRefs()
  }

  const startNodeDrag = (event: PointerEvent<HTMLElement>, canvasNode: CanvasNode) => {
    if (event.button !== 0 || isNodeLocked(canvasNode)) {
      return
    }

    onSelectNode(canvasNode.id, { additive: event.shiftKey })
    nodeDragGesture.current = {
      axisConstraint: event.shiftKey ? 'pending' : '',
      element: event.currentTarget,
      nodeId: canvasNode.id,
      origin: {
        x: event.clientX,
        y: event.clientY,
      },
      pointerId: event.pointerId,
      position: canvasNode.position,
      snapGrid: event.ctrlKey || event.metaKey,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveNodeDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = nodeDragGesture.current

    if (!gesture) {
      return
    }

    const rawDx = (event.clientX - gesture.origin.x) / scale
    const rawDy = (event.clientY - gesture.origin.y) / scale

    let workingGesture = gesture

    if (
      gesture.axisConstraint === 'pending' &&
      (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3)
    ) {
      const nextConstraint =
        Math.abs(rawDx) >= Math.abs(rawDy) ? ('horizontal' as const) : ('vertical' as const)

      const updatedGesture = {
        ...gesture,
        axisConstraint: nextConstraint,
      }

      nodeDragGesture.current = updatedGesture
      workingGesture = updatedGesture
    }

    let deltaX = rawDx
    let deltaY = rawDy

    if (workingGesture.axisConstraint === 'horizontal') {
      deltaY = 0
    }

    if (workingGesture.axisConstraint === 'vertical') {
      deltaX = 0
    }

    let targetX = workingGesture.position.x + deltaX
    let targetY = workingGesture.position.y + deltaY

    if (workingGesture.snapGrid) {
      targetX = Math.round(targetX / SNAP_GRID_PX) * SNAP_GRID_PX
      targetY = Math.round(targetY / SNAP_GRID_PX) * SNAP_GRID_PX
    }

    const axisDescriptor =
      workingGesture.axisConstraint === 'horizontal'
        ? 'y'
        : workingGesture.axisConstraint === 'vertical'
          ? 'x'
          : ''

    onMoveNode(
      workingGesture.nodeId,
      {
        x: Math.round(targetX),
        y: Math.round(targetY),
      },
      {
        axisLock: axisDescriptor,
        snapGrid: workingGesture.snapGrid,
      },
    )
  }

  const stopNodeDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = nodeDragGesture.current

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    nodeDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const PORT_FOCUS_PULSE_MS = 2600

  const schedulePortFocusPulse = useCallback((target: WirelessPortPulseTarget) => {
    if (portFocusPulseTimeoutRef.current !== null) {
      window.clearTimeout(portFocusPulseTimeoutRef.current)
    }

    setWirelessPortPulse(target)
    portFocusPulseTimeoutRef.current = window.setTimeout(() => {
      portFocusPulseTimeoutRef.current = null
      setWirelessPortPulse((current) => {
        if (
          !current ||
          current.connectionId !== target.connectionId ||
          current.nodeId !== target.nodeId ||
          current.portKind !== target.portKind ||
          current.outputSlotId !== target.outputSlotId
        ) {
          return current
        }

        return null
      })
    }, PORT_FOCUS_PULSE_MS)
  }, [])

  const focusGraphPointIntoView = useCallback(
    (point: PanPoint) => {
      const viewport = viewportBodyRef.current

      if (!viewport) {
        return
      }

      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight
      const pad = 80
      const bboxWidth = 320
      const bboxHeight = 240
      const minLeft = point.x - bboxWidth / 2
      const minTop = point.y - bboxHeight / 2
      const maxRight = point.x + bboxWidth / 2
      const maxBottom = point.y + bboxHeight / 2

      const widthScale = viewportWidth / (maxRight - minLeft + pad * 2)
      const heightScale = viewportHeight / (maxBottom - minTop + pad * 2)
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(widthScale, heightScale)))

      const centerX = (minLeft + maxRight) / 2
      const centerY = (minTop + maxBottom) / 2
      const nextPan = {
        x: Math.round(viewportWidth / 2 - centerX * targetScale),
        y: Math.round(viewportHeight / 2 - centerY * targetScale),
      }

      panRef.current = nextPan
      scaleRef.current = targetScale
      setPan(nextPan)
      setScale(targetScale)
      persistSceneCamera({ pan: nextPan, scale: targetScale })
    },
    [persistSceneCamera],
  )

  const focusInputPort = useCallback(
    (nodeId: string, connection: CanvasConnection) => {
      const anchor = portAnchors.inputs.get(nodeId)
      if (anchor) {
        focusGraphPointIntoView(anchor)
      } else {
        const canvasNode = scene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return
        }

        focusGraphPointIntoView({
          x: canvasNode.position.x + CARD_WIDTH / 2,
          y: canvasNode.position.y,
        })
      }

      schedulePortFocusPulse(buildPortFocusPulseTarget(connection, 'input', scene.nodes))
    },
    [focusGraphPointIntoView, portAnchors.inputs, scene.nodes, schedulePortFocusPulse],
  )

  const focusOutputPort = useCallback(
    (nodeId: string, structureId: string, connection: CanvasConnection) => {
      const anchor = portAnchors.outputs.get(outputAnchorKey(nodeId, structureId))
      if (anchor) {
        focusGraphPointIntoView(anchor)
      } else {
        const canvasNode = scene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return
        }

        focusGraphPointIntoView({
          x: canvasNode.position.x + CARD_WIDTH - PORT_OVERLAP,
          y: getOutputPortY(canvasNode, structureId, scene.connections),
        })
      }

      schedulePortFocusPulse(buildPortFocusPulseTarget(connection, 'output', scene.nodes))
    },
    [
      focusGraphPointIntoView,
      portAnchors.outputs,
      scene.connections,
      scene.nodes,
      schedulePortFocusPulse,
    ],
  )

  const buildOutputSlotPeerActions = useCallback(
    (fromNodeId: string): OutputSlotPeerActions | undefined => {
      if (!onPatchNodeSceneOverlay) {
        return undefined
      }

      return {
        getPeerState: (slotId) => {
          const resolved = resolveOutputSlotPeer(scene, fromNodeId, slotId)

          if (!resolved) {
            return undefined
          }

          const visibility = peerVisibilityState(
            resolved.peerCanvasNode,
            compactElementVisibility,
            scene,
          )

          return {
            peerNodeId: resolved.peerNodeId,
            ...visibility,
          }
        },
        onToggleLock: (slotId) => {
          const resolved = resolveOutputSlotPeer(scene, fromNodeId, slotId)

          if (!resolved) {
            return
          }

          const locked = resolved.peerCanvasNode.locked === true
          onPatchNodeSceneOverlay(
            resolved.peerNodeId,
            locked ? { locked: undefined } : { locked: true },
          )
        },
        onToggleVisibility: (slotId) => {
          const resolved = resolveOutputSlotPeer(scene, fromNodeId, slotId)

          if (!resolved) {
            return
          }

          const visibility = peerVisibilityState(
            resolved.peerCanvasNode,
            compactElementVisibility,
            scene,
          )

          onPatchNodeSceneOverlay(
            resolved.peerNodeId,
            peerVisibilityOverlayPatch(visibility.hidden, visibility.policyHidden),
          )
        },
        onFocusPeer: (slotId) => {
          const resolved = resolveOutputSlotPeer(scene, fromNodeId, slotId)

          if (!resolved) {
            return
          }

          onSelectNode(resolved.peerNodeId)
          focusInputPort(resolved.peerNodeId, resolved.connection)
        },
      }
    },
    [compactElementVisibility, focusInputPort, onPatchNodeSceneOverlay, onSelectNode, scene],
  )

  const focusSelectionIntoView = useCallback(
    (focusIds: string[]) => {
      const ids = [...new Set(focusIds)].filter((id) =>
        scene.nodes.some((node) => node.id === id),
      )

      if (ids.length === 0) {
        return
      }

      const viewport = viewportBodyRef.current

      if (!viewport) {
        return
      }

      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight

      let minLeft = Infinity
      let minTop = Infinity
      let maxRight = -Infinity
      let maxBottom = -Infinity

      for (const id of ids) {
        const canvasNode = scene.nodes.find((node) => node.id === id)

        if (!canvasNode) {
          continue
        }

        minLeft = Math.min(minLeft, canvasNode.position.x)
        minTop = Math.min(minTop, canvasNode.position.y)
        maxRight = Math.max(maxRight, canvasNode.position.x + CARD_WIDTH)
        maxBottom = Math.max(
          maxBottom,
          canvasNode.position.y + getNodeCardHeight(canvasNode, scene.connections),
        )
      }

      if (!Number.isFinite(minLeft)) {
        return
      }

      const pad = 80
      const bboxWidth = Math.max(maxRight - minLeft + pad * 2, 320)
      const bboxHeight = Math.max(maxBottom - minTop + pad * 2, 240)
      const centerX = (minLeft + maxRight) / 2
      const centerY = (minTop + maxBottom) / 2

      const widthScale = viewportWidth / bboxWidth
      const heightScale = viewportHeight / bboxHeight
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(widthScale, heightScale)))

      const nextPan = {
        x: Math.round(viewportWidth / 2 - centerX * targetScale),
        y: Math.round(viewportHeight / 2 - centerY * targetScale),
      }
      panRef.current = nextPan
      scaleRef.current = targetScale
      setPan(nextPan)
      setScale(targetScale)
      persistSceneCamera({ pan: nextPan, scale: targetScale })
    },
    [persistSceneCamera, scene.nodes],
  )

  useImperativeHandle(ref, () => ({
    focusSelectionIntoView,
    openPalette,
  }))

  const graphShortcutRefs = useRef<GraphCanvasShortcutRefs>({
    pendingLink: null,
    selectedNodeIds: [],
    selectedNodeId: null,
    glueTargetId: null,
    glueNodeId: null,
    viewportNavigateMode: false,
    scene,
  })
  graphShortcutRefs.current = {
    pendingLink,
    selectedNodeIds,
    selectedNodeId,
    glueTargetId,
    glueNodeId,
    viewportNavigateMode,
    scene,
  }

  useGraphCanvasShortcutHandlers({
    refs: graphShortcutRefs.current,
    isPaletteOpen,
    endLinkDraft,
    openPalette,
    onClearSelection,
    onSelectAllNodesShortcut,
    focusSelectionIntoView,
    setGlueNodeId,
    setViewportNavigateMode,
    onCloseCodePanelShortcut,
    onNeekoDropCode,
    setStructureCardResizeModifierActive,
  })

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) {
      return []
    }

    const stubCatalogNodeId =
      contextMenu.target.type === 'element' || contextMenu.target.type === 'node'
        ? contextMenu.target.nodeId
        : selectedNodeId
    const stubCatalogSchemaId = scene.nodes.find((node) => node.id === stubCatalogNodeId)?.node.schema.id
    const contextNode =
      contextMenu.target.type === 'node'
        ? scene.nodes.find((node) => node.id === contextMenu.target.nodeId)
        : undefined
    const sceneBodyCollapsedFlags = scene.nodes.map((node) =>
      isNodeBodyEffectivelyCollapsed(node, compactElementVisibility),
    )
    const sceneAllNodesBodyCollapsed =
      sceneBodyCollapsedFlags.length > 0 && sceneBodyCollapsedFlags.every(Boolean)
    const sceneAnyNodeBodyCollapsed = sceneBodyCollapsedFlags.some(Boolean)

    return buildContextMenuItems(contextMenu.target, {
      canRedo,
      canUndo,
      glueNodeId,
      hasSelectAll: scene.nodes.some((node) => isNodeVisibleOnCanvas(node, compactElementVisibility, scene)),
      isNodeBodyCollapsed: contextNode
        ? isNodeBodyEffectivelyCollapsed(contextNode, compactElementVisibility)
        : false,
      onCycleConnectionRouting,
      onSetConnectionRouting,
      onRemoveConnection,
      parameterStubCatalog: stubCatalogSchemaId
        ? schemaBaseParameterCatalogBySchemaId?.[stubCatalogSchemaId]
        : undefined,
      scene,
      selectedNodeIds,
      viewportNavigateMode,
      toolbarVisibility,
      hasPendingLink: Boolean(pendingLink),
      hasInspectorSlot: Boolean(viewportControlsSlot),
      sceneAllNodesBodyCollapsed,
      sceneAnyNodeBodyCollapsed,
      onGraphsToCode,
      onViewNodeCode,
      onViewNodeBlockCode,
      onViewNodeGroupCode,
      onPreviewNodeVfx,
      onSyncNodeValueToCode,
      canSyncNodeToCode,
      primarySelectedNodeId: selectedNodeId,
      tr: (id, fallback, vars) => t(id, fallback, vars),
      jadeThemeEnabled,
      jadeSyntaxEnabled,
    })
  }, [
    canRedo,
    canUndo,
    contextMenu,
    t,
    glueNodeId,
    compactElementVisibility,
    onCycleConnectionRouting,
    onSetConnectionRouting,
    onRemoveConnection,
    scene,
    schemaBaseParameterCatalogBySchemaId,
    selectedNodeId,
    selectedNodeIds,
    viewportNavigateMode,
    toolbarVisibility,
    pendingLink,
    viewportControlsSlot,
    onGraphsToCode,
    onViewNodeCode,
    onViewNodeBlockCode,
    onViewNodeGroupCode,
    onPreviewNodeVfx,
    onSyncNodeValueToCode,
    canSyncNodeToCode,
    jadeThemeEnabled,
    jadeSyntaxEnabled,
  ])

  const runContextMenuAction = useCallback(
    (actionId: ContextMenuItemId) => {
      const target = contextMenu?.target

      if (!target) {
        return
      }

      const routingChoice = parseSetConnectionRoutingMenuId(actionId)
      if (routingChoice) {
        onSetConnectionRouting?.(routingChoice.connectionId, routingChoice.routing)
        closeContextMenu()
        return
      }

      const peerOutputConnectionId = parseFocusPeerOutputSlotMenuId(actionId)
      if (peerOutputConnectionId) {
        const connection = scene.connections.find((entry) => entry.id === peerOutputConnectionId)
        if (connection) {
          const peer = peerOutputFromConnection(connection)
          focusOutputPort(peer.nodeId, peer.structureId, connection)
          onSelectNode(peer.nodeId)
        }
        closeContextMenu()
        return
      }

      switch (actionId) {
        case 'canvas.addNode': {
          const canvasEl = canvasRef.current
          const anchor = contextMenu?.anchor

          if (canvasEl && anchor) {
            openPalette(graphClientToPosition(canvasEl, scale, anchor.left, anchor.top))
          } else {
            openPalette()
          }
          break
        }
        case 'canvas.zoomIn':
          zoomIn()
          break
        case 'canvas.zoomOut':
          zoomOut()
          break
        case 'canvas.resetViewport':
          resetViewport()
          break
        case 'canvas.undo':
          onUndo()
          break
        case 'canvas.redo':
          onRedo()
          break
        case 'canvas.focusSelection':
          focusSelectionIntoView(selectedNodeIds)
          break
        case 'canvas.selectAll':
          onSelectAllNodesShortcut?.()
          break
        case 'canvas.clearSelection':
          onClearSelection?.()
          break
        case 'canvas.collapseAllNodeBodies':
          onSetAllNodesBodyCollapsed?.(true)
          break
        case 'canvas.expandAllNodeBodies':
          onSetAllNodesBodyCollapsed?.(false)
          break
        case 'canvas.extractSceneNodesState':
          if (selectedNodeId) {
            onExtractSceneNodesStatePreset?.(selectedNodeId)
          }
          break
        case 'canvas.graphsToCode':
          onGraphsToCode?.()
          break
        case 'canvas.toggleNavigateMode':
          setViewportNavigateMode((active) => !active)
          break
        case 'canvas.toggleLegend':
          setToolbarVisibility((current) => toggleToolbarVisibility(current, 'legend'))
          break
        case 'canvas.toolbar.addNode':
        case 'canvas.toolbar.undo':
        case 'canvas.toolbar.redo':
        case 'canvas.toolbar.camera':
        case 'canvas.toolbar.zoom':
        case 'canvas.toolbar.resetViewport':
        case 'canvas.toolbar.resetScene':
        case 'canvas.toolbar.inspector':
        case 'canvas.toolbar.legend':
        case 'canvas.toolbar.linkStatus':
        case 'canvas.toolbar.navigateHint':
        case 'canvas.toolbar.sceneNodes': {
          const toolId = actionId.replace('canvas.toolbar.', '') as CanvasToolbarToolId
          setToolbarVisibility((current) => {
            const next = toggleToolbarVisibility(current, toolId)

            if (next.sceneNodes) {
              onSceneNodesPanelRequest?.()
            }

            return next
          })
          break
        }
        case 'canvas.exibir':
          break
        case 'node.toggleBodyCollapse':
          if (target.type === 'node') {
            onToggleNodeBodyCollapsed?.(target.nodeId)
          }
          break
        case 'node.toggleStructureCardParamsExpanded':
          if (target.type === 'node') {
            onToggleStructureCardParamsExpanded?.(target.nodeId)
          }
          break
        case 'surface.toggleJadeTheme':
          void toggleTheme()
          break
        case 'surface.toggleJadeSyntax':
          void toggleSyntax()
          break
        case 'node.hideLinkedChildNodes':
          if (target.type === 'node') {
            onHideLinkedChildNodes?.(target.nodeId)
          }
          break
        case 'node.focus':
          if (target.type === 'node') {
            focusSelectionIntoView([target.nodeId])
          }
          break
        case 'node.select':
          if (target.type === 'node') {
            onSelectNode(target.nodeId)
          }
          break
        case 'node.glue':
          if (target.type === 'node') {
            setGlueNodeId((existing) => (existing === target.nodeId ? null : target.nodeId))
          }
          break
        case 'node.delete':
          if (target.type === 'node') {
            const canvasNode = scene.nodes.find((node) => node.id === target.nodeId)

            if (!canvasNode || isNodeLocked(canvasNode)) {
              onNodeLockedInteraction?.()
              break
            }

            onDeleteNodeIds?.([target.nodeId])
          }
          break
        case 'node.addNode':
          openPalette()
          break
        case 'node.organization':
          break
        case 'node.organization.bySectionType':
          if (target.type === 'node') {
            onSetNodeCardBodyLayout?.(target.nodeId, 'bySectionType')
          }
          break
        case 'node.organization.freeform':
          if (target.type === 'node') {
            onSetNodeCardBodyLayout?.(target.nodeId, 'freeform')
          }
          break
        case 'node.retractAllElements':
          if (target.type === 'node') {
            onSetAllNodeElementsRetracted?.(target.nodeId, true)
          }
          break
        case 'node.expandAllElements':
          if (target.type === 'node') {
            onSetAllNodeElementsRetracted?.(target.nodeId, false)
          }
          break
        case 'node.extractSceneNodesState':
          if (target.type === 'node') {
            onExtractSceneNodesStatePreset?.(target.nodeId)
          }
          break
        case 'node.graphsToCode':
          onGraphsToCode?.()
          break
        case 'node.viewCode':
          if (target.type === 'node') {
            onViewNodeCode?.(target.nodeId)
          }
          break
        case 'node.viewBlockCode':
          if (target.type === 'node') {
            onViewNodeBlockCode?.(target.nodeId)
          }
          break
        case 'node.viewGroupCode':
          if (target.type === 'node') {
            onViewNodeGroupCode?.(target.nodeId)
          }
          break
        case 'node.previewVfx':
          if (target.type === 'node') {
            onPreviewNodeVfx?.(target.nodeId)
          }
          break
        case 'node.syncValueToCode':
          if (target.type === 'node') {
            onSyncNodeValueToCode?.(target.nodeId)
          }
          break
        case 'node.codigo':
          break
        case 'connection.cycleRouting':
          if (target.type === 'connection') {
            onCycleConnectionRouting?.(target.connectionId)
          }
          break
        case 'connection.remove':
          if (target.type === 'connection') {
            onRemoveConnection?.(target.connectionId)
          }
          break
        case 'element.toggleCompact': {
          if (target.type !== 'element' || !onSetElementViewMode) {
            break
          }

          const canvasNode = scene.nodes.find((node) => node.id === target.nodeId)

          if (!canvasNode) {
            break
          }

          const viewKey = elementViewKeyForContextElementTarget(target)

          if (!viewKey) {
            break
          }

          const currentMode = getElementViewState(canvasNode.node, viewKey).mode
          onSetElementViewMode(target.nodeId, viewKey, currentMode === 'compact' ? 'list' : 'compact')
          break
        }
        case 'element.toggleRetracted': {
          if (target.type !== 'element' || !onSetElementRetracted) {
            break
          }

          const canvasNode = scene.nodes.find((node) => node.id === target.nodeId)

          if (!canvasNode) {
            break
          }

          const viewKey = elementViewKeyForContextElementTarget(target)

          if (!viewKey) {
            break
          }

          const retracted = Boolean(getElementViewState(canvasNode.node, viewKey).retracted)
          onSetElementRetracted(target.nodeId, viewKey, !retracted)
          break
        }
        case 'element.showOnlyConnectedComponent':
          if (target.type === 'nodeInputPort') {
            onShowOnlyConnectedComponent?.(target.nodeId)
            onSelectNode(target.nodeId)
            focusSelectionIntoView([target.nodeId])
          } else if (target.type === 'element' && isStructuralSlotContextKind(target.kind)) {
            onShowOnlyConnectedComponent?.(target.nodeId)
            onSelectNode(target.nodeId)
            focusSelectionIntoView([target.nodeId])
          }
          break
        case 'element.showOnlySlotSubtree':
          if (target.type === 'nodeInputPort') {
            onShowOnlyIncomingSlotBranch?.(target.nodeId)
            onSelectNode(target.nodeId)
            focusSelectionIntoView([target.nodeId])
          } else if (target.type === 'element' && isStructuralSlotContextKind(target.kind)) {
            onShowOnlySlotSubtree?.(target.nodeId, target.elementId)
            onSelectNode(target.nodeId)
            focusSelectionIntoView([target.nodeId])
          }
          break
        case 'element.focusPeerInputSlot':
          if (target.type === 'element') {
            const slotId = outputSlotIdFromElementTarget(target)
            if (slotId) {
              const connection = findConnectionFromOutputSlot(scene, target.nodeId, slotId)
              if (connection) {
                const peer = peerInputFromConnection(connection)
                focusInputPort(peer.nodeId, connection)
                onSelectNode(peer.nodeId)
              }
            }
          }
          break
        case 'nodeInputPort.focusPeerOutputSlot':
          if (target.type === 'nodeInputPort') {
            const incoming = findIncomingConnections(scene, target.nodeId)
            const connection = incoming[0]
            if (connection) {
              const peer = peerOutputFromConnection(connection)
              focusOutputPort(peer.nodeId, peer.structureId, connection)
              onSelectNode(peer.nodeId)
            }
          }
          break
        case 'element.relink': {
          if (target.type !== 'element' || target.kind !== 'internalStructure') {
            break
          }

          const fromNode = scene.nodes.find((node) => node.id === target.nodeId)
          const structure = fromNode?.node.schema.internalStructures.find(
            (entry) => entry.id === target.elementId,
          )
          const anchorEl = document.querySelector(
            `[${CANVAS_CONTEXT_NODE_ID_ATTR}="${target.nodeId}"][${CANVAS_CONTEXT_KIND_ATTR}="internalStructure"][${CANVAS_CONTEXT_ELEMENT_ID_ATTR}="${target.elementId}"]`,
          )

          if (fromNode && structure && anchorEl instanceof HTMLElement) {
            openCollectionTypeLinkMenu(target.nodeId, structure, anchorEl)
          }
          break
        }
        case 'element.removeConnections':
          if (target.type === 'element' && target.kind === 'internalStructure') {
            onRemoveConnectionsFromOutputSlot?.(target.nodeId, target.elementId)
          }
          break
        case 'element.remove':
          if (target.type === 'element' && onRequestRemoveElement) {
            const canvasNode = scene.nodes.find((node) => node.id === target.nodeId)

            if (!canvasNode) {
              break
            }

            const stubCatalog = schemaBaseParameterCatalogBySchemaId?.[canvasNode.node.schema.id]
            const removables = listRemovableNodeElements(canvasNode.node, stubCatalog, {
              canvasNodeId: target.nodeId,
              connections: scene.connections,
            })
            const item = removables.find(
              (entry) => entry.kind === target.kind && entry.id === target.elementId,
            )

            if (item) {
              onRequestRemoveElement(target.nodeId, item)
            }
          }
          break
        case 'element.removeInstance':
          if (target.type === 'element' && target.instanceId) {
            if (target.kind === 'list2EmbedInstance' && target.list2EmbedId) {
              onRemoveList2EmbedInstance?.(target.nodeId, target.list2EmbedId, target.instanceId)
            } else if (target.kind === 'list2PointerInstance' && target.list2PointerId) {
              onRemoveList2PointerInstance?.(target.nodeId, target.list2PointerId, target.instanceId)
            }
          }
          break
        case 'element.openElementMenu': {
          if (target.type !== 'element') {
            break
          }

          const nodeWrap = document.querySelector(`[data-canvas-node-id="${target.nodeId}"]`)
          const summary = nodeWrap?.querySelector(`[${ELEMENT_MENU_TRIGGER_ATTR}] summary`)

          if (summary instanceof HTMLElement) {
            summary.click()
          }
          break
        }
        default:
          break
      }
    },
    [
      contextMenu,
      focusInputPort,
      focusOutputPort,
      focusSelectionIntoView,
      onClearSelection,
      onCycleConnectionRouting,
      onSetConnectionRouting,
      onDeleteNodeIds,
      onNodeLockedInteraction,
      onSceneNodesPanelRequest,
      onExtractSceneNodesStatePreset,
      onGraphsToCode,
      onViewNodeCode,
      onViewNodeBlockCode,
      onViewNodeGroupCode,
      onPreviewNodeVfx,
      onSyncNodeValueToCode,
      onSetAllNodesBodyCollapsed,
      onToggleNodeBodyCollapsed,
      onToggleStructureCardParamsExpanded,
      onToggleNodeCardSection,
      onSetNodeCardBodyLayout,
      onRedo,
      onRemoveConnection,
      onRemoveConnectionsFromOutputSlot,
      onShowOnlyConnectedComponent,
      onShowOnlySlotSubtree,
      onShowOnlyIncomingSlotBranch,
      onHideLinkedChildNodes,
      onRemoveList2EmbedInstance,
      onRemoveList2PointerInstance,
      onRequestRemoveElement,
      onSelectAllNodesShortcut,
      onSelectNode,
      onSetElementViewMode,
      onSetElementRetracted,
      onSetAllNodeElementsRetracted,
      onUndo,
      openCollectionTypeLinkMenu,
      openPalette,
      scale,
      scene,
      schemaBaseParameterCatalogBySchemaId,
      selectedNodeIds,
      toggleTheme,
      toggleSyntax,
    ],
  )

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (isParameterPickerOpen()) {
        return
      }

      const resolved = resolveContextTarget(event)

      if (!resolved) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      setContextMenu({
        anchor: { left: event.clientX, top: event.clientY },
        target: resolved,
      })
    },
    [],
  )

  useEffect(() => {
    if (!paletteRequestSignal) {
      return
    }

    openPalette()
  }, [paletteRequestSignal, openPalette])

  useEffect(() => {
    const element = viewportBodyRef.current

    if (!element) {
      return
    }

    const handleWheelZoom = (event: WheelEvent) => {
      if (isParameterPickerOpen() || shouldIgnoreCanvasWheelShortcut(event.target)) {
        return
      }

      if (event.target instanceof HTMLElement && event.target.closest('[data-canvas-toolbar="true"]')) {
        return
      }

      event.preventDefault()

      const zoomDirection = event.deltaY > 0 ? -1 : 1
      const factor = 1 + zoomDirection * 0.08

      setScale((previousScale) => {
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, Number((previousScale * factor).toFixed(3))),
        )
        scaleRef.current = nextScale

        if (wheelPersistTimerRef.current !== null) {
          window.clearTimeout(wheelPersistTimerRef.current)
        }

        wheelPersistTimerRef.current = window.setTimeout(() => {
          wheelPersistTimerRef.current = null
          persistSceneCamera({ pan: panRef.current, scale: scaleRef.current })
        }, 150)

        return nextScale
      })
    }

    element.addEventListener('wheel', handleWheelZoom, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheelZoom)
    }
  }, [persistSceneCamera, scene.nodes.length])

  useEffect(() => {
    if (!glueNodeId) {
      return
    }

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const reposition = (nativeEvent: Event) => {
      const pointerEvent = nativeEvent as unknown as PointerEvent

      if (!glueNodeId) {
        return
      }

      const glueNode = scene.nodes.find((node) => node.id === glueNodeId)

      if (glueNode && isNodeLocked(glueNode)) {
        return
      }

      const projected = graphClientToPosition(canvas, scale, pointerEvent.clientX, pointerEvent.clientY)

      onMoveNode(glueNodeId, projected, {
        axisLock: '',
        snapGrid: pointerEvent.ctrlKey || pointerEvent.metaKey,
      })
    }

    window.addEventListener('pointermove', reposition)

    return () => {
      window.removeEventListener('pointermove', reposition)
    }
  }, [glueNodeId, onMoveNode, scale, scene.nodes])

  return (
    <section
      aria-label="Static node graph canvas"
      className={[styles.viewport, attachedViewport ? styles.viewportAttached : '']
        .filter(Boolean)
        .join(' ')}
      ref={viewportRef}
    >
      <div className={styles.toolbar} data-canvas-control="true" data-canvas-toolbar="true">
        {toolbarVisibility.legend ? (
          <div className={styles.legend} aria-label="Canvas legend">
            <span className={styles.legendItem}>
              <span className={styles.inputDot} />
              parent input
            </span>
            <span className={styles.legendItem}>
              <span className={styles.outputDot} />
              child output
            </span>
            <span className={styles.legendItem}>
              <span aria-hidden className={styles.legendWireIcon} /> fio curvo · ortogonal · sem fio (corrente nos
              ports) · clique no fio ou na corrente cicla estilo · Ctrl+clique remove · tecla A: seleccionar todos ou
              limpar · clique na grade limpa
            </span>
          </div>
        ) : null}

        <div className={styles.controls} aria-label="Canvas viewport controls">
          {toolbarVisibility.linkStatus && pendingLink ? (
            <span className={styles.linkStatus}>
              ligando até{' '}
              <strong>{pendingLink.targetCollectionType || pendingLink.targetSchemaId}</strong>
              {' · '}arrastar à grade vazia adiciona nó · vazio/Esc cancela
            </span>
          ) : null}
          {toolbarVisibility.navigateHint && viewportNavigateMode ? (
            <span className={styles.linkStatus}>
              modo mover na grade · arrastar para deslocar · clique vazio ou Esc para sair
            </span>
          ) : null}
          {toolbarVisibility.addNode ? (
            <button className={styles.primaryControl} type="button" onClick={() => openPalette()}>
              {t(LangId.GraphToolbarAddNode)}
            </button>
          ) : null}
          {toolbarVisibility.undo ? (
            <button disabled={!canUndo} type="button" onClick={onUndo}>
              {t(LangId.GraphToolbarUndo)}
            </button>
          ) : null}
          {toolbarVisibility.redo ? (
            <button disabled={!canRedo} type="button" onClick={onRedo}>
              {t(LangId.GraphToolbarRedo)}
            </button>
          ) : null}
          {toolbarVisibility.camera ? (
            <SceneCameraPanel
              onPanChange={(nextPan) => {
                panRef.current = nextPan
                setPan(nextPan)
                persistSceneCamera({ pan: nextPan, scale: scaleRef.current })
              }}
              pan={pan}
            />
          ) : null}
          {toolbarVisibility.zoom ? (
            <>
              <button type="button" onClick={zoomOut}>
                -
              </button>
              <span>{Math.round(scale * 100)}%</span>
              <button type="button" onClick={zoomIn}>
                +
              </button>
            </>
          ) : null}
          {toolbarVisibility.resetViewport ? (
            <button type="button" onClick={resetViewport}>
              {t(LangId.GraphToolbarResetViewport)}
            </button>
          ) : null}
          {toolbarVisibility.resetScene ? (
            <button className={styles.dangerControl} type="button" onClick={onResetScene}>
              {t(LangId.GraphToolbarResetScene)}
            </button>
          ) : null}
          {toolbarVisibility.sceneNodes && sceneNodesControlsSlot ? (
            <div className={styles.controlsInspectorSlot}>{sceneNodesControlsSlot}</div>
          ) : null}
          {toolbarVisibility.inspector && viewportControlsSlot ? (
            <div className={styles.controlsInspectorSlot}>{viewportControlsSlot}</div>
          ) : null}
          {blockInspectorControlsSlot ? (
            <div className={styles.controlsInspectorSlot}>{blockInspectorControlsSlot}</div>
          ) : null}
          {groupInspectorControlsSlot ? (
            <div className={styles.controlsInspectorSlot}>{groupInspectorControlsSlot}</div>
          ) : null}
        </div>
      </div>

      {isPaletteOpen ? (
        <AddNodePalette
          heading={linkDropContext ? t(LangId.NodePaletteLinkHeading) : undefined}
          onClose={closePalette}
          onPickSchema={handlePalettePick}
          packFolderBySchemaId={schemaPackFolderBySchemaId}
          jsonRelativePathBySchemaId={schemaJsonRelativePathBySchemaId}
          memoryPackFolders={memoryPackFolders}
          structureSubfolderBySchemaId={schemaStructureSubfolderBySchemaId}
          schemas={paletteSchemas}
        />
      ) : null}

      {collectionTypeLinkMenu && onRelinkInternalStructure
        ? (() => {
            const fromNode = scene.nodes.find((node) => node.id === collectionTypeLinkMenu.fromNodeId)

            if (!fromNode) {
              return null
            }

            const currentTarget = findConnectionTargetForSlot(
              scene.connections,
              collectionTypeLinkMenu.fromNodeId,
              collectionTypeLinkMenu.structure.id,
              scene.nodes,
            )
            const collectionType = resolveCollectionTypeForInternalStructure(
              collectionTypeLinkMenu.structure,
              schemaRegistry,
              currentTarget,
            )

            if (!collectionType) {
              return null
            }

            const compatibleNodes = getNodesByCollectionType(scene.nodes, collectionType, {
              excludeNodeId: fromNode.id,
            })

            return (
              <CollectionTypeLinkMenu
                anchor={collectionTypeLinkMenu.anchor}
                collectionType={collectionType}
                compatibleNodes={compatibleNodes}
                currentTarget={currentTarget}
                fromNode={fromNode}
                onClose={() => setCollectionTypeLinkMenu(null)}
                onSelect={(targetNodeId) => {
                  onRelinkInternalStructure(
                    collectionTypeLinkMenu.fromNodeId,
                    collectionTypeLinkMenu.structure.id,
                    targetNodeId,
                  )
                  setCollectionTypeLinkMenu(null)
                  onSelectNode(targetNodeId)
                }}
                structure={collectionTypeLinkMenu.structure}
              />
            )
          })()
        : null}

      {contextMenu && contextMenuItems.length > 0 ? (
        <CanvasContextMenu
          anchor={contextMenu.anchor}
          items={contextMenuItems}
          onClose={closeContextMenu}
          onSelect={runContextMenuAction}
        />
      ) : null}

      <div
        aria-label="Graph viewport navigation area"
        className={styles.viewportBody}
        onContextMenu={handleContextMenu}
        onPointerCancel={handleViewportPointerUp}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        ref={viewportBodyRef}
        {...{ [GRAPH_CANVAS_SCOPE_ATTR]: GRAPH_CANVAS_SCOPE_ID }}
      >
      <div className={styles.canvas} ref={canvasRef} style={canvasStyle}>
        <RitualNeekoStagingPreview />
        <svg
          className={styles.connections}
          height={canvasBounds.height}
          role="presentation"
          viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}
          width={canvasBounds.width}
        >
          <defs>
            <marker
              id="connection-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--port-child)" />
            </marker>
            <marker
              id="connection-arrow-block"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="6"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--block-slot-out)" />
            </marker>
          </defs>

          {connectionPaths.map((connection) => (
            <g key={connection.id}>
              {onRemoveConnection || onCycleConnectionRouting ? (
                <path
                  aria-label={`Ligação ${connection.id}`}
                  className={styles.connectionHit}
                  d={connection.d}
                  data-canvas-wire="true"
                  {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
                  onContextMenu={handleContextMenu}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()

                    if (event.ctrlKey || event.metaKey) {
                      if (onRemoveConnection) {
                        onRemoveConnection(connection.id)
                      }

                      return
                    }

                    onCycleConnectionRouting?.(connection.id)
                  }}
                />
              ) : null}
              <path className={styles.connectionHalo} d={connection.d} />
              <path
                className={
                  connection.routing === 'rigid' ? `${styles.connection} ${styles.connectionRigid}` : styles.connection
                }
                d={connection.d}
                markerEnd="url(#connection-arrow)"
              />
            </g>
          ))}
          {blockConnectionPaths.map((connection) => (
            <g key={connection.id}>
              {onRemoveConnection || onCycleConnectionRouting ? (
                <path
                  aria-label={`Ligação bloco ${connection.id}`}
                  className={styles.connectionHit}
                  d={connection.d}
                  data-canvas-wire="true"
                  {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
                  onContextMenu={handleContextMenu}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()

                    if (event.ctrlKey || event.metaKey) {
                      onRemoveConnection?.(connection.id)
                      return
                    }

                    onCycleConnectionRouting?.(connection.id)
                  }}
                />
              ) : null}
              <path className={styles.connectionBlockHalo} d={connection.d} />
              <path className={styles.connectionBlock} d={connection.d} markerEnd="url(#connection-arrow-block)" />
            </g>
          ))}
          {groupConnectionPaths.map((connection) => (
            <g key={connection.id}>
              {onRemoveConnection || onCycleConnectionRouting ? (
                <path
                  aria-label={`Ligação grupo ${connection.id}`}
                  className={styles.connectionHit}
                  d={connection.d}
                  data-canvas-wire="true"
                  {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
                  onContextMenu={handleContextMenu}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()

                    if (event.ctrlKey || event.metaKey) {
                      onRemoveConnection?.(connection.id)
                      return
                    }

                    onCycleConnectionRouting?.(connection.id)
                  }}
                />
              ) : null}
              <path className={styles.connectionBlockHalo} d={connection.d} />
              <path className={styles.connectionBlock} d={connection.d} markerEnd="url(#connection-arrow-block)" />
            </g>
          ))}
          {pendingBlockLink && blockLinkDraftPoint ? (
            <path
              className={styles.connectionBlockDraft}
              d={createBlockDraftConnectionPath(
                pendingBlockLink.draftAnchor.sx,
                pendingBlockLink.draftAnchor.sy,
                blockLinkDraftPoint.x,
                blockLinkDraftPoint.y,
              )}
            />
          ) : null}
          {pendingGroupLink && groupLinkDraftPoint ? (
            <path
              className={styles.connectionBlockDraft}
              d={createGroupDraftConnectionPath(
                pendingGroupLink.draftAnchor.sx,
                pendingGroupLink.draftAnchor.sy,
                groupLinkDraftPoint.x,
                groupLinkDraftPoint.y,
              )}
            />
          ) : null}
          {pendingLink && linkDraftPoint ? (
            <path
              className={styles.connectionDraft}
              d={createDraftConnectionPath(
                pendingLink.draftAnchor.sx,
                pendingLink.draftAnchor.sy,
                linkDraftPoint.x,
                linkDraftPoint.y,
              )}
            />
          ) : null}
        </svg>

        {marqueeOverlay ? (
          <div
            aria-hidden
            className={styles.marqueeFrame}
            style={(() => {
              const shape = normalizeMarqueeRect(marqueeOverlay.start, marqueeOverlay.current)

              return {
                height: `${shape.height}px`,
                left: `${shape.x}px`,
                top: `${shape.y}px`,
                width: `${shape.width}px`,
              }
            })()}
          />
        ) : null}

        {scene.nodes.map((canvasNode) => {
          if (!isNodeVisibleOnCanvas(canvasNode, compactElementVisibility, scene)) {
            return null
          }

          const nodeLocked = isNodeLocked(canvasNode)
          const isSelected = selectedNodeIds.includes(canvasNode.id)
          const cardHandlesSelection =
            (canvasNode.groupViewActive && !!canvasNode.groupStructure) ||
            (canvasNode.blockViewActive && !!canvasNode.blockStructure)
          const pendingFromNode = pendingLink
            ? scene.nodes.find((node) => node.id === pendingLink.fromNodeId)
            : undefined
          const pendingOutputSlot =
            pendingLink && pendingFromNode
              ? findOutputSlotInNode(pendingFromNode, pendingLink.fromInternalStructureId, scene.connections)
              : null
          const isCompatibleTarget =
            pendingLink !== null &&
            pendingFromNode !== undefined &&
            pendingOutputSlot !== null &&
            pendingLink.fromNodeId !== canvasNode.id &&
            nodesShareCollectionTypeForOutputSlot(
              pendingFromNode,
              pendingOutputSlot,
              canvasNode,
              schemaRegistry,
            )
          const isIncompatibleDuringLink =
            pendingLink !== null &&
            pendingLink.fromNodeId !== canvasNode.id &&
            !isCompatibleTarget
          const wirelessHighlighted = wirelessHighlightNodeId === canvasNode.id
          const blockWirelessLinked = blockWirelessDisplayByNode.get(canvasNode.id)?.linked
          const groupWirelessLinked = groupWirelessDisplayByNode.get(canvasNode.id)?.linked
          const linkDropHovered = ritualLinkDropHoverNodeId === canvasNode.id
          const classes = [
            styles.node,
            isSelected && !cardHandlesSelection ? styles.nodeSelected : '',
            wirelessHighlighted || blockWirelessLinked || groupWirelessLinked ? styles.nodeWirelessLinked : '',
            isCompatibleTarget ? styles.nodeCompatibleTarget : '',
            isIncompatibleDuringLink ? styles.nodeIncompatibleTarget : '',
            linkDropHovered ? styles.nodeLinkDropTarget : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              className={classes}
              data-canvas-node="true"
              data-canvas-node-id={canvasNode.id}
              key={canvasNode.id}
              onContextMenu={handleContextMenu}
              onPointerCancel={stopNodeDrag}
              onPointerMove={moveNodeDrag}
              onPointerUp={stopNodeDrag}
              style={{
                left: `${canvasNode.position.x}px`,
                top: `${canvasNode.position.y}px`,
              }}
            >
              {canvasNode.groupViewActive && canvasNode.groupStructure ? (
              <GroupCard
                canvasNode={canvasNode}
                scene={scene}
                selected={isSelected}
                interactionLocked={nodeLocked}
                activeGroupSlotId={pendingGroupLink?.fromGroupSlotId}
                blockWirelessDisplay={groupWirelessDisplayByNode.get(canvasNode.id)}
                blockWirelessPulseSlotId={
                  groupWirelessPulse?.nodeId === canvasNode.id ? groupWirelessPulse.slotId : undefined
                }
                onUpdateGroupParameter={(paramId, value) =>
                  onUpdateGroupParameter?.(canvasNode.id, paramId, value)
                }
                onBlockOutputPointerDown={(paramId, slotId, event) => {
                  event.stopPropagation()
                  beginGroupOutputLink(canvasNode.id, slotId, paramId)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onBlockOutputPointerUp={(_paramId, _slotId, event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                  resolveGroupLinkDrop(event.clientX, event.clientY)
                }}
                onBlockOutputPointerMove={(_paramId, _slotId, event) => {
                  const canvasEl = canvasRef.current
                  if (!canvasEl) {
                    return
                  }
                  setGroupLinkDraftPoint(
                    graphClientToPosition(canvasEl, scale, event.clientX, event.clientY),
                  )
                }}
                onBlockHeaderOutputPointerDown={(slotId, event) => {
                  event.stopPropagation()
                  beginGroupOutputLink(canvasNode.id, slotId)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onBlockHeaderOutputPointerUp={(_slotId, event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                  resolveGroupLinkDrop(event.clientX, event.clientY)
                }}
                onBlockHeaderInputPointerUp={(_slotId, event) => {
                  resolveGroupLinkDrop(event.clientX, event.clientY)
                }}
                onBlockInputPointerUp={(_paramId, _slotId, event) => {
                  resolveGroupLinkDrop(event.clientX, event.clientY)
                }}
                onGroupSlotWirelessHoverStart={handleGroupSlotWirelessHoverStart}
                onGroupSlotWirelessHoverEnd={handleGroupSlotWirelessHoverEnd}
                onGroupSlotCycleRouting={onCycleConnectionRouting}
                canvasScale={scale}
                structureCardResizeModifierActive={structureCardResizeModifierActive}
                onStructureCardResize={({ width, positionX }) =>
                  onSetStructureCardWidth?.(canvasNode.id, width, positionX)
                }
                onSelect={(event) => onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })}
                onStartDrag={
                  nodeLocked ? undefined : (event) => startNodeDrag(event, canvasNode)
                }
              />
            ) : canvasNode.blockViewActive && canvasNode.blockStructure ? (
              <BlockCard
                canvasNode={canvasNode}
                scene={scene}
                selected={isSelected}
                interactionLocked={nodeLocked}
                activeBlockSlotId={pendingBlockLink?.fromBlockSlotId}
                blockWirelessDisplay={blockWirelessDisplayByNode.get(canvasNode.id)}
                blockWirelessPulseSlotId={
                  blockWirelessPulse?.nodeId === canvasNode.id ? blockWirelessPulse.slotId : undefined
                }
                onUpdateBlockParameter={(paramId, value) =>
                  onUpdateBlockParameter?.(canvasNode.id, paramId, value)
                }
                onBlockOutputPointerDown={(paramId, slotId, event) => {
                  event.stopPropagation()
                  beginBlockOutputLink(canvasNode.id, slotId, paramId)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onBlockOutputPointerUp={(_paramId, _slotId, event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                  resolveBlockLinkDrop(event.clientX, event.clientY)
                }}
                onBlockOutputPointerMove={(_paramId, _slotId, event) => {
                  const canvasEl = canvasRef.current
                  if (!canvasEl) {
                    return
                  }
                  setBlockLinkDraftPoint(
                    graphClientToPosition(canvasEl, scale, event.clientX, event.clientY),
                  )
                }}
                onBlockHeaderOutputPointerDown={(slotId, event) => {
                  event.stopPropagation()
                  beginBlockOutputLink(canvasNode.id, slotId)
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onBlockHeaderOutputPointerUp={(_slotId, event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId)
                  }
                  resolveBlockLinkDrop(event.clientX, event.clientY)
                }}
                onBlockHeaderInputPointerUp={(_slotId, event) => {
                  resolveBlockLinkDrop(event.clientX, event.clientY)
                }}
                onBlockInputPointerUp={(_paramId, _slotId, event) => {
                  resolveBlockLinkDrop(event.clientX, event.clientY)
                }}
                onBlockSlotWirelessHoverStart={handleBlockSlotWirelessHoverStart}
                onBlockSlotWirelessHoverEnd={handleBlockSlotWirelessHoverEnd}
                onBlockSlotCycleRouting={onCycleConnectionRouting}
                canvasScale={scale}
                structureCardResizeModifierActive={structureCardResizeModifierActive}
                onStructureCardResize={({ width, positionX }) =>
                  onSetStructureCardWidth?.(canvasNode.id, width, positionX)
                }
                onSelect={(event) => onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })}
                onStartDrag={
                  nodeLocked ? undefined : (event) => startNodeDrag(event, canvasNode)
                }
              />
            ) : (
              <NodeCard
                activeOutputInternalStructureId={
                  pendingLink?.fromNodeId === canvasNode.id ? pendingLink.fromInternalStructureId : undefined
                }
                bodyStyle={canvasNodeBodyStyle(canvasNode)}
                cardStyle={canvasNodeCardStyle(canvasNode)}
                inputPortStyle={canvasNodeInputPortStyle(canvasNode)}
                canvasNodeId={canvasNode.id}
                canAcceptLink={isCompatibleTarget}
                connections={scene.connections}
                displayTitle={getNodeDisplayTitle(canvasNode)}
                locked={nodeLocked}
                onLockedInteraction={onNodeLockedInteraction}
                catalogParameters={(() => {
                  const sid = canvasNode.node.schema.id
                  const kind = schemaNodeKindBySchemaId?.[sid] ?? 'module'
                  if (kind !== 'base') {
                    return undefined
                  }
                  const list = schemaBaseParameterCatalogBySchemaId?.[sid] ?? []
                  const ids = new Set(canvasNode.node.schema.parameters.map((p) => p.id))
                  const names = new Set(canvasNode.node.schema.parameters.map((p) => p.name))
                  return list.filter((p) => !ids.has(p.id) && !names.has(p.name))
                })()}
                node={canvasNode.node}
                nodeKind={schemaNodeKindBySchemaId?.[canvasNode.node.schema.id] ?? 'module'}
                templateSchema={schemaRegistry[canvasNode.node.schema.id] ?? null}
                parameterStubCatalog={
                  schemaBaseParameterCatalogBySchemaId?.[canvasNode.node.schema.id] ?? []
                }
                onAppendCatalogParameter={
                  onCatalogParameterAppend
                    ? (definition) => onCatalogParameterAppend(canvasNode.id, definition)
                    : undefined
                }
                onAppendEmbedCatalogItem={
                  onAppendEmbedCatalogItem
                    ? (embedId, structure) =>
                        onAppendEmbedCatalogItem(canvasNode.id, embedId, structure)
                    : undefined
                }
                onAppendPointerCatalogItem={
                  onAppendPointerCatalogItem
                    ? (pointerId, structure) =>
                        onAppendPointerCatalogItem(canvasNode.id, pointerId, structure)
                    : undefined
                }
                onAppendListEmbedCatalogItem={
                  onAppendListEmbedCatalogItem
                    ? (listEmbedId, structure) =>
                        onAppendListEmbedCatalogItem(canvasNode.id, listEmbedId, structure)
                    : undefined
                }
                onAppendListPointerCatalogItem={
                  onAppendListPointerCatalogItem
                    ? (listPointerId, structure) =>
                        onAppendListPointerCatalogItem(canvasNode.id, listPointerId, structure)
                    : undefined
                }
                onAppendList2EmbedCatalogItem={
                  onAppendList2EmbedCatalogItem
                    ? (list2EmbedId, structure) =>
                        onAppendList2EmbedCatalogItem(canvasNode.id, list2EmbedId, structure)
                    : undefined
                }
                onAppendList2PointerCatalogItem={
                  onAppendList2PointerCatalogItem
                    ? (list2PointerId, structure) =>
                        onAppendList2PointerCatalogItem(canvasNode.id, list2PointerId, structure)
                    : undefined
                }
                onRemoveList2EmbedInstance={
                  onRemoveList2EmbedInstance
                    ? (list2EmbedId, instanceId) =>
                        onRemoveList2EmbedInstance(canvasNode.id, list2EmbedId, instanceId)
                    : undefined
                }
                onRemoveList2PointerInstance={
                  onRemoveList2PointerInstance
                    ? (list2PointerId, instanceId) =>
                        onRemoveList2PointerInstance(canvasNode.id, list2PointerId, instanceId)
                    : undefined
                }
                onRequestRemoveElement={
                  onRequestRemoveElement
                    ? (item) => onRequestRemoveElement(canvasNode.id, item)
                    : undefined
                }
                onInputPortClick={() => completeLink(canvasNode)}
                onOutputWireKeyboard={(entity) => handleOutputWireKeyboard(canvasNode.id, entity)}
                onOutputWirePointerCancel={handleOutputWirePointerCancel}
                onOutputWirePointerDown={
                  nodeLocked
                    ? undefined
                    : (entity, event) => handleOutputWirePointerDown(canvasNode.id, entity, event)
                }
                onOutputWirePointerMove={handleOutputWirePointerMove}
                onOutputWirePointerUp={(entity, event) =>
                  handleOutputWirePointerUp(canvasNode.id, entity, event)
                }
                onSelect={(event) => onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })}
                onStartDrag={
                  nodeLocked ? undefined : (event) => startNodeDrag(event, canvasNode)
                }
                onReorderNodeParameter={
                  onSetNodeParameterOrder
                    ? (parameterId, oneBased) =>
                        onSetNodeParameterOrder(canvasNode.id, parameterId, oneBased)
                    : undefined
                }
                onUpdateParameter={
                  onUpdateNodeParameter
                    ? (parameterId, nextValue) =>
                        onUpdateNodeParameter(canvasNode.id, parameterId, nextValue)
                    : undefined
                }
                onSetElementViewMode={
                  onSetElementViewMode
                    ? (elementKey, mode) => onSetElementViewMode(canvasNode.id, elementKey, mode)
                    : undefined
                }
                onSetElementRetracted={
                  onSetElementRetracted
                    ? (elementKey, retracted) =>
                        onSetElementRetracted(canvasNode.id, elementKey, retracted)
                    : undefined
                }
                onSetElementSelectedIndex={
                  onSetElementSelectedIndex
                    ? (elementKey, index) =>
                        onSetElementSelectedIndex(canvasNode.id, elementKey, index)
                    : undefined
                }
                onMapHashStructureSlotRemoved={
                  onRemoveConnectionsFromOutputSlot
                    ? (slotId) => onRemoveConnectionsFromOutputSlot(canvasNode.id, slotId)
                    : undefined
                }
                onCycleConnectionRouting={onCycleConnectionRouting}
                onRemoveConnection={onRemoveConnection}
                onWirelessPeerHoverStart={handleWirelessPeerHoverStart}
                onWirelessPeerHoverEnd={handleWirelessPeerHoverEnd}
                wirelessDisplay={wirelessDisplayByNode.get(canvasNode.id)}
                wirelessPortPulse={
                  wirelessPortPulse?.nodeId === canvasNode.id ? wirelessPortPulse : undefined
                }
                parameterHints={hints}
                bodyCollapsed={isNodeBodyEffectivelyCollapsed(canvasNode, compactElementVisibility)}
                cardSectionExpanded={canvasNode.cardSectionExpanded}
                cardSectionOrder={canvasNode.cardSectionOrder}
                cardBodyLayout={resolveNodeCardBodyLayout(canvasNode)}
                onToggleCardSection={
                  onToggleNodeCardSection
                    ? (sectionId) => onToggleNodeCardSection(canvasNode.id, sectionId)
                    : undefined
                }
                onReorderNodeCardSection={
                  onSetNodeCardSectionOrder
                    ? (sectionId, oneBased) =>
                        onSetNodeCardSectionOrder(canvasNode.id, sectionId, oneBased)
                    : undefined
                }
                selected={isSelected}
                neekoTransformPhase={canvasNode.neekoTransformPhase}
                neekoTransformError={canvasNode.neekoTransformError}
                isNeekoTransforming={neekoTransformingNodeId === canvasNode.id}
                ritualDropHover={ritualDropHoverNeekoId === canvasNode.id}
                onNeekoDropCode={
                  onNeekoDropCode && !nodeLocked
                    ? (text) => onNeekoDropCode(canvasNode.id, text)
                    : undefined
                }
                outputSlotPeerActions={buildOutputSlotPeerActions(canvasNode.id)}
              />
              )}
            </div>
          )
        })}
      </div>
      </div>
    </section>
  )
})
