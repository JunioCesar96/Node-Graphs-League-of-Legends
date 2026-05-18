import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import type { NodeElementListItem } from '@/core/listNodeElements'

import styles from './NodeInstanceStringPicker.module.css'
import pickerStyles from './ElementRemovalPicker.module.css'

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
  /** Título do diálogo (predefinido: «Remover elemento»). */
  dialogTitle?: string
  /** Subtítulo; `nodeTitle` continua disponível no texto predefinido. */
  dialogSubtitle?: string
  /** Oculta a etiqueta «Parâmetro» / «Internal_Structure» à direita. */
  hideKindLabel?: boolean
  confirmLabel?: string
}

function kindLabel(kind: NodeElementListItem['kind']): string {
  return kind === 'parameter' ? 'Parâmetro' : 'Internal_Structure'
}

export function itemKey(item: NodeElementListItem): string {
  return `${item.kind}:${item.id}`
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
  const selected =
    selectedKey !== null ? elements.find((element) => itemKey(element) === selectedKey) ?? null : null

  useEffect(() => {
    if (!open) {
      return
    }
    if (selectedKey !== null && !elements.some((element) => itemKey(element) === selectedKey)) {
      onSelectKey(null)
    }
  }, [elements, onSelectKey, open, selectedKey])

  if (!open || typeof document === 'undefined') {
    return null
  }

  const handleClose = () => {
    onSelectKey(null)
    onClose()
  }

  const handleConfirm = () => {
    if (!selected) {
      return
    }
    onConfirm(selected)
    onSelectKey(null)
  }

  return createPortal(
    <div
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
      <div
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

        <ul className={styles.list}>
          {elements.map((element) => {
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

        <div className={pickerStyles.actionsRow}>
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
        </div>
      </div>
    </div>,
    document.body,
  )
}
