import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import {
  clampGridDimension,
  formatVector2String,
  parseVector2String,
  plotFractionFromVector2,
  type Vector2,
  vector2FromPlotFraction,
} from '@/core/vector2Value'

import styles from '@/components/molecules/Vec2CoordinatePicker.module.css'

type Vec2CoordinatePickerProps = {
  value: string
  onChange: (next: string) => void
}

type DragMode = 'plot' | 'axisX' | 'axisY'

const DEFAULT_GRID_X = 5
const DEFAULT_GRID_Y = 5

function pickFractionFromElement(target: HTMLElement, clientX: number, clientY: number) {
  const rect = target.getBoundingClientRect()
  return {
    nx: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    ny: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  }
}

function displayCoord(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  const text = String(rounded)
  if (text.includes('.')) {
    return text
  }
  return text.padStart(2, '0')
}

export function Vec2CoordinatePicker({ value, onChange }: Vec2CoordinatePickerProps) {
  const vector = useMemo(() => parseVector2String(value), [value])

  const [gridMaxX, setGridMaxX] = useState(() =>
    clampGridDimension(Math.ceil(Math.max(Math.abs(vector.x), DEFAULT_GRID_X)), DEFAULT_GRID_X),
  )
  const [gridMaxY, setGridMaxY] = useState(() =>
    clampGridDimension(Math.ceil(Math.max(Math.abs(vector.y), DEFAULT_GRID_Y)), DEFAULT_GRID_Y),
  )
  const [allowNegative, setAllowNegative] = useState(() => vector.x < 0 || vector.y < 0)

  const plotRef = useRef<HTMLDivElement>(null)
  const axisXRef = useRef<HTMLDivElement>(null)
  const axisYRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<DragMode | null>(null)

  const commitVector = useCallback(
    (next: Vector2) => {
      onChange(formatVector2String(next))
    },
    [onChange],
  )

  const applyPlotFraction = useCallback(
    (nx: number, ny: number, mode: DragMode) => {
      const current = parseVector2String(value)
      const fromPlot = vector2FromPlotFraction(nx, ny, gridMaxX, gridMaxY, allowNegative)

      if (mode === 'axisX') {
        commitVector({ x: fromPlot.x, y: current.y })
        return
      }
      if (mode === 'axisY') {
        commitVector({ x: current.x, y: fromPlot.y })
        return
      }
      commitVector(fromPlot)
    },
    [allowNegative, commitVector, gridMaxX, gridMaxY, value],
  )

  const applyDrag = useCallback(
    (mode: DragMode, clientX: number, clientY: number) => {
      if (mode === 'plot' && plotRef.current) {
        const { nx, ny } = pickFractionFromElement(plotRef.current, clientX, clientY)
        applyPlotFraction(nx, ny, mode)
        return
      }
      if (mode === 'axisX' && axisXRef.current) {
        const { nx } = pickFractionFromElement(axisXRef.current, clientX, clientY)
        applyPlotFraction(nx, 0.5, mode)
        return
      }
      if (mode === 'axisY' && axisYRef.current) {
        const { ny } = pickFractionFromElement(axisYRef.current, clientX, clientY)
        applyPlotFraction(0.5, ny, mode)
      }
    },
    [applyPlotFraction],
  )

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
      applyDrag(dragging, event.clientX, event.clientY)
    }
    const onUp = () => setDragging(null)

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
  }, [applyDrag, dragging])

  const startDrag = (mode: DragMode, event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(mode)
    event.currentTarget.setPointerCapture(event.pointerId)
    applyDrag(mode, event.clientX, event.clientY)
  }

  const { nx, ny } = plotFractionFromVector2(vector, gridMaxX, gridMaxY, allowNegative)
  const cursorLeft = `${nx * 100}%`
  const cursorTop = `${ny * 100}%`

  const originNx = allowNegative ? 0.5 : 0
  const originNy = allowNegative ? 0.5 : 1

  const horizLeft = allowNegative ? `${Math.min(originNx, nx) * 100}%` : '0'
  const horizWidth = allowNegative ? `${Math.abs(nx - originNx) * 100}%` : `${nx * 100}%`

  const vertTop = allowNegative
    ? `${Math.min(originNy, ny) * 100}%`
    : `${ny * 100}%`
  const vertHeight = allowNegative ? `${Math.abs(ny - originNy) * 100}%` : `${(1 - ny) * 100}%`

  const toggleNegative = () => {
    const fraction = plotFractionFromVector2(vector, gridMaxX, gridMaxY, allowNegative)
    const nextAllow = !allowNegative
    setAllowNegative(nextAllow)
    commitVector(vector2FromPlotFraction(fraction.nx, fraction.ny, gridMaxX, gridMaxY, nextAllow))
  }

  const onChannelChange = (channel: 'x' | 'y', raw: string) => {
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) {
      return
    }
    const next = channel === 'x' ? { ...vector, x: n } : { ...vector, y: n }
    commitVector(next)
    if (channel === 'x') {
      setGridMaxX((prev) => clampGridDimension(Math.ceil(Math.max(Math.abs(n), prev)), prev))
    } else {
      setGridMaxY((prev) => clampGridDimension(Math.ceil(Math.max(Math.abs(n), prev)), prev))
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <button
          className={[styles.negativeToggle, allowNegative ? styles.negativeToggleActive : '']
            .filter(Boolean)
            .join(' ')}
          onClick={toggleNegative}
          type="button"
        >
          Eixo negativo
        </button>
        <div className={styles.gridSizeGroup}>
          <span className={styles.gridSizeLabel}>Grelha</span>
          <label className={styles.gridSizeField}>
            <input
              inputMode="numeric"
              min={1}
              max={256}
              onChange={(event) =>
                setGridMaxX(clampGridDimension(Number.parseInt(event.target.value, 10), DEFAULT_GRID_X))
              }
              type="number"
              value={gridMaxX}
            />
            <span>X</span>
          </label>
          <label className={styles.gridSizeField}>
            <input
              inputMode="numeric"
              min={1}
              max={256}
              onChange={(event) =>
                setGridMaxY(clampGridDimension(Number.parseInt(event.target.value, 10), DEFAULT_GRID_Y))
              }
              type="number"
              value={gridMaxY}
            />
            <span>Y</span>
          </label>
        </div>
      </div>

      <div className={styles.plotWrap}>
        <div
          ref={axisYRef}
          className={styles.axisY}
          onPointerDown={(event) => startDrag('axisY', event)}
        >
          <span
            className={styles.axisHandle}
            style={{ top: cursorTop, left: '100%' }}
            aria-hidden
          />
          <span className={styles.axisMeasureY} style={{ top: cursorTop }}>
            {displayCoord(vector.y)}
          </span>
        </div>

        <div
          ref={plotRef}
          className={styles.plot}
          style={
            {
              '--grid-cols': String(gridMaxX),
              '--grid-rows': String(gridMaxY),
            } as CSSProperties
          }
          onPointerDown={(event) => startDrag('plot', event)}
        >
          <span
            className={[styles.origin, allowNegative ? styles.originCenter : styles.originPositive].join(
              ' ',
            )}
            aria-hidden
          />
          <span
            className={styles.crossX}
            style={{ top: cursorTop, left: horizLeft, width: horizWidth }}
            aria-hidden
          />
          <span
            className={styles.crossY}
            style={{ left: cursorLeft, top: vertTop, height: vertHeight }}
            aria-hidden
          />
          <span className={styles.cursor} style={{ left: cursorLeft, top: cursorTop }}>
            <span className={styles.cursorLabel}>
              ({displayCoord(vector.x)}, {displayCoord(vector.y)})
            </span>
          </span>
        </div>

        <div
          ref={axisXRef}
          className={styles.axisX}
          onPointerDown={(event) => startDrag('axisX', event)}
        >
          <span
            className={styles.axisHandle}
            style={{ left: cursorLeft, top: 0 }}
            aria-hidden
          />
          <span className={styles.axisMeasureX} style={{ left: cursorLeft }}>
            {displayCoord(vector.x)}
          </span>
        </div>
      </div>

      <div className={styles.channels}>
        <label className={styles.channel}>
          <input
            inputMode="decimal"
            onChange={(event) => onChannelChange('x', event.target.value)}
            type="number"
            value={vector.x}
          />
          <span>X</span>
        </label>
        <label className={styles.channel}>
          <input
            inputMode="decimal"
            onChange={(event) => onChannelChange('y', event.target.value)}
            type="number"
            value={vector.y}
          />
          <span>Y</span>
        </label>
      </div>
    </div>
  )
}
