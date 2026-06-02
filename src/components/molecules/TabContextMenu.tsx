import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { useContextMenuPlacement } from '@/hooks/useContextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './TabContextMenu.module.css'

export type TabContextMenuAction = 'rename' | 'save' | 'close'

export type TabContextMenuAnchor = {
  left: number
  top: number
}

type TabContextMenuProps = {
  anchor: TabContextMenuAnchor
  onClose: () => void
  onSelect: (action: TabContextMenuAction) => void
}

export function TabContextMenu({ anchor, onClose, onSelect }: TabContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = useContextMenuPlacement(anchor.left, anchor.top, menuRef)

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

    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      className={styles.menu}
      data-expand-down={placement.expandDown ? 'true' : 'false'}
      data-expand-right={placement.expandRight ? 'true' : 'false'}
      ref={menuRef}
      role="menu"
      style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
    >
      <button onClick={() => onSelect('rename')} role="menuitem" type="button">
        {t(LangId.CodeTabMenuRename)}
      </button>
      <button onClick={() => onSelect('save')} role="menuitem" type="button">
        {t(LangId.CodeTabMenuSave)}
      </button>
      <div className={styles.separator} role="separator" />
      <button data-danger="true" onClick={() => onSelect('close')} role="menuitem" type="button">
        {t(LangId.CodeTabMenuClose)}
      </button>
    </div>,
    document.body,
  )
}
