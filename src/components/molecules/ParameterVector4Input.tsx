import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { Vec4SliderPicker } from '@/components/molecules/Vec4SliderPicker'
import {
  deriveSliderRange,
  normalizeVector4String,
  parseVector4String,
  sliderFractionFromScalar,
} from '@/core/vector4Value'

import styles from '@/components/molecules/ParameterVector4Input.module.css'

const PANEL_WIDTH = 392
const PANEL_HEIGHT = 340

const PREVIEW_CHANNELS = ['x', 'y', 'z', 'w'] as const

type ParameterVector4InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterVector4Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterVector4InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const vector = parseVector4String(value)
  const range = deriveSliderRange(vector)

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
        aria-label={`${ariaLabel} — abrir seletor vec4`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        type="button"
      >
        {PREVIEW_CHANNELS.map((channel) => {
          const fraction = sliderFractionFromScalar(vector[channel], range.min, range.max)
          return (
            <span
              key={channel}
              className={styles.previewBar}
              style={{ height: `${Math.max(18, fraction * 100)}%` }}
              aria-hidden
            />
          )
        })}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="vector4"
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
        title="Clique para abrir o seletor Vec4"
        type="text"
        value={value}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — seletor Vec4`}
          layerTestId="vector4"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <Vec4SliderPicker
            onChange={(next) => onCommit(normalizeVector4String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
