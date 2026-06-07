import { useMemo, useState } from 'react'

import { VfxEffectContextMenu, type VfxEffectContextMenuAnchor } from '@/components/molecules/VfxEffectContextMenu'
import {
  computeEffectDisplayPrefix,
  filterAndSortEffects,
  shortenEffectLabel,
  type VfxEffectSortMode,
} from '@/core/vfx/vfxEffectTabLabels'
import { LangId } from '@/core/language/languageIds'
import type { VfxEffectListItem } from '@/hooks/useVfxPreview'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxEffectTabsBar.module.css'

type VfxEffectTabsBarProps = {
  attached?: boolean
  activeEffectId: string | null
  compositorMode: boolean
  effects: readonly VfxEffectListItem[]
  onAddToCompositor: (effectId: string) => void
  onRemoveFromCompositor: (effectId: string) => void
  onSelectEffect: (effectId: string) => void
  onToggleEffectSelection: (effectId: string) => void
  selectedEffectIds: readonly string[]
}

export function VfxEffectTabsBar({
  attached = false,
  activeEffectId,
  compositorMode,
  effects,
  onAddToCompositor,
  onRemoveFromCompositor,
  onSelectEffect,
  onToggleEffectSelection,
  selectedEffectIds,
}: VfxEffectTabsBarProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<VfxEffectSortMode>('asc')
  const [contextMenu, setContextMenu] = useState<VfxEffectContextMenuAnchor | null>(null)

  const filtered = useMemo(
    () => filterAndSortEffects(effects, query, sortMode),
    [effects, query, sortMode],
  )

  const displayPrefix = useMemo(
    () => computeEffectDisplayPrefix(filtered.map((effect) => effect.label)),
    [filtered],
  )

  const selectedSet = useMemo(() => new Set(selectedEffectIds), [selectedEffectIds])

  const toggleSort = () => {
    setSortMode((previous) => (previous === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div className={[styles.bar, attached ? styles.barAttached : ''].filter(Boolean).join(' ')}>
      <div className={styles.controls}>
        <input
          aria-label={t(LangId.VfxEffectTabsSearch)}
          className={styles.search}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(LangId.VfxEffectTabsSearchPlaceholder)}
          type="search"
          value={query}
        />
        <button
          aria-label={t(LangId.VfxEffectTabsSort)}
          className={[styles.sortBtn, styles.sortBtnActive].join(' ')}
          onClick={toggleSort}
          title={t(LangId.VfxEffectTabsSort)}
          type="button"
        >
          <span>AZ</span>
          <span aria-hidden className={styles.sortArrow}>
            {sortMode === 'asc' ? '↓' : '↑'}
          </span>
        </button>
        <span className={styles.meta}>
          {filtered.length}/{effects.length}
        </span>
      </div>

      <div className={styles.tabsScroll} role="tablist">
        {filtered.length === 0 ? (
          <span className={styles.emptyHint}>{t(LangId.VfxEffectTabsNoMatch)}</span>
        ) : (
          filtered.map((effect) => {
            const active = effect.id === activeEffectId
            const compositorSelected = compositorMode && selectedSet.has(effect.id)
            const displayLabel = shortenEffectLabel(effect.label, displayPrefix)

            return (
              <button
                aria-selected={active}
                className={[
                  styles.tab,
                  active ? styles.tabActive : '',
                  compositorSelected ? styles.tabCompositor : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={effect.id}
                onClick={(event) => {
                  if (event.ctrlKey || event.metaKey) {
                    onToggleEffectSelection(effect.id)
                    return
                  }
                  onSelectEffect(effect.id)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setContextMenu({
                    effectId: effect.id,
                    effectLabel: effect.label,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }}
                role="tab"
                title={effect.label}
                type="button"
              >
                <span className={styles.tabLabel}>{displayLabel}</span>
                <span className={styles.tabBadge}>{effect.emitterCount}</span>
              </button>
            )
          })
        )}
      </div>

      {contextMenu ? (
        <VfxEffectContextMenu
          anchor={contextMenu}
          inCompositor={selectedSet.has(contextMenu.effectId)}
          onAddToCompositor={onAddToCompositor}
          onClose={() => setContextMenu(null)}
          onRemoveFromCompositor={onRemoveFromCompositor}
        />
      ) : null}
    </div>
  )
}
