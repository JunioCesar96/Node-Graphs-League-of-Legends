import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { ListVector4Picker } from '@/components/molecules/ListVector4Picker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { formatListVector4Preview, normalizeListVector4String, parseListVector4String } from '@/core/listVector4Value'

import styles from '@/components/molecules/ParameterListVector4Input.module.css'

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 560

type ParameterListVector4InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterListVector4Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterListVector4InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const items = parseListVector4String(value)
  const previewLabel = formatListVector4Preview(items)

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
        aria-label={`${ariaLabel} — abrir editor List[Vec4]`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        type="button"
      >
        {items.length}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="listVector4"
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
          ariaLabel={`${ariaLabel} — List[Vec4]`}
          layerTestId="listVector4"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <ListVector4Picker
            onChange={(next) => onCommit(normalizeListVector4String(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
