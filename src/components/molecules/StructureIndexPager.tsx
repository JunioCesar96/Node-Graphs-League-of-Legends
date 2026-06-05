import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import styles from './StructureIndexPager.module.css'

type StructureIndexPagerProps = {
  selectedIndex: number
  total: number
  onSelectedIndexChange: (index: number) => void
  onCounterClick?: () => void
  className?: string
  editableCounter?: boolean
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function StructureIndexPager({
  selectedIndex,
  total,
  onSelectedIndexChange,
  onCounterClick,
  className,
  editableCounter = false,
}: StructureIndexPagerProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const maxIndex = Math.max(0, total - 1)
  const safeIndex = total > 0 ? Math.min(Math.max(0, selectedIndex), maxIndex) : 0
  const displayIndex = safeIndex

  useEffect(() => {
    if (!editing) {
      setDraft(String(displayIndex))
    }
  }, [displayIndex, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (total <= 0) {
    return null
  }

  const beginEditing = () => {
    if (!editableCounter) {
      onCounterClick?.()
      return
    }
    setDraft(String(displayIndex))
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(String(displayIndex))
    setEditing(false)
  }

  const commitEditing = () => {
    const trimmed = digitsOnly(draft)
    const parsed = trimmed === '' ? displayIndex : Number.parseInt(trimmed, 10)
    const nextIndex = Number.isFinite(parsed)
      ? Math.min(Math.max(0, parsed), maxIndex)
      : displayIndex
    onSelectedIndexChange(nextIndex)
    setEditing(false)
  }

  const onDraftChange = (raw: string) => {
    const nextDigits = digitsOnly(raw)
    if (nextDigits === '') {
      setDraft('')
      return
    }
    const parsed = Number.parseInt(nextDigits, 10)
    if (!Number.isFinite(parsed) || parsed > maxIndex) {
      return
    }
    setDraft(nextDigits)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitEditing()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
    }
  }

  return (
    <div
      aria-label="Navegação por índice"
      className={[styles.pager, className ?? ''].filter(Boolean).join(' ')}
      role="navigation"
    >
      <button
        aria-label="Entrada anterior"
        className={styles.navButton}
        disabled={safeIndex <= 0}
        onClick={() => onSelectedIndexChange(safeIndex - 1)}
        type="button"
      >
        ‹
      </button>
      {editableCounter ? (
        <div className={styles.counterWrap}>
          {editing ? (
            <>
              <input
                ref={inputRef}
                aria-label={`Índice de 0 a ${maxIndex}`}
                className={styles.counterInput}
                inputMode="numeric"
                pattern="[0-9]*"
                size={Math.max(draft.length, String(maxIndex).length, 1)}
                type="text"
                value={draft}
                onBlur={commitEditing}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={onInputKeyDown}
                onPointerDown={(event) => event.stopPropagation()}
              />
              <span aria-hidden className={styles.counterSuffix}>
                / {maxIndex}
              </span>
            </>
          ) : (
            <button
              aria-label={`Índice ${displayIndex} de ${maxIndex}. Editar índice.`}
              className={styles.counter}
              onClick={beginEditing}
              type="button"
            >
              {displayIndex} / {maxIndex}
            </button>
          )}
        </div>
      ) : (
        <button
          aria-label={`Índice ${displayIndex} de ${maxIndex}. Abrir lista.`}
          className={styles.counter}
          onClick={onCounterClick}
          type="button"
        >
          {displayIndex} / {maxIndex}
        </button>
      )}
      <button
        aria-label="Entrada seguinte"
        className={styles.navButton}
        disabled={safeIndex >= maxIndex}
        onClick={() => onSelectedIndexChange(safeIndex + 1)}
        type="button"
      >
        ›
      </button>
    </div>
  )
}
