import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxGroundContextMenu.module.css'

export type VfxGroundContextMenuAnchor = {
  x: number
  y: number
}

type VfxGroundContextMenuProps = {
  anchor: VfxGroundContextMenuAnchor
  groundPosition: [number, number, number]
  groundScale2d: [number, number]
  onClose: () => void
  onGroundPositionChange: (next: [number, number, number]) => void
  onGroundScale2dChange: (next: [number, number]) => void
}

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(50, Math.max(0.05, value))
}

export function VfxGroundContextMenu({
  anchor,
  groundPosition,
  groundScale2d,
  onClose,
  onGroundPositionChange,
  onGroundScale2dChange,
}: VfxGroundContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (target instanceof Element && target.closest('[data-vfx-ground-context-menu]')) return
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
      className={styles.menu}
      data-vfx-ground-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={styles.menuTitle}>{t(LangId.VfxCtxGroundTitle)}</p>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t(LangId.VfxCtxGroundPositionLegend)}</legend>
        {(
          [
            ['X', 'X'],
            ['Y', 'Z LoL'],
            ['Z', 'Y LoL'],
          ] as const
        ).map(([axis, label], index) => (
          <label className={styles.field} key={axis}>
            <span>{label}</span>
            <input
              className={styles.input}
              onChange={(event) => {
                const next = [...groundPosition] as [number, number, number]
                next[index] = Number.parseFloat(event.target.value) || 0
                onGroundPositionChange(next)
              }}
              step={0.01}
              type="number"
              value={groundPosition[index]}
            />
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t(LangId.VfxCtxGroundScaleLegend)}</legend>
        <label className={styles.field}>
          <span>{t(LangId.VfxCtxGroundWidth)}</span>
          <input
            className={styles.input}
            min={0.05}
            onChange={(event) => {
              onGroundScale2dChange([
                clampScale(Number.parseFloat(event.target.value)),
                groundScale2d[1],
              ])
            }}
            step={0.05}
            type="number"
            value={groundScale2d[0]}
          />
        </label>
        <label className={styles.field}>
          <span>{t(LangId.VfxCtxGroundDepth)}</span>
          <input
            className={styles.input}
            min={0.05}
            onChange={(event) => {
              onGroundScale2dChange([
                groundScale2d[0],
                clampScale(Number.parseFloat(event.target.value)),
              ])
            }}
            step={0.05}
            type="number"
            value={groundScale2d[1]}
          />
        </label>
      </fieldset>
    </div>
  )

  return createPortal(menu, document.body)
}
