import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { LinkPathPicker } from '@/components/molecules/LinkPathPicker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import { formatLinkPathPreview, normalizeLinkPath } from '@/core/linkValue'

import styles from '@/components/molecules/ParameterLinkInput.module.css'

const PANEL_WIDTH = 400
const PANEL_HEIGHT = 420

type ParameterLinkInputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterLinkInput({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterLinkInputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)

  const preview = formatLinkPathPreview(value)

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
        aria-label={`${ariaLabel} — abrir seletor link`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        title={value || preview}
        type="button"
      >
        <span className={styles.previewLabel} aria-hidden>
          /
        </span>
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="link"
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
        title="Clique para abrir o editor de caminho (link)"
        type="text"
        value={preview}
      />
      {anchor ? (
        <ParameterPickerModal
          anchor={anchor}
          ariaLabel={`${ariaLabel} — seletor link`}
          layerTestId="link"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={PANEL_WIDTH}
          popoverUp={popoverUp}
        >
          <LinkPathPicker
            onChange={(next) => onCommit(normalizeLinkPath(next))}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}

