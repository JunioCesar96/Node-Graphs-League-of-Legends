import { useCallback, useMemo, useState } from 'react'

import { Mtx44AxisRow } from '@/components/molecules/Mtx44AxisRow'
import { displaySliderValue } from '@/components/molecules/VectorAxisSliderColumn'
import {
  buildMtx44FromSemantic,
  deriveMtx44SliderRanges,
  formatMtx44StringAsText,
  parseMtx44String,
  semanticFromMtx44,
  type Mtx44Semantic,
} from '@/core/mtx44Value'
import { clampScalarBetween } from '@/core/vector3Value'

import styles from '@/components/molecules/Mtx44Picker.module.css'

type Mtx44PickerProps = {
  value: string
  onChange: (next: string) => void
}

const POSITION_AXES = [
  { key: 'positionX' as const, label: 'Position X', letter: 'X', accent: '#5b9fd4' },
  { key: 'positionY' as const, label: 'Position Y', letter: 'Y', accent: '#d96565' },
  { key: 'positionZ' as const, label: 'Position Z', letter: 'Z', accent: '#6bc96b' },
]

const SCALE_AXES = [
  { key: 'scaleX' as const, label: 'Scale X', letter: 'X', accent: '#5b9fd4' },
  { key: 'scaleY' as const, label: 'Scale Y', letter: 'Y', accent: '#d96565' },
  { key: 'scaleZ' as const, label: 'Scale Z', letter: 'Z', accent: '#6bc96b' },
]

function commitSemantic(onChange: Mtx44PickerProps['onChange'], semantic: Mtx44Semantic) {
  onChange(formatMtx44StringAsText(buildMtx44FromSemantic(semantic)))
}

export function Mtx44Picker({ value, onChange }: Mtx44PickerProps) {
  const semantic = useMemo(() => semanticFromMtx44(parseMtx44String(value)), [value])
  const ranges = useMemo(() => deriveMtx44SliderRanges(semantic), [semantic])

  const [uniformScale, setUniformScale] = useState(
    () => semantic.scaleX === semantic.scaleY && semantic.scaleY === semantic.scaleZ,
  )

  const updateSemantic = useCallback(
    (patch: Partial<Mtx44Semantic>) => {
      commitSemantic(onChange, { ...semantic, ...patch })
    },
    [onChange, semantic],
  )

  const uniformValue = semantic.scaleX

  const setUniformScaleValue = (next: number) => {
    const clamped = clampScalarBetween(next, ranges.scaleMin, ranges.scaleMax)
    updateSemantic({ scaleX: clamped, scaleY: clamped, scaleZ: clamped })
  }

  const resetTranslation = () => {
    updateSemantic({ positionX: 0, positionY: 0, positionZ: 0 })
  }

  const resetScale = () => {
    updateSemantic({ scaleX: 1, scaleY: 1, scaleZ: 1 })
  }

  return (
    <div
      className={styles.picker}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Translation</h3>
          <button className={styles.resetBtn} onClick={resetTranslation} type="button">
            Reset
          </button>
        </header>
        <div className={styles.axisList}>
          {POSITION_AXES.map(({ key, label, letter, accent }) => (
            <Mtx44AxisRow
              key={key}
              accentCss={{ ['--axis-accent' as string]: accent, color: accent }}
              axisLabel={letter}
              label={label}
              max={ranges.positionMax}
              min={ranges.positionMin}
              onChange={(next) => updateSemantic({ [key]: next })}
              step={0.1}
              value={semantic[key]}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Scale</h3>
          <label className={styles.uniformToggle}>
            <span className={styles.uniformLabel}>Uniform</span>
            <input
              checked={uniformScale}
              className={styles.uniformCheckbox}
              onChange={(event) => setUniformScale(event.target.checked)}
              type="checkbox"
            />
          </label>
          <button className={styles.resetBtn} onClick={resetScale} type="button">
            Reset
          </button>
        </header>

        {uniformScale ? (
          <div className={styles.uniformField}>
            <button
              aria-label="Scale — diminuir"
              className={styles.stepBtn}
              onClick={() => setUniformScaleValue(uniformValue - 0.01)}
              type="button"
            >
              −
            </button>
            <input
              aria-label="Scale uniforme"
              className={styles.uniformInput}
              inputMode="decimal"
              onChange={(event) => {
                const n = Number.parseFloat(event.target.value)
                if (Number.isFinite(n)) {
                  setUniformScaleValue(n)
                }
              }}
              type="text"
              value={displaySliderValue(uniformValue)}
            />
            <button
              aria-label="Scale — aumentar"
              className={styles.stepBtn}
              onClick={() => setUniformScaleValue(uniformValue + 0.01)}
              type="button"
            >
              +
            </button>
          </div>
        ) : (
          <div className={styles.axisList}>
            {SCALE_AXES.map(({ key, label, letter, accent }) => (
              <Mtx44AxisRow
                key={key}
                accentCss={{ ['--axis-accent' as string]: accent, color: accent }}
                axisLabel={letter}
                label={label}
                max={ranges.scaleMax}
                min={ranges.scaleMin}
                onChange={(next) => updateSemantic({ [key]: next })}
                step={0.01}
                value={semantic[key]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
