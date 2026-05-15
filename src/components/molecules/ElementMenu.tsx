import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/atoms/Button'
import type { InternalStructureDefinition, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import { listNodeElements } from '@/core/listNodeElements'

import styles from './ElementMenu.module.css'

type ElementMenuProps = {
  catalogInternalStructures?: InternalStructureDefinition[]
  catalogParameters?: NodeParameterDefinition[]
  disabled?: boolean
  disabledTitle?: string
  hasCatalogParameters: boolean
  hasCatalogStructures: boolean
  node: NodeInstance
  onAppendCatalogInternalStructure?: (structure: InternalStructureDefinition) => void
  onAppendCatalogParameter?: (parameter: NodeParameterDefinition) => void
  onCreateElement?: (structure: InternalStructureDefinition) => void
  onRemoveElement?: () => void
  showPicker: boolean
}

type MenuPanel = 'root' | 'add'

export function ElementMenu({
  catalogInternalStructures,
  catalogParameters,
  disabled = false,
  disabledTitle,
  hasCatalogParameters,
  hasCatalogStructures,
  node,
  onAppendCatalogInternalStructure,
  onAppendCatalogParameter,
  onCreateElement,
  onRemoveElement,
  showPicker,
}: ElementMenuProps) {
  const elementSelectorRef = useRef<HTMLDetailsElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [panel, setPanel] = useState<MenuPanel>('root')

  const removables = listNodeElements(node)
  const canRemove = removables.length > 0 && Boolean(onRemoveElement)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (!elementSelectorRef.current?.contains(target)) {
        setIsOpen(false)
        setPanel('root')
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setPanel('root')
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  if (disabled) {
    return (
      <Button disabled title={disabledTitle} type="button">
        Element
      </Button>
    )
  }

  if (!showPicker) {
    return (
      <Button disabled title="Não há parâmetros nem Internal_Structures disponíveis para acrescentar.">
        Element
      </Button>
    )
  }

  const closeMenu = () => {
    setIsOpen(false)
    setPanel('root')
  }

  return (
    <details className={styles.elementSelector} open={isOpen} ref={elementSelectorRef}>
      <summary
        onClick={(clickEvent) => {
          clickEvent.preventDefault()
          setIsOpen((openState) => {
            const next = !openState
            if (!next) {
              setPanel('root')
            }
            return next
          })
        }}
      >
        Element
      </summary>
      <div className={styles.elementMenu}>
        {panel === 'root' ? (
          <>
            <button
              className={styles.toolRow}
              onClick={() => setPanel('add')}
              type="button"
            >
              <span>+ Element</span>
              <small>adicionar</small>
            </button>
            <button
              className={styles.toolRow}
              disabled={!canRemove}
              onClick={() => {
                closeMenu()
                onRemoveElement?.()
              }}
              title={
                canRemove
                  ? 'Remover parâmetro ou Internal_Structure deste nó'
                  : 'Não há elementos para remover neste nó'
              }
              type="button"
            >
              <span>- Element</span>
              <small>remover</small>
            </button>
          </>
        ) : (
          <div className={styles.addPanel}>
            <button className={styles.backRow} onClick={() => setPanel('root')} type="button">
              ← Element
            </button>

            {node.schema.internalStructures.map((structure) => (
              <button
                key={structure.id}
                onClick={() => {
                  onCreateElement?.(structure)
                  closeMenu()
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
                      closeMenu()
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
                      closeMenu()
                    }}
                    type="button"
                  >
                    <span>{parameter.name}</span>
                    <small>novo parâmetro · {parameter.type}</small>
                  </button>
                ))
              : null}
          </div>
        )}
      </div>
    </details>
  )
}
