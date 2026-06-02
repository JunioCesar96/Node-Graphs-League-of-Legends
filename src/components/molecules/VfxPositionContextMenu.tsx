import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxGroundContextMenu.module.css'

export type VfxPositionContextMenuAnchor = {
  x: number
  y: number
}

type VfxPositionContextMenuProps = {
  anchor: VfxPositionContextMenuAnchor
  enabled: boolean
  offset: [number, number, number]
  onClose: () => void
  onEnabledChange: (enabled: boolean) => void
  onOffsetChange: (next: [number, number, number]) => void
}

export function VfxPositionContextMenu({
  anchor,
  enabled,
  offset,
  onClose,
  onEnabledChange,
  onOffsetChange,
}: VfxPositionContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (target instanceof Element && target.closest('[data-vfx-position-context-menu]')) return
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
      data-vfx-context-menu=""
      data-vfx-position-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={styles.menuTitle}>{t(LangId.VfxCtxPositionTitle)}</p>

      <label className={styles.field}>
        <span>{t(LangId.VfxCtxPositionAdjust)}</span>
        <input
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
      </label>

      <p style={{ margin: '0 0 6px', fontSize: 10, color: 'rgb(255 255 255 / 50%)', lineHeight: 1.35 }}>
        {t(LangId.VfxCtxPositionHint)}
      </p>

      <fieldset className={styles.fieldset} disabled={!enabled}>
        <legend className={styles.legend}>{t(LangId.VfxCtxPositionOffsetLegend)}</legend>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <label className={styles.field} key={axis}>
            <span>{axis}</span>
            <input
              className={styles.input}
              disabled={!enabled}
              onChange={(event) => {
                const next = [...offset] as [number, number, number]
                next[index] = Number.parseFloat(event.target.value) || 0
                onOffsetChange(next)
              }}
              step={0.01}
              type="number"
              value={offset[index]}
            />
          </label>
        ))}
        <button
          disabled={!enabled}
          onClick={() => onOffsetChange([0, 1.5, 0])}
          style={{
            marginTop: 6,
            width: '100%',
            padding: '4px 8px',
            fontSize: 11,
            color: 'rgb(255 255 255 / 85%)',
            cursor: enabled ? 'pointer' : 'not-allowed',
            background: 'rgb(255 255 255 / 8%)',
            border: '1px solid rgb(255 255 255 / 12%)',
            borderRadius: 4,
          }}
          type="button"
        >
          {t(LangId.VfxCtxPositionResetDefault)}
        </button>
      </fieldset>
    </div>
  )

  return createPortal(menu, document.body)
}
