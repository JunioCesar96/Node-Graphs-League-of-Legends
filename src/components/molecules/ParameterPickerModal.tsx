import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { PARAMETER_PICKER_OPEN_DATASET } from '@/core/parameterPickerModal'

import styles from '@/components/molecules/ParameterPickerModal.module.css'

export type ParameterPickerAnchor = {
  left: number
  top: number
  width: number
}

type ParameterPickerModalProps = {
  anchor: ParameterPickerAnchor
  ariaLabel: string
  children: ReactNode
  layerTestId?: string
  onClose: () => void
  open: boolean
  panelHeight: number
  panelWidth: number
  popoverUp: boolean
}

export function computeParameterPickerPosition(
  anchor: ParameterPickerAnchor,
  panelWidth: number,
  panelHeight: number,
  popoverUp: boolean,
): { left: number; top: number } {
  return {
    left: Math.max(8, Math.min(anchor.left - panelWidth, window.innerWidth - panelWidth - 8)),
    top: popoverUp ? anchor.top - panelHeight - 8 : anchor.top + 8,
  }
}

export function ParameterPickerModal({
  anchor,
  ariaLabel,
  children,
  layerTestId,
  onClose,
  open,
  panelHeight,
  panelWidth,
  popoverUp,
}: ParameterPickerModalProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset[PARAMETER_PICKER_OPEN_DATASET] = 'true'

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      delete document.body.dataset[PARAMETER_PICKER_OPEN_DATASET]
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const position = computeParameterPickerPosition(anchor, panelWidth, panelHeight, popoverUp)

  return createPortal(
    <div
      className={styles.layer}
      data-parameter-picker-layer={layerTestId ?? 'true'}
      role="presentation"
    >
      <div
        aria-hidden
        className={styles.backdrop}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }}
        onWheel={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      />
      <div
        aria-label={ariaLabel}
        aria-modal="true"
        className={styles.popoverShell}
        role="dialog"
        style={position}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
