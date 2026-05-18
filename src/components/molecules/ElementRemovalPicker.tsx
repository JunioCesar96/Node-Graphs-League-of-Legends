import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import type { NodeElementListItem } from '@/core/listNodeElements'

import styles from './NodeInstanceStringPicker.module.css'
import pickerStyles from './ElementRemovalPicker.module.css'
import menuStyles from './ElementMenu.module.css'

export const ELEMENT_REMOVAL_PICKER_ROOT_ATTR = 'data-element-removal-picker'

type ElementRemovalPickerProps = {
  elements: NodeElementListItem[]
  nodeTitle: string
  onClose: () => void
  onConfirm: (item: NodeElementListItem) => void
  onSelectKey: (key: string | null) => void
  open: boolean
  selectedKey: string | null
  titleDomId?: string
  dialogTitle?: string
  dialogSubtitle?: string
  hideKindLabel?: boolean
  confirmLabel?: string
}

function kindLabel(kind: NodeElementListItem['kind']): string {
  if (kind === 'parameter') {
    return 'Parâmetro'
  }
  if (kind === 'listEmbedBlock') {
    return 'LIST_EMBED'
  }
  if (kind === 'listEmbedSlot') {
    return 'Estrutura interna'
  }
  return 'Internal_Structure'
}

export function itemKey(item: NodeElementListItem): string {
  return `${item.kind}:${item.id}`
}

function matchesRemovalQuery(item: NodeElementListItem, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  const haystack = `${item.name} ${item.meta ?? ''} ${kindLabel(item.kind)}`.toLowerCase()
  return haystack.includes(normalized)
}

export function ElementRemovalPicker({
  elements,
  nodeTitle,
  onClose,
  onConfirm,
  onSelectKey,
  open,
  selectedKey,
  titleDomId = 'element-removal-title',
  dialogTitle = 'Remover elemento',
  dialogSubtitle,
  hideKindLabel = false,
  confirmLabel = 'Confirmar',
}: ElementRemovalPickerProps) {
  const [query, setQuery] = useState('')

  const visibleElements = useMemo(
    () => elements.filter((element) => matchesRemovalQuery(element, query)),
    [elements, query],
  )

  const selected =
    selectedKey !== null
      ? visibleElements.find((element) => itemKey(element) === selectedKey) ??
        elements.find((element) => itemKey(element) === selectedKey) ??
        null
      : null

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    if (selectedKey !== null && !elements.some((element) => itemKey(element) === selectedKey)) {
      onSelectKey(null)
    }
  }, [elements, onSelectKey, open, selectedKey])

  useEffect(() => {
    if (!open) {
      return
    }
    if (
      selectedKey !== null &&
      !visibleElements.some((element) => itemKey(element) === selectedKey)
    ) {
      onSelectKey(null)
    }
  }, [onSelectKey, open, selectedKey, visibleElements])

  if (!open || typeof document === 'undefined') {
    return null
  }

  const handleClose = () => {
    setQuery('')
    onSelectKey(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!selected) {
      return
    }
    onConfirm(selected)
    setQuery('')
    onSelectKey(null)
  }

  const Root = 'div' as const

  return createPortal(
    <Root
      {...{ [ELEMENT_REMOVAL_PICKER_ROOT_ATTR]: '' }}
      aria-labelledby={titleDomId}
      aria-modal="true"
      className={`${styles.backdrop} ${pickerStyles.backdrop}`}
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
    >
      <Root
        className={styles.dialog}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
      >
        <h2 className={styles.title} id={titleDomId}>
          {dialogTitle}
        </h2>
        <p className={styles.subtitle}>
          {dialogSubtitle ?? (
            <>
              Escolha qual elemento de <strong>{nodeTitle}</strong> deseja excluir.
            </>
          )}
        </p>

        <input
          aria-label="Pesquisar elemento a remover"
          className={`${menuStyles.searchInput} ${pickerStyles.searchInput}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar por nome, tipo ou LIST_EMBED…"
          type="search"
          value={query}
        />

        <p className={pickerStyles.searchSummary}>
          {visibleElements.length === 0
            ? 'Nenhum elemento corresponde à pesquisa.'
            : `${String(visibleElements.length)} de ${String(elements.length)}`}
        </p>

        <ul className={styles.list}>
          {visibleElements.map((element) => {
            const key = itemKey(element)
            const isSelected = selectedKey === key

            return (
              <li className={styles.listItem} key={key}>
                <button
                  aria-pressed={isSelected}
                  className={`${styles.pickRow} ${isSelected ? pickerStyles.rowSelected : ''}`}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelectKey(key)
                  }}
                  type="button"
                >
                  <span className={styles.pickMain}>
                    <span className={styles.pickName}>{element.name}</span>
                    {element.meta ? <span className={styles.pickValue}>{element.meta}</span> : null}
                  </span>
                  {hideKindLabel ? null : (
                    <span className={styles.pickRowMeta}>{kindLabel(element.kind)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <Root className={pickerStyles.actionsRow}>
          <button className={styles.close} onClick={handleClose} type="button">
            Fechar
          </button>
          <button
            className={pickerStyles.confirm}
            disabled={selected === null}
            onClick={handleConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </Root>
      </Root>
    </Root>,
    document.body,
  )
}
