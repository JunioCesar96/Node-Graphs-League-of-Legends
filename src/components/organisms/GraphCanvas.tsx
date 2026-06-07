import { forwardRef, startTransition, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { showAppAlert } from '@/messenger_popup/appMessenger'
import { refreshCustomBackgroundLayerHosts } from '@jade/lib/themeApplicator'
import { createPortal } from 'react-dom'
import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react'

import { CanvasContextMenu } from '@/components/molecules/CanvasContextMenu'
import {
  CanvasGridControlPanel,
  resolveCanvasGridControlState,
  type CanvasGridControlPatch,
} from '@/components/molecules/CanvasGridControlPanel'
import {
  DEFAULT_CANVAS_GRID_OPACITY,
  resolveCanvasGridPresentation,
} from '@/core/canvasGridSettings'
import { CollectionTypeLinkMenu } from '@/components/molecules/CollectionTypeLinkMenu'
import { DockTabIcon } from '@/components/atoms/DockTabIcon'
import { ToolbarDockIconButton } from '@/components/atoms/ToolbarDockIconButton'
import { CanvasCameraDockBody } from '@/components/molecules/CanvasCameraDockBody'
import { CanvasToolbarToolSlot } from '@/components/molecules/CanvasToolbarToolSlot'
import { CanvasZoomDockBody } from '@/components/molecules/CanvasZoomDockBody'
import { InspectorViewportDockShell } from '@/components/molecules/InspectorViewportDockShell'
import { AddNodePalette, type PaletteCatalogMode } from '@/components/organisms/AddNodePalette'
import { SlashCommandPicker } from '@/components/organisms/SlashCommandPicker'
import { TextInputDialog } from '@/components/molecules/TextInputDialog'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import type { BlockDefinitionSpawnLinkContext } from '@/core/blockSlotConnections'
import {
  blockDefinitionMatchesLinkDrop,
  type BlockDropLinkPaletteContext,
} from '@/core/blockDefinitionLinkPalette'
import { Canvas2DCursor } from '@/components/molecules/Canvas2DCursor'
import { SnapMenu, useSnapMenu } from '@/components/molecules/SnapMenu'
import { renderGraphSnapMenuIcon } from '@/components/molecules/SnapMenu/graphSnapMenuIcons'
import { RitualNeekoStagingPreview } from '@/components/molecules/RitualNeekoStagingPreview'
import {
  GraphCanvasNodeHostProvider,
  type GraphCanvasNodeHostContextValue,
} from '@/components/organisms/GraphCanvasNodeHostContext'
import { GraphCanvasSceneNode } from '@/components/organisms/GraphCanvasSceneNode'
import { GraphCanvasConnectionsLayer } from '@/components/organisms/GraphCanvasConnectionsLayer'
import { connectionInvolvesAddon, findConnectionForAddonSlot, ADDON_CARD_WIDTH, resolveAddonSlotCanvasPoint } from '@/core/addonSlotConnections'
import { getAddonManifest } from '@/blockStructures/addonRegistry'
import { useAddonCanvasLinks } from '@/hooks/useAddonCanvasLinks'
import { resolveAddonDropFromDataTransfer } from '@/ritualDrag/addonDropHandler'
import { useRitualDragOptional } from '@/ritualDrag/RitualDragContext'
import {
  computePanCenteredOnGraphPoint,
  DEFAULT_CANVAS_2D_CURSOR_POSITION,
} from '@/core/canvas2DCursor'
import {
  buildGraphSnapMenuActions,
  GRAPH_NAVIGATION_MENU_TITLE,
  graphPointAtViewportCenter,
  isGraphSnapActionDisabled,
  resolveSelectionPivotCenter,
  type GraphSnapActionId,
} from '@/core/graphSnapMenu'
import { useCanvas2DCursorPlacement } from '@/hooks/useCanvas2DCursorPlacement'
import { useRitualDragCanvasDrop } from '@/hooks/useRitualDragCanvasDrop'
import {
  DEFAULT_CANVAS_INTERACTION_MODE,
  type CanvasInteractionMode,
  isCanvasPanCursorMode,
} from '@/core/canvasInteractionMode'
import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene, SceneCamera } from '@/core/canvasScene'
import { isCanvasNodeBodyCollapsed } from '@/core/canvasScene'
import {
  isNodeBodyEffectivelyCollapsed,
  isNodeLocked,
  isNodeVisibleOnCanvas,
  type CompactElementCanvasVisibility,
} from '@/core/canvasNodePresentation'
import { useCompactElementVisibility } from '@/hooks/useCompactElementVisibility'
import { graphCanvasNodePositionsKey } from '@/core/graphCanvasSceneMemoKeys'
import { useGraphCanvasBlockSlotIndexMap } from '@/hooks/useGraphCanvasBlockSlotIndexMap'
import { useGraphCanvasWirelessDisplayMaps } from '@/hooks/useGraphCanvasWirelessDisplayMaps'
import {
  applyGraphCanvasDragPositionOverride,
  resolveGraphCanvasNodeRenderPosition,
  type GraphCanvasDragPositionOverride,
} from '@/core/graphCanvasDragPosition'
import {
  collectCanvasRenderNodeIds,
  collectVisibleCanvasNodes,
  computeGraphViewportRect,
} from '@/core/canvasViewportCulling'
import {
  type WirelessPortPulseTarget,
  type WirelessPeerHoverPayload,
} from '@/core/connectionDisplay'
import {
  type BlockSlotWirelessLink,
} from '@/core/blockConnectionDisplay'
import {
  type BlockElementViewKey,
} from '@/core/blockElementViewState'
import {
  type GroupSlotWirelessLink,
} from '@/core/groupConnectionDisplay'
import { resolveBlockCardWidth, resolveGroupCardWidth } from '@/core/structureCardLayout'
import {
  createBlockDraftConnectionPath,
  estimateBlockCardHeight,
  classifyBlockSlotConnection,
  findBlockSlotEndpoint,
  findBlockSlotAtPoint,
  findConnectionForBlockSlot,
  findConnectionsForBlockOutputSlot,
  blockOutputSlotConnectionKey,
  resolveBlockOutputSlotConnectionIndex,
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
import {
  buildContextMenuItems,
  type CanvasContextMenuBuildContext,
} from '@/core/canvasContextMenuItems'
import {
  resolveBlockOrganizationOperationFromMenuId,
  type BlockOrganizationOperation,
} from '@/core/blockOrganizationLayout'
import { contextMenuItemsToSnapActions } from '@/core/snapMenu/contextMenuSnapMenu'
import {
  GRAPH_GRID_CONTEXT_MENU_TITLE,
  SNAP_MENU_BACK_LABEL,
} from '@/core/language/graphGridSnapMenuLangIds'
import { LangId } from '@/core/language/languageIds'
import type { SlashCommandDocument } from '@/core/slashCommandTypes'
import { refreshSlashCommandRegistryFromDisk } from '@/core/slashCommandStorage'
import { useLanguage } from '@/language/LanguageProvider'
import {
  MESSENGER_CONFIRM_ADDON_CONNECTION_FORCED,
  MESSENGER_CONFIRM_BLOCK_CONNECTION_FORCED,
} from '@/messenger_popup/messengerCatalog'
import {
  classifyCrossSlotRequest,
  type CrossSlotConnectRequest,
} from '@/core/crossSlotConnections'
import { useMessengerPopup } from '@/messenger_popup/MessengerPopupProvider'
import {
  DEFAULT_CANVAS_TOOLBAR_VISIBILITY,
  toggleToolbarVisibility,
  type CanvasToolbarToolId,
  type CanvasToolbarVisibility,
} from '@/core/canvasToolbarVisibility'
import { resolveContextTarget } from '@/core/canvasContextMenuResolve'
import {
  collectGraphPortAnchors,
  collectAddonSlotAnchors,
  emptyPortAnchorMaps,
  graphPointFromElementCenter,
  outputAnchorKey,
  type PortAnchorMaps,
  type GraphPanPoint,
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
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import { resolveBlockSlotPeer } from '@/core/blockSlotPeerState'
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
import type { ViewportToolbarDockId } from '@/core/viewportToolbarDock'

import dockStyles from '@/styles/inspectorViewportDock.module.css'
import styles from './GraphCanvas.module.css'

type CanvasToolbarDockId = Extract<ViewportToolbarDockId, 'camera' | 'zoom'>

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
  onCreateBlockFromDefinition?: (
    definition: BlockDefinitionJsonDocument,
    position?: CanvasPosition,
    spawnLink?: BlockDefinitionSpawnLinkContext,
  ) => { ok: true; nodeId: string } | { ok: false; error: string }
  onCreateAddonFromCatalog?: (
    addonId: string,
    position?: CanvasPosition,
    spawnLink?: {
      fromNodeId: string
      fromAddonSlotId?: string
      fromBlockSlotId?: string
      fromBlockParameterId?: string
      toAddonSlotName?: string
    },
  ) => Promise<{ ok: true; nodeId: string } | { ok: false; error: string }>
  onApplyAddonOutputs?: (nodeId: string, outputs: Record<string, unknown>) => void
  onConnectAddonSlots?: (
    request:
      | {
          kind: 'addon'
          fromNodeId: string
          fromAddonSlotId: string
          toNodeId: string
          toAddonSlotId: string
          allowForced?: boolean
        }
      | {
          kind: 'blockToAddon'
          fromNodeId: string
          fromBlockSlotId: string
          fromBlockParameterId?: string
          toNodeId: string
          toAddonSlotId: string
          allowForced?: boolean
        }
      | {
          kind: 'addonToBlock'
          fromNodeId: string
          fromAddonSlotId: string
          toNodeId: string
          toBlockSlotId: string
          toBlockParameterId?: string
          allowForced?: boolean
        },
  ) => void
  onSyncBlockParameterCatalog?: (
    definitions: readonly BlockDefinitionJsonDocument[],
  ) => Promise<{ ok: boolean; error?: string }>
  onAddBlockParameterFromCatalog?: (
    nodeId: string,
    doc: import('@/core/blockParameterJson').BlockParameterJsonDocument,
  ) => { ok: true } | { ok: false; error: string }
  onRemoveBlockParameter?: (nodeId: string, paramId: string) => void
  onEditBlockParameter?: (
    nodeId: string,
    param: import('@/core/blockSchema').BlockParameterDef,
    screenAnchor?: CanvasContextMenuAnchor,
  ) => void
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
    modifiers: { axisLock: '' | 'x' | 'y'; snapGrid: boolean; transient?: boolean },
  ) => void
  onBeginNodeDrag?: () => void
  onEndNodeDrag?: () => void
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
  onRemoveConnectionsFromBlockSlot?: (
    canvasNodeId: string,
    slotId: string,
    connectionId?: string,
  ) => void
  onRemoveConnectionsFromAddonSlot?: (canvasNodeId: string, slotId: string) => void
  onShowOnlyConnectedComponent?: (canvasNodeId: string) => void
  onShowOnlySlotSubtree?: (canvasNodeId: string, slotId: string) => void
  onShowOnlyIncomingSlotBranch?: (canvasNodeId: string) => void
  /** Oculta (`sceneHidden`) todos os descendentes ligados por saídas do nó. */
  onHideLinkedChildNodes?: (canvasNodeId: string) => void
  /** Mostra (`sceneHidden`) todos os descendentes ligados por saídas do nó. */
  onShowLinkedChildNodes?: (canvasNodeId: string) => void
  /** Oculta ramificações fora do índice activo em blocos (list[pointer] / map*). */
  onHideInactiveBlockIndexBranches?: (canvasNodeId: string) => void
  /** Alinha / distribui blocos seleccionados. */
  onApplyBlockOrganization?: (operation: BlockOrganizationOperation) => void
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
  /** Modo leve: pager obrigatório e índice 0 por defeito em fan-out. */
  nodeLightModeEnabled?: boolean
  onSetBlockOutputSlotConnectionIndex?: (
    canvasNodeId: string,
    slotId: string,
    index: number,
  ) => void
  onSetBlockElementSelectedIndex?: (
    canvasNodeId: string,
    elementKey: BlockElementViewKey,
    index: number,
  ) => void
  onConnectBlockSlots?: (
    fromNodeId: string,
    fromBlockSlotId: string,
    fromBlockParameterId: string | undefined,
    toNodeId: string,
    toBlockSlotId: string,
    toBlockParameterId: string | undefined,
    allowForced?: boolean,
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
  onSaveBlockSlashCommand?: (
    nodeId: string,
    commandName: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  onRemoveBlockSlashCommand?: (
    command: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  onApplyBlockSlashCommand?: (
    command: string,
    position?: CanvasPosition,
  ) => { ok: true; rootNodeId: string } | { ok: false; error: string }
  /** Serializa Main → ritual Class Group e abre no CodeDock. */
  onGraphsToCode?: () => void
  /** Pré-visualiza subárvore do nó no CodeDock. */
  onViewNodeCode?: (nodeId: string) => void
  onViewNodeBlockCode?: (nodeId: string) => void
  /** Preview de código de bloco a partir do menu de contexto do block card. */
  onPreviewBlockCardCode?: (nodeId: string) => void
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
  /** Barra de ferramentas da grade retraída (só ícone de ferramentas). */
  toolbarCollapsed?: boolean
  onToolbarCollapsedChange?: (collapsed: boolean) => void
  /** Fundo com padrão de grade no canvas (persistido em `scene.sceneChrome`). */
  showCanvasGrid?: boolean
  canvasGridSize?: number
  canvasGridOpacity?: number
  canvasGridLineColorEnabled?: boolean
  canvasGridHorizontalLineColor?: string
  canvasGridVerticalLineColor?: string
  canvasGridCheckerEnabled?: boolean
  canvasGridCheckerColorA?: string
  canvasGridCheckerColorB?: string
  onCanvasGridChange?: (patch: CanvasGridControlPatch) => void
  /** @deprecated Use onCanvasGridChange */
  onShowCanvasGridChange?: (show: boolean) => void
  /** Junta visualmente ao bloco de abas «Cenas de trabalho» (sem borda/cantos no topo). */
  attachedViewport?: boolean
  /** Quando definido, a barra de ferramentas é renderizada neste contentor (ex.: fila de abas). */
  toolbarChromeHost?: HTMLElement | null
  /** Dock expandido na barra da vista (inspetores + câmera/zoom/reset). */
  activeViewportToolbarDock?: ViewportToolbarDockId | null
  onViewportToolbarDockToggle?: (dockId: ViewportToolbarDockId) => void
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

type BlockDropLinkContext = BlockDropLinkPaletteContext & {
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
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
    return estimateBlockCardHeight(node.blockStructure, node.node)
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
    onCreateBlockFromDefinition,
    onSyncBlockParameterCatalog,
    onAddBlockParameterFromCatalog,
    onRemoveBlockParameter,
    onEditBlockParameter,
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
    onBeginNodeDrag,
    onEndNodeDrag,
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
    onRemoveConnectionsFromBlockSlot,
    onRemoveConnectionsFromAddonSlot,
    onShowOnlyConnectedComponent,
    onShowOnlySlotSubtree,
    onShowOnlyIncomingSlotBranch,
    onHideLinkedChildNodes,
    onShowLinkedChildNodes,
    onHideInactiveBlockIndexBranches,
    onApplyBlockOrganization,
    scene,
    onSceneCameraChange,
    selectedNodeIds,
    selectedNodeId,
    viewportControlsSlot,
    blockInspectorControlsSlot,
    groupInspectorControlsSlot,
    sceneNodesControlsSlot,
    onUpdateBlockParameter,
    nodeLightModeEnabled = true,
    onSetBlockOutputSlotConnectionIndex,
    onSetBlockElementSelectedIndex,
    onConnectBlockSlots,
    onUpdateGroupParameter,
    onConnectGroupSlots,
    onCreateAddonFromCatalog,
    onApplyAddonOutputs,
    onConnectAddonSlots,
    onNodeLockedInteraction,
    onPatchNodeSceneOverlay,
    onSceneNodesPanelRequest,
    onExtractSceneNodesStatePreset,
    onSaveBlockSlashCommand,
    onRemoveBlockSlashCommand,
    onApplyBlockSlashCommand,
    onGraphsToCode,
    onViewNodeCode,
    onViewNodeBlockCode,
    onPreviewBlockCardCode,
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
    toolbarCollapsed = true,
    onToolbarCollapsedChange,
    showCanvasGrid = true,
    canvasGridSize,
    canvasGridOpacity,
    canvasGridLineColorEnabled,
    canvasGridHorizontalLineColor,
    canvasGridVerticalLineColor,
    canvasGridCheckerEnabled,
    canvasGridCheckerColorA,
    canvasGridCheckerColorB,
    onCanvasGridChange,
    onShowCanvasGridChange,
    attachedViewport = false,
    toolbarChromeHost = null,
    activeViewportToolbarDock = null,
    onViewportToolbarDockToggle,
  },
  ref,
) {
  const { t } = useLanguage()
  const { showConfirmByCatalogId } = useMessengerPopup()
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [pendingBlockLink, setPendingBlockLink] = useState<PendingBlockLink | null>(null)
  const pendingBlockLinkRef = useRef<PendingBlockLink | null>(null)
  const [blockLinkDraftPoint, setBlockLinkDraftPoint] = useState<PanPoint | null>(null)
  const [blockWirelessPulse, setBlockWirelessPulse] = useState<{ nodeId: string; slotId: string } | null>(null)
  const [blockSlotToolsEnabledNodes, setBlockSlotToolsEnabledNodes] = useState<Set<string>>(
    () => new Set(),
  )
  const blockFocusPulseTimeoutRef = useRef<number | null>(null)
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
  const [blockDropLinkContext, setBlockDropLinkContext] = useState<BlockDropLinkContext | null>(null)
  const [addonDropLinkContext, setAddonDropLinkContext] = useState<{
    fromNodeId: string
    fromAddonSlotId: string
    position: CanvasPosition
  } | null>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isSlashCommandPickerOpen, setIsSlashCommandPickerOpen] = useState(false)
  const [slashCommandRemovePickerOpen, setSlashCommandRemovePickerOpen] = useState(false)
  const [slashCommandAddDialog, setSlashCommandAddDialog] = useState<{
    nodeId: string
    suggestedName: string
  } | null>(null)
  const [pan, setPan] = useState<PanPoint>(() => scene.camera?.pan ?? { x: 0, y: 0 })
  const [scale, setScale] = useState(() => scene.camera?.scale ?? 1)
  const sceneRef = useRef(scene)
  sceneRef.current = scene
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const nodeDragGesture = useRef<NodeDragGesture | null>(null)
  const [dragPositionOverride, setDragPositionOverride] = useState<GraphCanvasDragPositionOverride>(null)
  const lastDragVisualRef = useRef<GraphCanvasDragPositionOverride>(null)
  const pendingDragVisualRef = useRef<GraphCanvasDragPositionOverride>(null)
  const dragVisualRafRef = useRef<number | null>(null)
  const moveNodeDragImplRef = useRef<(event: PointerEvent<HTMLDivElement>) => void>(() => {})
  const stopNodeDragImplRef = useRef<(event: PointerEvent<HTMLDivElement>) => void>(() => {})

  const flushDragVisual = useCallback(() => {
    dragVisualRafRef.current = null
    const pending = pendingDragVisualRef.current

    if (!pending) {
      return
    }

    pendingDragVisualRef.current = null
    setDragPositionOverride(pending)
  }, [])

  const scheduleDragVisual = useCallback((nodeId: string, x: number, y: number) => {
    const nextOverride = { nodeId, x, y }
    lastDragVisualRef.current = nextOverride
    pendingDragVisualRef.current = nextOverride

    if (dragVisualRafRef.current === null) {
      dragVisualRafRef.current = window.requestAnimationFrame(flushDragVisual)
    }
  }, [flushDragVisual])

  const cancelPendingDragVisual = useCallback(() => {
    if (dragVisualRafRef.current !== null) {
      window.cancelAnimationFrame(dragVisualRafRef.current)
      dragVisualRafRef.current = null
    }

    pendingDragVisualRef.current = null
  }, [])

  const clearDragVisual = useCallback(() => {
    cancelPendingDragVisual()
    lastDragVisualRef.current = null
    setDragPositionOverride(null)
  }, [cancelPendingDragVisual])

  const commitDragVisualPosition = useCallback(
    (
      nodeId: string,
      modifiers: { axisLock: '' | 'x' | 'y'; snapGrid: boolean },
    ) => {
      const last = lastDragVisualRef.current

      if (!last || last.nodeId !== nodeId) {
        return
      }

      startTransition(() => {
        onMoveNode(
          last.nodeId,
          { x: last.x, y: last.y },
          { ...modifiers, transient: true },
        )
      })
    },
    [onMoveNode],
  )

  useEffect(() => {
    const cancelActiveNodeDrag = () => {
      nodeDragGesture.current = null
    }
    document.addEventListener('addon-context-menu-open', cancelActiveNodeDrag)
    return () => document.removeEventListener('addon-context-menu-open', cancelActiveNodeDrag)
  }, [])

  const panGesture = useRef<PanGesture | null>(null)
  const middlePanGestureRef = useRef<PanGesture | null>(null)
  const marqueeGestureRef = useRef<{ additive: boolean; pointerId: number; start: CanvasPosition } | null>(null)
  const temporarySelectBoxFromTweakRef = useRef(false)
  const viewportRef = useRef<HTMLElement | null>(null)
  const viewportBodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    refreshCustomBackgroundLayerHosts()
  }, [])
  const { cursor2DPosition, setCursor2DPosition } = useCanvas2DCursorPlacement({
    canvasRef,
    viewportBodyRef,
    scale,
  })
  const lastPointerClientRef = useRef({ x: 0, y: 0 })
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
  const gluePointerOffsetRef = useRef<CanvasPosition | null>(null)
  const previousGlueNodeIdRef = useRef<string | null>(null)
  const [structureCardResizeModifierActive, setStructureCardResizeModifierActive] = useState(false)
  const [wirelessHighlightNodeId, setWirelessHighlightNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    anchor: CanvasContextMenuAnchor
    target: CanvasContextTarget
  } | null>(null)
  const [blockParameterPanelRequest, setBlockParameterPanelRequest] = useState<{
    nodeId: string
    panel: 'add' | 'edit' | 'remove'
  } | null>(null)
  const [blockParameterScreenAnchor, setBlockParameterScreenAnchor] =
    useState<CanvasContextMenuAnchor | null>(null)
  const [blockParameterAnchorNodeId, setBlockParameterAnchorNodeId] = useState<string | null>(null)
  const [canvasInteractionMode, setCanvasInteractionMode] = useState<CanvasInteractionMode>(
    DEFAULT_CANVAS_INTERACTION_MODE,
  )
  const [gridControlAnchor, setGridControlAnchor] = useState<CanvasContextMenuAnchor | null>(null)
  const gridPresentation = useMemo(
    () =>
      resolveCanvasGridPresentation({
        showCanvasGrid,
        canvasGridSize,
        canvasGridOpacity,
        canvasGridLineColorEnabled,
        canvasGridHorizontalLineColor,
        canvasGridVerticalLineColor,
        canvasGridCheckerEnabled,
        canvasGridCheckerColorA,
        canvasGridCheckerColorB,
      }),
    [
      canvasGridCheckerColorA,
      canvasGridCheckerColorB,
      canvasGridCheckerEnabled,
      canvasGridHorizontalLineColor,
      canvasGridLineColorEnabled,
      canvasGridOpacity,
      canvasGridSize,
      canvasGridVerticalLineColor,
      showCanvasGrid,
    ],
  )
  const gridLineStrength = gridPresentation.showCanvasGrid
    ? Math.min(3, gridPresentation.canvasGridOpacity / DEFAULT_CANVAS_GRID_OPACITY)
    : 0
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
  const [paletteInitialCatalogMode, setPaletteInitialCatalogMode] = useState<PaletteCatalogMode>('nodes')
  const [paletteScreenAnchor, setPaletteScreenAnchor] = useState<{ left: number; top: number } | null>(
    null,
  )
  const addNodeToolbarAnchorRef = useRef<HTMLDivElement | null>(null)
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

  useLayoutEffect(() => {
    const viewport = viewportBodyRef.current

    if (!viewport) {
      return
    }

    const syncViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      })
    }

    syncViewportSize()

    const observer = new ResizeObserver(syncViewportSize)
    observer.observe(viewport)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (scene.camera === undefined) {
      return
    }

    const nextPan = scene.camera.pan
    const nextScale = scene.camera.scale

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

  const initialCameraOnCursor2DRef = useRef(false)

  const measureCanvasNodeBounds = useCallback(
    (node: CanvasNode) => ({
      x: node.position.x,
      y: node.position.y,
      width: getCanvasNodeWidth(node),
      height: getNodeCardHeight(node, scene.connections),
    }),
    [scene.connections],
  )

  const moveSelectionByDelta = useCallback(
    (delta: CanvasPosition) => {
      if (delta.x === 0 && delta.y === 0) {
        return
      }

      for (const nodeId of selectedNodeIds) {
        const node = scene.nodes.find((entry) => entry.id === nodeId)

        if (!node || isNodeLocked(node)) {
          continue
        }

        onMoveNode(
          nodeId,
          {
            x: node.position.x + delta.x,
            y: node.position.y + delta.y,
          },
          { axisLock: '', snapGrid: false },
        )
      }
    },
    [onMoveNode, scene.nodes, selectedNodeIds],
  )

  const graphSnapMenuActions = useMemo(() => buildGraphSnapMenuActions(t), [t])
  const isPointerOnCanvasGrid = useCallback(() => {
    const viewport = viewportBodyRef.current

    if (!viewport) {
      return false
    }

    const rect = viewport.getBoundingClientRect()
    const { x, y } = lastPointerClientRef.current

    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }, [])

  const graphSnapMenuTitle = useMemo(
    () => t(GRAPH_NAVIGATION_MENU_TITLE.langId, GRAPH_NAVIGATION_MENU_TITLE.fallback),
    [t],
  )

  const centerCameraOnCursor2D = useCallback(
    (options?: { persist?: boolean; scale?: number }) => {
      const viewport = viewportBodyRef.current

      if (!viewport) {
        return false
      }

      const viewportWidth = viewport.clientWidth
      const viewportHeight = viewport.clientHeight

      if (viewportWidth <= 0 || viewportHeight <= 0) {
        return false
      }

      const targetScale = options?.scale ?? scaleRef.current
      const nextPan = computePanCenteredOnGraphPoint(
        cursor2DPosition,
        viewportWidth,
        viewportHeight,
        targetScale,
      )

      panRef.current = nextPan
      scaleRef.current = targetScale
      setPan(nextPan)
      setScale(targetScale)

      if (options?.persist !== false) {
        persistSceneCamera({ pan: nextPan, scale: targetScale })
      }

      return true
    },
    [cursor2DPosition, persistSceneCamera],
  )

  useLayoutEffect(() => {
    if (initialCameraOnCursor2DRef.current) {
      return
    }

    const viewport = viewportBodyRef.current

    if (!viewport) {
      return
    }

    const applyInitialCamera = () => {
      if (initialCameraOnCursor2DRef.current) {
        return
      }

      if (scene.camera !== undefined) {
        initialCameraOnCursor2DRef.current = true
        return
      }

      if (centerCameraOnCursor2D({ scale: 1 })) {
        initialCameraOnCursor2DRef.current = true
      }
    }

    applyInitialCamera()

    const observer = new ResizeObserver(applyInitialCamera)
    observer.observe(viewport)

    return () => {
      observer.disconnect()
    }
  }, [centerCameraOnCursor2D, scene.camera])

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
  const glueModeActive = glueNodeId !== null

  const deactivateGlueNode = useCallback(() => {
    setGlueNodeId(null)
  }, [])

  const activateGlueNode = useCallback((nodeId: string) => {
    setGlueNodeId(nodeId)
  }, [])

  const toggleGlueForNode = useCallback(
    (nodeId: string) => {
      if (glueNodeId === nodeId) {
        deactivateGlueNode()
        return
      }

      activateGlueNode(nodeId)
    },
    [activateGlueNode, deactivateGlueNode, glueNodeId],
  )

  useEffect(() => {
    const previous = previousGlueNodeIdRef.current
    previousGlueNodeIdRef.current = glueNodeId

    if (!glueNodeId) {
      gluePointerOffsetRef.current = null
      return
    }

    if (previous === glueNodeId) {
      return
    }

    const canvas = canvasRef.current
    const node = scene.nodes.find((entry) => entry.id === glueNodeId)

    if (!canvas || !node) {
      gluePointerOffsetRef.current = { x: 0, y: 0 }
      return
    }

    const pointer = graphClientToPosition(
      canvas,
      scale,
      lastPointerClientRef.current.x,
      lastPointerClientRef.current.y,
    )

    gluePointerOffsetRef.current = {
      x: pointer.x - node.position.x,
      y: pointer.y - node.position.y,
    }
  }, [glueNodeId, scale, scene.nodes])

  useEffect(() => {
    if (!glueNodeId) {
      return
    }

    if (selectedNodeIds.length === 0 || !selectedNodeIds.includes(glueNodeId)) {
      deactivateGlueNode()
    }
  }, [deactivateGlueNode, glueNodeId, selectedNodeIds])

  useEffect(() => {
    if (!glueNodeId || blockParameterPanelRequest?.nodeId !== glueNodeId) {
      return
    }

    setBlockParameterPanelRequest(null)
    setBlockParameterScreenAnchor(null)
    setBlockParameterAnchorNodeId(null)
  }, [blockParameterPanelRequest?.nodeId, glueNodeId])

  const canvasBounds = getCanvasBounds(scene)
  const [portAnchors, setPortAnchors] = useState<PortAnchorMaps>(emptyPortAnchorMaps)
  const [addonSlotAnchors, setAddonSlotAnchors] = useState<Map<string, GraphPanPoint>>(() => new Map())

  const blockOutputSlotConnectionIndexByKey = useGraphCanvasBlockSlotIndexMap(
    scene,
    nodeLightModeEnabled,
  )

  const { wirelessDisplayByNode, blockWirelessDisplayByNode, groupWirelessDisplayByNode } =
    useGraphCanvasWirelessDisplayMaps(scene.connections, scene.nodes, blockOutputSlotConnectionIndexByKey)

  const resolveBlockOutputSlotConnectionIndexForNode = useCallback(
    (nodeId: string, slotId: string, connectionCount: number) =>
      resolveBlockOutputSlotConnectionIndex(
        blockOutputSlotConnectionIndexByKey,
        nodeId,
        slotId,
        connectionCount,
        { lightModeDefaultFirst: nodeLightModeEnabled },
      ),
    [blockOutputSlotConnectionIndexByKey, nodeLightModeEnabled],
  )

  const handleBlockOutputSlotConnectionIndexChange = useCallback(
    (nodeId: string, slotId: string, index: number) => {
      onSetBlockOutputSlotConnectionIndex?.(nodeId, slotId, index)
    },
    [onSetBlockOutputSlotConnectionIndex],
  )

  const handleWirelessPeerHoverStart = useCallback(
    (payload: WirelessPeerHoverPayload) => {
      setWirelessHighlightNodeId(payload.peerNodeId)

      const peerNode = sceneRef.current.nodes.find((node) => node.id === payload.peerNodeId)
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
    [],
  )

  const handleWirelessPeerHoverEnd = useCallback(() => {
    setWirelessHighlightNodeId(null)
    setWirelessPortPulse(null)
  }, [])

  const compactElementVisibility = useCompactElementVisibility(scene, nodeLightModeEnabled)

  const isPolicyVisibleOnCanvas = useCallback(
    (canvasNode: CanvasNode) =>
      isNodeVisibleOnCanvas(canvasNode, compactElementVisibility, sceneRef.current),
    [compactElementVisibility],
  )

  const nodePositionsKey = useMemo(
    () => graphCanvasNodePositionsKey(scene.nodes, dragPositionOverride),
    [dragPositionOverride, scene.nodes],
  )

  const graphViewportRect = useMemo(
    () =>
      computeGraphViewportRect(viewportSize.width, viewportSize.height, pan, scale),
    [pan.x, pan.y, scale, viewportSize.height, viewportSize.width],
  )

  const nodesForLayout = useMemo(
    () => applyGraphCanvasDragPositionOverride(scene.nodes, dragPositionOverride),
    [dragPositionOverride, scene.nodes],
  )

  const forceRenderNodeIds = useMemo(() => {
    const forced = new Set<string>(selectedNodeIds)

    if (dragPositionOverride?.nodeId) {
      forced.add(dragPositionOverride.nodeId)
    }

    if (glueNodeId) {
      forced.add(glueNodeId)
    }

    if (wirelessHighlightNodeId) {
      forced.add(wirelessHighlightNodeId)
    }

    if (ritualLinkDropHoverNodeId) {
      forced.add(ritualLinkDropHoverNodeId)
    }

    if (pendingLink) {
      forced.add(pendingLink.fromNodeId)
    }

    if (pendingBlockLink) {
      forced.add(pendingBlockLink.fromNodeId)
    }

    if (pendingGroupLink) {
      forced.add(pendingGroupLink.fromNodeId)
    }

    return forced
  }, [
    glueNodeId,
    pendingBlockLink,
    pendingGroupLink,
    pendingLink,
    ritualLinkDropHoverNodeId,
    selectedNodeIds,
    dragPositionOverride?.nodeId,
    wirelessHighlightNodeId,
  ])

  const canvasRenderNodeIds = useMemo(
    () =>
      collectCanvasRenderNodeIds({
        nodes: nodesForLayout,
        viewport: graphViewportRect,
        measureBounds: measureCanvasNodeBounds,
        forceNodeIds: forceRenderNodeIds,
        isPolicyVisible: isPolicyVisibleOnCanvas,
      }),
    [
      forceRenderNodeIds,
      graphViewportRect,
      isPolicyVisibleOnCanvas,
      measureCanvasNodeBounds,
      nodesForLayout,
    ],
  )

  const canvasRenderNodeIdsKey = useMemo(
    () => [...canvasRenderNodeIds].sort().join('|'),
    [canvasRenderNodeIds],
  )

  const visibleCanvasNodes = useMemo(
    () => collectVisibleCanvasNodes(scene.nodes, canvasRenderNodeIds),
    [canvasRenderNodeIds, scene.nodes],
  )

  const policyVisibleNodeIds = useMemo(
    () =>
      new Set(
        scene.nodes.filter((node) => isPolicyVisibleOnCanvas(node)).map((node) => node.id),
      ),
    [isPolicyVisibleOnCanvas, scene.nodes],
  )

  const isConnectionRenderedInViewport = useCallback(
    (connection: CanvasConnection) => {
      if (
        !policyVisibleNodeIds.has(connection.fromNodeId) ||
        !policyVisibleNodeIds.has(connection.toNodeId)
      ) {
        return false
      }

      return (
        canvasRenderNodeIds.has(connection.fromNodeId) ||
        canvasRenderNodeIds.has(connection.toNodeId)
      )
    },
    [canvasRenderNodeIds, policyVisibleNodeIds],
  )

  useLayoutEffect(() => {
    const el = canvasRef.current

    if (!el) {
      return
    }

    setPortAnchors(collectGraphPortAnchors(el, scale))
    setAddonSlotAnchors(collectAddonSlotAnchors(el, scale))
  }, [canvasRenderNodeIdsKey, dragPositionOverride, scale, scene.connections.length, scene.nodes.length])

  const tryConnectCrossSlots = useCallback(
    (request: CrossSlotConnectRequest, allowForced = false): boolean => {
      if (!onConnectAddonSlots) {
        return false
      }

      const connectionClass = classifyCrossSlotRequest(scene.nodes, request)
      if (connectionClass.kind === 'incompatible') {
        return false
      }

      if (connectionClass.kind === 'forced' && !allowForced) {
        showConfirmByCatalogId(MESSENGER_CONFIRM_ADDON_CONNECTION_FORCED, {
          replacements: {
            outputType: connectionClass.outputType,
            inputType: connectionClass.inputType,
            outputLabel: connectionClass.outputLabel,
            inputLabel: connectionClass.inputLabel,
          },
          onConfirm: () => {
            tryConnectCrossSlots(request, true)
          },
        })
        return false
      }

      onConnectAddonSlots({
        ...request,
        allowForced: connectionClass.kind === 'forced' || allowForced,
      })
      return true
    },
    [onConnectAddonSlots, scene.nodes, showConfirmByCatalogId],
  )

  const addonLinks = useAddonCanvasLinks({
    scene,
    scale,
    canvasRef,
    addonSlotAnchors,
    visibleNodeIds: canvasRenderNodeIds,
    tryConnectCrossSlots: onConnectAddonSlots ? tryConnectCrossSlots : undefined,
    onSelectNode,
    onOpenAddonPalette: onCreateAddonFromCatalog
      ? (context) => {
          setAddonDropLinkContext(context)
          setPaletteSpawnPosition(context.position)
          setPaletteScreenAnchor(null)
          setIsPaletteOpen(true)
        }
      : undefined,
    endBlockLinkDraft: () => {
      pendingBlockLinkRef.current = null
      setPendingBlockLink(null)
      setBlockLinkDraftPoint(null)
    },
    endGroupLinkDraft: () => {
      pendingGroupLinkRef.current = null
      setPendingGroupLink(null)
      setGroupLinkDraftPoint(null)
    },
  })

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

  const addonLinkDraftPath = useMemo(() => {
    if (!addonLinks.pendingAddonLink || !addonLinks.addonLinkDraftPoint) {
      return null
    }

    return addonLinks.createAddonDraftConnectionPath(
      addonLinks.pendingAddonLink.draftAnchor.sx,
      addonLinks.pendingAddonLink.draftAnchor.sy,
      addonLinks.addonLinkDraftPoint.x,
      addonLinks.addonLinkDraftPoint.y,
    )
  }, [addonLinks.addonLinkDraftPoint, addonLinks.createAddonDraftConnectionPath, addonLinks.pendingAddonLink])

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
      if (!anchor) {
        return
      }
      const next: PendingBlockLink = {
        fromNodeId,
        fromBlockSlotId,
        fromBlockParameterId,
        draftAnchor: { sx: anchor.x, sy: anchor.y },
      }
      pendingBlockLinkRef.current = next
      setPendingBlockLink(next)
      setBlockLinkDraftPoint({ x: anchor.x, y: anchor.y })
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

  const tryConnectBlockSlots = useCallback(
    (
      fromNodeId: string,
      fromBlockSlotId: string,
      fromBlockParameterId: string | undefined,
      toNodeId: string,
      toBlockSlotId: string,
      toBlockParameterId: string | undefined,
    ): boolean => {
      if (!onConnectBlockSlots) {
        return false
      }

      const fromNode = scene.nodes.find((node) => node.id === fromNodeId)
      const toNode = scene.nodes.find((node) => node.id === toNodeId)
      if (!fromNode?.blockStructure || !toNode?.blockStructure) {
        return false
      }

      const fromEndpoint = findBlockSlotEndpoint(fromNode, fromBlockSlotId)
      const toEndpoint = findBlockSlotEndpoint(toNode, toBlockSlotId)
      if (!fromEndpoint || !toEndpoint) {
        return false
      }

      const connectionClass = classifyBlockSlotConnection(
        fromEndpoint,
        toEndpoint,
        fromNode.blockStructure,
        toNode.blockStructure,
      )

      if (connectionClass.kind === 'incompatible') {
        return false
      }

      if (connectionClass.kind === 'forced') {
        showConfirmByCatalogId(MESSENGER_CONFIRM_BLOCK_CONNECTION_FORCED, {
          onConfirm: () => {
            onConnectBlockSlots(
              fromNodeId,
              fromBlockSlotId,
              fromBlockParameterId,
              toNodeId,
              toBlockSlotId,
              toBlockParameterId,
              true,
            )
          },
        })
        return false
      }

      onConnectBlockSlots(
        fromNodeId,
        fromBlockSlotId,
        fromBlockParameterId,
        toNodeId,
        toBlockSlotId,
        toBlockParameterId,
        false,
      )
      return true
    },
    [onConnectBlockSlots, scene.nodes, showConfirmByCatalogId],
  )

  const resolveBlockLinkDrop = useCallback(
    (clientX: number, clientY: number) => {
      const pending = pendingBlockLinkRef.current
      if (!pending) {
        return
      }
      if (!onConnectBlockSlots && !onConnectAddonSlots) {
        return
      }

      const el = document.elementFromPoint(clientX, clientY)
      const addonSlotEl = el instanceof Element ? el.closest('[data-addon-slot-id]') : null
      if (addonSlotEl instanceof HTMLElement && onConnectAddonSlots) {
        const direction = addonSlotEl.getAttribute('data-addon-slot-direction')
        const addonToNodeId = addonSlotEl.getAttribute('data-addon-slot-node-id')
        const toAddonSlotId = addonSlotEl.getAttribute('data-addon-slot-id')
        if (
          direction === 'input' &&
          addonToNodeId &&
          toAddonSlotId &&
          addonToNodeId !== pending.fromNodeId
        ) {
          tryConnectCrossSlots({
            kind: 'blockToAddon',
            fromNodeId: pending.fromNodeId,
            fromBlockSlotId: pending.fromBlockSlotId,
            fromBlockParameterId: pending.fromBlockParameterId,
            toNodeId: addonToNodeId,
            toAddonSlotId,
          })
          endBlockLinkDraft()
          onSelectNode(addonToNodeId)
          return
        }
      }

      const canvasEl = canvasRef.current
      let toNodeId: string | null = null
      let toBlockSlotId: string | null = null

      if (canvasEl && onConnectAddonSlots) {
        if (addonLinks.resolveBlockLinkDropOnAddon(pending, clientX, clientY)) {
          endBlockLinkDraft()
          return
        }
      }

      if (canvasEl && onConnectBlockSlots) {
        const point = graphClientToPosition(canvasEl, scale, clientX, clientY)
        const hit = findBlockSlotAtPoint(scene.nodes, point)
        if (hit && hit.direction === 'input' && hit.nodeId !== pending.fromNodeId) {
          toNodeId = hit.nodeId
          toBlockSlotId = hit.slotId
        }
      }

      if (!toNodeId || !toBlockSlotId) {
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
          const canvasElForDrop = canvasRef.current
          if (canvasElForDrop && onConnectBlockSlots) {
            const dropPosition = graphClientToPosition(canvasElForDrop, scale, clientX, clientY)
            const fromNode = scene.nodes.find((node) => node.id === pending.fromNodeId)
            const endpoint =
              fromNode ? findBlockSlotEndpoint(fromNode, pending.fromBlockSlotId) : undefined
            const outTypes = endpoint?.direction === 'output' ? [...endpoint.types] : []
            const fromParameterName =
              pending.fromBlockParameterId && fromNode?.blockStructure
                ? fromNode.blockStructure.parameters.find(
                    (entry) => entry.idParameter === pending.fromBlockParameterId,
                  )?.nameParameter
                : undefined

            setLinkDropContext(null)
            setBlockDropLinkContext({
              fromNodeId: pending.fromNodeId,
              fromBlockSlotId: pending.fromBlockSlotId,
              fromBlockParameterId: pending.fromBlockParameterId,
              fromParameterName,
              outTypes,
              position: dropPosition,
            })
            setPaletteSpawnPosition(dropPosition)
            setPaletteScreenAnchor(null)
            setIsPaletteOpen(true)
          }
          endBlockLinkDraft()
          return
        }
      }

      if (!onConnectBlockSlots) {
        endBlockLinkDraft()
        return
      }

      const paramMatch = /^block-param:(.+):input$/.exec(toBlockSlotId)
      tryConnectBlockSlots(
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
    [
      addonLinks,
      endBlockLinkDraft,
      onConnectAddonSlots,
      onSelectNode,
      scale,
      scene.nodes,
      tryConnectBlockSlots,
      tryConnectCrossSlots,
    ],
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
    (slotId: string, link: BlockSlotWirelessLink) => {
      const connection = scene.connections.find((entry) => entry.id === link.connectionId)
      const peerNodeId =
        connection && connection.fromBlockSlotId === slotId
          ? connection.toNodeId
          : connection && connection.toBlockSlotId === slotId
            ? connection.fromNodeId
            : link.peerNodeId
      const peerSlotId =
        connection && connection.fromBlockSlotId === slotId
          ? connection.toBlockSlotId ?? link.peerSlotId
          : connection && connection.toBlockSlotId === slotId
            ? connection.fromBlockSlotId ?? link.peerSlotId
            : link.peerSlotId

      setWirelessHighlightNodeId(peerNodeId)
      setBlockWirelessPulse({ nodeId: peerNodeId, slotId: peerSlotId })
    },
    [scene.connections],
  )

  const handleBlockSlotWirelessHoverEnd = useCallback(() => {
    setWirelessHighlightNodeId(null)
    setBlockWirelessPulse(null)
  }, [])

  const handleGroupSlotWirelessHoverStart = useCallback(
    (slotId: string, link: GroupSlotWirelessLink) => {
      const connection = scene.connections.find((entry) => entry.id === link.connectionId)
      const peerNodeId =
        connection && connection.fromGroupSlotId === slotId
          ? connection.toNodeId
          : connection && connection.toGroupSlotId === slotId
            ? connection.fromNodeId
            : link.peerNodeId
      const peerSlotId =
        connection && connection.fromGroupSlotId === slotId
          ? connection.toGroupSlotId ?? link.peerSlotId
          : connection && connection.toGroupSlotId === slotId
            ? connection.fromGroupSlotId ?? link.peerSlotId
            : link.peerSlotId

      setWirelessHighlightNodeId(peerNodeId)
      setGroupWirelessPulse({ nodeId: peerNodeId, slotId: peerSlotId })
    },
    [scene.connections],
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

  const toggleToolbarDock = useCallback(
    (dockId: CanvasToolbarDockId) => {
      onViewportToolbarDockToggle?.(dockId)
    },
    [onViewportToolbarDockToggle],
  )

  const setToolbarCollapsed = useCallback(
    (collapsed: boolean) => {
      if (collapsed && activeViewportToolbarDock) {
        onViewportToolbarDockToggle?.(activeViewportToolbarDock)
      }
      onToolbarCollapsedChange?.(collapsed)
    },
    [activeViewportToolbarDock, onToolbarCollapsedChange, onViewportToolbarDockToggle],
  )

  const renderToolbarDockHeaderActions = useCallback(
    (dockId: CanvasToolbarDockId) => (
      <button
        aria-label="Minimizar painel"
        className={dockStyles.dockHeaderButton}
        onClick={() => onViewportToolbarDockToggle?.(dockId)}
        type="button"
      >
        −
      </button>
    ),
    [onViewportToolbarDockToggle],
  )

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
        setPaletteScreenAnchor(null)
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

  const completeLink = useCallback(
    (toNode: CanvasNode) => {
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
    },
    [endLinkDraft, onConnectNodes, onSelectNode, pendingLink, scene.connections, scene.nodes],
  )

  const resolveAddNodeToolbarAnchor = useCallback((): { left: number; top: number } | null => {
    const anchor = addNodeToolbarAnchorRef.current
    if (!anchor) {
      return null
    }

    const rect = anchor.getBoundingClientRect()
    return { left: rect.left, top: rect.bottom }
  }, [])

  const openPalette = useCallback(
    (options?: { spawnPosition?: CanvasPosition; catalogMode?: PaletteCatalogMode }) => {
      setLinkDropContext(null)
      setBlockDropLinkContext(null)
      setPaletteSpawnPosition(options?.spawnPosition ?? null)
      setPaletteInitialCatalogMode(options?.catalogMode ?? 'nodes')
      setPaletteScreenAnchor(options?.spawnPosition ? null : resolveAddNodeToolbarAnchor())
      setIsPaletteOpen(true)
    },
    [resolveAddNodeToolbarAnchor],
  )

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false)
    setLinkDropContext(null)
    setBlockDropLinkContext(null)
    setPaletteSpawnPosition(null)
    setPaletteInitialCatalogMode('nodes')
    setPaletteScreenAnchor(null)
  }, [])

  const refreshSlashCommandsCatalog = useCallback(() => {
    void refreshSlashCommandRegistryFromDisk('blocks')
  }, [])

  useEffect(() => {
    refreshSlashCommandsCatalog()
  }, [refreshSlashCommandsCatalog])

  const resolvePaletteSpawnPosition = useCallback((): CanvasPosition => {
    return paletteSpawnPosition ?? cursor2DPosition
  }, [cursor2DPosition, paletteSpawnPosition])

  const openSlashCommandPicker = useCallback(() => {
    refreshSlashCommandsCatalog()
    setIsSlashCommandPickerOpen(true)
  }, [refreshSlashCommandsCatalog])

  const closeSlashCommandPicker = useCallback(() => {
    setIsSlashCommandPickerOpen(false)
  }, [])

  const handleSlashCommandPick = useCallback(
    (command: SlashCommandDocument) => {
      if (command.feature !== 'blocks' || !onApplyBlockSlashCommand) {
        closeSlashCommandPicker()
        return
      }

      const result = onApplyBlockSlashCommand(command.command, cursor2DPosition)
      closeSlashCommandPicker()
      setSlashCommandRemovePickerOpen(false)

      if (result.ok) {
        onSelectNode(result.rootNodeId)
      } else {
        showAppAlert(result.error)
      }
    },
    [
      closeSlashCommandPicker,
      cursor2DPosition,
      onApplyBlockSlashCommand,
      onSelectNode,
    ],
  )

  const handlePaletteSlashCommandPick = useCallback(
    (command: string) => {
      if (!onApplyBlockSlashCommand) {
        closePalette()
        return
      }

      const result = onApplyBlockSlashCommand(command, resolvePaletteSpawnPosition())
      closePalette()

      if (result.ok) {
        onSelectNode(result.rootNodeId)
      } else {
        showAppAlert(result.error)
      }
    },
    [closePalette, onApplyBlockSlashCommand, onSelectNode, resolvePaletteSpawnPosition],
  )

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

      onCreateRootNode(schema, resolvePaletteSpawnPosition())
      endLinkDraft()
      closePalette()
    },
    [
      closePalette,
      endLinkDraft,
      linkDropContext,
      onCreateChildNode,
      onCreateRootNode,
      resolvePaletteSpawnPosition,
      scene.connections,
      scene.nodes,
    ],
  )

  const handlePaletteAddonPick = useCallback(
    (addonId: string) => {
      if (!onCreateAddonFromCatalog) {
        closePalette()
        return
      }

      const dropContext = addonDropLinkContext
      const spawnLink = dropContext
        ? {
            fromNodeId: dropContext.fromNodeId,
            fromAddonSlotId: dropContext.fromAddonSlotId,
          }
        : undefined

      void onCreateAddonFromCatalog(addonId, resolvePaletteSpawnPosition(), spawnLink).then(
        (result) => {
          if (result.ok) {
            onSelectNode(result.nodeId)
          } else {
            showAppAlert(result.error)
          }
        },
      )
      setAddonDropLinkContext(null)
      closePalette()
    },
    [
      addonDropLinkContext,
      closePalette,
      onCreateAddonFromCatalog,
      onSelectNode,
      resolvePaletteSpawnPosition,
    ],
  )

  const handlePaletteBlockPick = useCallback(
    (definition: BlockDefinitionJsonDocument) => {
      if (!onCreateBlockFromDefinition) {
        closePalette()
        return
      }

      const dropContext = blockDropLinkContext
      const spawnLink: BlockDefinitionSpawnLinkContext | undefined = dropContext
        ? {
            fromNodeId: dropContext.fromNodeId,
            fromBlockSlotId: dropContext.fromBlockSlotId,
            fromBlockParameterId: dropContext.fromBlockParameterId,
            fromParameterName: dropContext.fromParameterName,
            outTypes: dropContext.outTypes,
          }
        : undefined
      const result = onCreateBlockFromDefinition(
        definition,
        resolvePaletteSpawnPosition(),
        spawnLink,
      )
      if (result.ok) {
        onSelectNode(result.nodeId)
      } else {
        showAppAlert(result.error)
      }
      closePalette()
    },
    [
      blockDropLinkContext,
      closePalette,
      onCreateBlockFromDefinition,
      onSelectNode,
      resolvePaletteSpawnPosition,
    ],
  )

  const blockDefinitionMatchesDropContext = useCallback(
    (definition: BlockDefinitionJsonDocument): boolean => {
      if (!blockDropLinkContext) {
        return true
      }
      return blockDefinitionMatchesLinkDrop(definition, blockDropLinkContext)
    },
    [blockDropLinkContext],
  )

  const handleViewportPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    lastPointerClientRef.current = { x: event.clientX, y: event.clientY }

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

    if (canvasInteractionMode === 'navigate') {
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

    const beginViewportMarquee = (temporaryFromTweak: boolean) => {
      if (temporaryFromTweak) {
        temporarySelectBoxFromTweakRef.current = true
        setCanvasInteractionMode('selectBox')
      }

      event.preventDefault()
      const additive = event.ctrlKey || event.metaKey
      const start = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)

      marqueeGestureRef.current = { additive, pointerId: event.pointerId, start }

      setMarqueeOverlay({
        current: start,
        start,
      })

      event.currentTarget.setPointerCapture(event.pointerId)
    }

    if (canvasInteractionMode === 'selectBox') {
      beginViewportMarquee(false)
      return
    }

    if (canvasInteractionMode === 'tweak') {
      if (event.shiftKey) {
        beginViewportMarquee(true)
        return
      }

      if (glueNodeId) {
        deactivateGlueNode()
      }

      if (selectedNodeIds.length > 0) {
        onClearSelection?.()
      }
      return
    }
  }

  const handleViewportPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    lastPointerClientRef.current = { x: event.clientX, y: event.clientY }

    const activeNodeDrag = nodeDragGesture.current

    if (activeNodeDrag && activeNodeDrag.pointerId === event.pointerId) {
      moveNodeDragImplRef.current(event)
      return
    }

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
    if (nodeDragGesture.current?.pointerId === event.pointerId) {
      stopNodeDragImplRef.current(event)
      return
    }

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

      if (temporarySelectBoxFromTweakRef.current) {
        temporarySelectBoxFromTweakRef.current = false
        setCanvasInteractionMode(DEFAULT_CANVAS_INTERACTION_MODE)
      }

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

    if (canvasInteractionMode === 'navigate' && navigateOrigin) {
      const delta = Math.hypot(event.clientX - navigateOrigin.x, event.clientY - navigateOrigin.y)

      if (delta < NAVIGATE_MODE_RELEASE_PX) {
        setCanvasInteractionMode(DEFAULT_CANVAS_INTERACTION_MODE)
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    persistSceneCameraFromRefs()
  }

  const startNodeDrag = useCallback((event: PointerEvent<HTMLElement>, canvasNode: CanvasNode) => {
    if (
      event.button !== 0 ||
      isNodeLocked(canvasNode) ||
      document.body.dataset.addonContextMenuActive === '1'
    ) {
      return
    }

    if (glueNodeId) {
      deactivateGlueNode()
    }

    onSelectNode(canvasNode.id, { additive: event.shiftKey })
    onBeginNodeDrag?.()

    const viewport = viewportBodyRef.current

    if (!viewport) {
      return
    }

    nodeDragGesture.current = {
      axisConstraint: event.shiftKey ? 'pending' : '',
      element: viewport,
      nodeId: canvasNode.id,
      origin: {
        x: event.clientX,
        y: event.clientY,
      },
      pointerId: event.pointerId,
      position: canvasNode.position,
      snapGrid: event.ctrlKey || event.metaKey,
    }
    viewport.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }, [deactivateGlueNode, glueNodeId, onBeginNodeDrag, onSelectNode])

  const moveNodeDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const gesture = nodeDragGesture.current

    if (!gesture || document.body.dataset.addonContextMenuActive === '1') {
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

    scheduleDragVisual(workingGesture.nodeId, Math.round(targetX), Math.round(targetY))
  }, [scale, scheduleDragVisual])

  const stopNodeDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const gesture = nodeDragGesture.current

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    nodeDragGesture.current = null

    if (dragVisualRafRef.current !== null) {
      window.cancelAnimationFrame(dragVisualRafRef.current)
      dragVisualRafRef.current = null
    }

    commitDragVisualPosition(gesture.nodeId, {
      axisLock:
        gesture.axisConstraint === 'horizontal'
          ? 'y'
          : gesture.axisConstraint === 'vertical'
            ? 'x'
            : '',
      snapGrid: gesture.snapGrid,
    })
    clearDragVisual()
    onEndNodeDrag?.()

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }, [clearDragVisual, commitDragVisualPosition, onEndNodeDrag])

  moveNodeDragImplRef.current = moveNodeDrag
  stopNodeDragImplRef.current = stopNodeDrag

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

  const focusSlotPeer = useCallback(
    (
      connection: CanvasConnection,
      nodeId: string,
      slotId: string,
      slotKind: 'block' | 'addon',
    ) => {
      const isFrom =
        slotKind === 'block'
          ? connection.fromNodeId === nodeId && connection.fromBlockSlotId === slotId
          : connection.fromNodeId === nodeId && connection.fromAddonSlotId === slotId

      const peerNodeId = isFrom ? connection.toNodeId : connection.fromNodeId
      const peerBlockSlotId = isFrom ? connection.toBlockSlotId : connection.fromBlockSlotId
      const peerAddonSlotId = isFrom ? connection.toAddonSlotId : connection.fromAddonSlotId

      if (!peerNodeId) {
        return
      }

      const peerNode = scene.nodes.find((node) => node.id === peerNodeId)
      if (peerAddonSlotId && peerNode?.addonInstance) {
        const manifest = getAddonManifest(peerNode.addonInstance.addonId)
        if (manifest) {
          const peerDirection =
            connection.toNodeId === peerNodeId && connection.toAddonSlotId === peerAddonSlotId
              ? 'input'
              : 'output'
          const point = resolveAddonSlotCanvasPoint(
            peerNode,
            manifest,
            peerAddonSlotId,
            peerDirection,
            ADDON_CARD_WIDTH,
            addonSlotAnchors,
          )
          if (point) {
            focusGraphPointIntoView(point)
          }
        }
      } else if (peerBlockSlotId && peerNode?.blockStructure) {
        const peerDirection =
          connection.toNodeId === peerNodeId && connection.toBlockSlotId === peerBlockSlotId
            ? 'input'
            : 'output'
        focusGraphPointIntoView(
          resolveBlockSlotCanvasPoint(
            peerNode,
            peerBlockSlotId,
            peerDirection === 'input' ? 'input' : 'output',
            resolveBlockCardWidth(peerNode),
          ),
        )
      } else if (peerNode) {
        focusGraphPointIntoView({
          x: peerNode.position.x + (peerNode.addonViewActive ? ADDON_CARD_WIDTH : CARD_WIDTH) / 2,
          y: peerNode.position.y,
        })
      }

      if (peerBlockSlotId) {
        if (blockFocusPulseTimeoutRef.current !== null) {
          window.clearTimeout(blockFocusPulseTimeoutRef.current)
        }

        setBlockWirelessPulse({ nodeId: peerNodeId, slotId: peerBlockSlotId })
        blockFocusPulseTimeoutRef.current = window.setTimeout(() => {
          blockFocusPulseTimeoutRef.current = null
          setBlockWirelessPulse(null)
        }, PORT_FOCUS_PULSE_MS)
      }

      onSelectNode(peerNodeId)
    },
    [addonSlotAnchors, focusGraphPointIntoView, onSelectNode, scene.nodes],
  )

  const focusBlockSlotPeer = useCallback(
    (connection: CanvasConnection, nodeId: string, slotId: string) => {
      focusSlotPeer(connection, nodeId, slotId, 'block')
    },
    [focusSlotPeer],
  )

  const buildBlockSlotPeerActions = useCallback(
    (nodeId: string): BlockSlotPeerActions | undefined => {
      if (!onPatchNodeSceneOverlay) {
        return undefined
      }

      const resolvePeer = (
        slotId: string,
        slotDirection: 'input' | 'output',
        connectionIndex?: number,
      ) =>
        resolveBlockSlotPeer(scene, nodeId, slotId, slotDirection, {
          connectionIndex,
          outputIndexBySlotKey: blockOutputSlotConnectionIndexByKey,
        })

      return {
        getPeerState: (slotId, slotDirection, connectionIndex) => {
          const resolved = resolvePeer(slotId, slotDirection, connectionIndex)
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
        onToggleLock: (slotId, slotDirection, connectionIndex) => {
          const resolved = resolvePeer(slotId, slotDirection, connectionIndex)
          if (!resolved) {
            return
          }
          const locked = resolved.peerCanvasNode.locked === true
          onPatchNodeSceneOverlay(
            resolved.peerNodeId,
            locked ? { locked: undefined } : { locked: true },
          )
        },
        onToggleVisibility: (slotId, slotDirection, connectionIndex) => {
          const resolved = resolvePeer(slotId, slotDirection, connectionIndex)
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
        onFocusPeer: (slotId, slotDirection, connectionIndex) => {
          const resolved = resolvePeer(slotId, slotDirection, connectionIndex)
          if (!resolved) {
            return
          }
          onSelectNode(resolved.peerNodeId)
          focusSlotPeer(resolved.connection, nodeId, slotId, 'block')
        },
        onRemoveConnection: (slotId, slotDirection, connectionIndex) => {
          const resolved = resolvePeer(slotId, slotDirection, connectionIndex)
          if (!resolved) {
            return
          }
          onRemoveConnectionsFromBlockSlot?.(
            nodeId,
            slotId,
            resolved.connection.id,
          )
        },
      }
    },
    [
      blockOutputSlotConnectionIndexByKey,
      compactElementVisibility,
      focusSlotPeer,
      onPatchNodeSceneOverlay,
      onRemoveConnectionsFromBlockSlot,
      onSelectNode,
      scene,
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

  const runSnapAction = useCallback(
    (actionId: GraphSnapActionId) => {
      const viewport = viewportBodyRef.current

      switch (actionId) {
        case 'cursorToWorldOrigin':
          setCursor2DPosition(DEFAULT_CANVAS_2D_CURSOR_POSITION)
          break
        case 'cursorToSelected': {
          const pivot = resolveSelectionPivotCenter(
            scene.nodes,
            selectedNodeIds,
            measureCanvasNodeBounds,
          )

          if (pivot) {
            setCursor2DPosition(pivot)
          }
          break
        }
        case 'cursorToCamera': {
          if (!viewport) {
            break
          }

          setCursor2DPosition(
            graphPointAtViewportCenter(
              viewport.clientWidth,
              viewport.clientHeight,
              panRef.current,
              scaleRef.current,
            ),
          )
          break
        }
        case 'cameraFocusCursor':
          centerCameraOnCursor2D()
          break
        case 'cameraFocusWorldOrigin': {
          if (!viewport) {
            break
          }

          const viewportWidth = viewport.clientWidth
          const viewportHeight = viewport.clientHeight

          if (viewportWidth <= 0 || viewportHeight <= 0) {
            break
          }

          const targetScale = scaleRef.current
          const nextPan = computePanCenteredOnGraphPoint(
            DEFAULT_CANVAS_2D_CURSOR_POSITION,
            viewportWidth,
            viewportHeight,
            targetScale,
          )

          panRef.current = nextPan
          scaleRef.current = targetScale
          setPan(nextPan)
          setScale(targetScale)
          persistSceneCamera({ pan: nextPan, scale: targetScale })
          break
        }
        case 'cameraFocusSelection':
          if (selectedNodeIds.length > 0) {
            focusSelectionIntoView(selectedNodeIds)
          }
          break
        case 'selectionToCursor': {
          const pivot = resolveSelectionPivotCenter(
            scene.nodes,
            selectedNodeIds,
            measureCanvasNodeBounds,
          )

          if (!pivot) {
            break
          }

          moveSelectionByDelta({
            x: cursor2DPosition.x - pivot.x,
            y: cursor2DPosition.y - pivot.y,
          })
          break
        }
        case 'selectionToWorldOrigin': {
          const pivot = resolveSelectionPivotCenter(
            scene.nodes,
            selectedNodeIds,
            measureCanvasNodeBounds,
          )

          if (!pivot) {
            break
          }

          moveSelectionByDelta({
            x: -pivot.x,
            y: -pivot.y,
          })
          break
        }
        case 'selectionToCamera': {
          const pivot = resolveSelectionPivotCenter(
            scene.nodes,
            selectedNodeIds,
            measureCanvasNodeBounds,
          )

          if (!pivot || !viewport) {
            break
          }

          const cameraCenter = graphPointAtViewportCenter(
            viewport.clientWidth,
            viewport.clientHeight,
            panRef.current,
            scaleRef.current,
          )

          moveSelectionByDelta({
            x: cameraCenter.x - pivot.x,
            y: cameraCenter.y - pivot.y,
          })
          break
        }
      }

    },
    [
      centerCameraOnCursor2D,
      cursor2DPosition.x,
      cursor2DPosition.y,
      focusSelectionIntoView,
      measureCanvasNodeBounds,
      moveSelectionByDelta,
      persistSceneCamera,
      scene.nodes,
      selectedNodeIds,
      setCursor2DPosition,
    ],
  )

  const graphSnapMenu = useSnapMenu<GraphSnapActionId>({
    actions: graphSnapMenuActions,
    title: graphSnapMenuTitle,
    openChord: { key: 's', modifiers: ['shift'] },
    holdRelease: true,
    canOpen: isPointerOnCanvasGrid,
    showPolygonVisual: false,
    showActiveBar: false,
    titleUpdatesWithActiveAction: true,
    resolveAnchor: () => {
      const viewport = viewportBodyRef.current
      const fallback = viewport?.getBoundingClientRect()

      return {
        left: lastPointerClientRef.current.x || (fallback ? fallback.left + fallback.width / 2 : 0),
        top: lastPointerClientRef.current.y || (fallback ? fallback.top + fallback.height / 2 : 0),
      }
    },
    onSelect: runSnapAction,
    isActionDisabled: (actionId) => isGraphSnapActionDisabled(actionId, selectedNodeIds),
  })

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
    canvasInteractionMode: DEFAULT_CANVAS_INTERACTION_MODE,
    scene,
  })
  graphShortcutRefs.current = {
    pendingLink,
    selectedNodeIds,
    selectedNodeId,
    glueTargetId,
    glueNodeId,
    canvasInteractionMode,
    scene,
  }

  const canvasContextMenuBuildContext = useMemo((): CanvasContextMenuBuildContext => {
    const sceneBodyCollapsedFlags = scene.nodes.map((node) =>
      isNodeBodyEffectivelyCollapsed(node, compactElementVisibility),
    )
    const sceneAllNodesBodyCollapsed =
      sceneBodyCollapsedFlags.length > 0 && sceneBodyCollapsedFlags.every(Boolean)
    const sceneAnyNodeBodyCollapsed = sceneBodyCollapsedFlags.some(Boolean)

    return {
      canRedo,
      canUndo,
      glueNodeId,
      hasSelectAll: scene.nodes.some((node) => isNodeVisibleOnCanvas(node, compactElementVisibility, scene)),
      onCycleConnectionRouting,
      onSetConnectionRouting,
      onRemoveConnection,
      scene,
      selectedNodeIds,
      canvasInteractionMode,
      toolbarVisibility,
      hasPendingLink: Boolean(pendingLink),
      hasInspectorSlot: Boolean(viewportControlsSlot),
      sceneAllNodesBodyCollapsed,
      sceneAnyNodeBodyCollapsed,
      onGraphsToCode,
      onViewNodeCode,
      onViewNodeBlockCode,
      onPreviewBlockCardCode,
      onViewNodeGroupCode,
      onPreviewNodeVfx,
      onSyncNodeValueToCode,
      canSyncNodeToCode,
      primarySelectedNodeId: selectedNodeId,
      tr: (id, fallback, vars) => t(id, fallback, vars),
      onRequestBlockParameterPanel: (nodeId, panel) => {
        setBlockParameterPanelRequest({ nodeId, panel })
      },
      blockParameterMenu:
        onAddBlockParameterFromCatalog || onRemoveBlockParameter || onEditBlockParameter
          ? {
              canAdd: Boolean(onAddBlockParameterFromCatalog),
              canEdit: Boolean(onEditBlockParameter),
              canRemove: Boolean(onRemoveBlockParameter),
            }
          : undefined,
      onRequestBlockSlashCommand:
        onSaveBlockSlashCommand || onRemoveBlockSlashCommand
          ? (nodeId, action) => {
              if (action === 'add') {
                const canvasNode = scene.nodes.find((node) => node.id === nodeId)
                const blockName = canvasNode?.blockStructure?.blockName ?? 'Block'
                setSlashCommandAddDialog({ nodeId, suggestedName: blockName })
                return
              }

              refreshSlashCommandsCatalog()
              setSlashCommandRemovePickerOpen(true)
            }
          : undefined,
      onHideInactiveBlockIndexBranches,
    onApplyBlockOrganization,
    }
  }, [
    canRedo,
    canUndo,
    t,
    glueNodeId,
    compactElementVisibility,
    onCycleConnectionRouting,
    onSetConnectionRouting,
    onRemoveConnection,
    scene,
    selectedNodeId,
    selectedNodeIds,
    canvasInteractionMode,
    toolbarVisibility,
    pendingLink,
    viewportControlsSlot,
    onGraphsToCode,
    onViewNodeCode,
    onViewNodeBlockCode,
    onPreviewBlockCardCode,
    onViewNodeGroupCode,
    onPreviewNodeVfx,
    onSyncNodeValueToCode,
    canSyncNodeToCode,
    onAddBlockParameterFromCatalog,
    onRemoveBlockParameter,
    onEditBlockParameter,
    onSaveBlockSlashCommand,
    onRemoveBlockSlashCommand,
    refreshSlashCommandsCatalog,
  ])

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

    return buildContextMenuItems(contextMenu.target, {
      ...canvasContextMenuBuildContext,
      isNodeBodyCollapsed: contextNode
        ? isNodeBodyEffectivelyCollapsed(contextNode, compactElementVisibility)
        : false,
      parameterStubCatalog: stubCatalogSchemaId
        ? schemaBaseParameterCatalogBySchemaId?.[stubCatalogSchemaId]
        : undefined,
    })
  }, [
    canvasContextMenuBuildContext,
    compactElementVisibility,
    contextMenu,
    schemaBaseParameterCatalogBySchemaId,
    scene.nodes,
    selectedNodeId,
  ])

  const runContextMenuAction = useCallback(
    (
      actionId: ContextMenuItemId,
      execution?: {
        target?: CanvasContextTarget
        anchor?: { left: number; top: number }
      },
    ) => {
      const target = execution?.target ?? contextMenu?.target

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

      const blockOrganizationOperation = resolveBlockOrganizationOperationFromMenuId(actionId)
      if (blockOrganizationOperation) {
        onApplyBlockOrganization?.(blockOrganizationOperation)
        closeContextMenu()
        return
      }

      switch (actionId) {
        case 'canvas.addNode':
          break
        case 'canvas.addNode.node':
          openPalette({ catalogMode: 'nodes' })
          break
        case 'canvas.addNode.block':
          openPalette({ catalogMode: 'blocks' })
          break
        case 'canvas.addNode.addon':
          openPalette({ catalogMode: 'addons' })
          break
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
          setCanvasInteractionMode((current) =>
            current === 'navigate' ? DEFAULT_CANVAS_INTERACTION_MODE : 'navigate',
          )
          break
        case 'canvas.navegacao':
          break
        case 'canvas.setInteractionMode.tweak':
          setCanvasInteractionMode('tweak')
          break
        case 'canvas.setInteractionMode.selectBox':
          setCanvasInteractionMode('selectBox')
          break
        case 'canvas.setInteractionMode.navigate':
          setCanvasInteractionMode('navigate')
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
        case 'canvas.showGrid':
          onShowCanvasGridChange?.(!showCanvasGrid)
          onCanvasGridChange?.({ showCanvasGrid: !showCanvasGrid })
          break
        case 'canvas.openGridControl': {
          const anchor = execution?.anchor ?? contextMenu?.anchor

          if (anchor) {
            setGridControlAnchor(anchor)
          }
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
        case 'node.hideLinkedChildNodes':
          if (target.type === 'node') {
            onHideLinkedChildNodes?.(target.nodeId)
          }
          break
        case 'node.showLinkedChildNodes':
          if (target.type === 'node') {
            onShowLinkedChildNodes?.(target.nodeId)
          }
          break
        case 'node.hideInactiveBlockIndexBranches':
          if (target.type === 'node') {
            onHideInactiveBlockIndexBranches?.(target.nodeId)
          }
          break
        case 'node.blockOrganization':
        case 'node.blockOrganization.align':
        case 'node.blockOrganization.distribute':
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
            toggleGlueForNode(target.nodeId)
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
        case 'node.codigoPreviewBlock':
          if (target.type === 'node') {
            const active = document.activeElement
            if (
              active instanceof HTMLInputElement ||
              active instanceof HTMLTextAreaElement ||
              (active instanceof HTMLElement && active.isContentEditable)
            ) {
              active.blur()
            }

            // Garante que commits pendentes do input no card sejam aplicados
            // antes de abrir o preview de código de bloco.
            window.requestAnimationFrame(() => {
              onPreviewBlockCardCode?.(target.nodeId)
            })
          }
          break
        case 'node.blockParameters':
          break
        case 'node.blockParameters.add':
          if (target.type === 'node') {
            setBlockParameterScreenAnchor(contextMenu?.anchor ?? null)
            setBlockParameterAnchorNodeId(target.nodeId)
            setBlockParameterPanelRequest({ nodeId: target.nodeId, panel: 'add' })
          }
          break
        case 'node.blockParameters.edit':
          if (target.type === 'node') {
            setBlockParameterScreenAnchor(contextMenu?.anchor ?? null)
            setBlockParameterAnchorNodeId(target.nodeId)
            setBlockParameterPanelRequest({ nodeId: target.nodeId, panel: 'edit' })
          }
          break
        case 'node.blockParameters.remove':
          if (target.type === 'node') {
            setBlockParameterScreenAnchor(contextMenu?.anchor ?? null)
            setBlockParameterAnchorNodeId(target.nodeId)
            setBlockParameterPanelRequest({ nodeId: target.nodeId, panel: 'remove' })
          }
          break
        case 'node.slashCommands':
          break
        case 'node.slashCommands.add':
          if (target.type === 'node') {
            const canvasNode = scene.nodes.find((node) => node.id === target.nodeId)
            const blockName = canvasNode?.blockStructure?.blockName ?? 'Block'
            setSlashCommandAddDialog({ nodeId: target.nodeId, suggestedName: blockName })
          }
          break
        case 'node.slashCommands.remove':
          refreshSlashCommandsCatalog()
          setSlashCommandRemovePickerOpen(true)
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
        case 'blockSlot.removeConnections':
          if (target.type === 'blockSlot') {
            onRemoveConnectionsFromBlockSlot?.(
              target.nodeId,
              target.slotId,
              target.connectionId,
            )
          } else if (target.type === 'addonSlot') {
            onRemoveConnectionsFromAddonSlot?.(target.nodeId, target.slotId)
          }
          break
        case 'blockSlot.focusPeerSlot':
          if (target.type === 'blockSlot') {
            const blockConnection = findConnectionForBlockSlot(scene, target.nodeId, target.slotId, {
              connectionIndex: target.connectionIndex,
            })
            if (blockConnection) {
              focusSlotPeer(blockConnection, target.nodeId, target.slotId, 'block')
            }
          } else if (target.type === 'addonSlot') {
            const addonConnection = findConnectionForAddonSlot(scene, target.nodeId, target.slotId)
            if (addonConnection) {
              focusSlotPeer(addonConnection, target.nodeId, target.slotId, 'addon')
            }
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
      focusBlockSlotPeer,
      focusSlotPeer,
      focusSelectionIntoView,
      onClearSelection,
      onCycleConnectionRouting,
      onSetConnectionRouting,
      onDeleteNodeIds,
      onNodeLockedInteraction,
      onSceneNodesPanelRequest,
      onShowCanvasGridChange,
      onCanvasGridChange,
      contextMenu?.anchor,
      onExtractSceneNodesStatePreset,
      onGraphsToCode,
      onViewNodeCode,
      onViewNodeBlockCode,
      onPreviewBlockCardCode,
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
      onRemoveConnectionsFromBlockSlot,
      onRemoveConnectionsFromAddonSlot,
      onShowOnlyConnectedComponent,
      onShowOnlySlotSubtree,
      onShowOnlyIncomingSlotBranch,
      onHideLinkedChildNodes,
      onShowLinkedChildNodes,
      onHideInactiveBlockIndexBranches,
    onApplyBlockOrganization,
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
      showCanvasGrid,
    ],
  )

  const gridContextSnapMenuBackLabel = useMemo(
    () => t(SNAP_MENU_BACK_LABEL.langId, SNAP_MENU_BACK_LABEL.fallback),
    [t],
  )
  const gridContextSnapMenuTitle = useMemo(
    () => t(GRAPH_GRID_CONTEXT_MENU_TITLE.langId, GRAPH_GRID_CONTEXT_MENU_TITLE.fallback),
    [t],
  )
  const gridContextSnapMenuActions = useMemo(
    () =>
      contextMenuItemsToSnapActions(
        buildContextMenuItems({ type: 'canvas' }, canvasContextMenuBuildContext),
        { backLabel: gridContextSnapMenuBackLabel },
      ),
    [canvasContextMenuBuildContext, gridContextSnapMenuBackLabel],
  )

  const gridContextSnapMenu = useSnapMenu<ContextMenuItemId>({
    actions: gridContextSnapMenuActions,
    title: gridContextSnapMenuTitle,
    openChord: { key: 'g', modifiers: ['shift'] },
    holdRelease: true,
    canOpen: isPointerOnCanvasGrid,
    showPolygonVisual: false,
    showActiveBar: false,
    titleUpdatesWithActiveAction: false,
    resolveAnchor: () => {
      const viewport = viewportBodyRef.current
      const fallback = viewport?.getBoundingClientRect()

      return {
        left: lastPointerClientRef.current.x || (fallback ? fallback.left + fallback.width / 2 : 0),
        top: lastPointerClientRef.current.y || (fallback ? fallback.top + fallback.height / 2 : 0),
      }
    },
    onSelect: (actionId) => {
      const viewport = viewportBodyRef.current
      const fallback = viewport?.getBoundingClientRect()
      const anchor = {
        left: lastPointerClientRef.current.x || (fallback ? fallback.left + fallback.width / 2 : 0),
        top: lastPointerClientRef.current.y || (fallback ? fallback.top + fallback.height / 2 : 0),
      }

      runContextMenuAction(actionId, {
        target: { type: 'canvas' },
        anchor,
      })
    },
  })

  useEffect(() => {
    if (graphSnapMenu.isOpen) {
      gridContextSnapMenu.close()
    }
  }, [graphSnapMenu.isOpen, gridContextSnapMenu.close])

  useEffect(() => {
    if (gridContextSnapMenu.isOpen) {
      graphSnapMenu.close()
    }
  }, [gridContextSnapMenu.isOpen, graphSnapMenu.close])

  useGraphCanvasShortcutHandlers({
    refs: graphShortcutRefs.current,
    isPaletteOpen,
    isSlashCommandPickerOpen,
    isSnapMenuOpen: graphSnapMenu.isOpen || gridContextSnapMenu.isOpen,
    endLinkDraft,
    openPalette,
    openSlashCommandPicker,
    closeSnapMenu: () => {
      graphSnapMenu.close()
      gridContextSnapMenu.close()
    },
    onClearSelection,
    onSelectAllNodesShortcut,
    focusSelectionIntoView,
    activateGlueNode,
    deactivateGlueNode,
    setCanvasInteractionMode,
    onCloseCodePanelShortcut,
    onNeekoDropCode,
    setStructureCardResizeModifierActive,
  })

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (isParameterPickerOpen()) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      let resolved = resolveContextTarget(event)

      if (!resolved) {
        return
      }

      if (resolved.type === 'blockSlot') {
        const outputConnections =
          resolved.direction === 'output'
            ? findConnectionsForBlockOutputSlot(scene, resolved.nodeId, resolved.slotId)
            : []
        if (outputConnections.length === 0) {
          const inputConnection = findConnectionForBlockSlot(scene, resolved.nodeId, resolved.slotId)
          if (!inputConnection) {
            resolved = { type: 'node', nodeId: resolved.nodeId }
          }
        } else {
          const connectionIndex = resolveBlockOutputSlotConnectionIndex(
            blockOutputSlotConnectionIndexByKey,
            resolved.nodeId,
            resolved.slotId,
            outputConnections.length,
          )
          const connection = outputConnections[connectionIndex]
          resolved = {
            ...resolved,
            connectionIndex,
            connectionId: connection?.id,
          }
        }
      } else if (resolved.type === 'addonSlot') {
        const connection = findConnectionForAddonSlot(scene, resolved.nodeId, resolved.slotId)
        if (!connection) {
          resolved = { type: 'node', nodeId: resolved.nodeId }
        }
      }

      event.preventDefault()
      event.stopPropagation()

      setContextMenu({
        anchor: { left: event.clientX, top: event.clientY },
        target: resolved,
      })
    },
    [scene, blockOutputSlotConnectionIndexByKey],
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

    onBeginNodeDrag?.()

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
      const offset = gluePointerOffsetRef.current ?? { x: 0, y: 0 }

      scheduleDragVisual(
        glueNodeId,
        Math.round(projected.x - offset.x),
        Math.round(projected.y - offset.y),
      )
    }

    window.addEventListener('pointermove', reposition, { passive: true })

    return () => {
      window.removeEventListener('pointermove', reposition)

      if (dragVisualRafRef.current !== null) {
        window.cancelAnimationFrame(dragVisualRafRef.current)
        dragVisualRafRef.current = null
      }

      if (pendingDragVisualRef.current) {
        const pending = pendingDragVisualRef.current
        pendingDragVisualRef.current = null
        lastDragVisualRef.current = pending
        setDragPositionOverride(pending)
      }

      commitDragVisualPosition(glueNodeId, { axisLock: '', snapGrid: false })
      clearDragVisual()
      onEndNodeDrag?.()
    }
  }, [
    clearDragVisual,
    commitDragVisualPosition,
    glueNodeId,
    onBeginNodeDrag,
    onEndNodeDrag,
    scheduleDragVisual,
    scale,
    scene.nodes,
  ])

  const setBlockSlotToolsEnabled = useCallback((nodeId: string, enabled: boolean) => {
    setBlockSlotToolsEnabledNodes((current) => {
      const next = new Set(current)
      if (enabled) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      return next
    })
  }, [])

  const clearBlockParameterPanelState = useCallback(() => {
    setBlockParameterScreenAnchor(null)
    setBlockParameterAnchorNodeId(null)
    setBlockParameterPanelRequest(null)
  }, [])

  const dismissBlockParameterPanel = useCallback(() => {
    setBlockParameterScreenAnchor(null)
    setBlockParameterAnchorNodeId(null)
  }, [])

  const clearBlockParameterPanelRequest = useCallback(() => {
    setBlockParameterPanelRequest(null)
  }, [])

  const showBlockParameterCatalogError = useCallback((error: string) => {
    showAppAlert(error)
  }, [])

  const nodeHostContextValue = useMemo((): GraphCanvasNodeHostContextValue => {
    return {
      sceneRef,
      sceneConnections: scene.connections,
      scale,
      glueModeActive,
      structureCardResizeModifierActive,
      nodeLightModeEnabled,
      hints,
      compactElementVisibility,
      schemaNodeKindBySchemaId,
      schemaBaseParameterCatalogBySchemaId,
      blockParameterScreenAnchor,
      canvasRef,
      pendingBlockLinkRef,
      addonLinks: {
        pendingAddonLink: addonLinks.pendingAddonLink,
        beginAddonOutputLink: addonLinks.beginAddonOutputLink,
        getPendingAddonLink: addonLinks.getPendingAddonLink,
        endAddonLinkDraft: addonLinks.endAddonLinkDraft,
        setAddonLinkDraftPointFromClient: addonLinks.setAddonLinkDraftPointFromClient,
        resolveAddonLinkDrop: addonLinks.resolveAddonLinkDrop,
      },
      handleContextMenu,
      startNodeDrag,
      onSelectNode,
      onApplyAddonOutputs,
      onConnectAddonSlots,
      tryConnectCrossSlots,
      endBlockLinkDraft,
      beginGroupOutputLink,
      resolveGroupLinkDrop,
      setGroupLinkDraftPoint,
      handleGroupSlotWirelessHoverStart,
      handleGroupSlotWirelessHoverEnd,
      onUpdateGroupParameter,
      onCycleConnectionRouting,
      onSetStructureCardWidth,
      beginBlockOutputLink,
      resolveBlockLinkDrop,
      setBlockLinkDraftPoint,
      handleBlockSlotWirelessHoverStart,
      handleBlockSlotWirelessHoverEnd,
      resolveBlockOutputSlotConnectionIndexForNode,
      handleBlockOutputSlotConnectionIndexChange,
      setBlockSlotToolsEnabled,
      buildBlockSlotPeerActions,
      onSetBlockElementSelectedIndex,
      onRemoveConnectionsFromBlockSlot,
      onUpdateBlockParameter,
      onAddBlockParameterFromCatalog,
      onRemoveBlockParameter,
      onEditBlockParameter,
      clearBlockParameterPanelState,
      dismissBlockParameterPanel,
      clearBlockParameterPanelRequest,
      completeLink,
      handleOutputWireKeyboard,
      handleOutputWirePointerCancel,
      handleOutputWirePointerDown,
      handleOutputWirePointerMove,
      handleOutputWirePointerUp,
      onCatalogParameterAppend,
      onAppendEmbedCatalogItem,
      onAppendPointerCatalogItem,
      onAppendListEmbedCatalogItem,
      onAppendListPointerCatalogItem,
      onAppendList2EmbedCatalogItem,
      onAppendList2PointerCatalogItem,
      onRemoveList2EmbedInstance,
      onRemoveList2PointerInstance,
      onRequestRemoveElement,
      onSetNodeParameterOrder,
      onUpdateNodeParameter,
      onSetElementViewMode,
      onSetElementRetracted,
      onSetElementSelectedIndex,
      onRemoveConnectionsFromOutputSlot,
      onRemoveConnection,
      handleWirelessPeerHoverStart,
      handleWirelessPeerHoverEnd,
      buildOutputSlotPeerActions,
      onToggleNodeCardSection,
      onSetNodeCardSectionOrder,
      onNeekoDropCode,
      onNodeLockedInteraction,
      showBlockParameterCatalogError,
    }
  }, [
    addonLinks,
    beginBlockOutputLink,
    beginGroupOutputLink,
    blockParameterScreenAnchor,
    buildBlockSlotPeerActions,
    buildOutputSlotPeerActions,
    clearBlockParameterPanelRequest,
    clearBlockParameterPanelState,
    compactElementVisibility,
    completeLink,
    dismissBlockParameterPanel,
    endBlockLinkDraft,
    handleBlockSlotWirelessHoverEnd,
    handleBlockSlotWirelessHoverStart,
    handleContextMenu,
    handleGroupSlotWirelessHoverEnd,
    handleGroupSlotWirelessHoverStart,
    handleOutputWireKeyboard,
    handleOutputWirePointerCancel,
    handleOutputWirePointerDown,
    handleOutputWirePointerMove,
    handleOutputWirePointerUp,
    handleWirelessPeerHoverEnd,
    handleWirelessPeerHoverStart,
    hints,
    glueModeActive,
    nodeLightModeEnabled,
    onAppendEmbedCatalogItem,
    onAppendList2EmbedCatalogItem,
    onAppendList2PointerCatalogItem,
    onAppendListEmbedCatalogItem,
    onAppendListPointerCatalogItem,
    onAppendPointerCatalogItem,
    onApplyAddonOutputs,
    onAddBlockParameterFromCatalog,
    onCatalogParameterAppend,
    onConnectAddonSlots,
    onCycleConnectionRouting,
    onEditBlockParameter,
    onNeekoDropCode,
    onNodeLockedInteraction,
    onRemoveBlockParameter,
    onRemoveConnection,
    onRemoveConnectionsFromBlockSlot,
    onRemoveConnectionsFromOutputSlot,
    onRemoveList2EmbedInstance,
    onRemoveList2PointerInstance,
    onRequestRemoveElement,
    onSelectNode,
    onSetBlockElementSelectedIndex,
    onSetElementRetracted,
    onSetElementSelectedIndex,
    onSetElementViewMode,
    onSetNodeCardSectionOrder,
    onSetNodeParameterOrder,
    onSetStructureCardWidth,
    onToggleNodeCardSection,
    onUpdateBlockParameter,
    onUpdateGroupParameter,
    onUpdateNodeParameter,
    resolveBlockLinkDrop,
    resolveBlockOutputSlotConnectionIndexForNode,
    resolveGroupLinkDrop,
    scene.connections,
    schemaNodeKindBySchemaId,
    setBlockLinkDraftPoint,
    setBlockSlotToolsEnabled,
    setGroupLinkDraftPoint,
    showBlockParameterCatalogError,
    startNodeDrag,
    structureCardResizeModifierActive,
    tryConnectCrossSlots,
    handleBlockOutputSlotConnectionIndexChange,
  ])

  return (
    <section
      aria-label="Static node graph canvas"
      className={[
        styles.viewport,
        attachedViewport ? styles.viewportAttached : '',
        gridPresentation.showCanvasGrid ? '' : styles.viewportNoGrid,
        gridPresentation.canvasGridCheckerEnabled ? styles.viewportGridChecker : '',
        gridPresentation.showCanvasGrid && gridPresentation.canvasGridLineColorEnabled
          ? styles.viewportGridColoredLines
          : '',
        isCanvasPanCursorMode(canvasInteractionMode)
          ? styles.viewportPanCursor
          : styles.viewportDefaultCursor,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={viewportRef}
      style={
        {
          '--canvas-grid-step': `${gridPresentation.canvasGridSize}px`,
          '--canvas-grid-line-strength': String(gridLineStrength),
          '--canvas-grid-h-line': gridPresentation.horizontalLinePaint,
          '--canvas-grid-v-line': gridPresentation.verticalLinePaint,
          '--canvas-grid-checker-a': gridPresentation.resolvedCheckerColorA,
          '--canvas-grid-checker-b': gridPresentation.resolvedCheckerColorB,
        } as CSSProperties
      }
    >
      {(() => {
        const chromeStrip = Boolean(toolbarChromeHost)
        const controlsClassName = [
          styles.controls,
          toolbarCollapsed ? styles.controlsCollapsed : '',
          chromeStrip ? styles.controlsChromeEmbedded : '',
        ]
          .filter(Boolean)
          .join(' ')

        const viewportControls = (
          <div
            aria-label="Canvas viewport controls"
            className={controlsClassName}
            data-canvas-control="true"
            data-canvas-toolbar="true"
            data-chrome-strip-toolbar={chromeStrip ? '' : undefined}
          >
          {toolbarCollapsed ? (
            <div className={styles.controlsInspectorSlot} data-tool-label={t(LangId.GraphToolbarExpand)}>
              <ToolbarDockIconButton
                active={false}
                ariaLabel={t(LangId.GraphToolbarExpand)}
                chromeStrip={chromeStrip}
                kind="tools"
                onClick={() => setToolbarCollapsed(false)}
              />
            </div>
          ) : (
            <div className={styles.controlsInspectorSlot} data-tool-label={t(LangId.GraphToolbarCollapse)}>
              <ToolbarDockIconButton
                active
                ariaLabel={t(LangId.GraphToolbarCollapse)}
                chromeStrip={chromeStrip}
                kind="tools"
                onClick={() => setToolbarCollapsed(true)}
              />
            </div>
          )}
          {!toolbarChromeHost && !toolbarCollapsed && toolbarVisibility.linkStatus && pendingLink ? (
            <span className={styles.linkStatus}>
              ligando até{' '}
              <strong>{pendingLink.targetCollectionType || pendingLink.targetSchemaId}</strong>
              {' · '}arrastar à grade vazia adiciona nó · vazio/Esc cancela
            </span>
          ) : null}
          {!toolbarChromeHost && !toolbarCollapsed && toolbarVisibility.navigateHint && canvasInteractionMode === 'navigate' ? (
            <span className={styles.linkStatus}>
              modo mover na grade · arrastar para deslocar · W ou Esc para sair
            </span>
          ) : null}
          {!toolbarChromeHost && !toolbarCollapsed && canvasInteractionMode === 'selectBox' ? (
            <span className={styles.linkStatus}>
              {t(LangId.GraphHintSelectBoxMode, 'modo select box · arrastar na grade para seleccionar · Esc para sair')}
            </span>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.addNode ? (
            <div className={styles.controlsInspectorSlot} ref={addNodeToolbarAnchorRef}>
              <CanvasToolbarToolSlot
                label={t(LangId.GraphToolbarAddNode)}
                placement={chromeStrip ? 'below' : 'above'}
              >
                <ToolbarDockIconButton
                  ariaLabel={t(LangId.GraphToolbarAddNode)}
                  chromeStrip={chromeStrip}
                  kind="addNode"
                  onClick={() => openPalette()}
                />
              </CanvasToolbarToolSlot>
            </div>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.undo ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.GraphToolbarUndo)}
              placement="above"
            >
              <ToolbarDockIconButton
                ariaLabel={t(LangId.GraphToolbarUndo)}
                chromeStrip={chromeStrip}
                disabled={!canUndo}
                kind="undo"
                onClick={onUndo}
              />
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.redo ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.GraphToolbarRedo)}
              placement="above"
            >
              <ToolbarDockIconButton
                ariaLabel={t(LangId.GraphToolbarRedo)}
                chromeStrip={chromeStrip}
                disabled={!canRedo}
                kind="redo"
                onClick={onRedo}
              />
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed &&
          (toolbarVisibility.camera ||
            toolbarVisibility.resetViewport ||
            toolbarVisibility.resetScene) ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.GraphToolbarCamera)}
              placement="above"
            >
              <InspectorViewportDockShell
                chromeStrip={chromeStrip}
                body={
                  <CanvasCameraDockBody
                    onPanChange={(nextPan) => {
                      panRef.current = nextPan
                      setPan(nextPan)
                      persistSceneCamera({ pan: nextPan, scale: scaleRef.current })
                    }}
                    onResetScene={onResetScene}
                    onResetViewport={resetViewport}
                    pan={pan}
                    showResetScene={toolbarVisibility.resetScene}
                    showResetViewport={toolbarVisibility.resetViewport}
                  />
                }
                bodyClassName="inspectorScrollHost"
                expandAriaLabel={t(LangId.GraphToolbarCamera)}
                expandContent={<DockTabIcon kind="camera" />}
                headerActions={renderToolbarDockHeaderActions('camera')}
                minimized={activeViewportToolbarDock !== 'camera'}
                onExpand={() => toggleToolbarDock('camera')}
                shellSurfaceClassName={dockStyles.dockedShellNode}
                title={t(LangId.GraphToolbarCamera)}
              />
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.zoom ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.GraphToolbarZoom)}
              placement="above"
            >
              <InspectorViewportDockShell
                chromeStrip={chromeStrip}
                body={
                  <CanvasZoomDockBody
                    maxScale={MAX_SCALE}
                    minScale={MIN_SCALE}
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    scale={scale}
                  />
                }
                bodyClassName="inspectorScrollHost"
                expandAriaLabel={t(LangId.GraphToolbarZoom)}
                expandContent={<DockTabIcon kind="zoom" />}
                headerActions={renderToolbarDockHeaderActions('zoom')}
                minimized={activeViewportToolbarDock !== 'zoom'}
                onExpand={() => toggleToolbarDock('zoom')}
                shellSurfaceClassName={dockStyles.dockedShellNode}
                title={t(LangId.GraphToolbarZoom)}
              />
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.sceneNodes && sceneNodesControlsSlot ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.SceneNodesTitle)}
              placement="above"
            >
              {sceneNodesControlsSlot}
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && toolbarVisibility.inspector && viewportControlsSlot ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.NodeInspectorEyebrow)}
              placement="above"
            >
              {viewportControlsSlot}
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && blockInspectorControlsSlot ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.BlockInspectorTitle)}
              placement="above"
            >
              {blockInspectorControlsSlot}
            </CanvasToolbarToolSlot>
          ) : null}
          {!toolbarCollapsed && groupInspectorControlsSlot ? (
            <CanvasToolbarToolSlot
              className={styles.controlsInspectorSlot}
              label={t(LangId.GroupInspectorTitle)}
              placement="above"
            >
              {groupInspectorControlsSlot}
            </CanvasToolbarToolSlot>
          ) : null}
          </div>
        )

        const toolbarChromePortal =
          toolbarChromeHost && typeof document !== 'undefined'
            ? createPortal(
                <div className={styles.controlsChromeHost}>
                  <div className={styles.controlsChromeScroll}>{viewportControls}</div>
                </div>,
                toolbarChromeHost,
              )
            : null

        const showFloatingToolbarRow = !toolbarChromeHost || toolbarVisibility.legend

        return (
          <>
            {toolbarChromePortal}
            {showFloatingToolbarRow ? (
            <div
              className={[
                styles.toolbar,
                toolbarChromeHost ? styles.toolbarWithoutControls : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-canvas-control="true"
              data-canvas-toolbar={toolbarChromeHost ? undefined : 'true'}
            >
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
                    <span aria-hidden className={styles.legendWireIcon} /> fio curvo · ortogonal · sem fio (corrente
                    nos ports) · clique no fio ou na corrente cicla estilo · Ctrl+clique remove · tecla A: seleccionar
                    todos ou limpar · clique na grade limpa
                  </span>
                </div>
              ) : null}
              {!toolbarChromeHost ? viewportControls : null}
            </div>
            ) : null}
          </>
        )
      })()}

      <SlashCommandPicker
        featureFilter="blocks"
        isOpen={isSlashCommandPickerOpen}
        onClose={closeSlashCommandPicker}
        onPick={handleSlashCommandPick}
      />

      <SlashCommandPicker
        featureFilter="blocks"
        isOpen={slashCommandRemovePickerOpen}
        onClose={() => setSlashCommandRemovePickerOpen(false)}
        onPick={async (command) => {
          if (!onRemoveBlockSlashCommand) {
            setSlashCommandRemovePickerOpen(false)
            return
          }

          const confirmed = window.confirm(
            t(
              LangId.SlashCommandRemoveConfirmMessage,
              'Remover o comando /{command} da feature {feature}?',
              { command: command.command, feature: command.feature },
            ),
          )
          if (!confirmed) {
            return
          }

          const result = await onRemoveBlockSlashCommand(command.command)
          setSlashCommandRemovePickerOpen(false)
          if (!result.ok) {
            showAppAlert(result.error)
          }
        }}
        title={t(LangId.SlashCommandRemovePickerTitle, 'Remover slash command')}
      />

      <TextInputDialog
        confirmLabel={t(LangId.BlockCardSlashCommandsAdd, 'Adicionar')}
        hint={t(LangId.SlashCommandAddDialogHint, 'O nome será o comando (ex.: /MeuPreset).')}
        initialValue={slashCommandAddDialog?.suggestedName ?? ''}
        inputLabel={t(LangId.SlashCommandAddDialogTitle, 'Nome do comando')}
        isOpen={slashCommandAddDialog !== null}
        onCancel={() => setSlashCommandAddDialog(null)}
        onConfirm={async (value) => {
          const request = slashCommandAddDialog
          setSlashCommandAddDialog(null)
          if (!request || !onSaveBlockSlashCommand) {
            return
          }

          const result = await onSaveBlockSlashCommand(request.nodeId, value)
          if (result.ok) {
            refreshSlashCommandsCatalog()
          } else {
            showAppAlert(result.error)
          }
        }}
        title={t(LangId.SlashCommandAddDialogTitle, 'Novo slash command')}
      />

      {isPaletteOpen ? (
        <AddNodePalette
          addonsCatalogEnabled={Boolean(addonDropLinkContext) || (!linkDropContext && !blockDropLinkContext)}
          blocksCatalogEnabled={Boolean(blockDropLinkContext) || !linkDropContext}
          blockDefinitionFilter={blockDropLinkContext ? blockDefinitionMatchesDropContext : undefined}
          blockDropLinkContext={blockDropLinkContext ?? undefined}
          heading={
            linkDropContext || blockDropLinkContext || addonDropLinkContext
              ? t(LangId.NodePaletteLinkHeading)
              : undefined
          }
          initialCatalogMode={
            addonDropLinkContext
              ? 'addons'
              : blockDropLinkContext
                ? 'blocks'
                : paletteInitialCatalogMode
          }
          onClose={closePalette}
          onPickAddon={handlePaletteAddonPick}
          onPickBlock={handlePaletteBlockPick}
          onPickSlashCommand={handlePaletteSlashCommandPick}
          onPickSchema={handlePalettePick}
          onRefreshSlashCommands={refreshSlashCommandsCatalog}
          onSyncBlockParameterCatalog={onSyncBlockParameterCatalog}
          packFolderBySchemaId={schemaPackFolderBySchemaId}
          jsonRelativePathBySchemaId={schemaJsonRelativePathBySchemaId}
          memoryPackFolders={memoryPackFolders}
          screenAnchor={linkDropContext || blockDropLinkContext ? null : paletteScreenAnchor}
          structureSubfolderBySchemaId={schemaStructureSubfolderBySchemaId}
          schemas={blockDropLinkContext ? [] : paletteSchemas}
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

      {graphSnapMenu.isOpen && graphSnapMenu.anchor ? (
        <SnapMenu
          actions={graphSnapMenu.actions}
          anchor={graphSnapMenu.anchor}
          disabledActionIds={graphSnapMenu.disabledActionIds}
          onActiveActionChange={graphSnapMenu.setActiveActionId}
          onClose={graphSnapMenu.close}
          onSelect={graphSnapMenu.handleSelect}
          renderIcon={renderGraphSnapMenuIcon}
          showActiveBar={graphSnapMenu.showActiveBar}
          showPolygonVisual={graphSnapMenu.showPolygonVisual}
          title={graphSnapMenu.title}
          titleUpdatesWithActiveAction={graphSnapMenu.titleUpdatesWithActiveAction}
        />
      ) : null}

      {gridContextSnapMenu.isOpen && gridContextSnapMenu.anchor ? (
        <SnapMenu
          actions={gridContextSnapMenu.actions}
          anchor={gridContextSnapMenu.anchor}
          disabledActionIds={gridContextSnapMenu.disabledActionIds}
          onActiveActionChange={gridContextSnapMenu.setActiveActionId}
          onClose={gridContextSnapMenu.close}
          onSelect={gridContextSnapMenu.handleSelect}
          showActiveBar={gridContextSnapMenu.showActiveBar}
          showPolygonVisual={gridContextSnapMenu.showPolygonVisual}
          title={gridContextSnapMenu.title}
          titleUpdatesWithActiveAction={gridContextSnapMenu.titleUpdatesWithActiveAction}
        />
      ) : null}

      {gridControlAnchor ? (
        <CanvasGridControlPanel
          anchor={gridControlAnchor}
          onChange={(patch) => onCanvasGridChange?.(patch)}
          onClose={() => setGridControlAnchor(null)}
          state={resolveCanvasGridControlState({
            showCanvasGrid,
            canvasGridSize,
            canvasGridOpacity,
            canvasGridLineColorEnabled,
            canvasGridHorizontalLineColor,
            canvasGridVerticalLineColor,
            canvasGridCheckerEnabled,
            canvasGridCheckerColorA,
            canvasGridCheckerColorB,
          })}
        />
      ) : null}

      <div
        aria-label="Graph viewport navigation area"
        className={[
          styles.viewportBody,
          'ngl-canvas-grid-host',
          isCanvasPanCursorMode(canvasInteractionMode)
            ? styles.viewportPanCursor
            : styles.viewportDefaultCursor,
        ]
          .filter(Boolean)
          .join(' ')}
        onContextMenu={handleContextMenu}
        onPointerCancel={handleViewportPointerUp}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onDragOver={(event) => {
          if (resolveAddonDropFromDataTransfer(event.dataTransfer)) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }
        }}
        onDrop={(event) => {
          const addonId = resolveAddonDropFromDataTransfer(event.dataTransfer)
          if (!addonId || !onCreateAddonFromCatalog) {
            return
          }
          event.preventDefault()
          const canvasEl = canvasRef.current
          if (!canvasEl) {
            return
          }
          const position = graphClientToPosition(canvasEl, scale, event.clientX, event.clientY)
          void onCreateAddonFromCatalog(addonId, position).then((result) => {
            if (result.ok) {
              onSelectNode(result.nodeId)
            } else {
              showAppAlert(result.error)
            }
          })
        }}
        ref={viewportBodyRef}
        {...{ [GRAPH_CANVAS_SCOPE_ATTR]: GRAPH_CANVAS_SCOPE_ID }}
      >
      <div className={styles.canvas} ref={canvasRef} style={canvasStyle}>
        <Canvas2DCursor position={cursor2DPosition} />
        <RitualNeekoStagingPreview />
        <GraphCanvasConnectionsLayer
          canvasBounds={canvasBounds}
          nodePositionsKey={nodePositionsKey}
          connections={scene.connections}
          nodesForLayout={nodesForLayout}
          portAnchors={portAnchors}
          isConnectionRenderedInViewport={isConnectionRenderedInViewport}
          resolveNodeConnectionPath={resolveConnectionPath}
          addonConnectionPaths={addonLinks.addonConnectionPaths}
          addonLinkDraftPath={addonLinkDraftPath}
          pendingBlockLink={pendingBlockLink}
          blockLinkDraftPoint={blockLinkDraftPoint}
          pendingGroupLink={pendingGroupLink}
          groupLinkDraftPoint={groupLinkDraftPoint}
          pendingLink={pendingLink}
          linkDraftPoint={linkDraftPoint}
          createDraftConnectionPath={createDraftConnectionPath}
          onContextMenu={handleContextMenu}
          onRemoveConnection={onRemoveConnection}
          onCycleConnectionRouting={onCycleConnectionRouting}
        />

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

        <GraphCanvasNodeHostProvider value={nodeHostContextValue}>
          {visibleCanvasNodes.map((canvasNode) => {
            const nodeLocked = isNodeLocked(canvasNode)
            const nodeGlueLocked = glueNodeId === canvasNode.id
            const nodeInteractionLocked = nodeLocked || nodeGlueLocked
            const isSelected = selectedNodeIds.includes(canvasNode.id)
            const cardHandlesSelection =
              (canvasNode.groupViewActive && !!canvasNode.groupStructure) ||
              (canvasNode.addonViewActive && !!canvasNode.addonInstance) ||
              (canvasNode.blockViewActive && !!canvasNode.blockStructure)
            const pendingFromNode = pendingLink
              ? scene.nodes.find((node) => node.id === pendingLink.fromNodeId)
              : undefined
            const pendingOutputSlot =
              pendingLink && pendingFromNode
                ? findOutputSlotInNode(
                    pendingFromNode,
                    pendingLink.fromInternalStructureId,
                    scene.connections,
                  )
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
            const slotToolsEnabled =
              !nodeGlueLocked && blockSlotToolsEnabledNodes.has(canvasNode.id)

            return (
              <GraphCanvasSceneNode
                key={canvasNode.id}
                canvasNode={canvasNode}
                renderPosition={resolveGraphCanvasNodeRenderPosition(
                  canvasNode,
                  dragPositionOverride,
                )}
                isSelected={isSelected}
                nodeInteractionLocked={nodeInteractionLocked}
                nodeLocked={nodeLocked}
                isCompatibleTarget={isCompatibleTarget}
                isIncompatibleDuringLink={isIncompatibleDuringLink}
                wirelessHighlighted={wirelessHighlightNodeId === canvasNode.id}
                linkDropHovered={ritualLinkDropHoverNodeId === canvasNode.id}
                cardHandlesSelection={cardHandlesSelection}
                blockWirelessDisplay={blockWirelessDisplayByNode.get(canvasNode.id)}
                groupWirelessDisplay={groupWirelessDisplayByNode.get(canvasNode.id)}
                wirelessDisplay={wirelessDisplayByNode.get(canvasNode.id)}
                blockWirelessPulseSlotId={
                  blockWirelessPulse?.nodeId === canvasNode.id
                    ? blockWirelessPulse.slotId
                    : undefined
                }
                groupWirelessPulseSlotId={
                  groupWirelessPulse?.nodeId === canvasNode.id
                    ? groupWirelessPulse.slotId
                    : undefined
                }
                wirelessPortPulse={
                  wirelessPortPulse?.nodeId === canvasNode.id ? wirelessPortPulse : undefined
                }
                slotToolsEnabled={slotToolsEnabled}
                slotPagerEnabled={nodeLightModeEnabled || slotToolsEnabled}
                parameterPanelRequest={
                  blockParameterPanelRequest?.nodeId === canvasNode.id
                    ? blockParameterPanelRequest.panel
                    : null
                }
                parameterPanelScreenAnchor={
                  blockParameterAnchorNodeId === canvasNode.id
                    ? blockParameterScreenAnchor
                    : null
                }
                blockSlotPeerActions={
                  slotToolsEnabled ? buildBlockSlotPeerActions(canvasNode.id) : undefined
                }
                activeBlockSlotId={pendingBlockLink?.fromBlockSlotId}
                activeGroupSlotId={pendingGroupLink?.fromGroupSlotId}
                activeAddonSlotId={addonLinks.pendingAddonLink?.fromAddonSlotId}
                activeOutputInternalStructureId={
                  pendingLink?.fromNodeId === canvasNode.id
                    ? pendingLink.fromInternalStructureId
                    : undefined
                }
                bodyCollapsed={isNodeBodyEffectivelyCollapsed(
                  canvasNode,
                  compactElementVisibility,
                )}
                cardBodyLayout={resolveNodeCardBodyLayout(canvasNode)}
                neekoTransforming={neekoTransformingNodeId === canvasNode.id}
                ritualDropHover={ritualDropHoverNeekoId === canvasNode.id}
              />
            )
          })}
        </GraphCanvasNodeHostProvider>
      </div>
      </div>
    </section>
  )
})

GraphCanvas.displayName = 'GraphCanvas'
