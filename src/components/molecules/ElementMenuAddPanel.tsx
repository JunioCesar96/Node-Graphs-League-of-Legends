import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react'

import type { ElementMenuEntry, ElementMenuOrganizationMode, ElementMenuTypeTag } from '@/core/elementMenuCatalogUtils'
import { ELEMENT_MENU_ALL_TYPE_TAG_ID } from '@/core/elementMenuCatalogUtils'
import type { ElementMenuCatalogScope, ElementMenuScopeCatalogSources } from '@/core/elementMenuScopeCatalog'

import { ElementMenuAddPanelCatalogList } from '@/components/molecules/ElementMenuAddPanelCatalogList'

import styles from './ElementMenu.module.css'

type ElementMenuAddPanelProps = {
  activeTypeTagId: string | null
  automaticTypeTags: readonly ElementMenuTypeTag[]
  catalogScope: ElementMenuCatalogScope
  elementOrganization: ElementMenuOrganizationMode
  elementPickerMenuOpen: boolean
  elementPickerMenuWrapRef: RefObject<HTMLDivElement | null>
  elementPickerSearchInputRef: RefObject<HTMLInputElement | null>
  elementPickerSummaryLabel: string
  elementQuery: string
  elementTypeListRef: RefObject<HTMLDivElement | null>
  elementTypeScrollControlStyle: CSSProperties & Record<`--${string}`, string>
  elementTypeScrollDirection: 'down' | 'idle' | 'up'
  isElementTypeScrollActive: boolean
  onBack: () => void
  onCatalogScopeChange: (scope: ElementMenuCatalogScope) => void
  onPickEntry: (entry: ElementMenuEntry) => void
  scopeCatalogSources: ElementMenuScopeCatalogSources
  onSetActiveTypeTagId: (tagId: string) => void
  onSetElementOrganization: (mode: ElementMenuOrganizationMode) => void
  onSetElementPickerMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  onSetElementQuery: (query: string) => void
  showElementTypeScrollControl: boolean
  startElementTypeScroll: (event: ReactPointerEvent<HTMLButtonElement>) => void
  moveElementTypeScroll: (event: ReactPointerEvent<HTMLButtonElement>) => void
  stopElementTypeScroll: (event: ReactPointerEvent<HTMLButtonElement>) => void
  visibleEntries: readonly ElementMenuEntry[]
}

/** Painel «+ Element»: organização, filtro Elementos (pesquisa + tipo) e catálogo abaixo. */
export function ElementMenuAddPanel({
  activeTypeTagId,
  automaticTypeTags,
  catalogScope,
  elementOrganization,
  elementPickerMenuOpen,
  elementPickerMenuWrapRef,
  elementPickerSearchInputRef,
  elementPickerSummaryLabel,
  elementQuery,
  elementTypeListRef,
  elementTypeScrollControlStyle,
  elementTypeScrollDirection,
  isElementTypeScrollActive,
  onBack,
  onCatalogScopeChange,
  onPickEntry,
  scopeCatalogSources,
  onSetActiveTypeTagId,
  onSetElementOrganization,
  onSetElementPickerMenuOpen,
  onSetElementQuery,
  showElementTypeScrollControl,
  startElementTypeScroll,
  moveElementTypeScroll,
  stopElementTypeScroll,
  visibleEntries,
}: ElementMenuAddPanelProps) {
  return (
    <div className={styles.addPanel}>
      <button className={styles.backRow} onClick={onBack} type="button">
        {'\u2190'} Element
      </button>

      <div aria-label={'Modos de organiza\u00e7\u00e3o'} className={styles.tags}>
        <button
          aria-pressed={elementOrganization === 'az'}
          onClick={() => onSetElementOrganization('az')}
          type="button"
        >
          A-Z
        </button>
        <button
          aria-pressed={elementOrganization === 'tipo'}
          onClick={() => onSetElementOrganization('tipo')}
          type="button"
        >
          Tipo
        </button>
        <button
          aria-pressed={elementOrganization === 'parameter-type'}
          onClick={() => onSetElementOrganization('parameter-type')}
          type="button"
        >
          {'Tipo de Par\u00e2metro'}
        </button>
      </div>

      <div className={styles.typeTagMenuWrap} ref={elementPickerMenuWrapRef}>
        <button
          aria-expanded={elementPickerMenuOpen}
          aria-haspopup="listbox"
          className={styles.elementPickerMenuTrigger}
          onClick={() => onSetElementPickerMenuOpen((open) => !open)}
          type="button"
        >
          <span className={styles.typeTagMenuTriggerLabel}>Elementos</span>
          <span className={styles.typeTagMenuTriggerValue}>{elementPickerSummaryLabel}</span>
          <span aria-hidden className={styles.typeTagMenuTriggerChevron}>
            {elementPickerMenuOpen ? '\u25B4' : '\u25BE'}
          </span>
        </button>
        {elementPickerMenuOpen ? (
          <div className={styles.typeTagPopover}>
            <input
              ref={elementPickerSearchInputRef}
              aria-label="Pesquisar elemento"
              autoComplete="off"
              className={styles.typeTagPopoverSearch}
              onChange={(event) => onSetElementQuery(event.target.value)}
              placeholder={'Pesquisar elemento\u2026'}
              type="search"
              value={elementQuery}
            />
            {automaticTypeTags.length > 0 ? (
              <div aria-label={'Filtrar por tipo'} className={styles.elementPopoverTypeFilter}>
                <span className={styles.elementPopoverTypeFilterLabel}>Tipo</span>
                <div className={styles.elementPopoverTypeFilterBody}>
                  <div
                    ref={elementTypeListRef}
                    className={styles.elementPopoverTypeList}
                    role="listbox"
                  >
                    {automaticTypeTags.map((tag) => (
                      <button
                        aria-selected={
                          tag.id === ELEMENT_MENU_ALL_TYPE_TAG_ID
                            ? activeTypeTagId === ELEMENT_MENU_ALL_TYPE_TAG_ID ||
                              activeTypeTagId === null
                            : activeTypeTagId === tag.id
                        }
                        className={styles.elementPopoverTypeOption}
                        key={tag.id}
                        onClick={() => onSetActiveTypeTagId(tag.id)}
                        role="option"
                        type="button"
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                  {showElementTypeScrollControl ? (
                    <button
                      aria-label="Custom add node list scroll control"
                      className={[
                        styles.typeTagScrollControl,
                        isElementTypeScrollActive ? styles.scrollControlActive : '',
                        elementTypeScrollDirection === 'up' ? styles.scrollControlUp : '',
                        elementTypeScrollDirection === 'down' ? styles.scrollControlDown : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onPointerCancel={stopElementTypeScroll}
                      onPointerDown={startElementTypeScroll}
                      onPointerMove={moveElementTypeScroll}
                      onPointerUp={stopElementTypeScroll}
                      style={elementTypeScrollControlStyle}
                      type="button"
                    >
                      <span aria-hidden className={styles.scrollArrowUp} />
                      <span aria-hidden className={styles.scrollCenter} />
                      <span aria-hidden className={styles.scrollArrowDown} />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <ElementMenuAddPanelCatalogList
        catalogScope={catalogScope}
        entries={visibleEntries}
        onCatalogScopeChange={onCatalogScopeChange}
        onPickEntry={onPickEntry}
        scopeCatalogSources={scopeCatalogSources}
      />
    </div>
  )
}
