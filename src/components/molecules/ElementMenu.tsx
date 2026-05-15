import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/atoms/Button'
import type { InternalStructureDefinition, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import {
  type ElementMenuOrganizationMode,
  filterAndSortElementMenuEntries,
  buildElementMenuEntries,
} from '@/core/elementMenuCatalogUtils'
import { listRemovableNodeElements } from '@/core/listNodeElements'

import { ELEMENT_REMOVAL_PICKER_ROOT_ATTR } from '@/components/molecules/ElementRemovalPicker'

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
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  showPicker: boolean
}

type MenuPanel = 'root' | 'add'

const DEFAULT_ORGANIZATION: ElementMenuOrganizationMode = 'az'

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
  parameterStubCatalog,
  showPicker,
}: ElementMenuProps) {
  const elementSelectorRef = useRef<HTMLDetailsElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [panel, setPanel] = useState<MenuPanel>('root')
  const [elementQuery, setElementQuery] = useState('')
  const [elementOrganization, setElementOrganization] =
    useState<ElementMenuOrganizationMode>(DEFAULT_ORGANIZATION)

  const removables = listRemovableNodeElements(node, parameterStubCatalog)
  const canRemove = removables.length > 0 && Boolean(onRemoveElement)

  const catalogEntries = useMemo(
    () =>
      buildElementMenuEntries({
        presetStructures: node.schema.internalStructures,
        catalogStructures: catalogInternalStructures,
        catalogParameters: catalogParameters,
        includeCatalogStructures: hasCatalogStructures,
        includeCatalogParameters: hasCatalogParameters,
      }),
    [
      catalogInternalStructures,
      catalogParameters,
      hasCatalogParameters,
      hasCatalogStructures,
      node.schema.internalStructures,
    ],
  )

  const visibleEntries = useMemo(
    () => filterAndSortElementMenuEntries(catalogEntries, elementQuery, elementOrganization),
    [catalogEntries, elementOrganization, elementQuery],
  )

  const resetAddPanelState = () => {
    setElementQuery('')
    setElementOrganization(DEFAULT_ORGANIZATION)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof globalThis.Node)) {
        return
      }
      if (target instanceof Element && target.closest(`[${ELEMENT_REMOVAL_PICKER_ROOT_ATTR}]`)) {
        return
      }
      if (!elementSelectorRef.current?.contains(target)) {
        setIsOpen(false)
        setPanel('root')
        resetAddPanelState()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setPanel('root')
        resetAddPanelState()
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
    resetAddPanelState()
  }

  const handlePickEntry = (entry: (typeof visibleEntries)[number]) => {
    if (entry.onPick === 'create-element' && entry.structure) {
      onCreateElement?.(entry.structure)
    } else if (entry.onPick === 'append-structure' && entry.structure) {
      onAppendCatalogInternalStructure?.(entry.structure)
    } else if (entry.onPick === 'append-parameter' && entry.parameter) {
      onAppendCatalogParameter?.(entry.parameter)
    }

    closeMenu()
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
              resetAddPanelState()
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
            <button
              className={styles.backRow}
              onClick={() => {
                setPanel('root')
                resetAddPanelState()
              }}
              type="button"
            >
              ← Element
            </button>

            <input
              aria-label="Pesquisar elementos do catálogo"
              autoComplete="off"
              className={styles.searchInput}
              onChange={(event) => setElementQuery(event.target.value)}
              placeholder="Pesquisar elemento…"
              type="search"
              value={elementQuery}
            />

            <div aria-label="Modos de organização" className={styles.tags}>
              <button
                aria-pressed={elementOrganization === 'az'}
                onClick={() => setElementOrganization('az')}
                type="button"
              >
                A-Z
              </button>
              <button
                aria-pressed={elementOrganization === 'tipo'}
                onClick={() => setElementOrganization('tipo')}
                type="button"
              >
                Tipo
              </button>
              <button
                aria-pressed={elementOrganization === 'parameter-type'}
                onClick={() => setElementOrganization('parameter-type')}
                type="button"
              >
                Tipo de Parâmetro
              </button>
            </div>

            <div className={styles.results}>
              {visibleEntries.length > 0 ? (
                visibleEntries.map((entry) => (
                  <button key={entry.id} onClick={() => handlePickEntry(entry)} type="button">
                    <span>{entry.label}</span>
                    <small>{entry.meta}</small>
                  </button>
                ))
              ) : (
                <p className={styles.emptyState}>Nenhum elemento encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}
