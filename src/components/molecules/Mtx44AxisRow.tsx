import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import { displaySliderValue } from '@/components/molecules/VectorAxisSliderColumn'
import { clampScalarBetween, scalarFromSliderFraction, sliderFractionFromScalar } from '@/core/vector3Value'

import styles from '@/components/molecules/Mtx44AxisRow.module.css'

type Mtx44AxisRowProps = {
  accentCss?: CSSProperties
  axisLabel: string
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step?: number
  value: number
}

function parseInput(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function Mtx44AxisRow({
  accentCss,
  axisLabel,
  label,
  max,
  min,
  onChange,
  step = 0.1,
  value,
}: Mtx44AxisRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const fraction = sliderFractionFromScalar(value, min, max)
  const thumbLeft = `${fraction * 100}%`
  const fillWidth = `${fraction * 100}%`

  const applyClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) {
        return
      }
      const rect = track.getBoundingClientRect()
      const t = clampScalarBetween((clientX - rect.left) / rect.width, 0, 1)
      onChange(scalarFromSliderFraction(t, min, max))
    },
    [max, min, onChange],
  )

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    applyClientX(event.clientX)
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
      applyClientX(event.clientX)
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
  }, [applyClientX, dragging])

  const nudge = (delta: number) => {
    onChange(clampScalarBetween(value + delta, min, max))
  }

  return (
    <div className={styles.row} style={accentCss}>
      <span className={styles.axisName}>
        <span className={styles.axisLetter} style={accentCss}>
          {axisLabel}
        </span>
        <span className={styles.axisSuffix}> Axis</span>
      </span>

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
          <span className={styles.trackFill} style={{ width: fillWidth }} aria-hidden />
          <span className={styles.thumb} style={{ left: thumbLeft }} aria-hidden />
        </div>
      </div>

      <div className={styles.valueGroup}>
        <button
          aria-label={`${label} — diminuir`}
          className={styles.stepBtn}
          onClick={() => nudge(-step)}
          type="button"
        >
          −
        </button>
        <input
          aria-label={`${label} — valor`}
          className={styles.valueInput}
          inputMode="decimal"
          onChange={(event) => onChange(parseInput(event.target.value, value))}
          onPointerDown={(event) => event.stopPropagation()}
          type="text"
          value={displaySliderValue(value)}
        />
        <button
          aria-label={`${label} — aumentar`}
          className={styles.stepBtn}
          onClick={() => nudge(step)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  )
}
