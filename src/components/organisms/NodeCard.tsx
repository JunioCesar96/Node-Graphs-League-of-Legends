import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from 'react'

import { ElementMenu } from '@/components/molecules/ElementMenu'
import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import { InternalStructureItem } from '@/components/molecules/InternalStructureItem'
import { ListEmbedAddPicker } from '@/components/molecules/ListEmbedAddPicker'
import { ListEmbedItem } from '@/components/molecules/ListEmbedItem'
import { NodeHeader } from '@/components/molecules/NodeHeader'
import { ParameterItem } from '@/components/molecules/ParameterItem'
import type { CanvasConnection } from '@/core/canvasScene'
import { populatedSlotsForListEmbed } from '@/core/listEmbedSlots'
import { listRemovableNodeElements, type NodeElementListItem } from '@/core/listNodeElements'
import {
  buildListEmbedAddChoices,
  listListEmbedCatalogPicksForElementMenu,
  listRemovableListEmbedSlotsForBlock,
  resolveListEmbedTemplateBlockId,
  structureForListEmbedAdd,
} from '@/core/listEmbedElementMenu'
import type {
  InternalStructureDefinition,
  NodeInstance,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'

import styles from './NodeCard.module.css'

type NodeCardProps = {
  canvasNodeId: string
  activeOutputInternalStructureId?: string
  connections?: readonly CanvasConnection[]
  canAcceptLink?: boolean
  catalogInternalStructures?: InternalStructureDefinition[]
  catalogParameters?: NodeParameterDefinition[]
  /** `module` — raiz do pack; `base` — subpasta pack_Type (corpo Type.json). */
  nodeKind?: 'module' | 'base'
  node: NodeInstance
  onAppendCatalogInternalStructure?: (structure: InternalStructureDefinition) => void
  onAppendCatalogParameter?: (parameter: NodeParameterDefinition) => void
  onAppendListEmbedCatalogItem?: (listEmbedId: string, structure: InternalStructureDefinition) => void
  /** Schema base (registry) — catálogo LIST_EMBED para o picker «+». */
  templateSchema?: NodeSchemaDefinition | null
  onCreateElement?: (structure: InternalStructureDefinition) => void
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
  /** Reordena parâmetros no card durante o arrasto pelo nome (índice 1-based). */
  onReorderNodeParameter?: (parameterId: string, oneBasedIndex: number) => void
  parameterHints?: Record<string, string>
  /** Catálogo base do schema (stubs) — usado para resolver parâmetros obrigatórios na remoção. */
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  selected?: boolean
}

function getNodeTooltip(node: NodeInstance) {
  const valueTypes = Array.from(new Set(node.schema.parameters.map((parameter) => parameter.type)))
  const valueSummary = valueTypes.length > 0 ? valueTypes.join(', ') : 'no values'
  const listEmbedCount = node.schema.listEmbed?.length ?? 0

  return `${node.schema.title}: ${node.schema.parameters.length} parameters, ${String(listEmbedCount)} LIST_EMBED, ${node.schema.internalStructures.length} Internal_Structures, ${valueSummary}`
}

export function NodeCard({
  activeOutputInternalStructureId,
  canvasNodeId,
  connections = [],
  canAcceptLink = false,
  catalogInternalStructures,
  catalogParameters,
  nodeKind = 'module',
  node,
  onAppendCatalogInternalStructure,
  onAppendCatalogParameter,
  onAppendListEmbedCatalogItem,
  templateSchema = null,
  onCreateElement,
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
  onReorderNodeParameter,
  parameterHints,
  parameterStubCatalog,
  selected = false,
}: NodeCardProps) {
  const [removalPickerOpen, setRemovalPickerOpen] = useState(false)
  const [removalSelectedKey, setRemovalSelectedKey] = useState<string | null>(null)
  const [listEmbedAddPickerOpen, setListEmbedAddPickerOpen] = useState(false)
  /** Id da instância do bloco LIST_EMBED (não o template). */
  const [listEmbedAddTargetBlockId, setListEmbedAddTargetBlockId] = useState<string | null>(null)
  const [listEmbedRemoveTargetBlockId, setListEmbedRemoveTargetBlockId] = useState<string | null>(null)
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

  const presetStructureCount = node.schema.internalStructures.length
  const isModule = nodeKind === 'module'
  const hasCatalogStructures = Boolean(
    catalogInternalStructures?.length && onAppendCatalogInternalStructure,
  )
  const hasCatalogParameters = Boolean(catalogParameters?.length && onAppendCatalogParameter)
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
      return []
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

  const removables = listRemovableNodeElements(node, parameterStubCatalog, {
    canvasNodeId,
    connections,
  })

  const showElementPicker =
    presetStructureCount > 0 ||
    hasCatalogStructures ||
    hasCatalogParameters ||
    hasListEmbedElementMenu ||
    removables.length > 0 ||
    isModule

  useEffect(() => {
    if (!removalPickerOpen) {
      setRemovalSelectedKey(null)
    }
  }, [removalPickerOpen])

  useEffect(() => {
    if (!listEmbedRemovalPickerOpen) {
      setRemovalSelectedKey(null)
    }
  }, [listEmbedRemovalPickerOpen])

  return (
    <article className={styles.card} aria-label={`${node.schema.title} node`}>
      <NodeHeader
        canvasNodeId={canvasNodeId}
        canAcceptLink={canAcceptLink}
        infoTooltip={getNodeTooltip(node)}
        onInputPortClick={onInputPortClick}
        onSelect={onSelect}
        onStartDrag={onStartDrag}
        selected={selected}
        title={node.schema.title}
      />
      <div className={styles.body}>
        <section className={styles.section} aria-labelledby={`${sectionId}-parameters`}>
          <h3 className={styles.sectionTitle} id={`${sectionId}-parameters`}>
            Parameters
          </h3>
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

              return (
                <ParameterItem
                  hint={parameterHints?.[parameter.name]}
                  isParameterReorderDragSource={dragParameterId === parameter.id}
                  key={parameter.id}
                  onCommitValue={
                    onUpdateParameter
                      ? (nextValue) => onUpdateParameter(parameter.id, nextValue)
                      : undefined
                  }
                  parameter={parameter}
                  parameterNameReorderHandlers={nameReorderHandlers}
                  registerParameterRowRef={(rowElement) => registerParameterRowRef(parameter.id, rowElement)}
                  value={getParameterValue(parameter.id, parameter.defaultValue)}
                />
              )
            })}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby={`${sectionId}-list-embed`}>
          <h3 className={styles.sectionTitle} id={`${sectionId}-list-embed`}>
            LIST_EMBED
          </h3>
          <ul className={styles.list}>
            {(node.schema.listEmbed ?? []).map((listEmbed) => (
              <ListEmbedItem
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
                slots={populatedSlotsForListEmbed(listEmbed)}
              />
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby={`${sectionId}-internal-structures`}>
          <h3 className={styles.sectionTitle} id={`${sectionId}-internal-structures`}>
            Internal_Structures
          </h3>
          <ul className={styles.list}>
            {node.schema.internalStructures.map((structure) => (
              <InternalStructureItem
                active={structure.id === activeOutputInternalStructureId}
                canvasNodeId={canvasNodeId}
                key={structure.id}
                structure={structure}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
              />
            ))}
          </ul>
        </section>

        <ElementMenu
          catalogInternalStructures={catalogInternalStructures}
          catalogParameters={catalogParameters}
          disabled={false}
          hasCatalogParameters={Boolean(hasCatalogParameters)}
          hasCatalogStructures={Boolean(hasCatalogStructures)}
          node={node}
          nodeKind={nodeKind}
          onAppendCatalogInternalStructure={onAppendCatalogInternalStructure}
          onAppendCatalogParameter={onAppendCatalogParameter}
          onAppendListEmbedCatalogItem={onAppendListEmbedCatalogItem}
          onCreateElement={onCreateElement}
          onRemoveElement={
            onRequestRemoveElement && removables.length > 0
              ? () => setRemovalPickerOpen(true)
              : undefined
          }
          parameterStubCatalog={parameterStubCatalog}
          showPicker={showElementPicker}
        />

        <ElementRemovalPicker
          elements={removables}
          nodeTitle={node.schema.title}
          onClose={() => setRemovalPickerOpen(false)}
          onConfirm={(item) => {
            setRemovalPickerOpen(false)
            onRequestRemoveElement?.(item)
          }}
          onSelectKey={setRemovalSelectedKey}
          open={removalPickerOpen}
          selectedKey={removalPickerOpen ? removalSelectedKey : null}
          titleDomId={removalPickerTitleId}
        />

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
          onClose={() => setListEmbedRemoveTargetBlockId(null)}
          onConfirm={(item) => {
            setListEmbedRemoveTargetBlockId(null)
            onRequestRemoveElement?.(item)
          }}
          onSelectKey={setRemovalSelectedKey}
          open={listEmbedRemovalPickerOpen}
          selectedKey={listEmbedRemovalPickerOpen ? removalSelectedKey : null}
          titleDomId={`${sectionId}-list-embed-remove-title`}
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

      </div>
    </article>
  )
}
