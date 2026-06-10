import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  displaySliderValue,
  VectorAxisSliderColumn,
} from '@/components/molecules/VectorAxisSliderColumn'
import {
  clampScalarBetween,
  deriveSliderRange,
  expandSliderRangeToFitVector,
  formatVector3String,
  parseVector3String,
  type Vector3,
} from '@/core/vector3Value'

import styles from '@/components/molecules/Vec3SliderPicker.module.css'

type Vec3SliderPickerProps = {
  value: string
  onChange: (next: string) => void
}

type AxisKey = 'x' | 'y' | 'z'

const AXES: { key: AxisKey; label: string }[] = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'z', label: 'Z' },
]

function parseRangeInput(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function Vec3SliderPicker({ value, onChange }: Vec3SliderPickerProps) {
  const vector = useMemo(() => parseVector3String(value), [value])
  const fittedRange = useMemo(() => deriveSliderRange(vector), [vector.x, vector.y, vector.z])

  const [sliderMin, setSliderMin] = useState(fittedRange.min)
  const [sliderMax, setSliderMax] = useState(fittedRange.max)

  useEffect(() => {
    setSliderMin(fittedRange.min)
    setSliderMax(fittedRange.max)
  }, [fittedRange.min, fittedRange.max])

  const commitVector = useCallback(
    (next: Vector3) => {
      onChange(formatVector3String(next))
    },
    [onChange],
  )

  const setChannel = (channel: AxisKey, nextValue: number) => {
    const next = { ...vector, [channel]: nextValue }
    const expanded = expandSliderRangeToFitVector({ min: sliderMin, max: sliderMax }, next)
    setSliderMin(expanded.min)
    setSliderMax(expanded.max)
    commitVector({
      x: clampScalarBetween(next.x, expanded.min, expanded.max),
      y: clampScalarBetween(next.y, expanded.min, expanded.max),
      z: clampScalarBetween(next.z, expanded.min, expanded.max),
    })
  }

  const onMinChange = (raw: string) => {
    const nextMin = parseRangeInput(raw, sliderMin)
    let nextMax = sliderMax
    if (nextMin > nextMax) {
      nextMax = nextMin + 1
    }
    setSliderMin(nextMin)
    setSliderMax(nextMax)
    commitVector({
      x: clampScalarBetween(vector.x, nextMin, nextMax),
      y: clampScalarBetween(vector.y, nextMin, nextMax),
      z: clampScalarBetween(vector.z, nextMin, nextMax),
    })
  }

  const onMaxChange = (raw: string) => {
    const nextMax = parseRangeInput(raw, sliderMax)
    let nextMin = sliderMin
    if (nextMax < nextMin) {
      nextMin = nextMax - 1
    }
    setSliderMax(nextMax)
    setSliderMin(nextMin)
    commitVector({
      x: clampScalarBetween(vector.x, nextMin, nextMax),
      y: clampScalarBetween(vector.y, nextMin, nextMax),
      z: clampScalarBetween(vector.z, nextMin, nextMax),
    })
  }

  return (
    <div
      className={styles.picker}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className={styles.rangeHeader}>
        <span className={styles.rangeTitle}>Slider size</span>
        <div className={styles.rangeFields}>
          <label className={styles.rangeField}>
            <input
              className={styles.rangeInput}
              inputMode="decimal"
              onChange={(event) => onMinChange(event.target.value)}
              type="text"
              value={displaySliderValue(sliderMin)}
            />
            <span className={styles.rangeLabel}>min</span>
          </label>
          <label className={styles.rangeField}>
            <input
              className={styles.rangeInput}
              inputMode="decimal"
              onChange={(event) => onMaxChange(event.target.value)}
              type="text"
              value={displaySliderValue(sliderMax)}
            />
            <span className={styles.rangeLabel}>max</span>
          </label>
        </div>
      </div>

      <div className={styles.slidersRow}>
        {AXES.map(({ key, label }) => (
          <VectorAxisSliderColumn
            key={key}
            label={label}
            max={sliderMax}
            min={sliderMin}
            onChange={(next) => setChannel(key, next)}
            value={vector[key]}
          />
        ))}
      </div>
    </div>
  )
}
