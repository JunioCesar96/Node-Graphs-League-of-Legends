import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxGroundContextMenu.module.css'

export type VfxGlobalRotationContextMenuAnchor = {
  x: number
  y: number
}

type VfxGlobalRotationContextMenuProps = {
  anchor: VfxGlobalRotationContextMenuAnchor
  enabled: boolean
  offsetDegrees: [number, number, number]
  onClose: () => void
  onEnabledChange: (enabled: boolean) => void
  onOffsetDegreesChange: (next: [number, number, number]) => void
}

export function VfxGlobalRotationContextMenu({
  anchor,
  enabled,
  offsetDegrees,
  onClose,
  onEnabledChange,
  onOffsetDegreesChange,
}: VfxGlobalRotationContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (target instanceof Element && target.closest('[data-vfx-global-rotation-context-menu]')) return
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
      data-vfx-global-rotation-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={styles.menuTitle}>{t(LangId.VfxCtxGlobalRotationTitle)}</p>

      <label className={styles.field}>
        <span>{t(LangId.VfxCtxGlobalRotationCorrection)}</span>
        <input
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          type="checkbox"
        />
      </label>

      <fieldset className={styles.fieldset} disabled={!enabled}>
        <legend className={styles.legend}>{t(LangId.VfxCtxGlobalRotationOffsetLegend)}</legend>
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <label className={styles.field} key={axis}>
            <span>{axis}</span>
            <input
              className={styles.input}
              disabled={!enabled}
              onChange={(event) => {
                const next = [...offsetDegrees] as [number, number, number]
                next[index] = Number.parseFloat(event.target.value) || 0
                onOffsetDegreesChange(next)
              }}
              step={1}
              type="number"
              value={offsetDegrees[index]}
            />
          </label>
        ))}
        <button
          disabled={!enabled}
          onClick={() => onOffsetDegreesChange([0, 0, 0])}
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
          {t(LangId.VfxCtxResetOffset)}
        </button>
      </fieldset>
    </div>
  )

  return createPortal(menu, document.body)
}
