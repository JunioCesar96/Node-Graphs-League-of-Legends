import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { STRUCTURE_INDEX_PICKER_ROOT_ATTR } from '@/core/canvasKeyboardGuard'

import styles from './StructureIndexPicker.module.css'

export type StructureIndexPickerItem = {
  index: number
  label: string
  meta?: string
}

type StructureIndexPickerProps = {
  open: boolean
  title: string
  items: StructureIndexPickerItem[]
  selectedIndex: number
  onClose: () => void
  onSelect: (index: number) => void
}

function matchesQuery(item: StructureIndexPickerItem, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  const haystack = `${item.label} ${item.meta ?? ''} ${item.index}`.toLowerCase()
  return haystack.includes(normalized)
}

export function StructureIndexPicker({
  open,
  title,
  items,
  selectedIndex,
  onClose,
  onSelect,
}: StructureIndexPickerProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose, open])

  const visibleItems = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  )

  if (!open) {
    return null
  }

  return createPortal(
    <div
      {...{ [STRUCTURE_INDEX_PICKER_ROOT_ATTR]: '' }}
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      <div
        aria-labelledby="structure-index-picker-title"
        aria-modal="true"
        className={styles.dialog}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className={styles.header}>
          <h2 className={styles.title} id="structure-index-picker-title">
            {title}
          </h2>
          <input
            aria-label="Pesquisar entradas"
            autoFocus
            className={styles.search}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Pesquisar hash ou nome…"
            type="search"
            value={query}
          />
        </div>
        <ul className={styles.list}>
          {visibleItems.length === 0 ? (
            <li>
              <p className={styles.empty}>Nenhuma entrada corresponde à pesquisa.</p>
            </li>
          ) : (
            visibleItems.map((item) => (
              <li className={styles.itemRow} key={item.index}>
                <button
                  aria-pressed={item.index === selectedIndex}
                  className={styles.itemButton}
                  onClick={() => {
                    onSelect(item.index)
                    onClose()
                  }}
                  title={item.meta}
                  type="button"
                >
                  {item.label}
                </button>
                <span className={styles.itemIndex}>{item.index}</span>
              </li>
            ))
          )}
        </ul>
        <div className={styles.footer}>
          <button className={styles.closeButton} onClick={onClose} type="button">
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
