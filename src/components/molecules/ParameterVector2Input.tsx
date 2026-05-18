import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { Vec2CoordinatePicker } from '@/components/molecules/Vec2CoordinatePicker'
import {
  normalizeVector2String,
  parseVector2String,
  plotFractionFromVector2,
} from '@/core/vector2Value'

import styles from '@/components/molecules/ParameterVector2Input.module.css'

const PANEL_WIDTH = 300
const PANEL_HEIGHT = 400

type ParameterVector2InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterVector2Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterVector2InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const vector = parseVector2String(value)
  const previewFraction = plotFractionFromVector2(vector, 5, 5, vector.x < 0 || vector.y < 0)

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
        aria-label={`${ariaLabel} — abrir seletor vec2`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        type="button"
      >
        <span
          className={styles.previewDot}
          style={{ left: `${previewFraction.nx * 100}%`, top: `${previewFraction.ny * 100}%` }}
          aria-hidden
        />
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="vector2"
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
        title="Clique para abrir o seletor Vec2"
        type="text"
        value={value}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — seletor Vec2`}
          layerTestId="vector2"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <Vec2CoordinatePicker
            onChange={(next) => onCommit(normalizeVector2String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
