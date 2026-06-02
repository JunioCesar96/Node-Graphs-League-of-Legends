import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './TextInputDialog.module.css'

export type TextInputDialogProps = {
  cancelLabel?: string
  confirmLabel?: string
  hint?: string
  initialValue?: string
  inputLabel?: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
  title: string
}

export function TextInputDialog({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  hint,
  initialValue = '',
  inputLabel = 'Nome',
  isOpen,
  onCancel,
  onConfirm,
  title,
}: TextInputDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
    }
  }, [initialValue, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  const trimmed = value.trim()
  const canConfirm = trimmed.length > 0

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
      role="dialog"
    >
      <div className={styles.panel}>
        <p className={styles.title} id={titleId}>
          {title}
        </p>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        <label className={styles.field}>
          {inputLabel}
          <input
            className={styles.input}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canConfirm) {
                event.preventDefault()
                onConfirm(trimmed)
              }
            }}
            ref={inputRef}
            type="text"
            value={value}
          />
        </label>
        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button
            className={styles.primaryButton}
            disabled={!canConfirm}
            onClick={() => onConfirm(trimmed)}
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
