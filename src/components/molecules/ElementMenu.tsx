import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/atoms/Button'
import { useCustomListScrollControl } from '@/hooks/useCustomListScrollControl'
import type { InternalStructureDefinition, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import {
  type ElementMenuEntry,
  type ElementMenuOrganizationMode,
  ELEMENT_MENU_ALL_TYPE_TAG_ID,
  buildAutomaticTypeTags,
  buildElementMenuEntries,
  catalogStructureAppendName,
  filterAndSortElementMenuEntries,
  filterElementMenuEntriesByCatalogScope,
} from '@/core/elementMenuCatalogUtils'
import { ElementMenuAddPanel } from '@/components/molecules/ElementMenuAddPanel'
import { listRemovableNodeElements } from '@/core/listNodeElements'
import {
  buildElementMenuScopeCatalogSources,
  defaultElementMenuCatalogScope,
  elementMenuScopeHasCatalog,
  type ElementMenuCatalogScope,
} from '@/core/elementMenuScopeCatalog'
import {
  schemaJsonRelativePathBySchemaId,
  schemaNodeKindBySchemaId,
  schemaPackFolderBySchemaId,
  schemaRegistry,
} from '@/core/nodeStructureRegistry'

import { ELEMENT_REMOVAL_PICKER_ROOT_ATTR } from '@/components/molecules/ElementRemovalPicker'

import styles from './ElementMenu.module.css'

type ElementMenuProps = {
  catalogInternalStructures?: InternalStructureDefinition[]
  catalogParameters?: NodeParameterDefinition[]
  disabled?: boolean
  disabledTitle?: string
  hasCatalogParameters: boolean
  hasCatalogStructures: boolean
  nodeKind?: 'module' | 'base'
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
const TYPE_FILTER_VISIBLE_ROWS = 5

export function ElementMenu({
  catalogInternalStructures,
  catalogParameters,
  disabled = false,
  disabledTitle,
  hasCatalogParameters,
  hasCatalogStructures,
  nodeKind = 'base',
  node,
  onAppendCatalogInternalStructure,
  onAppendCatalogParameter,
  onCreateElement,
  onRemoveElement,
  parameterStubCatalog,
  showPicker,
}: ElementMenuProps) {
  const elementSelectorRef = useRef<HTMLDetailsElement>(null)
  const elementPickerMenuWrapRef = useRef<HTMLDivElement | null>(null)
  const elementPickerSearchInputRef = useRef<HTMLInputElement | null>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [panel, setPanel] = useState<MenuPanel>('root')
  const [elementQuery, setElementQuery] = useState('')
  const [elementOrganization, setElementOrganization] =
    useState<ElementMenuOrganizationMode>(DEFAULT_ORGANIZATION)
  const [activeTypeTagId, setActiveTypeTagId] = useState<string | null>(ELEMENT_MENU_ALL_TYPE_TAG_ID)
  const [elementPickerMenuOpen, setElementPickerMenuOpen] = useState(false)
  const [catalogScope, setCatalogScope] = useState<ElementMenuCatalogScope>(() =>
    defaultElementMenuCatalogScope(nodeKind),
  )

  const removables = listRemovableNodeElements(node, parameterStubCatalog)
  const canRemove = removables.length > 0 && Boolean(onRemoveElement)

  const scopeCatalogSources = useMemo(
    () =>
      buildElementMenuScopeCatalogSources({
        node,
        nodeKind,
        schemaRegistry,
        schemaNodeKindBySchemaId,
        jsonRelativePathBySchemaId: schemaJsonRelativePathBySchemaId,
        packFolderBySchemaId: schemaPackFolderBySchemaId,
        baseCatalogStructures: catalogInternalStructures,
        baseCatalogParameters: catalogParameters,
      }),
    [catalogInternalStructures, catalogParameters, node, nodeKind],
  )

  const catalogEntries = useMemo(() => {
    const moduleSlice = buildElementMenuEntries({
      ...scopeCatalogSources.module,
      schemaRegistry,
      catalogScope: 'module',
    })
    const baseSlice = buildElementMenuEntries({
      ...scopeCatalogSources.base,
      schemaRegistry,
      catalogScope: 'base',
    })
    return [...moduleSlice, ...baseSlice]
  }, [scopeCatalogSources])

  const scopedCatalogEntries = useMemo(
    () => filterElementMenuEntriesByCatalogScope(catalogEntries, catalogScope),
    [catalogEntries, catalogScope],
  )

  const automaticTypeTags = useMemo(
    () => buildAutomaticTypeTags(scopedCatalogEntries),
    [scopedCatalogEntries],
  )

  const typeFilterScrollActive =
    elementPickerMenuOpen && automaticTypeTags.length > TYPE_FILTER_VISIBLE_ROWS
  const {
    listRef: elementTypeListRef,
    isScrollActive: isElementTypeScrollActive,
    scrollDirection: elementTypeScrollDirection,
    startScroll: startElementTypeScroll,
    moveScroll: moveElementTypeScroll,
    stopScroll: stopElementTypeScroll,
    scrollControlStyle: elementTypeScrollControlStyle,
  } = useCustomListScrollControl(typeFilterScrollActive)

  const showElementTypeScrollControl = automaticTypeTags.length > TYPE_FILTER_VISIBLE_ROWS

  const visibleEntries = useMemo(
    () =>
      filterAndSortElementMenuEntries(
        scopedCatalogEntries,
        elementQuery,
        elementOrganization,
        activeTypeTagId,
        catalogScope,
      ),
    [activeTypeTagId, catalogScope, elementOrganization, elementQuery, scopedCatalogEntries],
  )

  const elementPickerSummaryLabel = useMemo(() => {
    const n = visibleEntries.length
    if (n === 0) {
      return 'Nenhum'
    }
    if (n === scopedCatalogEntries.length) {
      return `${String(n)} dispon\u00edveis`
    }
    return `${String(n)} de ${String(scopedCatalogEntries.length)}`
  }, [scopedCatalogEntries.length, visibleEntries.length])

  const resolveCatalogScopeWithCatalog = (
    preferred: ElementMenuCatalogScope,
  ): ElementMenuCatalogScope => {
    if (elementMenuScopeHasCatalog(preferred, scopeCatalogSources)) {
      return preferred
    }
    if (preferred === 'module' && elementMenuScopeHasCatalog('base', scopeCatalogSources)) {
      return 'base'
    }
    if (preferred === 'base' && elementMenuScopeHasCatalog('module', scopeCatalogSources)) {
      return 'module'
    }
    return preferred
  }

  const refreshAddPanelFilters = (scope: ElementMenuCatalogScope) => {
    setElementQuery('')
    setElementOrganization(DEFAULT_ORGANIZATION)
    setActiveTypeTagId(ELEMENT_MENU_ALL_TYPE_TAG_ID)
    setElementPickerMenuOpen(false)
    setCatalogScope(scope)
  }

  const resetAddPanelState = () => {
    refreshAddPanelFilters(defaultElementMenuCatalogScope(nodeKind))
  }

  const openAddPanel = () => {
    const scope = resolveCatalogScopeWithCatalog(defaultElementMenuCatalogScope(nodeKind))
    refreshAddPanelFilters(scope)
    setPanel('add')
  }

  const handleCatalogScopeChange = (scope: ElementMenuCatalogScope) => {
    refreshAddPanelFilters(resolveCatalogScopeWithCatalog(scope))
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
      if (event.key !== 'Escape') {
        return
      }
      if (elementPickerMenuOpen) {
        event.stopPropagation()
        setElementPickerMenuOpen(false)
        return
      }
      setIsOpen(false)
      setPanel('root')
      resetAddPanelState()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [elementPickerMenuOpen, isOpen])

  useEffect(() => {
    if (elementPickerMenuOpen) {
      elementPickerSearchInputRef.current?.focus()
    }
  }, [elementPickerMenuOpen])

  useEffect(() => {
    if (!elementPickerMenuOpen) {
      return
    }
    const onPointerDownCapture = (event: globalThis.PointerEvent) => {
      const el = elementPickerMenuWrapRef.current
      const target = event.target
      if (el && target instanceof globalThis.Node && !el.contains(target)) {
        setElementPickerMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => document.removeEventListener('pointerdown', onPointerDownCapture, true)
  }, [elementPickerMenuOpen])

  if (disabled) {
    return (
      <Button disabled title={disabledTitle} type="button">
        Element
      </Button>
    )
  }

  if (!showPicker) {
    return (
      <Button
        disabled
        title={'N\u00e3o h\u00e1 par\u00e2metros nem Internal_Structures dispon\u00edveis para acrescentar.'}
      >
        Element
      </Button>
    )
  }

  const closeMenu = () => {
    setIsOpen(false)
    setPanel('root')
    resetAddPanelState()
  }

  const handlePickEntry = (entry: ElementMenuEntry) => {
    if (entry.onPick === 'create-element' && entry.structure) {
      onCreateElement?.(entry.structure)
    } else if (entry.onPick === 'append-structure' && entry.structure) {
      onAppendCatalogInternalStructure?.({
        ...entry.structure,
        name: catalogStructureAppendName(entry, schemaRegistry),
      })
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
            <button className={styles.toolRow} onClick={openAddPanel} type="button">
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
                  ? 'Remover par\u00e2metro ou Internal_Structure deste n\u00f3'
                  : 'N\u00e3o h\u00e1 elementos para remover neste n\u00f3'
              }
              type="button"
            >
              <span>- Element</span>
              <small>remover</small>
            </button>
          </>
        ) : (
          <ElementMenuAddPanel
            activeTypeTagId={activeTypeTagId}
            automaticTypeTags={automaticTypeTags}
            catalogScope={catalogScope}
            elementOrganization={elementOrganization}
            elementPickerMenuOpen={elementPickerMenuOpen}
            elementPickerMenuWrapRef={elementPickerMenuWrapRef}
            elementPickerSearchInputRef={elementPickerSearchInputRef}
            elementPickerSummaryLabel={elementPickerSummaryLabel}
            elementQuery={elementQuery}
            elementTypeListRef={elementTypeListRef}
            elementTypeScrollControlStyle={elementTypeScrollControlStyle}
            elementTypeScrollDirection={elementTypeScrollDirection}
            isElementTypeScrollActive={isElementTypeScrollActive}
            onBack={() => {
              setPanel('root')
              resetAddPanelState()
            }}
            onCatalogScopeChange={handleCatalogScopeChange}
            onPickEntry={handlePickEntry}
            scopeCatalogSources={scopeCatalogSources}
            onSetActiveTypeTagId={setActiveTypeTagId}
            onSetElementOrganization={setElementOrganization}
            onSetElementPickerMenuOpen={setElementPickerMenuOpen}
            onSetElementQuery={setElementQuery}
            showElementTypeScrollControl={showElementTypeScrollControl}
            startElementTypeScroll={startElementTypeScroll}
            moveElementTypeScroll={moveElementTypeScroll}
            stopElementTypeScroll={stopElementTypeScroll}
            visibleEntries={visibleEntries}
          />
        )}
      </div>
    </details>
  )
}
