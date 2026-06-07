import { createContext, useContext, type MouseEvent, type PointerEvent, type RefObject } from 'react'

import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import type { BlockParameterDef } from '@/core/blockSchema'
import type { BlockWirelessNodeDisplay } from '@/core/blockConnectionDisplay'
import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { CrossSlotConnectRequest } from '@/core/crossSlotConnections'
import type { BlockElementViewKey } from '@/core/blockElementViewState'
import type { WirelessPortPulseTarget } from '@/core/connectionDisplay'
import type { CompactElementCanvasVisibility } from '@/core/canvasNodePresentation'
import type { InternalStructureDefinition, NodeParameterDefinition } from '@/core/nodeSchema'
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import type { OutputSlotPeerActions } from '@/core/outputSlotPeerActions'
import type { NodeElementListItem } from '@/core/listNodeElements'
import type { NodeCardBodyLayout, NodeCardSectionId } from '@/core/nodeCardSections'
import type { PendingAddonLink } from '@/hooks/useAddonCanvasLinks'

type PanPoint = { x: number; y: number }

export type GraphCanvasNodeHostAddonLinks = {
  pendingAddonLink: PendingAddonLink | null
  beginAddonOutputLink: (fromNodeId: string, fromAddonSlotId: string) => void
  getPendingAddonLink: () => PendingAddonLink | null
  endAddonLinkDraft: () => void
  setAddonLinkDraftPointFromClient: (clientX: number, clientY: number) => void
  resolveAddonLinkDrop: (clientX: number, clientY: number) => void
}

export type GraphCanvasNodeHostContextValue = {
  sceneRef: RefObject<CanvasScene>
  /** Referência estável para re-render do contexto quando ligações mudam (não quando só posição muda). */
  sceneConnections: readonly CanvasConnection[]
  scale: number
  glueModeActive: boolean
  structureCardResizeModifierActive: boolean
  nodeLightModeEnabled: boolean
  hints?: Record<string, string>
  compactElementVisibility: CompactElementCanvasVisibility
  schemaNodeKindBySchemaId?: Record<string, 'module' | 'base'>
  schemaBaseParameterCatalogBySchemaId?: Record<string, NodeParameterDefinition[]>
  blockParameterScreenAnchor: CanvasContextMenuAnchor | null
  canvasRef: RefObject<HTMLDivElement | null>
  pendingBlockLinkRef: RefObject<{
    fromNodeId: string
    fromBlockSlotId: string
    fromBlockParameterId?: string
    draftAnchor: { sx: number; sy: number }
  } | null>
  addonLinks: GraphCanvasNodeHostAddonLinks
  handleContextMenu: (event: MouseEvent<HTMLElement>) => void
  startNodeDrag: (event: PointerEvent<HTMLElement>, canvasNode: CanvasNode) => void
  onSelectNode: (nodeId: string, options?: { additive?: boolean }) => void
  onApplyAddonOutputs?: (nodeId: string, outputs: Record<string, unknown>) => void
  onConnectAddonSlots?: (request: CrossSlotConnectRequest) => void
  tryConnectCrossSlots: (request: CrossSlotConnectRequest, allowForced?: boolean) => boolean
  endBlockLinkDraft: () => void
  beginGroupOutputLink: (
    fromNodeId: string,
    fromGroupSlotId: string,
    fromGroupParameterId?: string,
  ) => void
  resolveGroupLinkDrop: (clientX: number, clientY: number) => void
  setGroupLinkDraftPoint: (point: PanPoint | null) => void
  handleGroupSlotWirelessHoverStart: (
    slotId: string,
    link: import('@/core/groupConnectionDisplay').GroupSlotWirelessLink,
  ) => void
  handleGroupSlotWirelessHoverEnd: () => void
  onUpdateGroupParameter?: (nodeId: string, paramId: string, value: unknown) => void
  onCycleConnectionRouting?: (connectionId: string) => void
  onSetStructureCardWidth?: (nodeId: string, width: number, positionX?: number) => void
  beginBlockOutputLink: (
    fromNodeId: string,
    fromBlockSlotId: string,
    fromBlockParameterId?: string,
  ) => void
  resolveBlockLinkDrop: (clientX: number, clientY: number) => void
  setBlockLinkDraftPoint: (point: PanPoint | null) => void
  handleBlockSlotWirelessHoverStart: (
    slotId: string,
    link: import('@/core/blockConnectionDisplay').BlockSlotWirelessLink,
  ) => void
  handleBlockSlotWirelessHoverEnd: () => void
  resolveBlockOutputSlotConnectionIndexForNode: (
    nodeId: string,
    slotId: string,
    connectionCount: number,
  ) => number
  handleBlockOutputSlotConnectionIndexChange: (
    nodeId: string,
    slotId: string,
    index: number,
  ) => void
  setBlockSlotToolsEnabled: (nodeId: string, enabled: boolean) => void
  buildBlockSlotPeerActions: (nodeId: string) => BlockSlotPeerActions | undefined
  onSetBlockElementSelectedIndex?: (
    nodeId: string,
    elementKey: BlockElementViewKey,
    index: number,
  ) => void
  onRemoveConnectionsFromBlockSlot?: (nodeId: string, slotId: string) => void
  onUpdateBlockParameter?: (nodeId: string, paramId: string, value: unknown) => void
  onAddBlockParameterFromCatalog?: (
    nodeId: string,
    doc: BlockParameterJsonDocument,
  ) => { ok: true } | { ok: false; error: string }
  onRemoveBlockParameter?: (nodeId: string, paramId: string) => void
  onEditBlockParameter?: (
    nodeId: string,
    param: BlockParameterDef,
    screenAnchor?: CanvasContextMenuAnchor,
  ) => void
  clearBlockParameterPanelState: () => void
  dismissBlockParameterPanel: () => void
  clearBlockParameterPanelRequest: () => void
  completeLink: (toNode: CanvasNode) => void
  handleOutputWireKeyboard: (fromNodeId: string, entity: InternalStructureDefinition) => void
  handleOutputWirePointerCancel: (
    entity: InternalStructureDefinition,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  handleOutputWirePointerDown: (
    fromNodeId: string,
    entity: InternalStructureDefinition,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  handleOutputWirePointerMove: (
    entity: InternalStructureDefinition,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  handleOutputWirePointerUp: (
    fromNodeId: string,
    entity: InternalStructureDefinition,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onCatalogParameterAppend?: (canvasNodeId: string, definition: NodeParameterDefinition) => void
  onAppendEmbedCatalogItem?: (
    canvasNodeId: string,
    embedId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendPointerCatalogItem?: (
    canvasNodeId: string,
    pointerId: string,
    structure: InternalStructureDefinition,
  ) => void
  onAppendListEmbedCatalogItem?: (
    canvasNodeId: string,
    listEmbedId: string,
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
  onRequestRemoveElement?: (canvasNodeId: string, item: NodeElementListItem) => void
  onSetNodeParameterOrder?: (
    canvasNodeId: string,
    parameterId: string,
    oneBased: number,
  ) => void
  onUpdateNodeParameter?: (canvasNodeId: string, parameterId: string, value: string) => void
  onSetElementViewMode?: (
    canvasNodeId: string,
    elementKey: string,
    mode: import('@/core/elementViewState').ElementViewMode,
  ) => void
  onSetElementRetracted?: (canvasNodeId: string, elementKey: string, retracted: boolean) => void
  onSetElementSelectedIndex?: (
    canvasNodeId: string,
    elementKey: string,
    index: number,
  ) => void
  onRemoveConnectionsFromOutputSlot?: (canvasNodeId: string, slotId: string) => void
  onRemoveConnection?: (connectionId: string) => void
  handleWirelessPeerHoverStart: (payload: import('@/core/connectionDisplay').WirelessPeerHoverPayload) => void
  handleWirelessPeerHoverEnd: () => void
  buildOutputSlotPeerActions: (fromNodeId: string) => OutputSlotPeerActions | undefined
  onToggleNodeCardSection?: (nodeId: string, sectionId: NodeCardSectionId) => void
  onSetNodeCardSectionOrder?: (
    nodeId: string,
    sectionId: NodeCardSectionId,
    oneBasedIndex: number,
  ) => void
  onNeekoDropCode?: (nodeId: string, text: string) => void
  onNodeLockedInteraction?: () => void
  showBlockParameterCatalogError: (error: string) => void
}

const GraphCanvasNodeHostContext = createContext<GraphCanvasNodeHostContextValue | null>(null)

export function GraphCanvasNodeHostProvider({
  value,
  children,
}: {
  value: GraphCanvasNodeHostContextValue
  children: React.ReactNode
}) {
  return (
    <GraphCanvasNodeHostContext.Provider value={value}>{children}</GraphCanvasNodeHostContext.Provider>
  )
}

export function useGraphCanvasNodeHost(): GraphCanvasNodeHostContextValue {
  const value = useContext(GraphCanvasNodeHostContext)

  if (!value) {
    throw new Error('useGraphCanvasNodeHost must be used within GraphCanvasNodeHostProvider')
  }

  return value
}

/** Cena actual do canvas (via ref — não invalida memo quando só a posição muda). */
export function useGraphCanvasScene(): CanvasScene {
  return useGraphCanvasNodeHost().sceneRef.current!
}

export type { BlockWirelessNodeDisplay, NodeCardBodyLayout, WirelessPortPulseTarget }
