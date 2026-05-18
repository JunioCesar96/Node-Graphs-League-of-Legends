import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import {
  clamp01,
  formatRgbaString,
  hsvToRgb,
  parseRgbaString,
  rgbToHsv,
  rgbaFromByteChannels,
  rgbaToByteChannels,
  rgbaToCss,
  type RgbaColor,
} from '@/core/rgbaColor'

import styles from '@/components/molecules/RgbaColorPicker.module.css'

type RgbaColorPickerProps = {
  value: string
  onChange: (next: string) => void
}

function hueCss(h: number): string {
  const rgb = hsvToRgb(h, 1, 1)
  return rgbaToCss({ ...rgb, a: 1 })
}

export function RgbaColorPicker({ value, onChange }: RgbaColorPickerProps) {
  const rgba = useMemo(() => parseRgbaString(value), [value])
  const hsv = useMemo(() => rgbToHsv(rgba.r, rgba.g, rgba.b), [rgba.b, rgba.g, rgba.r])
  const bytes = useMemo(() => rgbaToByteChannels(rgba), [rgba])

  const svRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const alphaRef = useRef<HTMLDivElement>(null)

  const [dragging, setDragging] = useState<'sv' | 'v' | 'h' | 'a' | null>(null)

  const commitRgba = useCallback(
    (next: RgbaColor) => {
      onChange(formatRgbaString(next))
    },
    [onChange],
  )

  const commitFromHsv = useCallback(
    (h: number, s: number, v: number, a: number) => {
      const rgb = hsvToRgb(h, s, v)
      commitRgba({ ...rgb, a: clamp01(a) })
    },
    [commitRgba],
  )

  const pickFromClient = useCallback((target: HTMLElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect()
    const x = clamp01((clientX - rect.left) / rect.width)
    const y = clamp01((clientY - rect.top) / rect.height)
    return { x, y }
  }, [])

  const applyDrag = useCallback(
    (mode: 'sv' | 'v' | 'h' | 'a', clientX: number, clientY: number) => {
      if (mode === 'sv' && svRef.current) {
        const { x, y } = pickFromClient(svRef.current, clientX, clientY)
        commitFromHsv(hsv.h, x, 1 - y, rgba.a)
        return
      }
      if (mode === 'v' && valueRef.current) {
        const { y } = pickFromClient(valueRef.current, clientX, clientY)
        commitFromHsv(hsv.h, hsv.s, 1 - y, rgba.a)
        return
      }
      if (mode === 'h' && hueRef.current) {
        const { x } = pickFromClient(hueRef.current, clientX, clientY)
        commitFromHsv(x * 360, hsv.s, hsv.v, rgba.a)
        return
      }
      if (mode === 'a' && alphaRef.current) {
        const { x } = pickFromClient(alphaRef.current, clientX, clientY)
        commitFromHsv(hsv.h, hsv.s, hsv.v, x)
      }
    },
    [commitFromHsv, hsv.h, hsv.s, hsv.v, pickFromClient, rgba.a],
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

  const startDrag = (mode: 'sv' | 'v' | 'h' | 'a', event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(mode)
    event.currentTarget.setPointerCapture(event.pointerId)
    applyDrag(mode, event.clientX, event.clientY)
  }

  const onChannelChange = (channel: 'r' | 'g' | 'b' | 'a', raw: string) => {
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) {
      return
    }
    const next = { ...bytes, [channel]: Math.min(255, Math.max(0, n)) }
    commitRgba(rgbaFromByteChannels(next.r, next.g, next.b, next.a))
  }

  const canEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window

  const pickScreenColor = async () => {
    if (!canEyedropper) {
      return
    }
    try {
      type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> }
      const dropper = new (window as Window & { EyeDropper: EyeDropperCtor }).EyeDropper()
      const result = await dropper.open()
      const hex = result.sRGBHex.replace('#', '')
      if (hex.length !== 6) {
        return
      }
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      commitRgba({ ...rgbaFromByteChannels(r, g, b, 255), a: rgba.a })
    } catch {
      /** cancelado */
    }
  }

  const svHue = hueCss(hsv.h)
  const opaque = rgbaToCss({ ...rgba, a: 1 })

  return (
    <div className={styles.picker}>
      <div className={styles.topRow}>
        <div
          ref={svRef}
          className={styles.svPanel}
          style={{ ['--sv-hue' as string]: svHue }}
          onPointerDown={(event) => startDrag('sv', event)}
        >
          <div className={styles.svBase} aria-hidden />
          <div className={styles.svShade} aria-hidden />
          <span
            className={styles.svCursor}
            style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
          />
        </div>
        <div
          ref={valueRef}
          className={styles.valueSlider}
          onPointerDown={(event) => startDrag('v', event)}
        >
          <span className={styles.valueThumb} style={{ top: `${(1 - hsv.v) * 100}%` }} />
        </div>
      </div>

      <div className={styles.midRow}>
        <div className={styles.previewCol}>
          <span className={styles.preview} style={{ background: rgbaToCss(rgba) }} aria-hidden />
          <button
            className={styles.eyedropper}
            disabled={!canEyedropper}
            onClick={() => void pickScreenColor()}
            title={canEyedropper ? 'Conta-gotas' : 'Conta-gotas não suportado neste browser'}
            type="button"
          >
            &#9095;
          </button>
        </div>
        <div className={styles.slidersCol}>
          <div
            ref={hueRef}
            className={styles.hueSlider}
            onPointerDown={(event) => startDrag('h', event)}
          >
            <span className={styles.sliderThumb} style={{ left: `${(hsv.h / 360) * 100}%` }} />
          </div>
          <div
            ref={alphaRef}
            className={styles.alphaSlider}
            onPointerDown={(event) => startDrag('a', event)}
          >
            <div className={styles.alphaChecker} aria-hidden />
            <div
              className={styles.alphaFill}
              style={{
                background: `linear-gradient(to right, transparent, ${opaque})`,
              }}
              aria-hidden
            />
            <span className={styles.sliderThumb} style={{ left: `${rgba.a * 100}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.channels}>
        {(['r', 'g', 'b', 'a'] as const).map((ch) => (
          <label className={styles.channel} key={ch}>
            <input
              inputMode="numeric"
              max={255}
              min={0}
              onChange={(event) => onChannelChange(ch, event.target.value)}
              type="number"
              value={bytes[ch]}
            />
            <span>{ch.toUpperCase()}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
