import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import {
  DEFAULT_AXIS_WORLD_COLORS,
  DEFAULT_AXIS_WORLD_SCALE,
  type VfxAxisWorldColors,
} from '@/core/vfx/vfxViewportPreferences'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import groundStyles from './VfxGroundContextMenu.module.css'
import styles from './VfxAxisWorldContextMenu.module.css'

export type VfxAxisWorldContextMenuAnchor = {
  x: number
  y: number
}

type VfxAxisWorldContextMenuProps = {
  anchor: VfxAxisWorldContextMenuAnchor
  scale: [number, number, number]
  colors: VfxAxisWorldColors
  onClose: () => void
  onScaleChange: (next: [number, number, number]) => void
  onColorsChange: (next: VfxAxisWorldColors) => void
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(20, Math.max(0.05, value))
}

function normalizeHexInput(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return fallback
}

const AXES = ['X', 'Y', 'Z'] as const
const COLOR_KEYS: Array<keyof VfxAxisWorldColors> = ['x', 'y', 'z']

export function VfxAxisWorldContextMenu({
  anchor,
  scale,
  colors,
  onClose,
  onScaleChange,
  onColorsChange,
}: VfxAxisWorldContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (target instanceof Element && target.closest('[data-vfx-axis-world-context-menu]')) return
      if (!menuRef.current?.contains(target)) onClose()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const menu = (
    <div
      className={groundStyles.menu}
      data-vfx-axis-world-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={groundStyles.menuTitle}>{t(LangId.VfxCtxAxisWorldTitle)}</p>

      <fieldset className={groundStyles.fieldset}>
        <legend className={groundStyles.legend}>{t(LangId.VfxCtxAxisScaleLegend)}</legend>
        {AXES.map((axis, index) => (
          <label className={groundStyles.field} key={axis}>
            <span>{axis}</span>
            <input
              className={groundStyles.input}
              min={0.05}
              max={20}
              onChange={(event) => {
                const next = [...scale] as [number, number, number]
                next[index] = clampScale(Number.parseFloat(event.target.value))
                onScaleChange(next)
              }}
              step={0.05}
              type="number"
              value={scale[index]}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className={groundStyles.fieldset}>
        <legend className={groundStyles.legend}>{t(LangId.VfxCtxAxisColorLegend)}</legend>
        {AXES.map((axis, index) => {
          const key = COLOR_KEYS[index]!
          return (
            <div className={styles.colorRow} key={axis}>
              <span className={styles.colorLabel}>{axis}</span>
              <input
                aria-label={t(LangId.VfxCtxAxisColorAria, 'Cor eixo {axis}', { axis })}
                className={styles.colorPicker}
                onChange={(event) => {
                  onColorsChange({
                    ...colors,
                    [key]: normalizeHexInput(event.target.value, colors[key]),
                  })
                }}
                type="color"
                value={colors[key]}
              />
              <input
                className={groundStyles.input}
                onChange={(event) => {
                  onColorsChange({
                    ...colors,
                    [key]: normalizeHexInput(event.target.value, colors[key]),
                  })
                }}
                spellCheck={false}
                type="text"
                value={colors[key]}
              />
            </div>
          )
        })}
      </fieldset>

      <button
        className={styles.resetButton}
        onClick={() => {
          onScaleChange([...DEFAULT_AXIS_WORLD_SCALE])
          onColorsChange({ ...DEFAULT_AXIS_WORLD_COLORS })
        }}
        type="button"
      >
        {t(LangId.VfxCtxResetDefault)}
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}
