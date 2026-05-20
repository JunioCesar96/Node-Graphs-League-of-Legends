import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { Mtx44Picker } from '@/components/molecules/Mtx44Picker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { formatMtx44Preview, normalizeMtx44String, parseMtx44String, semanticFromMtx44 } from '@/core/mtx44Value'

import styles from '@/components/molecules/ParameterMtx44Input.module.css'

const PANEL_WIDTH = 340
const PANEL_HEIGHT = 440

type ParameterMtx44InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterMtx44Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterMtx44InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const preview = formatMtx44Preview(semanticFromMtx44(parseMtx44String(value)))

  const closePicker = () => {
    setOpen(false)
    onFocusChange?.(false)
  }

  const openPicker = () => {
    const el = wrapRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setPopoverUp(spaceBelow < PANEL_HEIGHT && rect.top > PANEL_HEIGHT)
    setAnchor({ left: rect.right, top: rect.bottom, width: rect.width })
    setOpen(true)
    onFocusChange?.(true)
  }

  return (
    <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')} ref={wrapRef}>
      <button
        aria-label={`${ariaLabel} — abrir seletor mtx44`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        title={preview}
        type="button"
      >
        <span className={styles.previewLabel} aria-hidden>
          4×4
        </span>
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="mtx44"
        onClick={() => (open ? closePicker() : openPicker())}
        onFocus={() => openPicker()}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open ? closePicker() : openPicker()
          }
          if (event.key === 'Escape') {
            closePicker()
          }
        }}
        readOnly
        title="Clique para abrir o seletor mtx44 (escala e translação)"
        type="text"
        value={preview}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — seletor mtx44`}
          layerTestId="mtx44"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <Mtx44Picker
            onChange={(next) => onCommit(normalizeMtx44String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
