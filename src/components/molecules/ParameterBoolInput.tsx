import { useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

import { normalizeBoolString, parseBoolString } from '@/core/boolValue'
import { PARAMETER_PICKER_OPEN_DATASET } from '@/core/parameterPickerModal'

import styles from '@/components/molecules/ParameterBoolInput.module.css'

const OPTIONS = [
  { value: 'false', label: 'false' },
  { value: 'true', label: 'true' },
] as const

type ParameterBoolInputProps = {
  ariaLabel: string
  className?: string
  parameterType?: 'bool' | 'flag'
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterBoolInput({
  ariaLabel,
  className,
  parameterType = 'bool',
  value,
  onCommit,
  onFocusChange,
}: ParameterBoolInputProps) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number } | null>(
    null,
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayValue = normalizeBoolString(value)

  const closeMenu = () => {
    setOpen(false)
    onFocusChange?.(false)
  }

  const openMenu = () => {
    const el = wrapRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    setMenuPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.max(rect.width, 112),
    })
    setOpen(true)
    onFocusChange?.(true)
  }

  const pick = (next: string) => {
    onCommit(normalizeBoolString(next))
    closeMenu()
  }

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset[PARAMETER_PICKER_OPEN_DATASET] = 'true'

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      delete document.body.dataset[PARAMETER_PICKER_OPEN_DATASET]
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')} ref={wrapRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        data-parameter-type={parameterType}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open ? closeMenu() : openMenu()
          }
          if (event.key === 'Escape') {
            closeMenu()
          }
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            openMenu()
          }
        }}
        type="button"
      >
        {displayValue}
      </button>
      {open && menuPosition
        ? createPortal(
            <div className={styles.layer} data-parameter-picker-layer="bool" role="presentation">
              <div
                aria-hidden
                className={styles.backdrop}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeMenu()
                }}
                onWheel={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
              />
              <div
                ref={menuRef}
                aria-label={`${ariaLabel} — opções`}
                className={styles.menu}
                role="listbox"
                style={{
                  left: menuPosition.left,
                  top: menuPosition.top,
                  minWidth: menuPosition.width,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                {OPTIONS.map((option) => {
                  const selected = parseBoolString(displayValue) === parseBoolString(option.value)
                  return (
                    <button
                      key={option.value}
                      aria-selected={selected}
                      className={[
                        styles.option,
                        option.value === 'false' ? styles.optionFalse : '',
                        selected ? styles.optionSelected : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        pick(option.value)
                      }}
                      role="option"
                      type="button"
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
