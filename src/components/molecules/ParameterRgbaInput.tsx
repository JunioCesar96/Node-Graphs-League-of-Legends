import { useRef, useState } from 'react'

import type { KeyboardEvent } from 'react'



import {

  ParameterPickerModal,

  type ParameterPickerAnchor,

} from '@/components/molecules/ParameterPickerModal'

import { RgbaColorPicker } from '@/components/molecules/RgbaColorPicker'

import { normalizeRgbaString, parseRgbaString, rgbaToCss } from '@/core/rgbaColor'



import styles from '@/components/molecules/ParameterRgbaInput.module.css'



const PANEL_WIDTH = 280

const PANEL_HEIGHT = 320



type ParameterRgbaInputProps = {

  ariaLabel: string

  className?: string

  value: string

  onCommit: (value: string) => void

  onFocusChange?: (focused: boolean) => void

}



export function ParameterRgbaInput({

  ariaLabel,

  className,

  value,

  onCommit,

  onFocusChange,

}: ParameterRgbaInputProps) {

  const [open, setOpen] = useState(false)

  const [popoverUp, setPopoverUp] = useState(false)

  const wrapRef = useRef<HTMLDivElement>(null)

  const [anchor, setAnchor] = useState<ParameterPickerAnchor | null>(null)



  const previewCss = rgbaToCss(parseRgbaString(value))



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

        aria-label={`${ariaLabel} — abrir seletor de cor`}

        className={styles.swatch}

        onClick={() => (open ? closePicker() : openPicker())}

        style={{ background: previewCss }}

        type="button"

      />

      <input

        aria-label={ariaLabel}

        className={styles.input}

        data-parameter-type="rgba"

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

        title="Clique para abrir o seletor RGBA"

        type="text"

        value={value}

      />

      {anchor ? (

        <ParameterPickerModal

          anchor={anchor}

          ariaLabel={`${ariaLabel} — seletor de cor`}

          layerTestId="rgba"

          onClose={closePicker}

          open={open}

          panelHeight={PANEL_HEIGHT}

          panelWidth={PANEL_WIDTH}

          popoverUp={popoverUp}

        >

          <RgbaColorPicker

            onChange={(next) => {

              onCommit(normalizeRgbaString(next))

            }}

            value={value}

          />

        </ParameterPickerModal>

      ) : null}

    </div>

  )

}


