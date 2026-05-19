import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { MapHashLinkPicker } from '@/components/molecules/MapHashLinkPicker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import {
  formatMapHashLinkPreview,
  normalizeMapHashLinkString,
  parseMapHashLinkString,
} from '@/core/mapHashLinkValue'

import styles from '@/components/molecules/ParameterListVector4Input.module.css'

const PANEL_WIDTH_COMPACT = 520
const PANEL_WIDTH_WITH_LINK = 900
const PANEL_HEIGHT = 560

type ParameterMapHashLinkInputProps = {
  ariaLabel: string
  className?: string
  value: string
  onCommit: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function ParameterMapHashLinkInput({
  ariaLabel,
  className,
  value,
  onCommit,
  onFocusChange,
}: ParameterMapHashLinkInputProps) {
  const [open, setOpen] = useState(false)
  const [popoverUp, setPopoverUp] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)

  const panelWidth = linkEditorOpen ? PANEL_WIDTH_WITH_LINK : PANEL_WIDTH_COMPACT
  const items = parseMapHashLinkString(value)
  const previewLabel = formatMapHashLinkPreview(items)

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
    setLinkEditorOpen(false)
    setAnchor({ left: rect.right, top: rect.bottom, width: rect.width })
    setOpen(true)
    onFocusChange?.(true)
  }

  return (
    <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')} ref={wrapRef}>
      <button
        aria-label={`${ariaLabel} — abrir editor Map[hash,link]`}
        className={styles.preview}
        onClick={() => (open ? closePicker() : openPicker())}
        style={{ color: 'var(--syntax-link)' }}
        type="button"
      >
        {items.length}
      </button>
      <input
        aria-label={ariaLabel}
        className={styles.input}
        data-parameter-type="mapHashLink"
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
          ariaLabel={`${ariaLabel} — Map[hash,link]`}
          layerTestId="mapHashLink"
          onClose={closePicker}
          open={open}
          panelHeight={PANEL_HEIGHT}
          panelWidth={panelWidth}
          popoverUp={popoverUp}
        >
          <MapHashLinkPicker
            onChange={(next) => onCommit(normalizeMapHashLinkString(next))}
            onLinkEditorOpenChange={setLinkEditorOpen}
            value={value}
          />
        </ParameterPickerModal>
      ) : null}
    </div>
  )
}
