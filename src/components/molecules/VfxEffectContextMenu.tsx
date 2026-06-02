import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxTimelineContextMenu.module.css'

export type VfxEffectContextMenuAnchor = {
  effectId: string
  effectLabel: string
  x: number
  y: number
}

type VfxEffectContextMenuProps = {
  anchor: VfxEffectContextMenuAnchor
  inCompositor: boolean
  onAddToCompositor: (effectId: string) => void
  onClose: () => void
  onRemoveFromCompositor: (effectId: string) => void
}

export function VfxEffectContextMenu({
  anchor,
  inCompositor,
  onAddToCompositor,
  onClose,
  onRemoveFromCompositor,
}: VfxEffectContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node) || menuRef.current?.contains(target)) {
        return
      }
      onClose()
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('mousedown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('mousedown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      className={styles.menu}
      data-vfx-effect-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={styles.menuTitle} title={anchor.effectLabel}>
        {anchor.effectLabel}
      </p>
      <button
        disabled={inCompositor}
        onClick={() => {
          onAddToCompositor(anchor.effectId)
          onClose()
        }}
        role="menuitem"
        type="button"
      >
        {t(LangId.VfxEffectCtxAddCompositor)}
      </button>
      <button
        disabled={!inCompositor}
        onClick={() => {
          onRemoveFromCompositor(anchor.effectId)
          onClose()
        }}
        role="menuitem"
        type="button"
      >
        {t(LangId.VfxEffectCtxRemoveCompositor)}
      </button>
    </div>,
    document.body,
  )
}
