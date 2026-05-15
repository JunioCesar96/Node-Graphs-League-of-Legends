import { useId, useRef, useState, useCallback } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from 'react'

import { ElementMenu } from '@/components/molecules/ElementMenu'
import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import { InternalStructureItem } from '@/components/molecules/InternalStructureItem'
import { NodeHeader } from '@/components/molecules/NodeHeader'
import { ParameterItem } from '@/components/molecules/ParameterItem'
import { listNodeElements, type NodeElementListItem } from '@/core/listNodeElements'
import type { InternalStructureDefinition, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './NodeCard.module.css'

type NodeCardProps = {
  canvasNodeId: string
  activeOutputInternalStructureId?: string
  canAcceptLink?: boolean
  catalogInternalStructures?: InternalStructureDefinition[]
  catalogParameters?: NodeParameterDefinition[]
  /** `module` — raiz do pack; `base` — subpasta pack_Type (corpo Type.json). */
  nodeKind?: 'module' | 'base'
  node: NodeInstance
  onAppendCatalogInternalStructure?: (structure: InternalStructureDefinition) => void
  onAppendCatalogParameter?: (parameter: NodeParameterDefinition) => void
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
  selected?: boolean
}

function getNodeTooltip(node: NodeInstance) {
  const valueTypes = Array.from(new Set(node.schema.parameters.map((parameter) => parameter.type)))
  const valueSummary = valueTypes.length > 0 ? valueTypes.join(', ') : 'no values'

  return `${node.schema.title}: ${node.schema.parameters.length} parameters, ${node.schema.internalStructures.length} Internal_Structures, ${valueSummary}`
}

export function NodeCard({
  activeOutputInternalStructureId,
  canvasNodeId,
  canAcceptLink = false,
  catalogInternalStructures,
  catalogParameters,
  nodeKind = 'module',
  node,
  onAppendCatalogInternalStructure,
  onAppendCatalogParameter,
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
  selected = false,
}: NodeCardProps) {
  const [removalPickerOpen, setRemovalPickerOpen] = useState(false)
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
    !isModule && catalogInternalStructures?.length && onAppendCatalogInternalStructure,
  )
  const hasCatalogParameters = Boolean(!isModule && catalogParameters?.length && onAppendCatalogParameter)
  const showElementPicker =
    !isModule && (presetStructureCount > 0 || hasCatalogStructures || hasCatalogParameters)

  const removables = listNodeElements(node)

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
          disabled={isModule}
          disabledTitle="Nó módulo: catálogo dinâmico (Element) será activado numa fase futura."
          hasCatalogParameters={Boolean(hasCatalogParameters)}
          hasCatalogStructures={Boolean(hasCatalogStructures)}
          node={node}
          onAppendCatalogInternalStructure={onAppendCatalogInternalStructure}
          onAppendCatalogParameter={onAppendCatalogParameter}
          onCreateElement={onCreateElement}
          onRemoveElement={
            onRequestRemoveElement && removables.length > 0
              ? () => setRemovalPickerOpen(true)
              : undefined
          }
          showPicker={showElementPicker}
        />

        <ElementRemovalPicker
          elements={removables}
          nodeTitle={node.schema.title}
          onClose={() => setRemovalPickerOpen(false)}
          onPick={(item) => {
            setRemovalPickerOpen(false)
            onRequestRemoveElement?.(item)
          }}
          open={removalPickerOpen}
          titleDomId={removalPickerTitleId}
        />

      </div>
    </article>
  )
}
