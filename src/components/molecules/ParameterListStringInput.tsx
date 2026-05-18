import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { ListStringPicker } from '@/components/molecules/ListStringPicker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import {
  formatListStringPreview,
  normalizeListStringString,
  parseListStringString,
} from '@/core/listStringValue'

import styles from '@/components/molecules/ParameterListVector4Input.module.css'

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 480

type ParameterListStringInputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterListStringInput({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterListStringInputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const items = parseListStringString(value)
  const previewLabel = formatListStringPreview(items)

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
        aria-label={`${ariaLabel} — abrir editor List[string]`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        style={{ color: 'var(--syntax-string)' }}
        type="button"
      >
        {items.length}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="listString"
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
          ariaLabel={`${ariaLabel} — List[string]`}
          layerTestId="listString"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <ListStringPicker
            onChange={(next) => onCommit(normalizeListStringString(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
