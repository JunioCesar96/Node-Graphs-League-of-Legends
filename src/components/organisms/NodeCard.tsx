import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from 'react'

import { NodeCardCollapsibleSection } from '@/components/molecules/NodeCardCollapsibleSection'
import { ElementMenu } from '@/components/molecules/ElementMenu'
import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import { EmbedAddPicker } from '@/components/molecules/EmbedAddPicker'
import { EmbedItem } from '@/components/molecules/EmbedItem'
import { ListEmbedAddPicker } from '@/components/molecules/ListEmbedAddPicker'
import { ListEmbedItem } from '@/components/molecules/ListEmbedItem'
import { List2EmbedItem } from '@/components/molecules/List2EmbedItem'
import { List2PointerItem } from '@/components/molecules/List2PointerItem'
import { ListPointerItem } from '@/components/molecules/ListPointerItem'
import { PointerItem } from '@/components/molecules/PointerItem'
import { NodeHeader } from '@/components/molecules/NodeHeader'
import { ParameterItem } from '@/components/molecules/ParameterItem'
import type { CSSProperties } from 'react'
import type { CanvasConnection } from '@/core/canvasScene'
import { isNodeCardBlockedInteractionTarget } from '@/core/canvasNodePresentation'
import {
  isWirelessPortPulsing,
  toWirelessPortLinkProps,
  type WirelessNodeDisplay,
  type WirelessPortHandlers,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import { populatedSlotsForEmbed } from '@/core/embedSlots'
import { populatedSlotsForListEmbed } from '@/core/listEmbedSlots'
import { populatedSlotsForListPointer } from '@/core/listPointerSlots'
import { populatedSlotsForPointer } from '@/core/pointerSlots'
import { listRemovableNodeElements, type NodeElementListItem } from '@/core/listNodeElements'
import {
  NODE_CARD_SECTION_LABELS,
  resolveNodeCardSectionExpanded,
  resolveNodeCardSectionOrder,
  type NodeCardBodyLayout,
  type NodeCardSectionExpandedMap,
  type NodeCardSectionId,
} from '@/core/nodeCardSections'
import {
  buildEmbedAddChoices,
  embedCatalogPicksForElementMenu,
  listRemovableEmbedSlotsForBlock,
  resolveEmbedTemplateBlockId,
  structureForEmbedAdd,
} from '@/core/embedElementMenu'
import {
  buildListEmbedAddChoices,
  listListEmbedCatalogPicksForElementMenu,
  listRemovableListEmbedSlotsForBlock,
  resolveListEmbedTemplateBlockId,
  structureForListEmbedAdd,
} from '@/core/listEmbedElementMenu'
import type { ListEmbedAddBlockChoice } from '@/core/listEmbedElementMenu'
import type { EmbedAddBlockChoice } from '@/core/embedElementMenu'
import {
  buildListPointerAddChoices,
  listListPointerCatalogPicksForElementMenu,
  listRemovableListPointerSlotsForBlock,
  resolveListPointerTemplateBlockId,
  structureForListPointerAdd,
} from '@/core/listPointerElementMenu'
import type { ListPointerAddBlockChoice } from '@/core/listPointerElementMenu'
import {
  buildPointerAddChoices,
  pointerCatalogPicksForElementMenu,
  listRemovablePointerSlotsForBlock,
  resolvePointerTemplateBlockId,
  structureForPointerAdd,
} from '@/core/pointerElementMenu'
import type { PointerAddBlockChoice } from '@/core/pointerElementMenu'
import type {
  ElementViewKey,
  ElementViewMode,
  InternalStructureDefinition,
  NodeInstance,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import {
  elementViewKeyForEmbed,
  elementViewKeyForList2Embed,
  elementViewKeyForList2Pointer,
  elementViewKeyForListEmbed,
  elementViewKeyForListPointer,
  elementViewKeyForParameter,
  elementViewKeyForPointer,
  getElementViewState,
} from '@/core/elementViewState'

import styles from './NodeCard.module.css'

const EMPTY_REMOVAL_ELEMENTS: NodeElementListItem[] = []

function blockViewProps(
  node: NodeInstance,
  elementKey: ElementViewKey,
  onSetElementViewMode?: (elementKey: ElementViewKey, mode: ElementViewMode) => void,
  onSetElementSelectedIndex?: (elementKey: ElementViewKey, index: number) => void,
  onSetElementRetracted?: (elementKey: ElementViewKey, retracted: boolean) => void,
) {
  const state = getElementViewState(node, elementKey)
  return {
    viewMode: state.mode,
    selectedIndex: state.selectedIndex ?? 0,
    retracted: Boolean(state.retracted),
    onExpandFromRetracted: onSetElementRetracted
      ? () => onSetElementRetracted(elementKey, false)
      : undefined,
    onViewModeChange: onSetElementViewMode
      ? (mode: ElementViewMode) => onSetElementViewMode(elementKey, mode)
      : undefined,
    onSelectedIndexChange: onSetElementSelectedIndex
      ? (index: number) => onSetElementSelectedIndex(elementKey, index)
      : undefined,
  }
}

function pointerAddBlocksAsEmbed(blocks: readonly PointerAddBlockChoice[]): EmbedAddBlockChoice[] {
  return blocks.map((block) => ({
    embedId: block.pointerId,
    title: block.title,
    structures: block.structures,
  }))
}

function listPointerAddBlocksAsListEmbed(
  blocks: readonly ListPointerAddBlockChoice[],
): ListEmbedAddBlockChoice[] {
  return blocks.map((block) => ({
    listEmbedId: block.listPointerId,
    title: block.title,
    structures: block.structures,
  }))
}

type NodeCardProps = {
  canvasNodeId: string
  activeOutputInternalStructureId?: string
  connections?: readonly CanvasConnection[]
  canAcceptLink?: boolean
  catalogParameters?: NodeParameterDefinition[]
  /** `module` — raiz do pack; `base` — subpasta pack_Type (corpo Type.json). */
  nodeKind?: 'module' | 'base'
  node: NodeInstance
  onAppendCatalogParameter?: (parameter: NodeParameterDefinition) => void
  onAppendEmbedCatalogItem?: (embedId: string, structure: InternalStructureDefinition) => void
  onAppendPointerCatalogItem?: (pointerId: string, structure: InternalStructureDefinition) => void
  onAppendListEmbedCatalogItem?: (listEmbedId: string, structure: InternalStructureDefinition) => void
  onAppendListPointerCatalogItem?: (listPointerId: string, structure: InternalStructureDefinition) => void
  onAppendList2EmbedCatalogItem?: (list2EmbedId: string, structure: InternalStructureDefinition) => void
  onAppendList2PointerCatalogItem?: (list2PointerId: string, structure: InternalStructureDefinition) => void
  onRemoveList2EmbedInstance?: (list2EmbedId: string, instanceId: string) => void
  onRemoveList2PointerInstance?: (list2PointerId: string, instanceId: string) => void
  /** Schema base (registry) — catálogo LIST_EMBED para o picker «+». */
  templateSchema?: NodeSchemaDefinition | null
  onRequestRemoveElement?: (item: NodeElementListItem) => void
  onInputPortClick?: () => void
  onOutputWireKeyboard?: (structure: InternalStructureDefinition) => void
  onOutputWirePointerCancel?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerDown?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerMove?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerUp?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  /** Grava o valor de um parâmetro deste nó (card editável). */
  onUpdateParameter?: (parameterId: string, value: string) => void
  /** Remove ligações de saída de um slot virtual map[hash,pointer]. */
  onMapHashStructureSlotRemoved?: (slotId: string) => void
  onSetElementViewMode?: (elementKey: ElementViewKey, mode: ElementViewMode) => void
  onSetElementRetracted?: (elementKey: ElementViewKey, retracted: boolean) => void
  onSetElementSelectedIndex?: (elementKey: ElementViewKey, index: number) => void
  onCycleConnectionRouting?: (connectionId: string) => void
  onRemoveConnection?: (connectionId: string) => void
  onWirelessPeerHoverStart?: (peerNodeId: string) => void
  onWirelessPeerHoverEnd?: () => void
  wirelessDisplay?: WirelessNodeDisplay
  wirelessPortPulse?: WirelessPortPulseTarget
  /** Reordena parâmetros no card durante o arrasto pelo nome (índice 1-based). */
  onReorderNodeParameter?: (parameterId: string, oneBasedIndex: number) => void
  parameterHints?: Record<string, string>
  /** Catálogo base do schema (stubs) — usado para resolver parâmetros obrigatórios na remoção. */
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  selected?: boolean
  /** Oculta o corpo do card (parâmetros, estruturas, Element). */
  bodyCollapsed?: boolean
  cardSectionExpanded?: NodeCardSectionExpandedMap
  cardSectionOrder?: readonly NodeCardSectionId[]
  cardBodyLayout?: NodeCardBodyLayout
  onToggleCardSection?: (sectionId: NodeCardSectionId) => void
  /** Reordena secções do card (índice 1-based entre secções visíveis). */
  onReorderNodeCardSection?: (sectionId: NodeCardSectionId, oneBasedIndex: number) => void
  displayTitle?: string
  bodyStyle?: CSSProperties
  cardStyle?: CSSProperties
  inputPortStyle?: CSSProperties
  locked?: boolean
  onLockedInteraction?: () => void
}

function getNodeTooltip(node: NodeInstance) {
  const valueTypes = Array.from(new Set(node.schema.parameters.map((parameter) => parameter.type)))
  const valueSummary = valueTypes.length > 0 ? valueTypes.join(', ') : 'no values'
  const listEmbedCount = node.schema.listEmbed?.length ?? 0

  return `${node.schema.title}: ${node.schema.parameters.length} parameters, ${String(listEmbedCount)} LIST_EMBED, ${valueSummary}`
}

export function NodeCard({
  activeOutputInternalStructureId,
  canvasNodeId,
  connections = [],
  canAcceptLink = false,
  catalogParameters,
  nodeKind = 'module',
  node,
  onAppendCatalogParameter,
  onAppendEmbedCatalogItem,
  onAppendPointerCatalogItem,
  onAppendListEmbedCatalogItem,
  onAppendListPointerCatalogItem,
  onAppendList2EmbedCatalogItem,
  onAppendList2PointerCatalogItem,
  onRemoveList2EmbedInstance,
  onRemoveList2PointerInstance,
  templateSchema = null,
  onRequestRemoveElement,
  onInputPortClick,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  onSelect,
  onStartDrag,
  onUpdateParameter,
  onMapHashStructureSlotRemoved,
  onSetElementViewMode,
  onSetElementRetracted,
  onSetElementSelectedIndex,
  onCycleConnectionRouting,
  onRemoveConnection,
  onWirelessPeerHoverStart,
  onWirelessPeerHoverEnd,
  wirelessDisplay,
  wirelessPortPulse,
  onReorderNodeParameter,
  parameterHints,
  parameterStubCatalog,
  selected = false,
  bodyCollapsed = false,
  cardSectionExpanded,
  cardSectionOrder,
  cardBodyLayout = 'bySectionType',
  onToggleCardSection,
  onReorderNodeCardSection,
  displayTitle,
  bodyStyle,
  cardStyle,
  inputPortStyle,
  locked = false,
  onLockedInteraction,
}: NodeCardProps) {
  const [removalPickerOpen, setRemovalPickerOpen] = useState(false)
  const [removalSelectedKey, setRemovalSelectedKey] = useState<string | null>(null)
  const [embedAddPickerOpen, setEmbedAddPickerOpen] = useState(false)
  const [embedAddTargetBlockId, setEmbedAddTargetBlockId] = useState<string | null>(null)
  const [embedRemoveTargetBlockId, setEmbedRemoveTargetBlockId] = useState<string | null>(null)
  const [listEmbedAddPickerOpen, setListEmbedAddPickerOpen] = useState(false)
  /** Id da instância do bloco LIST_EMBED (não o template). */
  const [listEmbedAddTargetBlockId, setListEmbedAddTargetBlockId] = useState<string | null>(null)
  const [listEmbedRemoveTargetBlockId, setListEmbedRemoveTargetBlockId] = useState<string | null>(null)
  const [pointerAddPickerOpen, setPointerAddPickerOpen] = useState(false)
  const [pointerAddTargetBlockId, setPointerAddTargetBlockId] = useState<string | null>(null)
  const [pointerRemoveTargetBlockId, setPointerRemoveTargetBlockId] = useState<string | null>(null)
  const [listPointerAddPickerOpen, setListPointerAddPickerOpen] = useState(false)
  const [listPointerAddTargetBlockId, setListPointerAddTargetBlockId] = useState<string | null>(null)
  const [listPointerRemoveTargetBlockId, setListPointerRemoveTargetBlockId] = useState<string | null>(null)
  const sectionId = useId()
  const removalPickerTitleId = `${sectionId}-element-removal-title`

  const parameterRowRefs = useRef(new Map<string, HTMLLIElement>())
  const registerParameterRowRef = useCallback((parameterId: string, element: HTMLLIElement | null) => {
    if (element) {
      parameterRowRefs.current.set(parameterId, element)
    } else {
      parameterRowRefs.current.delete(parameterId)
    }
  }, [])

  const nodeRef = useRef(node)
  nodeRef.current = node

  const onReorderRef = useRef(onReorderNodeParameter)
  onReorderRef.current = onReorderNodeParameter

  const dragParameterIdRef = useRef<string | null>(null)
  const [dragParameterId, setDragParameterId] = useState<string | null>(null)

  const handleParameterReorderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      const reorder = onReorderRef.current
      const draggedId = dragParameterIdRef.current
      if (!reorder || !draggedId) {
        return
      }

      const parameters = nodeRef.current.schema.parameters
      const fromIndex = parameters.findIndex((parameter) => parameter.id === draggedId)
      if (fromIndex < 0) {
        return
      }

      let targetIndex = parameters.length - 1
      for (let i = 0; i < parameters.length; i++) {
        const rowElement = parameterRowRefs.current.get(parameters[i].id)
        if (!rowElement) {
          continue
        }
        const rect = rowElement.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (event.clientY < midY) {
          targetIndex = i
          break
        }
      }

      if (targetIndex !== fromIndex) {
        reorder(draggedId, targetIndex + 1)
      }
    },
    [],
  )

  const endParameterReorderDrag = useCallback((event: ReactPointerEvent<HTMLSpanElement>) => {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      /** ignore */
    }
    dragParameterIdRef.current = null
    setDragParameterId(null)
  }, [])

  const beginParameterReorderDrag = useCallback(
    (parameterId: string, event: ReactPointerEvent<HTMLSpanElement>) => {
      if (!onReorderNodeParameter || node.schema.parameters.length < 2) {
        return
      }
      if (event.button !== 0) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
      dragParameterIdRef.current = parameterId
      setDragParameterId(parameterId)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [onReorderNodeParameter, node.schema.parameters.length],
  )

  const getParameterValue = (parameterId: string, fallback: string) => {
    return node.values.find((value) => value.parameterId === parameterId)?.value ?? fallback
  }

  const hasCatalogParameters = Boolean(catalogParameters?.length && onAppendCatalogParameter)
  const embedAddChoices = useMemo(() => buildEmbedAddChoices(node, templateSchema), [node, templateSchema])
  const embedAddPickerBlocks = useMemo(() => {
    if (!embedAddTargetBlockId) {
      return embedAddChoices
    }
    const block = node.schema.embed?.find((entry) => entry.id === embedAddTargetBlockId)
    const templateId = block ? resolveEmbedTemplateBlockId(block) : embedAddTargetBlockId
    return embedAddChoices.filter((choice) => choice.embedId === templateId)
  }, [embedAddChoices, embedAddTargetBlockId, node.schema.embed])

  const embedAddPickerFieldTitle = useMemo(() => {
    if (!embedAddTargetBlockId) {
      return undefined
    }
    return node.schema.embed?.find((entry) => entry.id === embedAddTargetBlockId)?.title
  }, [embedAddTargetBlockId, node.schema.embed])

  const canAddToEmbedBlock = useCallback(
    (blockInstanceId: string) => {
      const block = node.schema.embed?.find((entry) => entry.id === blockInstanceId)
      if (!block || populatedSlotsForEmbed(block).length >= 1) {
        return false
      }
      const templateId = resolveEmbedTemplateBlockId(block)
      return Boolean(
        onAppendEmbedCatalogItem &&
          embedAddChoices.some((choice) => choice.embedId === templateId),
      )
    },
    [embedAddChoices, node.schema.embed, onAppendEmbedCatalogItem],
  )

  const embedRemovalElements = useMemo((): NodeElementListItem[] => {
    if (!embedRemoveTargetBlockId) {
      return EMPTY_REMOVAL_ELEMENTS
    }
    return listRemovableEmbedSlotsForBlock(node, embedRemoveTargetBlockId).map((slot) => ({
      id: slot.id,
      kind: 'embedSlot' as const,
      meta: slot.meta,
      name: slot.name,
      embedId: slot.embedId,
    }))
  }, [embedRemoveTargetBlockId, node])

  const embedRemovalPickerOpen = embedRemoveTargetBlockId !== null

  const canRemoveFromEmbedBlock = useCallback(
    (blockInstanceId: string) =>
      Boolean(
        onRequestRemoveElement &&
          listRemovableEmbedSlotsForBlock(node, blockInstanceId).length > 0,
      ),
    [node, onRequestRemoveElement],
  )

  const hasEmbedElementMenu = Boolean(
    onAppendEmbedCatalogItem && embedCatalogPicksForElementMenu(node, templateSchema).length > 0,
  )

  const pointerAddChoices = useMemo(() => buildPointerAddChoices(node, templateSchema), [node, templateSchema])
  const pointerAddPickerBlocks = useMemo(() => {
    if (!pointerAddTargetBlockId) {
      return pointerAddBlocksAsEmbed(pointerAddChoices)
    }
    const block = node.schema.pointer?.find((entry) => entry.id === pointerAddTargetBlockId)
    const templateId = block ? resolvePointerTemplateBlockId(block) : pointerAddTargetBlockId
    return pointerAddBlocksAsEmbed(
      pointerAddChoices.filter((choice) => choice.pointerId === templateId),
    )
  }, [pointerAddChoices, pointerAddTargetBlockId, node.schema.pointer])

  const pointerAddPickerFieldTitle = useMemo(() => {
    if (!pointerAddTargetBlockId) {
      return undefined
    }
    return node.schema.pointer?.find((entry) => entry.id === pointerAddTargetBlockId)?.title
  }, [pointerAddTargetBlockId, node.schema.pointer])

  const canAddToPointerBlock = useCallback(
    (blockInstanceId: string) => {
      const block = node.schema.pointer?.find((entry) => entry.id === blockInstanceId)
      if (!block || populatedSlotsForPointer(block).length >= 1) {
        return false
      }
      const templateId = resolvePointerTemplateBlockId(block)
      return Boolean(
        onAppendPointerCatalogItem &&
          pointerAddChoices.some((choice) => choice.pointerId === templateId),
      )
    },
    [pointerAddChoices, node.schema.pointer, onAppendPointerCatalogItem],
  )

  const pointerRemovalElements = useMemo((): NodeElementListItem[] => {
    if (!pointerRemoveTargetBlockId) {
      return EMPTY_REMOVAL_ELEMENTS
    }
    return listRemovablePointerSlotsForBlock(node, pointerRemoveTargetBlockId).map((slot) => ({
      id: slot.id,
      kind: 'pointerSlot' as const,
      meta: slot.meta,
      name: slot.name,
      pointerId: slot.pointerId,
    }))
  }, [pointerRemoveTargetBlockId, node])

  const pointerRemovalPickerOpen = pointerRemoveTargetBlockId !== null

  const canRemoveFromPointerBlock = useCallback(
    (blockInstanceId: string) =>
      Boolean(
        onRequestRemoveElement &&
          listRemovablePointerSlotsForBlock(node, blockInstanceId).length > 0,
      ),
    [node, onRequestRemoveElement],
  )

  const hasPointerElementMenu = Boolean(
    onAppendPointerCatalogItem && pointerCatalogPicksForElementMenu(node, templateSchema).length > 0,
  )

  const listEmbedAddChoices = useMemo(
    () => buildListEmbedAddChoices(node, templateSchema),
    [node, templateSchema],
  )
  const listEmbedAddPickerBlocks = useMemo(() => {
    if (!listEmbedAddTargetBlockId) {
      return listEmbedAddChoices
    }
    const block = node.schema.listEmbed?.find((entry) => entry.id === listEmbedAddTargetBlockId)
    const templateId = block ? resolveListEmbedTemplateBlockId(block) : listEmbedAddTargetBlockId
    return listEmbedAddChoices.filter((choice) => choice.listEmbedId === templateId)
  }, [listEmbedAddChoices, listEmbedAddTargetBlockId, node.schema.listEmbed])

  const listEmbedAddPickerInitialTemplateId = useMemo(() => {
    if (!listEmbedAddTargetBlockId) {
      return null
    }
    const block = node.schema.listEmbed?.find((entry) => entry.id === listEmbedAddTargetBlockId)
    return block ? resolveListEmbedTemplateBlockId(block) : null
  }, [listEmbedAddTargetBlockId, node.schema.listEmbed])

  const canAddToListEmbedBlock = useCallback(
    (blockInstanceId: string) => {
      const block = node.schema.listEmbed?.find((entry) => entry.id === blockInstanceId)
      if (!block) {
        return false
      }
      const templateId = resolveListEmbedTemplateBlockId(block)
      return Boolean(
        onAppendListEmbedCatalogItem &&
          listEmbedAddChoices.some((choice) => choice.listEmbedId === templateId),
      )
    },
    [listEmbedAddChoices, node.schema.listEmbed, onAppendListEmbedCatalogItem],
  )

  const listEmbedRemovalElements = useMemo((): NodeElementListItem[] => {
    if (!listEmbedRemoveTargetBlockId) {
      return EMPTY_REMOVAL_ELEMENTS
    }
    return listRemovableListEmbedSlotsForBlock(node, listEmbedRemoveTargetBlockId).map((slot) => ({
      id: slot.id,
      kind: 'listEmbedSlot' as const,
      meta: slot.meta,
      name: slot.name,
      listEmbedId: slot.listEmbedId,
    }))
  }, [listEmbedRemoveTargetBlockId, node])

  const listEmbedRemovalPickerOpen = listEmbedRemoveTargetBlockId !== null

  const canRemoveFromListEmbedBlock = useCallback(
    (blockInstanceId: string) =>
      Boolean(
        onRequestRemoveElement &&
          listRemovableListEmbedSlotsForBlock(node, blockInstanceId).length > 0,
      ),
    [node, onRequestRemoveElement],
  )
  const hasListEmbedElementMenu = Boolean(
    onAppendListEmbedCatalogItem &&
      listListEmbedCatalogPicksForElementMenu(node, templateSchema).length > 0,
  )

  const listPointerAddChoices = useMemo(
    () => buildListPointerAddChoices(node, templateSchema),
    [node, templateSchema],
  )
  const listPointerAddPickerBlocks = useMemo(() => {
    if (!listPointerAddTargetBlockId) {
      return listPointerAddBlocksAsListEmbed(listPointerAddChoices)
    }
    const block = node.schema.listPointer?.find((entry) => entry.id === listPointerAddTargetBlockId)
    const templateId = block ? resolveListPointerTemplateBlockId(block) : listPointerAddTargetBlockId
    return listPointerAddBlocksAsListEmbed(
      listPointerAddChoices.filter((choice) => choice.listPointerId === templateId),
    )
  }, [listPointerAddChoices, listPointerAddTargetBlockId, node.schema.listPointer])

  const listPointerAddPickerInitialTemplateId = useMemo(() => {
    if (!listPointerAddTargetBlockId) {
      return null
    }
    const block = node.schema.listPointer?.find((entry) => entry.id === listPointerAddTargetBlockId)
    return block ? resolveListPointerTemplateBlockId(block) : null
  }, [listPointerAddTargetBlockId, node.schema.listPointer])

  const canAddToListPointerBlock = useCallback(
    (blockInstanceId: string) => {
      const block = node.schema.listPointer?.find((entry) => entry.id === blockInstanceId)
      if (!block) {
        return false
      }
      const templateId = resolveListPointerTemplateBlockId(block)
      return Boolean(
        onAppendListPointerCatalogItem &&
          listPointerAddChoices.some((choice) => choice.listPointerId === templateId),
      )
    },
    [listPointerAddChoices, node.schema.listPointer, onAppendListPointerCatalogItem],
  )

  const listPointerRemovalElements = useMemo((): NodeElementListItem[] => {
    if (!listPointerRemoveTargetBlockId) {
      return EMPTY_REMOVAL_ELEMENTS
    }
    return listRemovableListPointerSlotsForBlock(node, listPointerRemoveTargetBlockId).map((slot) => ({
      id: slot.id,
      kind: 'listPointerSlot' as const,
      meta: slot.meta,
      name: slot.name,
      listPointerId: slot.listPointerId,
    }))
  }, [listPointerRemoveTargetBlockId, node])

  const listPointerRemovalPickerOpen = listPointerRemoveTargetBlockId !== null

  const canRemoveFromListPointerBlock = useCallback(
    (blockInstanceId: string) =>
      Boolean(
        onRequestRemoveElement &&
          listRemovableListPointerSlotsForBlock(node, blockInstanceId).length > 0,
      ),
    [node, onRequestRemoveElement],
  )

  const hasListPointerElementMenu = Boolean(
    onAppendListPointerCatalogItem &&
      listListPointerCatalogPicksForElementMenu(node, templateSchema).length > 0,
  )

  const removables = listRemovableNodeElements(node, parameterStubCatalog, {
    canvasNodeId,
    connections,
  })

  const wirelessPortHandlers = useMemo((): WirelessPortHandlers => ({
    onCycleRouting: onCycleConnectionRouting,
    onRemoveConnection,
    onWirelessPeerHoverStart,
    onWirelessPeerHoverEnd,
  }), [
    onCycleConnectionRouting,
    onRemoveConnection,
    onWirelessPeerHoverStart,
    onWirelessPeerHoverEnd,
  ])

  const wirelessInputLink = toWirelessPortLinkProps(
    wirelessDisplay?.input,
    wirelessPortHandlers,
    wirelessDisplay?.input
      ? isWirelessPortPulsing(wirelessPortPulse, wirelessDisplay.input.connectionId, 'input')
      : false,
  )
  const wirelessOutputLinks = wirelessDisplay?.outputs

  const showElementPicker =
    hasCatalogParameters ||
    hasEmbedElementMenu ||
    hasPointerElementMenu ||
    hasListEmbedElementMenu ||
    hasListPointerElementMenu ||
    removables.length > 0

  const headerTitle = displayTitle ?? node.schema.title

  const isSectionExpanded = useCallback(
    (sectionId: NodeCardSectionId) => resolveNodeCardSectionExpanded(cardSectionExpanded, sectionId),
    [cardSectionExpanded],
  )

  const visibleSectionOrder = useMemo(
    () => resolveNodeCardSectionOrder(cardSectionOrder, node),
    [cardSectionOrder, node.schema.list2Embed?.length, node.schema.list2Pointer?.length],
  )

  const sectionOrderIndex = useMemo(
    () => new Map(visibleSectionOrder.map((id, index) => [id, index] as const)),
    [visibleSectionOrder],
  )

  const sectionRefs = useRef(new Map<NodeCardSectionId, HTMLElement>())
  const registerSectionRef = useCallback((sectionId: NodeCardSectionId, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element)
    } else {
      sectionRefs.current.delete(sectionId)
    }
  }, [])

  const onReorderSectionRef = useRef(onReorderNodeCardSection)
  onReorderSectionRef.current = onReorderNodeCardSection

  const visibleSectionOrderRef = useRef(visibleSectionOrder)
  visibleSectionOrderRef.current = visibleSectionOrder

  const dragSectionIdRef = useRef<NodeCardSectionId | null>(null)
  const [dragSectionId, setDragSectionId] = useState<NodeCardSectionId | null>(null)

  const canReorderSections = Boolean(onReorderNodeCardSection) && visibleSectionOrder.length > 1

  const handleSectionReorderPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const reorder = onReorderSectionRef.current
      const draggedId = dragSectionIdRef.current
      if (!reorder || !draggedId) {
        return
      }

      const order = visibleSectionOrderRef.current
      const fromIndex = order.indexOf(draggedId)
      if (fromIndex < 0) {
        return
      }

      let targetIndex = order.length - 1
      for (let i = 0; i < order.length; i++) {
        const sectionElement = sectionRefs.current.get(order[i]!)
        if (!sectionElement) {
          continue
        }
        const rect = sectionElement.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (event.clientY < midY) {
          targetIndex = i
          break
        }
      }

      if (targetIndex !== fromIndex) {
        reorder(draggedId, targetIndex + 1)
      }
    },
    [],
  )

  const endSectionReorderDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      /** ignore */
    }
    dragSectionIdRef.current = null
    setDragSectionId(null)
  }, [])

  const beginSectionReorderDrag = useCallback(
    (sectionId: NodeCardSectionId, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!onReorderNodeCardSection || visibleSectionOrder.length < 2) {
        return
      }
      if (event.button !== 0) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
      dragSectionIdRef.current = sectionId
      setDragSectionId(sectionId)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [onReorderNodeCardSection, visibleSectionOrder.length],
  )

  const sectionDomSuffix: Record<NodeCardSectionId, string> = {
    parameters: 'parameters',
    embed: 'embed',
    pointer: 'pointer',
    listEmbed: 'list-embed',
    listPointer: 'list-pointer',
    list2Embed: 'list2-embed',
    list2Pointer: 'list2-pointer',
  }

  const sectionCollapsibleProps = useCallback(
    (sectionKey: NodeCardSectionId) => ({
      expanded: isSectionExpanded(sectionKey),
      onToggle: () => onToggleCardSection?.(sectionKey),
      sectionId: `${sectionId}-${sectionDomSuffix[sectionKey]}`,
      title: NODE_CARD_SECTION_LABELS[sectionKey],
      style: { order: sectionOrderIndex.get(sectionKey) ?? 0 } as CSSProperties,
      reorderable: canReorderSections,
      isReorderDragSource: dragSectionId === sectionKey,
      reorderHandlers: canReorderSections
        ? {
            onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
              beginSectionReorderDrag(sectionKey, event),
            onPointerMove: handleSectionReorderPointerMove,
            onPointerUp: endSectionReorderDrag,
            onLostPointerCapture: endSectionReorderDrag,
          }
        : undefined,
      ref: (element: HTMLElement | null) => registerSectionRef(sectionKey, element),
    }),
    [
      beginSectionReorderDrag,
      canReorderSections,
      dragSectionId,
      endSectionReorderDrag,
      handleSectionReorderPointerMove,
      isSectionExpanded,
      onToggleCardSection,
      registerSectionRef,
      sectionId,
      sectionOrderIndex,
    ],
  )

  const handleLockedBodyPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!locked || !onLockedInteraction) {
        return
      }

      if (!isNodeCardBlockedInteractionTarget(event.target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      onLockedInteraction()
    },
    [locked, onLockedInteraction],
  )

  const isCardFreeform = cardBodyLayout === 'freeform'

  const sectionHasContent = (sectionId: NodeCardSectionId): boolean => {
    switch (sectionId) {
      case 'parameters':
        return node.schema.parameters.length > 0
      case 'embed':
        return (node.schema.embed?.length ?? 0) > 0
      case 'pointer':
        return (node.schema.pointer?.length ?? 0) > 0
      case 'listEmbed':
        return (node.schema.listEmbed?.length ?? 0) > 0
      case 'listPointer':
        return (node.schema.listPointer?.length ?? 0) > 0
      case 'list2Embed':
        return (node.schema.list2Embed?.length ?? 0) > 0
      case 'list2Pointer':
        return (node.schema.list2Pointer?.length ?? 0) > 0
      default:
        return false
    }
  }

  const renderSectionPanel = (sectionId: NodeCardSectionId) => {
    switch (sectionId) {
      case 'parameters':
        return (
          <ul className={styles.list}>
            {node.schema.parameters.map((parameter) => {
              const nameReorderHandlers =
                onReorderNodeParameter && node.schema.parameters.length > 1
                  ? {
                      onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) =>
                        beginParameterReorderDrag(parameter.id, event),
                      onPointerMove: handleParameterReorderPointerMove,
                      onPointerUp: endParameterReorderDrag,
                      onLostPointerCapture: endParameterReorderDrag,
                    }
                  : undefined

              const paramViewKey = elementViewKeyForParameter(parameter.id)
              const paramViewState = getElementViewState(node, paramViewKey)

              return (
                <ParameterItem
                  activeOutputInternalStructureId={activeOutputInternalStructureId}
                  canvasNodeId={canvasNodeId}
                  hint={parameterHints?.[parameter.name]}
                  isParameterReorderDragSource={dragParameterId === parameter.id}
                  key={parameter.id}
                  elementViewKey={paramViewKey}
                  viewMode={paramViewState.mode}
                  selectedIndex={paramViewState.selectedIndex ?? 0}
                  retracted={Boolean(paramViewState.retracted)}
                  onExpandFromRetracted={
                    onSetElementRetracted
                      ? () => onSetElementRetracted(paramViewKey, false)
                      : undefined
                  }
                  onElementViewModeChange={
                    onSetElementViewMode
                      ? (mode) => onSetElementViewMode(paramViewKey, mode)
                      : undefined
                  }
                  onElementSelectedIndexChange={
                    onSetElementSelectedIndex
                      ? (index) => onSetElementSelectedIndex(paramViewKey, index)
                      : undefined
                  }
                  interactionLocked={locked}
                  onBlockedInteraction={onLockedInteraction}
                  onCommitValue={
                    onUpdateParameter || locked
                      ? (nextValue) => {
                          if (locked) {
                            onLockedInteraction?.()
                            return
                          }

                          onUpdateParameter?.(parameter.id, nextValue)
                        }
                      : undefined
                  }
                  onOutputWireKeyboard={onOutputWireKeyboard}
                  onOutputWirePointerCancel={onOutputWirePointerCancel}
                  onOutputWirePointerDown={onOutputWirePointerDown}
                  onOutputWirePointerMove={onOutputWirePointerMove}
                  onOutputWirePointerUp={onOutputWirePointerUp}
                  onMapHashStructureSlotRemoved={onMapHashStructureSlotRemoved}
                  wirelessOutputLinks={wirelessOutputLinks}
                  wirelessPortHandlers={wirelessPortHandlers}
                  wirelessPortPulse={wirelessPortPulse}
                  parameter={parameter}
                  parameterNameReorderHandlers={nameReorderHandlers}
                  registerParameterRowRef={(rowElement) => registerParameterRowRef(parameter.id, rowElement)}
                  value={getParameterValue(parameter.id, parameter.defaultValue)}
                />
              )
            })}
          </ul>
        )
      case 'embed':
        return (
          <ul className={styles.list}>
            {(node.schema.embed ?? []).map((embed) => (
              <EmbedItem
                {...blockViewProps(
                  node,
                  elementViewKeyForEmbed(embed.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={canAddToEmbedBlock(embed.id)}
                canRemove={canRemoveFromEmbedBlock(embed.id)}
                canvasNodeId={canvasNodeId}
                embed={embed}
                key={embed.id}
                onAddClick={() => {
                  setEmbedAddTargetBlockId(embed.id)
                  setEmbedAddPickerOpen(true)
                }}
                onRemoveClick={() => setEmbedRemoveTargetBlockId(embed.id)}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
                slots={populatedSlotsForEmbed(embed)}
              />
            ))}
          </ul>
        )
      case 'pointer':
        return (
          <ul className={styles.list}>
            {(node.schema.pointer ?? []).map((pointer) => (
              <PointerItem
                {...blockViewProps(
                  node,
                  elementViewKeyForPointer(pointer.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={canAddToPointerBlock(pointer.id)}
                canRemove={canRemoveFromPointerBlock(pointer.id)}
                canvasNodeId={canvasNodeId}
                key={pointer.id}
                onAddClick={() => {
                  setPointerAddTargetBlockId(pointer.id)
                  setPointerAddPickerOpen(true)
                }}
                onRemoveClick={() => setPointerRemoveTargetBlockId(pointer.id)}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
                pointer={pointer}
                slots={populatedSlotsForPointer(pointer)}
              />
            ))}
          </ul>
        )
      case 'listEmbed':
        return (
          <ul className={styles.list}>
            {(node.schema.listEmbed ?? []).map((listEmbed) => (
              <ListEmbedItem
                {...blockViewProps(
                  node,
                  elementViewKeyForListEmbed(listEmbed.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={canAddToListEmbedBlock(listEmbed.id)}
                canRemove={canRemoveFromListEmbedBlock(listEmbed.id)}
                canvasNodeId={canvasNodeId}
                key={listEmbed.id}
                listEmbed={listEmbed}
                onAddClick={() => {
                  setListEmbedAddTargetBlockId(listEmbed.id)
                  setListEmbedAddPickerOpen(true)
                }}
                onRemoveClick={() => setListEmbedRemoveTargetBlockId(listEmbed.id)}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
                slots={populatedSlotsForListEmbed(listEmbed)}
              />
            ))}
          </ul>
        )
      case 'listPointer':
        return (
          <ul className={styles.list}>
            {(node.schema.listPointer ?? []).map((listPointer) => (
              <ListPointerItem
                {...blockViewProps(
                  node,
                  elementViewKeyForListPointer(listPointer.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={canAddToListPointerBlock(listPointer.id)}
                canRemove={canRemoveFromListPointerBlock(listPointer.id)}
                canvasNodeId={canvasNodeId}
                key={listPointer.id}
                listPointer={listPointer}
                onAddClick={() => {
                  setListPointerAddTargetBlockId(listPointer.id)
                  setListPointerAddPickerOpen(true)
                }}
                onRemoveClick={() => setListPointerRemoveTargetBlockId(listPointer.id)}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
                slots={populatedSlotsForListPointer(listPointer)}
              />
            ))}
          </ul>
        )
      case 'list2Embed':
        if ((node.schema.list2Embed?.length ?? 0) === 0) {
          return null
        }
        return (
          <ul className={styles.list}>
            {(node.schema.list2Embed ?? []).map((list2Embed) => (
              <List2EmbedItem
                {...blockViewProps(
                  node,
                  elementViewKeyForList2Embed(list2Embed.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={Boolean(onAppendList2EmbedCatalogItem) && list2Embed.internalStructures.length > 0}
                canRemove={(list2Embed.instances?.length ?? 0) > 0}
                canvasNodeId={canvasNodeId}
                key={list2Embed.id}
                list2Embed={list2Embed}
                onAddClick={() => {
                  const first = list2Embed.internalStructures[0]
                  if (first && onAppendList2EmbedCatalogItem) {
                    onAppendList2EmbedCatalogItem(list2Embed.id, first)
                  }
                }}
                onRemoveClick={() => {
                  const last = list2Embed.instances.at(-1)
                  if (last && onRemoveList2EmbedInstance) {
                    onRemoveList2EmbedInstance(list2Embed.id, last.id)
                  }
                }}
                onRemoveInstanceClick={(instanceId) =>
                  onRemoveList2EmbedInstance?.(list2Embed.id, instanceId)
                }
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
              />
            ))}
          </ul>
        )
      case 'list2Pointer':
        if ((node.schema.list2Pointer?.length ?? 0) === 0) {
          return null
        }
        return (
          <ul className={styles.list}>
            {(node.schema.list2Pointer ?? []).map((list2Pointer) => (
              <List2PointerItem
                {...blockViewProps(
                  node,
                  elementViewKeyForList2Pointer(list2Pointer.id),
                  onSetElementViewMode,
                  onSetElementSelectedIndex,
                  onSetElementRetracted,
                )}
                activeSlotId={activeOutputInternalStructureId}
                canAdd={Boolean(onAppendList2PointerCatalogItem) && list2Pointer.internalStructures.length > 0}
                canRemove={(list2Pointer.instances?.length ?? 0) > 0}
                canvasNodeId={canvasNodeId}
                key={list2Pointer.id}
                list2Pointer={list2Pointer}
                onAddClick={() => {
                  const first = list2Pointer.internalStructures[0]
                  if (first && onAppendList2PointerCatalogItem) {
                    onAppendList2PointerCatalogItem(list2Pointer.id, first)
                  }
                }}
                onRemoveClick={() => {
                  const last = list2Pointer.instances.at(-1)
                  if (last && onRemoveList2PointerInstance) {
                    onRemoveList2PointerInstance(list2Pointer.id, last.id)
                  }
                }}
                onRemoveInstanceClick={(instanceId) =>
                  onRemoveList2PointerInstance?.(list2Pointer.id, instanceId)
                }
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
                wirelessOutputLinks={wirelessOutputLinks}
                wirelessPortHandlers={wirelessPortHandlers}
                wirelessPortPulse={wirelessPortPulse}
              />
            ))}
          </ul>
        )
      default:
        return null
    }
  }

  const sectionPanels = isCardFreeform ? (
    <div className={styles.bodyFreeform}>
      {visibleSectionOrder.map((sectionId) => {
        if (!sectionHasContent(sectionId)) {
          return null
        }
        const panel = renderSectionPanel(sectionId)
        if (!panel) {
          return null
        }
        return (
          <div className={styles.freeformGroup} key={sectionId}>
            {panel}
          </div>
        )
      })}
    </div>
  ) : (
    visibleSectionOrder.map((sectionId) => {
      const panel = renderSectionPanel(sectionId)
      if (!panel) {
        return null
      }
      return (
        <NodeCardCollapsibleSection key={sectionId} {...sectionCollapsibleProps(sectionId)}>
          {panel}
        </NodeCardCollapsibleSection>
      )
    })
  )

  return (
    <article className={styles.card} aria-label={`${headerTitle} node`} style={cardStyle}>
      <NodeHeader
        canvasNodeId={canvasNodeId}
        canAcceptLink={canAcceptLink}
        infoTooltip={getNodeTooltip(node)}
        inputPortStyle={inputPortStyle}
        locked={locked}
        onInputPortClick={onInputPortClick}
        onSelect={onSelect}
        onStartDrag={onStartDrag}
        selected={selected}
        title={headerTitle}
        wirelessLink={wirelessInputLink}
      />
      <div
        className={[
          styles.body,
          isCardFreeform ? styles.bodyFreeformActive : '',
          bodyCollapsed ? styles.bodyCollapsed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDownCapture={handleLockedBodyPointerDown}
        style={bodyStyle}
      >
        {sectionPanels}

        <div className={styles.bodyFooter}>
        <ElementMenu
          catalogParameters={catalogParameters}
          disabled={false}
          hasCatalogParameters={Boolean(hasCatalogParameters)}
          node={node}
          nodeKind={nodeKind}
          onAppendCatalogParameter={onAppendCatalogParameter}
          onAppendEmbedCatalogItem={onAppendEmbedCatalogItem}
          onAppendPointerCatalogItem={onAppendPointerCatalogItem}
          onAppendListEmbedCatalogItem={onAppendListEmbedCatalogItem}
          onAppendListPointerCatalogItem={onAppendListPointerCatalogItem}
          onRemoveElement={
            onRequestRemoveElement && removables.length > 0
              ? () => setRemovalPickerOpen(true)
              : undefined
          }
          parameterStubCatalog={parameterStubCatalog}
          showPicker={showElementPicker}
        />
        </div>

        {removalPickerOpen ? (
          <ElementRemovalPicker
            elements={removables}
            nodeTitle={node.schema.title}
            onClose={() => {
              setRemovalPickerOpen(false)
              setRemovalSelectedKey(null)
            }}
            onConfirm={(item) => {
              setRemovalPickerOpen(false)
              setRemovalSelectedKey(null)
              onRequestRemoveElement?.(item)
            }}
            onSelectKey={setRemovalSelectedKey}
            open
            selectedKey={removalSelectedKey}
            titleDomId={removalPickerTitleId}
          />
        ) : null}

        {listEmbedRemovalPickerOpen ? (
          <ElementRemovalPicker
            confirmLabel="Remover"
            dialogSubtitle={
              listEmbedRemoveTargetBlockId ? (
                <>
                  Escolha a estrutura a remover de{' '}
                  <strong>
                    {node.schema.listEmbed?.find((b) => b.id === listEmbedRemoveTargetBlockId)?.title ??
                      listEmbedRemoveTargetBlockId}
                  </strong>
                  .
                </>
              ) : undefined
            }
            dialogTitle="Remover estrutura interna"
            elements={listEmbedRemovalElements}
            nodeTitle={node.schema.title}
            onClose={() => {
              setListEmbedRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
            }}
            onConfirm={(item) => {
              setListEmbedRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
              onRequestRemoveElement?.(item)
            }}
            onSelectKey={setRemovalSelectedKey}
            open
            selectedKey={removalSelectedKey}
            titleDomId={`${sectionId}-list-embed-remove-title`}
          />
        ) : null}

        {embedRemovalPickerOpen ? (
          <ElementRemovalPicker
            confirmLabel="Remover"
            dialogSubtitle={
              embedRemoveTargetBlockId ? (
                <>
                  Escolha a estrutura a remover de{' '}
                  <strong>
                    {node.schema.embed?.find((b) => b.id === embedRemoveTargetBlockId)?.title ??
                      embedRemoveTargetBlockId}
                  </strong>
                  .
                </>
              ) : undefined
            }
            dialogTitle="Remover estrutura interna"
            elements={embedRemovalElements}
            nodeTitle={node.schema.title}
            onClose={() => {
              setEmbedRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
            }}
            onConfirm={(item) => {
              setEmbedRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
              onRequestRemoveElement?.(item)
            }}
            onSelectKey={setRemovalSelectedKey}
            open
            selectedKey={removalSelectedKey}
            titleDomId={`${sectionId}-embed-remove-title`}
          />
        ) : null}

        <EmbedAddPicker
          blocks={embedAddPickerBlocks}
          embedFieldTitle={embedAddPickerFieldTitle}
          nodeTitle={node.schema.title}
          onClose={() => {
            setEmbedAddPickerOpen(false)
            setEmbedAddTargetBlockId(null)
          }}
          onConfirm={(choice) => {
            if (!embedAddTargetBlockId) {
              return
            }
            onAppendEmbedCatalogItem?.(embedAddTargetBlockId, structureForEmbedAdd(choice.structure))
          }}
          open={embedAddPickerOpen}
          titleDomId={`${sectionId}-embed-add-title`}
        />

        <ListEmbedAddPicker
          blocks={listEmbedAddPickerBlocks}
          initialListEmbedId={listEmbedAddPickerInitialTemplateId}
          nodeTitle={node.schema.title}
          onClose={() => {
            setListEmbedAddPickerOpen(false)
            setListEmbedAddTargetBlockId(null)
          }}
          onConfirm={(_templateListEmbedId, choice) => {
            if (!listEmbedAddTargetBlockId) {
              return
            }
            onAppendListEmbedCatalogItem?.(
              listEmbedAddTargetBlockId,
              structureForListEmbedAdd(choice.structure),
            )
          }}
          open={listEmbedAddPickerOpen}
          titleDomId={`${sectionId}-list-embed-add-title`}
        />

        {pointerRemovalPickerOpen ? (
          <ElementRemovalPicker
            confirmLabel="Remover"
            dialogSubtitle={
              pointerRemoveTargetBlockId ? (
                <>
                  Escolha a estrutura a remover de{' '}
                  <strong>
                    {node.schema.pointer?.find((b) => b.id === pointerRemoveTargetBlockId)?.title ??
                      pointerRemoveTargetBlockId}
                  </strong>
                  .
                </>
              ) : undefined
            }
            dialogTitle="Remover estrutura interna"
            elements={pointerRemovalElements}
            nodeTitle={node.schema.title}
            onClose={() => {
              setPointerRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
            }}
            onConfirm={(item) => {
              setPointerRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
              onRequestRemoveElement?.(item)
            }}
            onSelectKey={setRemovalSelectedKey}
            open
            selectedKey={removalSelectedKey}
            titleDomId={`${sectionId}-pointer-remove-title`}
          />
        ) : null}

        {listPointerRemovalPickerOpen ? (
          <ElementRemovalPicker
            confirmLabel="Remover"
            dialogSubtitle={
              listPointerRemoveTargetBlockId ? (
                <>
                  Escolha a estrutura a remover de{' '}
                  <strong>
                    {node.schema.listPointer?.find((b) => b.id === listPointerRemoveTargetBlockId)
                      ?.title ?? listPointerRemoveTargetBlockId}
                  </strong>
                  .
                </>
              ) : undefined
            }
            dialogTitle="Remover estrutura interna"
            elements={listPointerRemovalElements}
            nodeTitle={node.schema.title}
            onClose={() => {
              setListPointerRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
            }}
            onConfirm={(item) => {
              setListPointerRemoveTargetBlockId(null)
              setRemovalSelectedKey(null)
              onRequestRemoveElement?.(item)
            }}
            onSelectKey={setRemovalSelectedKey}
            open
            selectedKey={removalSelectedKey}
            titleDomId={`${sectionId}-list-pointer-remove-title`}
          />
        ) : null}

        <EmbedAddPicker
          blocks={pointerAddPickerBlocks}
          embedFieldTitle={pointerAddPickerFieldTitle}
          nodeTitle={node.schema.title}
          onClose={() => {
            setPointerAddPickerOpen(false)
            setPointerAddTargetBlockId(null)
          }}
          onConfirm={(choice) => {
            if (!pointerAddTargetBlockId) {
              return
            }
            onAppendPointerCatalogItem?.(
              pointerAddTargetBlockId,
              structureForPointerAdd(choice.structure),
            )
          }}
          open={pointerAddPickerOpen}
          titleDomId={`${sectionId}-pointer-add-title`}
        />

        <ListEmbedAddPicker
          blocks={listPointerAddPickerBlocks}
          initialListEmbedId={listPointerAddPickerInitialTemplateId}
          nodeTitle={node.schema.title}
          onClose={() => {
            setListPointerAddPickerOpen(false)
            setListPointerAddTargetBlockId(null)
          }}
          onConfirm={(_templateListPointerId, choice) => {
            if (!listPointerAddTargetBlockId) {
              return
            }
            onAppendListPointerCatalogItem?.(
              listPointerAddTargetBlockId,
              structureForListPointerAdd(choice.structure),
            )
          }}
          open={listPointerAddPickerOpen}
          titleDomId={`${sectionId}-list-pointer-add-title`}
        />

      </div>
    </article>
  )
}
