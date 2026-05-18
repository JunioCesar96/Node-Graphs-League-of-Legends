import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { ListF32Picker } from '@/components/molecules/ListF32Picker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { formatListF32Preview, normalizeListF32String, parseListF32String } from '@/core/listF32Value'

import styles from '@/components/molecules/ParameterListVector4Input.module.css'

const PANEL_WIDTH = 420
const PANEL_HEIGHT = 480

type ParameterListF32InputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterListF32Input({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterListF32InputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const items = parseListF32String(value)
  const previewLabel = formatListF32Preview(items)

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
        aria-label={`${ariaLabel} — abrir editor List[f32]`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        style={{ color: 'var(--syntax-float)' }}
        type="button"
      >
        {items.length}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="listF32"
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
          ariaLabel={`${ariaLabel} — List[f32]`}
          layerTestId="listF32"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <ListF32Picker onChange={(next) => onCommit(normalizeListF32String(next))} value={value} />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
