import type { ElementMenuEntry } from '@/core/elementMenuCatalogUtils'
import {
  elementMenuScopeHasCatalog,
  type ElementMenuCatalogScope,
  type ElementMenuScopeCatalogSources,
} from '@/core/elementMenuScopeCatalog'

import styles from './ElementMenu.module.css'

type ElementMenuAddPanelCatalogListProps = {
  catalogScope: ElementMenuCatalogScope
  entries: readonly ElementMenuEntry[]
  onCatalogScopeChange: (scope: ElementMenuCatalogScope) => void
  onPickEntry: (entry: ElementMenuEntry) => void
  scopeCatalogSources: ElementMenuScopeCatalogSources
}

/** Catálogo de elementos: âmbito module/base + lista filtrada. */
export function ElementMenuAddPanelCatalogList({
  catalogScope,
  entries,
  onCatalogScopeChange,
  onPickEntry,
  scopeCatalogSources,
}: ElementMenuAddPanelCatalogListProps) {
  return (
    <section aria-label="Catálogo de elementos" className={styles.elementAddPanelCatalog}>
      <div className={styles.elementAddPanelCatalogHeader}>
        <span className={styles.elementAddPanelCatalogLabel}>Catálogo de elementos</span>
        <div aria-label={'Origem do catálogo'} className={styles.catalogScopeTags}>
          <button
            aria-pressed={catalogScope === 'module'}
            disabled={!elementMenuScopeHasCatalog('module', scopeCatalogSources)}
            onClick={() => onCatalogScopeChange('module')}
            type="button"
          >
            module
          </button>
          <button
            aria-pressed={catalogScope === 'base'}
            disabled={!elementMenuScopeHasCatalog('base', scopeCatalogSources)}
            onClick={() => onCatalogScopeChange('base')}
            type="button"
          >
            base
          </button>
        </div>
      </div>
      <div className={styles.elementAddPanelCatalogBody}>
        {entries.length > 0 ? (
          entries.map((entry) => (
            <button
              className={styles.elementPickerOption}
              key={entry.id}
              onClick={() => onPickEntry(entry)}
              type="button"
            >
              <span className={styles.elementPickerOptionLabel}>{entry.label}</span>
              {entry.meta ? <span className={styles.elementPickerOptionMeta}>{entry.meta}</span> : null}
            </button>
          ))
        ) : (
          <p className={styles.typeTagPopoverEmpty}>Nenhum elemento encontrado</p>
        )}
      </div>
    </section>
  )
}
