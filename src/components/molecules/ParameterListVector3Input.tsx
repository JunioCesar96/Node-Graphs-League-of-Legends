import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { ListVector3Picker } from '@/components/molecules/ListVector3Picker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import {
  formatListVector3Preview,
  normalizeListVector3String,
  parseListVector3String,
} from '@/core/listVector3Value'

import styles from '@/components/molecules/ParameterListVector4Input.module.css'

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 560

type ParameterListVector3InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterListVector3Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterListVector3InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const items = parseListVector3String(value)
  const previewLabel = formatListVector3Preview(items)

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
        aria-label={`${ariaLabel} — abrir editor List[Vec3]`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        style={{ color: 'var(--syntax-vector3)' }}
        type="button"
      >
        {items.length}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="listVector3"
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
        title={previewLabel}
        type="text"
        value={value.replace(/\n/g, ' · ')}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — List[Vec3]`}
          layerTestId="listVector3"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <ListVector3Picker
            onChange={(next) => onCommit(normalizeListVector3String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
