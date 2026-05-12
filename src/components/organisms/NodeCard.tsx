import { useEffect, useId, useRef, useState } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
} from 'react'

import { Button } from '@/components/atoms/Button'
import { EntityItem } from '@/components/molecules/EntityItem'
import { NodeHeader } from '@/components/molecules/NodeHeader'
import { ParameterItem } from '@/components/molecules/ParameterItem'
import type { NodeEntityDefinition, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './NodeCard.module.css'

type NodeCardProps = {
  canvasNodeId: string
  activeOutputEntityId?: string
  canAcceptLink?: boolean
  catalogEntities?: NodeEntityDefinition[]
  catalogParameters?: NodeParameterDefinition[]
  node: NodeInstance
  onAppendCatalogEntity?: (entity: NodeEntityDefinition) => void
  onAppendCatalogParameter?: (parameter: NodeParameterDefinition) => void
  onCreateElement?: (entity: NodeEntityDefinition) => void
  onInputPortClick?: () => void
  onOutputWireKeyboard?: (entity: NodeEntityDefinition) => void
  onOutputWirePointerCancel?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerDown?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerMove?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerUp?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  parameterHints?: Record<string, string>
  selected?: boolean
}

function getNodeTooltip(node: NodeInstance) {
  const valueTypes = Array.from(new Set(node.schema.parameters.map((parameter) => parameter.type)))
  const valueSummary = valueTypes.length > 0 ? valueTypes.join(', ') : 'no values'

  return `${node.schema.title}: ${node.schema.parameters.length} parameters, ${node.schema.entities.length} entities, ${valueSummary}`
}

export function NodeCard({
  activeOutputEntityId,
  canvasNodeId,
  canAcceptLink = false,
  catalogEntities,
  catalogParameters,
  node,
  onAppendCatalogEntity,
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

  const presetEntityCount = node.schema.entities.length
  const hasCatalogEntities = Boolean(catalogEntities?.length && onAppendCatalogEntity)
  const hasCatalogParameters = Boolean(catalogParameters?.length && onAppendCatalogParameter)
  const showElementPicker = presetEntityCount > 0 || hasCatalogEntities || hasCatalogParameters

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

        <section className={styles.section} aria-labelledby={`${sectionId}-entities`}>
          <h3 className={styles.sectionTitle} id={`${sectionId}-entities`}>
            Entities
          </h3>
          <ul className={styles.list}>
            {node.schema.entities.map((entity) => (
              <EntityItem
                active={entity.id === activeOutputEntityId}
                canvasNodeId={canvasNodeId}
                entity={entity}
                key={entity.id}
                onOutputWireKeyboard={onOutputWireKeyboard}
                onOutputWirePointerCancel={onOutputWirePointerCancel}
                onOutputWirePointerDown={onOutputWirePointerDown}
                onOutputWirePointerMove={onOutputWirePointerMove}
                onOutputWirePointerUp={onOutputWirePointerUp}
              />
            ))}
          </ul>
        </section>

        {showElementPicker ? (
          <details className={styles.elementSelector} open={isElementSelectorOpen} ref={elementSelectorRef}>
            <summary
              onClick={(clickEvent) => {
                clickEvent.preventDefault()
                setIsElementSelectorOpen((openState) => !openState)
              }}
            >
              + Element
            </summary>
            <div className={styles.elementMenu}>
              {node.schema.entities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => {
                    onCreateElement?.(entity)
                    setIsElementSelectorOpen(false)
                  }}
                  type="button"
                >
                  <span>{entity.name}</span>
                  <small>{entity.schemaId}</small>
                </button>
              ))}

              {hasCatalogEntities
                ? catalogEntities?.map((entity) => (
                    <button
                      key={`catalog-entity:${entity.schemaId}:${entity.name}`}
                      onClick={() => {
                        onAppendCatalogEntity?.(entity)
                        setIsElementSelectorOpen(false)
                      }}
                      type="button"
                    >
                      <span>{entity.name}</span>
                      <small>nova entidade ({entity.schemaId})</small>
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
          <Button disabled>+ Element</Button>
        )}
      </div>
    </article>
  )
}
