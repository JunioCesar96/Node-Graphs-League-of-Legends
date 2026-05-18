import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import {
  clampGridDimension,
  formatVector3String,
  parseVector3String,
  plotFractionFromVector3,
  type Vector3,
  vec3CursorSizePx,
  vector3FromPlotFraction,
} from '@/core/vector3Value'

import styles from '@/components/molecules/Vec3CoordinatePicker.module.css'

type Vec3CoordinatePickerProps = {
  value: string
  onChange: (next: string) => void
}

type DragMode = 'plot' | 'axisX' | 'axisY' | 'axisZ'

const DEFAULT_GRID = 5

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

export function Vec3CoordinatePicker({ value, onChange }: Vec3CoordinatePickerProps) {
  const vector = useMemo(() => parseVector3String(value), [value])

  const [gridMaxX, setGridMaxX] = useState(() =>
    clampGridDimension(Math.ceil(Math.max(Math.abs(vector.x), DEFAULT_GRID)), DEFAULT_GRID),
  )
  const [gridMaxY, setGridMaxY] = useState(() =>
    clampGridDimension(Math.ceil(Math.max(Math.abs(vector.y), DEFAULT_GRID)), DEFAULT_GRID),
  )
  const [gridMaxZ, setGridMaxZ] = useState(() =>
    clampGridDimension(Math.ceil(Math.max(Math.abs(vector.z), DEFAULT_GRID)), DEFAULT_GRID),
  )
  const [allowNegative, setAllowNegative] = useState(
    () => vector.x < 0 || vector.y < 0 || vector.z < 0,
  )

  const plotRef = useRef<HTMLDivElement>(null)
  const axisXRef = useRef<HTMLDivElement>(null)
  const axisYRef = useRef<HTMLDivElement>(null)
  const axisZRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<DragMode | null>(null)

  const commitVector = useCallback(
    (next: Vector3) => {
      onChange(formatVector3String(next))
    },
    [onChange],
  )

  const applyPlotFraction = useCallback(
    (nx: number, ny: number, nz: number, mode: DragMode) => {
      const current = parseVector3String(value)
      const fromPlot = vector3FromPlotFraction(
        nx,
        ny,
        nz,
        gridMaxX,
        gridMaxY,
        gridMaxZ,
        allowNegative,
      )

      if (mode === 'axisX') {
        commitVector({ x: fromPlot.x, y: current.y, z: current.z })
        return
      }
      if (mode === 'axisY') {
        commitVector({ x: current.x, y: fromPlot.y, z: current.z })
        return
      }
      if (mode === 'axisZ') {
        commitVector({ x: current.x, y: current.y, z: fromPlot.z })
        return
      }
      commitVector(fromPlot)
    },
    [allowNegative, commitVector, gridMaxX, gridMaxY, gridMaxZ, value],
  )

  const applyDrag = useCallback(
    (mode: DragMode, clientX: number, clientY: number) => {
      if (mode === 'plot' && plotRef.current) {
        const { nx, ny } = pickFractionFromElement(plotRef.current, clientX, clientY)
        const { nz } = plotFractionFromVector3(
          parseVector3String(value),
          gridMaxX,
          gridMaxY,
          gridMaxZ,
          allowNegative,
        )
        applyPlotFraction(nx, ny, nz, mode)
        return
      }
      if (mode === 'axisX' && axisXRef.current) {
        const { nx } = pickFractionFromElement(axisXRef.current, clientX, clientY)
        const { ny, nz } = plotFractionFromVector3(
          parseVector3String(value),
          gridMaxX,
          gridMaxY,
          gridMaxZ,
          allowNegative,
        )
        applyPlotFraction(nx, ny, nz, mode)
        return
      }
      if (mode === 'axisY' && axisYRef.current) {
        const { ny } = pickFractionFromElement(axisYRef.current, clientX, clientY)
        const { nx, nz } = plotFractionFromVector3(
          parseVector3String(value),
          gridMaxX,
          gridMaxY,
          gridMaxZ,
          allowNegative,
        )
        applyPlotFraction(nx, ny, nz, mode)
        return
      }
      if (mode === 'axisZ' && axisZRef.current) {
        const { ny: nz } = pickFractionFromElement(axisZRef.current, clientX, clientY)
        const { nx, ny } = plotFractionFromVector3(
          parseVector3String(value),
          gridMaxX,
          gridMaxY,
          gridMaxZ,
          allowNegative,
        )
        applyPlotFraction(nx, ny, nz, mode)
      }
    },
    [allowNegative, applyPlotFraction, gridMaxX, gridMaxY, gridMaxZ, value],
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

  const { nx, ny, nz } = plotFractionFromVector3(vector, gridMaxX, gridMaxY, gridMaxZ, allowNegative)
  const cursorLeft = `${nx * 100}%`
  const cursorTop = `${ny * 100}%`
  const cursorZTop = `${nz * 100}%`

  const originNx = allowNegative ? 0.5 : 0
  const originNy = allowNegative ? 0.5 : 1

  const horizLeft = allowNegative ? `${Math.min(originNx, nx) * 100}%` : '0'
  const horizWidth = allowNegative ? `${Math.abs(nx - originNx) * 100}%` : `${nx * 100}%`

  const vertTop = allowNegative ? `${Math.min(originNy, ny) * 100}%` : `${ny * 100}%`
  const vertHeight = allowNegative ? `${Math.abs(ny - originNy) * 100}%` : `${(1 - ny) * 100}%`

  const cursorSizePx = vec3CursorSizePx(vector.z)
  const cursorBorderPx = Math.max(1, Math.round(cursorSizePx * 0.14))

  const toggleNegative = () => {
    const fraction = plotFractionFromVector3(vector, gridMaxX, gridMaxY, gridMaxZ, allowNegative)
    const nextAllow = !allowNegative
    setAllowNegative(nextAllow)
    commitVector(
      vector3FromPlotFraction(
        fraction.nx,
        fraction.ny,
        fraction.nz,
        gridMaxX,
        gridMaxY,
        gridMaxZ,
        nextAllow,
      ),
    )
  }

  const onChannelChange = (channel: 'x' | 'y' | 'z', raw: string) => {
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n)) {
      return
    }
    const next = { ...vector, [channel]: n }
    commitVector(next)
    if (channel === 'x') {
      setGridMaxX((prev) => clampGridDimension(Math.ceil(Math.max(Math.abs(n), prev)), prev))
    } else if (channel === 'y') {
      setGridMaxY((prev) => clampGridDimension(Math.ceil(Math.max(Math.abs(n), prev)), prev))
    } else {
      setGridMaxZ((prev) => clampGridDimension(Math.ceil(Math.max(Math.abs(n), prev)), prev))
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
              max={256}
              min={1}
              onChange={(event) =>
                setGridMaxX(clampGridDimension(Number.parseInt(event.target.value, 10), DEFAULT_GRID))
              }
              type="number"
              value={gridMaxX}
            />
            <span>X</span>
          </label>
          <label className={styles.gridSizeField}>
            <input
              inputMode="numeric"
              max={256}
              min={1}
              onChange={(event) =>
                setGridMaxY(clampGridDimension(Number.parseInt(event.target.value, 10), DEFAULT_GRID))
              }
              type="number"
              value={gridMaxY}
            />
            <span>Y</span>
          </label>
          <label className={styles.gridSizeField}>
            <input
              inputMode="numeric"
              max={256}
              min={1}
              onChange={(event) =>
                setGridMaxZ(clampGridDimension(Number.parseInt(event.target.value, 10), DEFAULT_GRID))
              }
              type="number"
              value={gridMaxZ}
            />
            <span>Z</span>
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
          <span className={styles.depthGuide} style={{ left: cursorLeft, top: cursorTop }} aria-hidden />
          <span
            className={styles.cursor}
            style={{
              left: cursorLeft,
              top: cursorTop,
              width: cursorSizePx,
              height: cursorSizePx,
              borderWidth: cursorBorderPx,
            }}
          >
            <span className={styles.cursorLabel}>
              ({displayCoord(vector.x)}, {displayCoord(vector.y)}, {displayCoord(vector.z)})
            </span>
          </span>
        </div>

        <div
          ref={axisZRef}
          className={styles.axisZ}
          onPointerDown={(event) => startDrag('axisZ', event)}
        >
          <span
            className={styles.axisHandle}
            style={{ top: cursorZTop, left: 0 }}
            aria-hidden
          />
          <span className={styles.axisMeasureZ} style={{ top: cursorZTop }}>
            {displayCoord(vector.z)}
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
        {(['x', 'y', 'z'] as const).map((channel) => (
          <label className={styles.channel} key={channel}>
            <input
              inputMode="decimal"
              onChange={(event) => onChannelChange(channel, event.target.value)}
              type="number"
              value={vector[channel]}
            />
            <span>{channel.toUpperCase()}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
