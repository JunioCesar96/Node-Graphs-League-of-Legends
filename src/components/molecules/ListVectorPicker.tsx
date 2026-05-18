import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { ElementRemovalPicker } from '@/components/molecules/ElementRemovalPicker'
import type { NodeElementListItem } from '@/core/listNodeElements'

import styles from '@/components/molecules/ListVectorPicker.module.css'

export type ListVectorPickerVariant = 'vec2' | 'vec3' | 'vec4'

type ListVectorPickerProps<T> = {
  value: string
  onChange: (next: string) => void
  variant: ListVectorPickerVariant
  title: string
  itemLabel: string
  parseList: (raw: string) => T[]
  formatList: (items: readonly T[]) => string
  formatBrace: (item: T) => string
  formatItem: (item: T) => string
  parseItem: (raw: string) => T
  defaultItem: T
  renderEditor: (props: { value: string; onChange: (next: string) => void }) => ReactNode
  removalTitleDomId: string
}

export function ListVectorPicker<T>({
  value,
  onChange,
  variant,
  title,
  itemLabel,
  parseList,
  formatList,
  formatBrace,
  formatItem,
  parseItem,
  defaultItem,
  renderEditor,
  removalTitleDomId,
}: ListVectorPickerProps<T>) {
  const items = useMemo(() => parseList(value), [parseList, value])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [vecMenuOpen, setVecMenuOpen] = useState(false)
  const [removePickerOpen, setRemovePickerOpen] = useState(false)
  const [removePickerSelectedKey, setRemovePickerSelectedKey] = useState<string | null>(null)
  const vecMenuRef = useRef<HTMLDivElement>(null)

  const removalElements = useMemo<NodeElementListItem[]>(
    () =>
      items.map((item, index) => ({
        id: String(index),
        kind: 'parameter',
        name: String(index),
        meta: formatBrace(item),
      })),
    [formatBrace, items],
  )

  const commitItems = useCallback(
    (nextItems: T[]) => {
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

  const closeVecMenu = () => setVecMenuOpen(false)

  const toggleVecMenu = () => {
    setVecMenuOpen((open) => {
      if (!open) {
        setSelectedIndex(-1)
      }
      return !open
    })
  }

  const addItem = () => {
    onChange(formatList([...items, { ...defaultItem }]))
    closeVecMenu()
  }

  const openRemovePicker = () => {
    if (items.length === 0) {
      return
    }
    closeVecMenu()
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
    closeVecMenu()
    setSelectedIndex((prev) => (prev === index ? -1 : index))
  }

  const updateSelected = (nextItem: string) => {
    if (selectedIndex < 0 || selectedIndex >= items.length) {
      return
    }
    const next = [...items]
    next[selectedIndex] = parseItem(nextItem)
    commitItems(next)
  }

  const selectedValue =
    selectedIndex >= 0 && selectedIndex < items.length
      ? formatItem(items[selectedIndex]!)
      : formatItem(defaultItem)

  useEffect(() => {
    if (!vecMenuOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (vecMenuRef.current?.contains(target)) {
        return
      }
      closeVecMenu()
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [vecMenuOpen])

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

      if (vecMenuOpen) {
        event.stopPropagation()
        closeVecMenu()
        return
      }

      if (selectedIndex >= 0) {
        event.stopPropagation()
        setSelectedIndex(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [removePickerOpen, selectedIndex, vecMenuOpen])

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
                {formatBrace(item)}
              </button>
              <span className={styles.itemIndex}>{index}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.vecMenuWrap} ref={vecMenuRef}>
        <button
          aria-expanded={vecMenuOpen}
          aria-haspopup="menu"
          className={[styles.vecTrigger, vecMenuOpen ? styles.vecTriggerOpen : '']
            .filter(Boolean)
            .join(' ')}
          onClick={toggleVecMenu}
          type="button"
        >
          {itemLabel}
        </button>
        {vecMenuOpen ? (
          <div aria-label={`Ações ${itemLabel}`} className={styles.vecSubmenu} role="menu">
            <button className={styles.vecSubmenuItem} onClick={addItem} role="menuitem" type="button">
              + {itemLabel}
            </button>
            <button
              className={styles.vecSubmenuItem}
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
          {renderEditor({ value: selectedValue, onChange: updateSelected })}
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
