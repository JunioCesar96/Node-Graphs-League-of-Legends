import { useCallback, useMemo, useState } from 'react'

import { RgbaColorPicker } from '@/components/molecules/RgbaColorPicker'
import {
  ParameterPickerModal,
  type ParameterPickerAnchor,
} from '@/components/molecules/ParameterPickerModal'
import {
  colorVec4DisplayFormatLabel,
  formatColorVec4Display,
  nextColorVec4DisplayFormat,
  readColorVec4DisplayFormat,
  type ColorVec4DisplayFormat,
} from '@/core/colorVec4DisplayFormat'
import {
  emitAddonColorVec4PanelChange,
  syncColorPanelFromLiteral,
} from '@/core/addonColorVec4Input'
import { normalizeRgbaString, parseRgbaString } from '@/core/rgbaColor'

import styles from '@/components/molecules/AddonColorVec4Picker.module.css'

const PANEL_WIDTH = 280
const PANEL_HEIGHT = 360

type AddonColorVec4PickerProps = {
  anchor: ParameterPickerAnchor
  panel: HTMLElement
  popoverUp: boolean
  onClose: () => void
}

export function AddonColorVec4Picker({
  anchor,
  panel,
  popoverUp,
  onClose,
}: AddonColorVec4PickerProps) {
  const hidden = panel.querySelector('input[name="literal"]')
  const initialLiteral =
    hidden instanceof HTMLInputElement ? hidden.value : '1, 1, 1, 1'

  const [value, setValue] = useState(initialLiteral)
  const [displayFormat, setDisplayFormat] = useState<ColorVec4DisplayFormat>(() =>
    readColorVec4DisplayFormat(panel),
  )

  const rgba = useMemo(() => parseRgbaString(value), [value])
  const displayValue = useMemo(
    () => formatColorVec4Display(displayFormat, rgba.r, rgba.g, rgba.b, rgba.a),
    [displayFormat, rgba.a, rgba.b, rgba.g, rgba.r],
  )

  const commitValue = useCallback(
    (next: string) => {
      const normalized = normalizeRgbaString(next)
      setValue(normalized)
      syncColorPanelFromLiteral(panel, normalized)
      emitAddonColorVec4PanelChange(panel)
    },
    [panel],
  )

  const cycleFormat = () => {
    setDisplayFormat((current) => {
      const next = nextColorVec4DisplayFormat(current)
      const select = panel.querySelector('[data-color-vec4-format]')
      if (select instanceof HTMLSelectElement) {
        select.value = next
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
      return next
    })
  }

  return (
    <ParameterPickerModal
      anchor={anchor}
      ariaLabel="Seletor de cor Vec4"
      layerTestId="addon-color-vec4"
      onClose={onClose}
      open
      panelHeight={PANEL_HEIGHT}
      panelWidth={PANEL_WIDTH}
      popoverUp={popoverUp}
    >
      <div className={styles.wrap}>
        <RgbaColorPicker onChange={commitValue} value={value} />
        <div className={styles.formatRow}>
          <button
            className={styles.formatButton}
            onClick={cycleFormat}
            title="Alternar formato (HEX / RGB / HSL / VEC4)"
            type="button"
          >
            {colorVec4DisplayFormatLabel(displayFormat)}
          </button>
          <input
            className={styles.formatValue}
            readOnly
            type="text"
            value={displayValue}
          />
        </div>
      </div>
    </ParameterPickerModal>
  )
}
