import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import {
  clampScalarBetween,
  scalarFromSliderFraction,
  sliderFractionFromScalar,
} from '@/core/vector3Value'

import styles from '@/components/molecules/VectorAxisSliderColumn.module.css'

export function displaySliderValue(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  const text = String(rounded)
  if (text.includes('.')) {
    return text
  }
  return text.padStart(2, '0')
}

type VectorAxisSliderColumnProps = {
  accentCss?: CSSProperties
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  value: number
}

export function VectorAxisSliderColumn({
  accentCss,
  label,
  max,
  min,
  onChange,
  value,
}: VectorAxisSliderColumnProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const fraction = sliderFractionFromScalar(value, min, max)
  const thumbTop = `${(1 - fraction) * 100}%`
  const fillHeight = `${fraction * 100}%`

  const applyClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current
      if (!track) {
        return
      }
      const rect = track.getBoundingClientRect()
      const t = 1 - clampScalarBetween((clientY - rect.top) / rect.height, 0, 1)
      onChange(scalarFromSliderFraction(t, min, max))
    },
    [max, min, onChange],
  )

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    applyClientY(event.clientY)
  }

  useEffect(() => {
    if (!dragging) {
      return
    }

    const previousUserSelect = document.body.style.userSelect
    const previousTouchAction = document.body.style.touchAction
    document.body.style.userSelect = 'none'
    document.body.style.touchAction = 'none'

    const onMove = (event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      applyClientY(event.clientY)
    }
    const onUp = () => setDragging(false)

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.touchAction = previousTouchAction
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [applyClientY, dragging])

  return (
    <div className={styles.axisColumn} style={accentCss}>
      <div
        className={styles.trackWrap}
        onPointerDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div
          ref={trackRef}
          aria-label={`${label} — slider`}
          aria-valuemax={max}
          aria-valuemin={min}
          aria-valuenow={value}
          className={styles.track}
          onPointerDown={startDrag}
          role="slider"
        >
          <span className={styles.trackLine} aria-hidden />
          <span className={styles.trackFill} style={{ height: fillHeight }} aria-hidden />
          <span className={styles.trackBase} aria-hidden />
          <span className={styles.floatValue} style={{ top: thumbTop }}>
            ({displaySliderValue(value)})
          </span>
          <span className={styles.thumb} style={{ top: thumbTop }} aria-hidden />
        </div>
      </div>
      <input
        aria-label={`${label} — valor`}
        className={styles.axisInput}
        inputMode="decimal"
        onChange={(event) => {
          const n = Number.parseFloat(event.target.value)
          if (Number.isFinite(n)) {
            onChange(clampScalarBetween(n, min, max))
          }
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="text"
        value={displaySliderValue(value)}
      />
      <span className={styles.axisLabel}>{label}</span>
    </div>
  )
}
