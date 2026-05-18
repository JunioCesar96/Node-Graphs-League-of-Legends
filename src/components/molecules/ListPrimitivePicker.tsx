import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import type { NodeElementListItem } from '@/core/listNodeElements'

import styles from '@/components/molecules/ListPrimitivePicker.module.css'

export type ListPrimitivePickerVariant = 'f32' | 'string' | 'hash'

type ListPrimitivePickerProps = {
  value: string
  onChange: (next: string) => void
  variant: ListPrimitivePickerVariant
  title: string
  itemLabel: string
  parseList: (raw: string) => string[]
  formatList: (items: readonly string[]) => string
  formatDisplay: (item: string) => string
  parseItem: (raw: string) => string
  defaultItem: string
  inputMode: 'decimal' | 'text'
  removalTitleDomId: string
}

export function ListPrimitivePicker({
  value,
  onChange,
  variant,
  title,
  itemLabel,
  parseList,
  formatList,
  formatDisplay,
  parseItem,
  defaultItem,
  inputMode,
  removalTitleDomId,
}: ListPrimitivePickerProps) {
  const items = useMemo(() => parseList(value), [parseList, value])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [itemMenuOpen, setItemMenuOpen] = useState(false)
  const [removePickerOpen, setRemovePickerOpen] = useState(false)
  const [removePickerSelectedKey, setRemovePickerSelectedKey] = useState<string | null>(null)
  const itemMenuRef = useRef<HTMLDivElement>(null)

  const removalElements = useMemo<NodeElementListItem[]>(
    () =>
      items.map((item, index) => ({
        id: String(index),
        kind: 'parameter',
        name: String(index),
        meta: formatDisplay(item),
      })),
    [formatDisplay, items],
  )

  const commitItems = useCallback(
    (nextItems: string[]) => {
      onChange(formatList(nextItems))
      setSelectedIndex((prev) => {
        if (nextItems.length === 0 || prev < 0) {
          return -1
        }
        if (prev >= nextItems.length) {
          return -1
        }
        return prev
      })
    },
    [formatList, onChange],
  )

  const closeItemMenu = () => setItemMenuOpen(false)

  const toggleItemMenu = () => {
    setItemMenuOpen((open) => {
      if (!open) {
        setSelectedIndex(-1)
      }
      return !open
    })
  }

  const addItem = () => {
    onChange(formatList([...items, defaultItem]))
    closeItemMenu()
  }

  const openRemovePicker = () => {
    if (items.length === 0) {
      return
    }
    closeItemMenu()
    setSelectedIndex(-1)
    setRemovePickerSelectedKey(null)
    setRemovePickerOpen(true)
  }

  const closeRemovePicker = () => {
    setRemovePickerOpen(false)
    setRemovePickerSelectedKey(null)
  }

  const confirmRemoveItem = (item: NodeElementListItem) => {
    const index = Number.parseInt(item.id, 10)
    if (!Number.isFinite(index) || index < 0 || index >= items.length) {
      return
    }
    commitItems(items.filter((_, i) => i !== index))
    closeRemovePicker()
  }

  const onItemClick = (index: number) => {
    closeItemMenu()
    setSelectedIndex((prev) => (prev === index ? -1 : index))
  }

  const updateSelected = (raw: string) => {
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      return
    }
    const next = [...items]
    next[selectedIndex] = parseItem(raw)
    commitItems(next)
  }

  const selectedValue =
    selectedIndex >= 0 && selectedIndex < items.length ? items[selectedIndex]! : defaultItem

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

      if (selectedIndex >= 0) {
        event.stopPropagation()
        setSelectedIndex(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [itemMenuOpen, removePickerOpen, selectedIndex])

  return (
    <div
      className={[styles.picker, styles[variant]].filter(Boolean).join(' ')}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <span className={styles.title}>{title}</span>

      <div className={styles.listScroll}>
        {items.length === 0 ? (
          <p className={styles.emptyHint}>
            Lista vazia — abra {itemLabel} e use + {itemLabel}.
          </p>
        ) : (
          items.map((item, index) => (
            <div className={styles.itemRow} key={index}>
              <button
                aria-pressed={index === selectedIndex}
                className={[
                  styles.itemButton,
                  index === selectedIndex ? styles.itemButtonSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onItemClick(index)}
                type="button"
              >
                {formatDisplay(item)}
              </button>
              <span className={styles.itemIndex}>{index}</span>
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
          {itemLabel}
        </button>
        {itemMenuOpen ? (
          <div aria-label={`Ações ${itemLabel}`} className={styles.itemSubmenu} role="menu">
            <button className={styles.itemSubmenuEntry} onClick={addItem} role="menuitem" type="button">
              + {itemLabel}
            </button>
            <button
              className={styles.itemSubmenuEntry}
              disabled={items.length === 0}
              onClick={openRemovePicker}
              role="menuitem"
              type="button"
            >
              − {itemLabel}
            </button>
          </div>
        ) : null}
      </div>

      {selectedIndex >= 0 && items.length > 0 ? (
        <div className={styles.editorSlot}>
          <span className={styles.editorLabel}>Editar índice {selectedIndex}</span>
          <input
            className={styles.editorInput}
            inputMode={inputMode}
            onChange={(event) => updateSelected(event.target.value)}
            type="text"
            value={selectedValue}
          />
        </div>
      ) : null}

      <ElementRemovalPicker
        dialogSubtitle={`Escolha qual entrada ${itemLabel} deseja excluir e confirme.`}
        dialogTitle={`Remover ${itemLabel}`}
        elements={removalElements}
        hideKindLabel
        nodeTitle={title}
        onClose={closeRemovePicker}
        onConfirm={confirmRemoveItem}
        onSelectKey={setRemovePickerSelectedKey}
        open={removePickerOpen}
        selectedKey={removePickerSelectedKey}
        titleDomId={removalTitleDomId}
      />
    </div>
  )
}
