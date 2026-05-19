import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import { LinkPathPicker } from '@/components/molecules/LinkPathPicker'
import type { NodeElementListItem } from '@/core/listNodeElements'
import { formatLinkPathPreview, normalizeLinkPath } from '@/core/linkValue'
import { normalizeHashItem } from '@/core/listHashValue'
import {
  formatMapHashLinkEntryPreview,
  formatMapHashLinkString,
  isMapHashLinkValue,
  MAP_HASH_LINK_NEW_KEY_DEFAULT,
  parseMapHashLinkString,
  type MapHashLinkEntry,
} from '@/core/mapHashLinkValue'

import styles from '@/components/molecules/MapHashLinkPicker.module.css'

type MapHashLinkPickerProps = {
  value: string
  onChange: (next: string) => void
  /** Notifica quando o painel lateral de link abre/fecha (ajuste do modal pai). */
  onLinkEditorOpenChange?: (open: boolean) => void
}

export function MapHashLinkPicker({ value, onChange, onLinkEditorOpenChange }: MapHashLinkPickerProps) {
  const entries = useMemo(() => parseMapHashLinkString(value), [value])
  const [itemMenuOpen, setItemMenuOpen] = useState(false)
  const [removePickerOpen, setRemovePickerOpen] = useState(false)
  const [removePickerSelectedKey, setRemovePickerSelectedKey] = useState<string | null>(null)
  const [linkEditIndex, setLinkEditIndex] = useState(-1)
  const itemMenuRef = useRef<HTMLDivElement>(null)

  const removalElements = useMemo<NodeElementListItem[]>(
    () =>
      entries.map((entry, index) => ({
        id: String(index),
        kind: 'parameter',
        name: entry.key,
        meta: formatMapHashLinkEntryPreview(entry),
      })),
    [entries],
  )

  const commitEntries = useCallback(
    (nextEntries: MapHashLinkEntry[]) => {
      onChange(formatMapHashLinkString(nextEntries))
      setLinkEditIndex((prev) => {
        if (nextEntries.length === 0 || prev < 0) {
          return -1
        }
        if (prev >= nextEntries.length) {
          return -1
        }
        return prev
      })
    },
    [onChange],
  )

  const updateEntry = (index: number, patch: Partial<MapHashLinkEntry>) => {
    const next = entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    commitEntries(next)
  }

  const closeItemMenu = () => setItemMenuOpen(false)

  const toggleItemMenu = () => {
    setItemMenuOpen((open) => {
      if (!open) {
        setLinkEditIndex(-1)
      }
      return !open
    })
  }

  const addEntry = () => {
    commitEntries([...entries, { key: MAP_HASH_LINK_NEW_KEY_DEFAULT, value: '' }])
    closeItemMenu()
  }

  const openRemovePicker = () => {
    if (entries.length === 0) {
      return
    }
    closeItemMenu()
    setLinkEditIndex(-1)
    setRemovePickerSelectedKey(null)
    setRemovePickerOpen(true)
  }

  const closeRemovePicker = () => {
    setRemovePickerOpen(false)
    setRemovePickerSelectedKey(null)
  }

  const confirmRemoveEntry = (item: NodeElementListItem) => {
    const index = Number.parseInt(item.id, 10)
    if (!Number.isFinite(index) || index < 0 || index >= entries.length) {
      return
    }
    commitEntries(entries.filter((_, i) => i !== index))
    closeRemovePicker()
  }

  useEffect(() => {
    if (!itemMenuOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (itemMenuRef.current?.contains(target)) {
        return
      }
      closeItemMenu()
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [itemMenuOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (removePickerOpen) {
        event.stopPropagation()
        closeRemovePicker()
        return
      }

      if (itemMenuOpen) {
        event.stopPropagation()
        closeItemMenu()
        return
      }

      if (linkEditIndex >= 0) {
        event.stopPropagation()
        setLinkEditIndex(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [itemMenuOpen, linkEditIndex, removePickerOpen])

  const linkEntry = linkEditIndex >= 0 && linkEditIndex < entries.length ? entries[linkEditIndex]! : null
  const linkEditorOpen = Boolean(linkEntry && isMapHashLinkValue(linkEntry.value))

  useEffect(() => {
    onLinkEditorOpenChange?.(linkEditorOpen)
  }, [linkEditorOpen, onLinkEditorOpenChange])

  return (
    <div
      className={[styles.picker, linkEditorOpen ? styles.pickerWithLinkEditor : ''].filter(Boolean).join(' ')}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <span className={styles.title}>Map[hash,link]</span>

      <div className={styles.body}>
        <div className={styles.mainColumn}>
          <div className={styles.listScroll}>
        {entries.length === 0 ? (
          <p className={styles.emptyHint}>Mapa vazio — use + entrada para adicionar um par hash → valor.</p>
        ) : (
          entries.map((entry, index) => (
            <div className={styles.entryRow} key={`${entry.key}-${index}`}>
              <input
                aria-label={`Chave ${index}`}
                className={styles.keyInput}
                onChange={(event) => updateEntry(index, { key: normalizeHashItem(event.target.value) })}
                type="text"
                value={entry.key}
              />
              {isMapHashLinkValue(entry.value) ? (
                <button
                  className={[
                    styles.valueLinkButton,
                    linkEditIndex === index ? styles.valueLinkButtonSelected : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setLinkEditIndex(linkEditIndex === index ? -1 : index)}
                  title={entry.value}
                  type="button"
                >
                  {formatLinkPathPreview(entry.value)}
                </button>
              ) : (
                <input
                  aria-label={`Valor ${index}`}
                  className={styles.valueTextInput}
                  onChange={(event) => updateEntry(index, { value: event.target.value })}
                  type="text"
                  value={entry.value}
                />
              )}
            </div>
          ))
        )}
          </div>

          <div className={styles.itemMenuWrap} ref={itemMenuRef}>
        <button
          aria-expanded={itemMenuOpen}
          aria-haspopup="menu"
          className={[styles.itemMenuTrigger, itemMenuOpen ? styles.itemMenuTriggerOpen : '']
            .filter(Boolean)
            .join(' ')}
          onClick={toggleItemMenu}
          type="button"
        >
          entrada
        </button>
        {itemMenuOpen ? (
          <div aria-label="Ações mapa" className={styles.itemSubmenu} role="menu">
            <button className={styles.itemSubmenuEntry} onClick={addEntry} role="menuitem" type="button">
              + entrada
            </button>
            <button
              className={styles.itemSubmenuEntry}
              disabled={entries.length === 0}
              onClick={openRemovePicker}
              role="menuitem"
              type="button"
            >
              − entrada
            </button>
          </div>
        ) : null}
          </div>
        </div>

        {linkEditorOpen ? (
          <aside aria-label={`Editar link — ${linkEntry!.key}`} className={styles.linkEditorAside}>
            <span className={styles.linkEditorLabel}>Editar link</span>
            <span className={styles.linkEditorKey} title={linkEntry!.value}>
              {linkEntry!.key}
            </span>
            <div className={styles.linkEditorBody}>
              <LinkPathPicker
                embedded
                onChange={(next) => updateEntry(linkEditIndex, { value: normalizeLinkPath(next) })}
                value={linkEntry!.value}
              />
            </div>
            <button className={styles.linkEditorClose} onClick={() => setLinkEditIndex(-1)} type="button">
              Fechar
            </button>
          </aside>
        ) : null}
      </div>

      <ElementRemovalPicker
        dialogSubtitle="Escolha qual par hash → valor deseja excluir e confirme."
        dialogTitle="Remover entrada"
        elements={removalElements}
        hideKindLabel
        nodeTitle="Map[hash,link]"
        onClose={closeRemovePicker}
        onConfirm={confirmRemoveEntry}
        onSelectKey={setRemovePickerSelectedKey}
        open={removePickerOpen}
        selectedKey={removePickerSelectedKey}
        titleDomId="map-hash-link-removal-title"
      />
    </div>
  )
}
