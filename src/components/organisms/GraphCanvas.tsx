import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'

import { CollectionTypeLinkMenu } from '@/components/molecules/CollectionTypeLinkMenu'
import { AddNodePalette } from '@/components/organisms/AddNodePalette'
import { NodeCard } from '@/components/organisms/NodeCard'
import type { CanvasConnection, CanvasNode, CanvasPosition, CanvasScene } from '@/core/canvasScene'
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
import { filterOutEmbedCatalogChildStructures } from '@/core/embedElementMenu'
import { filterOutPointerCatalogChildStructures } from '@/core/pointerElementMenu'
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
import { filterOutListEmbedCatalogChildStructures } from '@/core/listEmbedElementMenu'
import { filterOutListPointerCatalogChildStructures } from '@/core/listPointerElementMenu'
import { populatedSlotsForPointer } from '@/core/pointerSlots'
import { populatedSlotsForListPointer } from '@/core/listPointerSlots'
import type { NodeElementListItem } from '@/core/listNodeElements'
import type { InternalStructureDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import {
  filterInternalStructuresByPathHierarchy,
  listInternalStructureCandidatesForBase,
} from '@/core/pathHierarchyInternalStructures'
import { isParameterPickerOpen } from '@/core/parameterPickerModal'
import { schemaJsonRelativePathBySchemaId } from '@/core/nodeStructureRegistry'
import { schemaRegistry } from '@/core/nodeStructureRegistry'

import styles from './GraphCanvas.module.css'

const CARD_WIDTH = 360
const HEADER_HEIGHT = 56
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
const ITEM_GAP = 8
const SECTION_GAP = 20
const PORT_OVERLAP = 6
const RIGID_SEGMENT_LENGTH = 44
const BUTTON_HEIGHT = 46
const CANVAS_PADDING = 240
const MIN_SCALE = 0.65
const MAX_SCALE = 1.25
const SCALE_STEP = 0.1
const SNAP_GRID_PX = 24

const DROP_TO_OPEN_LINK_PALETTE_PX = 12

export type GraphCanvasHandle = {
  focusSelectionIntoView(nodeIds: string[]): void
  openPalette: () => void
}

type GraphCanvasProps = {
  availableSchemas: NodeSchemaDefinition[]
  /** Nome da pasta sob `src/nodeStructures/` por id de schema (filtro 📂 na paleta). */
  schemaPackFolderBySchemaId?: Record<string, string>
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
  onCreateChildNode: (
    fromNodeId: string,
    structure: InternalStructureDefinition,
    position?: CanvasPosition,
  ) => void
  onCreateRootNode: (schema: NodeSchemaDefinition) => void
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
  onAppendCatalogInternalStructure?: (
    canvasNodeId: string,
    structure: InternalStructureDefinition,
  ) => void
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
  /** Reordena parâmetros no card (índice 1-based na lista actual). */
  onSetNodeParameterOrder?: (
    canvasNodeId: string,
    parameterId: string,
    oneBasedIndex: number,
  ) => void
  scene: CanvasScene
  selectedNodeIds: string[]
  selectedNodeId: string
  /** Conteúdo extra dentro da régua aria-label «Canvas viewport controls» (ex.: inspector acoplado). */
  viewportControlsSlot?: ReactNode
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

type GraphDropLinkContext = {
  entity: InternalStructureDefinition
  fromNodeId: string
  position: CanvasPosition
}

type CanvasBounds = {
  height: number
  width: number
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
}

function getParameterSectionHeight(node: CanvasNode) {
  const itemCount = node.node.schema.parameters.length
  const listHeight = itemCount * PARAMETER_ITEM_HEIGHT + Math.max(0, itemCount - 1) * ITEM_GAP

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + listHeight
}

function getEmbedBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.embed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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
  const blocksHeight = getEmbedBlocksHeight(node)
  if (blocksHeight === 0) {
    return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP
  }

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getPointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.pointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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
  const blocksHeight = getPointerBlocksHeight(node)
  if (blocksHeight === 0) {
    return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP
  }

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getListEmbedBlocksHeight(node: CanvasNode, connections: readonly CanvasConnection[]) {
  const blocks = node.node.schema.listEmbed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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
  const blocksHeight = getListEmbedBlocksHeight(node, connections)
  if (blocksHeight === 0) {
    return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP
  }

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getListPointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.listPointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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
  const blocksHeight = getListPointerBlocksHeight(node)
  if (blocksHeight === 0) {
    return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP
  }

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getList2EmbedBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.list2Embed ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getList2PointerBlocksHeight(node: CanvasNode) {
  const blocks = node.node.schema.list2Pointer ?? []
  if (blocks.length === 0) {
    return 0
  }

  let height = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!
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

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + blocksHeight
}

function getInternalStructureSectionHeight(node: CanvasNode) {
  const itemCount = node.node.schema.internalStructures.length
  const listHeight =
    itemCount * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, itemCount - 1) * ITEM_GAP

  return SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP + listHeight
}

function getNodeCardHeight(node: CanvasNode, connections: readonly CanvasConnection[]) {
  return (
    HEADER_HEIGHT +
    BODY_PADDING * 2 +
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
    SECTION_GAP +
    getInternalStructureSectionHeight(node) +
    SECTION_GAP +
    BUTTON_HEIGHT
  )
}

function getCanvasBounds(scene: CanvasScene): CanvasBounds {
  return scene.nodes.reduce(
    (bounds, node) => ({
      height: Math.max(bounds.height, node.position.y + getNodeCardHeight(node, scene.connections) + CANVAS_PADDING),
      width: Math.max(bounds.width, node.position.x + CARD_WIDTH + RIGID_SEGMENT_LENGTH + CANVAS_PADDING),
    }),
    {
      height: scene.height,
      width: scene.width,
    },
  )
}

function getEmbedPortY(node: CanvasNode, structureId: string) {
  let cursor =
    node.position.y +
    HEADER_HEIGHT +
    BODY_PADDING +
    getParameterSectionHeight(node) +
    SECTION_GAP +
    SECTION_TITLE_HEIGHT +
    SECTION_TITLE_GAP

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
  let cursor =
    node.position.y +
    HEADER_HEIGHT +
    BODY_PADDING +
    getParameterSectionHeight(node) +
    SECTION_GAP +
    getEmbedSectionHeight(node) +
    SECTION_GAP +
    SECTION_TITLE_HEIGHT +
    SECTION_TITLE_GAP

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
  let cursor =
    node.position.y +
    HEADER_HEIGHT +
    BODY_PADDING +
    getParameterSectionHeight(node) +
    SECTION_GAP +
    getEmbedSectionHeight(node) +
    SECTION_GAP +
    getPointerSectionHeight(node) +
    SECTION_GAP +
    SECTION_TITLE_HEIGHT +
    SECTION_TITLE_GAP

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
  let cursor =
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
    SECTION_TITLE_HEIGHT +
    SECTION_TITLE_GAP

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
  const safeIndex = Math.max(structureIndex, 0)

  return (
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
    SECTION_TITLE_HEIGHT +
    SECTION_TITLE_GAP +
    safeIndex * (INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP) +
    INTERNAL_STRUCTURE_ITEM_HEIGHT / 2
  )
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

type PortAnchorMaps = {
  inputs: Map<string, PanPoint>
  outputs: Map<string, PanPoint>
}

function graphPointFromElementCenter(canvasEl: HTMLElement, scale: number, innerEl: HTMLElement): PanPoint {
  const canvasRect = canvasEl.getBoundingClientRect()
  const bounds = innerEl.getBoundingClientRect()
  const clientX = bounds.left + bounds.width / 2
  const clientY = bounds.top + bounds.height / 2

  return {
    x: (clientX - canvasRect.left) / scale,
    y: (clientY - canvasRect.top) / scale,
  }
}

function outputAnchorKey(nodeId: string, structureId: string): string {
  return `${nodeId}|${structureId}`
}

function collectGraphPortAnchors(canvasEl: HTMLElement, scale: number): PortAnchorMaps {
  const outputs = new Map<string, PanPoint>()
  const inputs = new Map<string, PanPoint>()
  const elements = canvasEl.querySelectorAll('[data-graph-node-id][data-graph-port]')

  elements.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return
    }

    const nodeId = node.getAttribute('data-graph-node-id')
    const kind = node.getAttribute('data-graph-port')

    if (!nodeId || !kind) {
      return
    }

    const p = graphPointFromElementCenter(canvasEl, scale, node)

    if (kind === 'output') {
      const structureId = node.getAttribute('data-graph-internal-structure-id')
      if (structureId) {
        outputs.set(outputAnchorKey(nodeId, structureId), p)
      }
      return
    }

    if (kind === 'input') {
      inputs.set(nodeId, p)
    }
  })

  return { inputs, outputs }
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

function intersectsCanvasNodeRect(
  marquee: { height: number; width: number; x: number; y: number },
  node: CanvasNode,
  connections: readonly CanvasConnection[],
): boolean {
  const nodeRect = {
    height: getNodeCardHeight(node, connections),
    width: CARD_WIDTH,
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

function collectNodesInMarquee(scene: CanvasScene, start: CanvasPosition, end: CanvasPosition): string[] {
  const marquee = normalizeMarqueeRect(start, end)

  if (marquee.width < 4 && marquee.height < 4) {
    return []
  }

  return scene.nodes
    .filter((node) => intersectsCanvasNodeRect(marquee, node, scene.connections))
    .map((node) => node.id)
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  {
    availableSchemas,
    schemaPackFolderBySchemaId,
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
    onCreateChildNode,
    onCreateRootNode,
    onMarqueeCommit,
    onMoveNode,
    onRedo,
    onRemoveConnection,
    onResetScene,
    hints,
    onAppendCatalogInternalStructure,
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
    scene,
    selectedNodeIds,
    selectedNodeId,
    viewportControlsSlot,
  },
  ref,
) {
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null)
  const [collectionTypeLinkMenu, setCollectionTypeLinkMenu] = useState<CollectionTypeLinkMenuState | null>(
    null,
  )
  const [linkDraftPoint, setLinkDraftPoint] = useState<PanPoint | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const linkDraftClientRef = useRef<{ cx: number; cy: number } | null>(null)
  const outputWireDragRef = useRef<OutputWireDragSession | null>(null)
  const pendingLinkRef = useRef<PendingLink | null>(null)
  const [linkDropContext, setLinkDropContext] = useState<GraphDropLinkContext | null>(null)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const nodeDragGesture = useRef<NodeDragGesture | null>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const middlePanGestureRef = useRef<PanGesture | null>(null)
  const marqueeGestureRef = useRef<{ additive: boolean; pointerId: number; start: CanvasPosition } | null>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const viewportBodyRef = useRef<HTMLDivElement | null>(null)
  const [marqueeOverlay, setMarqueeOverlay] = useState<null | { current: CanvasPosition; start: CanvasPosition }>(
    null,
  )
  const [glueNodeId, setGlueNodeId] = useState<string | null>(null)
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
  const [portAnchors, setPortAnchors] = useState<PortAnchorMaps>(() => ({
    inputs: new Map(),
    outputs: new Map(),
  }))

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

  const connectionPaths = useMemo(() => {
    return scene.connections
      .map((connection) => resolveConnectionPath(connection, scene.nodes, scene.connections, portAnchors))
      .filter((path): path is ConnectionPath => path !== null)
  }, [portAnchors, scene.connections, scene.nodes])

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

  const updateLinkDraftFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current

      if (!pendingLink) {
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
    },
    [pendingLink, scale],
  )

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
    setPendingLink(null)
    setLinkDraftPoint(null)
  }, [])

  useEffect(() => {
    pendingLinkRef.current = pendingLink
  }, [pendingLink])

  const canvasStyle: CanvasStyle = {
    '--canvas-height': `${canvasBounds.height}px`,
    '--canvas-width': `${canvasBounds.width}px`,
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
  }

  const zoomIn = () => {
    setScale((currentScale) => Math.min(MAX_SCALE, Number((currentScale + SCALE_STEP).toFixed(2))))
  }

  const zoomOut = () => {
    setScale((currentScale) => Math.max(MIN_SCALE, Number((currentScale - SCALE_STEP).toFixed(2))))
  }

  const resetViewport = () => {
    setPan({ x: 0, y: 0 })
    setScale(1)
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
      const embedHit = fromNode ? findSlotInEmbedSchema(fromNode.node.schema, entity.id) : null
      const pointerHit =
        !embedHit && fromNode ? findSlotInPointerSchema(fromNode.node.schema, entity.id) : null
      const listEmbedHit =
        !embedHit && !pointerHit && fromNode
          ? findSlotInListEmbedSchema(fromNode.node.schema, entity.id)
          : null
      const listPointerHit =
        !embedHit && !pointerHit && !listEmbedHit && fromNode
          ? findSlotInListPointerSchema(fromNode.node.schema, entity.id)
          : null
      const targetCollectionType = embedHit
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

      linkDraftClientRef.current = null
      setLinkDraftPoint(null)
      setPendingLink({
        draftAnchor: { sx, sy },
        fromInternalStructureId: entity.id,
        fromNodeId,
        targetCollectionType,
        targetSchemaId: entity.schemaId,
      })
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
      const nodeWrapBlocking = el instanceof Element ? el.closest('[data-canvas-node="true"]') : null
      const inCanvas = el instanceof Node && canvasEl.contains(el)

      if (
        drag.maxScreenDelta >= DROP_TO_OPEN_LINK_PALETTE_PX &&
        inCanvas &&
        !nodeWrapBlocking &&
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
      const embedHit = findSlotInEmbedSchema(fromNode.node.schema, structure.id)
      const pointerHit = !embedHit ? findSlotInPointerSchema(fromNode.node.schema, structure.id) : null
      const listEmbedHit = !embedHit && !pointerHit
        ? findSlotInListEmbedSchema(fromNode.node.schema, structure.id)
        : null
      const listPointerHit =
        !embedHit && !pointerHit && !listEmbedHit
          ? findSlotInListPointerSchema(fromNode.node.schema, structure.id)
          : null
      const collectionType = embedHit
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

  const handleOutputWirePointerDown = useCallback(
    (fromNodeId: string, entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
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
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [beginPendingLink],
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

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (drag.maxScreenDelta < DROP_TO_OPEN_LINK_PALETTE_PX) {
        openCollectionTypeLinkMenu(fromNodeId, entity, event.currentTarget)
        endLinkDraft()
        return
      }

      resolveOutputWireDrop(drag, event.clientX, event.clientY)
    },
    [endLinkDraft, openCollectionTypeLinkMenu, resolveOutputWireDrop],
  )

  const handleOutputWirePointerCancel = useCallback(
    (_entity: InternalStructureDefinition, event: PointerEvent<HTMLButtonElement>) => {
      const drag = outputWireDragRef.current

      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      outputWireDragRef.current = null

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      endLinkDraft()
    },
    [endLinkDraft],
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

  const openPalette = useCallback(() => {
    setLinkDropContext(null)
    setIsPaletteOpen(true)
  }, [])

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false)
    setLinkDropContext(null)
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

      onCreateRootNode(schema)
      endLinkDraft()
      closePalette()
    },
    [closePalette, endLinkDraft, linkDropContext, onCreateChildNode, onCreateRootNode, scene.connections, scene.nodes],
  )

  useEffect(() => {
    if (!pendingLink) {
      return
    }

    const cancelLinkOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isEditableTarget(event.target)) {
        event.preventDefault()
        endLinkDraft()
      }
    }

    window.addEventListener('keydown', cancelLinkOnEscape)

    return () => {
      window.removeEventListener('keydown', cancelLinkOnEscape)
    }
  }, [endLinkDraft, pendingLink])

  useEffect(() => {
    const openPaletteOnShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !isEditableTarget(event.target)) {
        event.preventDefault()
        openPalette()
      }
    }

    window.addEventListener('keydown', openPaletteOnShortcut)

    return () => {
      window.removeEventListener('keydown', openPaletteOnShortcut)
    }
  }, [openPalette])

  const handleViewportPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isParameterPickerOpen()) {
      return
    }

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
        const hits = collectNodesInMarquee(scene, marqueeGest.start, end)

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

      return
    }

    if (panGesture.current?.pointerId !== event.pointerId) {
      return
    }

    panGesture.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const startNodeDrag = (event: PointerEvent<HTMLElement>, canvasNode: CanvasNode) => {
    if (event.button !== 0) {
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

      setPan({
        x: viewportWidth / 2 - centerX * targetScale,
        y: viewportHeight / 2 - centerY * targetScale,
      })
      setScale(targetScale)
    },
    [scene.nodes],
  )

  useImperativeHandle(ref, () => ({
    focusSelectionIntoView,
    openPalette,
  }))

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

    const handleWheelPan = (event: WheelEvent) => {
      if (isParameterPickerOpen()) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.ctrlKey || event.metaKey) {
        return
      }

      event.preventDefault()
      const zoomDirection = event.deltaY > 0 ? -1 : 1
      const factor = 1 + zoomDirection * 0.08

      setScale((previousScale) =>
        Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((previousScale * factor).toFixed(3)))),
      )
    }

    element.addEventListener('wheel', handleWheelPan, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheelPan)
    }
  }, [scene.nodes.length])

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
  }, [glueNodeId, onMoveNode, scale])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return
      }

      const lowered = event.key.toLowerCase()

      if (lowered === 'a') {
        event.preventDefault()

        if (selectedNodeIds.length > 0) {
          onClearSelection?.()
        } else {
          onSelectAllNodesShortcut?.()
        }

        return
      }

      if (event.key === '.') {
        event.preventDefault()
        focusSelectionIntoView(selectedNodeIds)
        return
      }

      if (lowered === 'g') {
        event.preventDefault()
        setGlueNodeId((existingGlue) =>
          glueTargetId === null ? null : existingGlue === glueTargetId ? null : glueTargetId,
        )
        return
      }

      if (event.key === 'Escape') {
        onCloseCodePanelShortcut?.()
        setGlueNodeId(null)
      }
    }

    window.addEventListener('keydown', handleShortcut)

    return () => {
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [
    focusSelectionIntoView,
    glueTargetId,
    onClearSelection,
    onCloseCodePanelShortcut,
    onSelectAllNodesShortcut,
    selectedNodeId,
    selectedNodeIds,
  ])

  return (
    <section
      aria-label="Static node graph canvas"
      className={styles.viewport}
      ref={viewportRef}
    >
      <div className={styles.toolbar} data-canvas-control="true" data-canvas-toolbar="true">
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
            <span aria-hidden className={styles.legendWireIcon} /> fio · clique cicla estilo · Ctrl+clique remove ·
            tecla A: seleccionar todos ou limpar · clique na grade limpa
          </span>
        </div>

        <div className={styles.controls} aria-label="Canvas viewport controls">
          {pendingLink ? (
            <span className={styles.linkStatus}>
              ligando até{' '}
              <strong>{pendingLink.targetCollectionType || pendingLink.targetSchemaId}</strong>
              {' · '}arrastar à grade vazia adiciona nó · vazio/Esc cancela
            </span>
          ) : null}
          <button className={styles.primaryControl} type="button" onClick={openPalette}>
            add node
          </button>
          <button disabled={!canUndo} type="button" onClick={onUndo}>
            undo
          </button>
          <button disabled={!canRedo} type="button" onClick={onRedo}>
            redo
          </button>
          <button type="button" onClick={zoomOut}>
            -
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={zoomIn}>
            +
          </button>
          <button type="button" onClick={resetViewport}>
            reset
          </button>
          <button className={styles.dangerControl} type="button" onClick={onResetScene}>
            reset scene
          </button>
          {viewportControlsSlot ? (
            <div className={styles.controlsInspectorSlot}>{viewportControlsSlot}</div>
          ) : null}
        </div>
      </div>

      {isPaletteOpen ? (
        <AddNodePalette
          heading={linkDropContext ? 'Ligar novo nó' : undefined}
          onClose={closePalette}
          onPickSchema={handlePalettePick}
          packFolderBySchemaId={schemaPackFolderBySchemaId}
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

      <div
        aria-label="Graph viewport navigation area"
        className={styles.viewportBody}
        onPointerCancel={handleViewportPointerUp}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        ref={viewportBodyRef}
      >
      <div className={styles.canvas} ref={canvasRef} style={canvasStyle}>
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
          </defs>

          {connectionPaths.map((connection) => (
            <g key={connection.id}>
              {onRemoveConnection || onCycleConnectionRouting ? (
                <path
                  aria-label={`Ligação ${connection.id}`}
                  className={styles.connectionHit}
                  d={connection.d}
                  data-canvas-wire="true"
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
          const isSelected = selectedNodeIds.includes(canvasNode.id)
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
          const classes = [
            styles.node,
            isSelected ? styles.nodeSelected : '',
            isCompatibleTarget ? styles.nodeCompatibleTarget : '',
            isIncompatibleDuringLink ? styles.nodeIncompatibleTarget : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              className={classes}
              data-canvas-node="true"
              data-canvas-node-id={canvasNode.id}
              key={canvasNode.id}
              onPointerCancel={stopNodeDrag}
              onPointerMove={moveNodeDrag}
              onPointerUp={stopNodeDrag}
              style={{
                left: `${canvasNode.position.x}px`,
                top: `${canvasNode.position.y}px`,
              }}
            >
              <NodeCard
                activeOutputInternalStructureId={
                  pendingLink?.fromNodeId === canvasNode.id ? pendingLink.fromInternalStructureId : undefined
                }
                canvasNodeId={canvasNode.id}
                canAcceptLink={isCompatibleTarget}
                connections={scene.connections}
                catalogInternalStructures={(() => {
                  const sid = canvasNode.node.schema.id
                  const parentSchema = canvasNode.node.schema
                  const kind = schemaNodeKindBySchemaId?.[sid] ?? 'module'
                  const list =
                    kind === 'base'
                      ? (schemaBaseInternalStructureCatalogBySchemaId?.[sid] ?? [])
                      : listInternalStructureCandidatesForBase(parentSchema, schemaRegistry, {
                          jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
                        })
                  const used = new Set(
                    canvasNode.node.schema.internalStructures.map((structure) => structure.schemaId),
                  )
                  const fresh = list.filter((structure) => !used.has(structure.schemaId))
                  const templateSchema = schemaRegistry[sid] ?? null
                  return filterOutEmbedCatalogChildStructures(
                    filterOutPointerCatalogChildStructures(
                      filterOutListEmbedCatalogChildStructures(
                        filterOutListPointerCatalogChildStructures(
                          filterInternalStructuresByPathHierarchy(
                            parentSchema,
                            fresh,
                            schemaRegistry,
                            schemaJsonRelativePathBySchemaId,
                          ),
                          templateSchema,
                        ),
                        templateSchema,
                      ),
                      templateSchema,
                    ),
                    templateSchema,
                  )
                })()}
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
                onAppendCatalogInternalStructure={
                  onAppendCatalogInternalStructure
                    ? (structure) => onAppendCatalogInternalStructure(canvasNode.id, structure)
                    : undefined
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
                onCreateElement={(entity) => onCreateChildNode(canvasNode.id, entity)}
                onRequestRemoveElement={
                  onRequestRemoveElement
                    ? (item) => onRequestRemoveElement(canvasNode.id, item)
                    : undefined
                }
                onInputPortClick={() => completeLink(canvasNode)}
                onOutputWireKeyboard={(entity) => handleOutputWireKeyboard(canvasNode.id, entity)}
                onOutputWirePointerCancel={handleOutputWirePointerCancel}
                onOutputWirePointerDown={(entity, event) =>
                  handleOutputWirePointerDown(canvasNode.id, entity, event)
                }
                onOutputWirePointerMove={handleOutputWirePointerMove}
                onOutputWirePointerUp={(entity, event) =>
                  handleOutputWirePointerUp(canvasNode.id, entity, event)
                }
                onSelect={(event) => onSelectNode(canvasNode.id, { additive: Boolean(event?.shiftKey) })}
                onStartDrag={(event) => startNodeDrag(event, canvasNode)}
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
                parameterHints={hints}
                selected={isSelected}
              />
            </div>
          )
        })}
      </div>
      </div>
    </section>
  )
})
