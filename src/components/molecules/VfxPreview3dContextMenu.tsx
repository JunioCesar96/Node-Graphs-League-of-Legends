import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import type { Preview3dSpinAxis } from '@/core/vfx/preview3dSpin'
import { computeContextMenuPlacement } from '@/core/ui/contextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import type { VfxPreview3dContextMenuAnchor } from '@/hooks/useVfxPreview3dContextMenu'

import styles from './VfxPreview3dContextMenu.module.css'

type VfxPreview3dContextMenuProps = {
  anchor: VfxPreview3dContextMenuAnchor
  activeAxis: Preview3dSpinAxis
  onClose: () => void
  onSelectAxis: (axis: Preview3dSpinAxis) => void
}

const MENU_WIDTH = 196
const MENU_HEIGHT = 168

export function VfxPreview3dContextMenu({
  anchor,
  activeAxis,
  onClose,
  onSelectAxis,
}: VfxPreview3dContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = computeContextMenuPlacement(anchor.x, anchor.y, MENU_WIDTH, MENU_HEIGHT)

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (event.button !== 0) return
      const target = event.target
      if (!(target instanceof Node)) return
      if (target instanceof Element && target.closest('[data-vfx-preview-3d-context-menu]')) return
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
      data-vfx-preview-3d-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: placement.x, top: placement.y }}
    >
      <p className={styles.menuTitle}>{t(LangId.VfxPreview3dCtxTitle)}</p>

      {(
        [
          ['x', LangId.VfxPreview3dCtxRotateX],
          ['y', LangId.VfxPreview3dCtxRotateY],
          ['z', LangId.VfxPreview3dCtxRotateZ],
        ] as const
      ).map(([axis, labelId]) => (
        <button
          data-active={activeAxis === axis ? 'true' : undefined}
          key={axis}
          onClick={() => onSelectAxis(axis)}
          role="menuitem"
          type="button"
        >
          {t(labelId)}
        </button>
      ))}

      <div className={styles.separator} role="separator" />

      <button
        data-active={activeAxis === null ? 'true' : undefined}
        onClick={() => onSelectAxis(null)}
        role="menuitem"
        type="button"
      >
        {t(LangId.VfxPreview3dCtxStopRotation)}
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}
