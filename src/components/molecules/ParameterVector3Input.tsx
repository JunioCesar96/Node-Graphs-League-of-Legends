import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { Vec3SliderPicker } from '@/components/molecules/Vec3SliderPicker'
import {
  normalizeVector3String,
  parseVector3String,
  plotFractionFromVector3,
  vec3CursorSizePx,
} from '@/core/vector3Value'

import styles from '@/components/molecules/ParameterVector3Input.module.css'

const PANEL_WIDTH = 308
const PANEL_HEIGHT = 340
const PREVIEW_GRID = 5

type ParameterVector3InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterVector3Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterVector3InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const vector = parseVector3String(value)
  const allowNegative = vector.x < 0 || vector.y < 0 || vector.z < 0
  const previewFraction = plotFractionFromVector3(
    vector,
    PREVIEW_GRID,
    PREVIEW_GRID,
    PREVIEW_GRID,
    allowNegative,
  )
  const zBarHeight = `${Math.max(12, (1 - previewFraction.nz) * 100)}%`
  const previewDotPx = Math.min(10, vec3CursorSizePx(vector.z, 6))

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
        aria-label={`${ariaLabel} — abrir seletor vec3`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        type="button"
      >
        <span
          className={styles.previewDot}
          style={{
            left: `${previewFraction.nx * 100}%`,
            top: `${previewFraction.ny * 100}%`,
            width: previewDotPx,
            height: previewDotPx,
          }}
          aria-hidden
        />
        <span className={styles.previewZBar} style={{ height: zBarHeight }} aria-hidden />
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="vector3"
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
        title="Clique para abrir o seletor Vec3"
        type="text"
        value={value}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — seletor Vec3`}
          layerTestId="vector3"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <Vec3SliderPicker
            onChange={(next) => onCommit(normalizeVector3String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
