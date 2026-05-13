import { useEffect, useId, useRef, useState } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from 'react'

import { Button } from '@/components/atoms/Button'
import { InternalStructureItem } from '@/components/molecules/InternalStructureItem'
import { NodeHeader } from '@/components/molecules/NodeHeader'
import { ParameterItem } from '@/components/molecules/ParameterItem'
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
  onInputPortClick,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  onSelect,
  onStartDrag,
  parameterHints,
  selected = false,
}: NodeCardProps) {
  const elementSelectorRef = useRef<HTMLDetailsElement>(null)
  const [isElementSelectorOpen, setIsElementSelectorOpen] = useState(false)
  const sectionId = useId()

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

  useEffect(() => {
    if (!isElementSelectorOpen) {
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node

      if (!elementSelectorRef.current?.contains(target)) {
        setIsElementSelectorOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsElementSelectorOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isElementSelectorOpen])

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
            {node.schema.parameters.map((parameter) => (
              <ParameterItem
                hint={parameterHints?.[parameter.name]}
                key={parameter.id}
                parameter={parameter}
                value={getParameterValue(parameter.id, parameter.defaultValue)}
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

        {isModule ? (
          <Button
            disabled
            title="Nó módulo: catálogo dinâmico (+ Elemento) será activado numa fase futura."
            type="button"
          >
            + Elemento
          </Button>
        ) : showElementPicker ? (
          <details className={styles.elementSelector} open={isElementSelectorOpen} ref={elementSelectorRef}>
            <summary
              onClick={(clickEvent) => {
                clickEvent.preventDefault()
                setIsElementSelectorOpen((openState) => !openState)
              }}
            >
              + Elemento
            </summary>
            <div className={styles.elementMenu}>
              {node.schema.internalStructures.map((structure) => (
                <button
                  key={structure.id}
                  onClick={() => {
                    onCreateElement?.(structure)
                    setIsElementSelectorOpen(false)
                  }}
                  type="button"
                >
                  <span>{structure.name}</span>
                  <small>{structure.schemaId}</small>
                </button>
              ))}

              {hasCatalogStructures
                ? catalogInternalStructures?.map((structure) => (
                    <button
                      key={`catalog-is:${structure.schemaId}:${structure.name}`}
                      onClick={() => {
                        onAppendCatalogInternalStructure?.(structure)
                        setIsElementSelectorOpen(false)
                      }}
                      type="button"
                    >
                      <span>{structure.name}</span>
                      <small>Internal_Structure · {structure.schemaId}</small>
                    </button>
                  ))
                : null}

              {hasCatalogParameters
                ? catalogParameters?.map((parameter) => (
                    <button
                      key={`catalog-param:${parameter.type}:${parameter.name}:${parameter.defaultValue}`}
                      onClick={() => {
                        onAppendCatalogParameter?.(parameter)
                        setIsElementSelectorOpen(false)
                      }}
                      type="button"
                    >
                      <span>{parameter.name}</span>
                      <small>novo parâmetro · {parameter.type}</small>
                    </button>
                  ))
                : null}
            </div>
          </details>
        ) : (
          <Button disabled title="Não há parâmetros nem Internal_Structures disponíveis para acrescentar.">
            + Elemento
          </Button>
        )}
      </div>
    </article>
  )
}
