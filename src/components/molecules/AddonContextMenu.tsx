import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { ResolvedAddonContextMenuItem } from '@/core/addonContextMenu'
import { useContextMenuPlacement } from '@/hooks/useContextMenuPlacement'

import styles from './AddonContextMenu.module.css'

export type AddonContextMenuAnchor = {
  left: number
  top: number
}

type AddonContextMenuProps = {
  anchor: AddonContextMenuAnchor
  items: ResolvedAddonContextMenuItem[]
  onClose: () => void
  onSelect: (action: string) => void
}

function blockPointerEvent(event: { preventDefault: () => void; stopPropagation: () => void }) {
  event.preventDefault()
  event.stopPropagation()
}

export function AddonContextMenu({ anchor, items, onClose, onSelect }: AddonContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const placement = useContextMenuPlacement(anchor.left, anchor.top, menuRef)

  useEffect(() => {
    document.body.dataset.addonContextMenuActive = '1'
    document.dispatchEvent(new CustomEvent('addon-context-menu-open'))
    return () => {
      delete document.body.dataset.addonContextMenuActive
    }
  }, [])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (menuRef.current?.contains(target)) {
        return
      }
      if (target instanceof Element && target.closest('[data-addon-context-menu-root]')) {
        return
      }
      onClose()
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('click', closeOnOutside, true)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('click', closeOnOutside, true)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  if (items.length === 0) {
    return null
  }

  return createPortal(
    <>
      <div
        className={styles.backdrop}
        data-addon-context-menu-root="true"
        onContextMenu={(event) => blockPointerEvent(event)}
        onPointerDown={(event) => blockPointerEvent(event)}
        onPointerUp={(event) => {
          blockPointerEvent(event)
          onClose()
        }}
      />
      <div
        className={styles.menu}
        data-addon-context-menu-root="true"
        data-expand-down={placement.expandDown ? 'true' : 'false'}
        data-expand-right={placement.expandRight ? 'true' : 'false'}
        onContextMenu={(event) => blockPointerEvent(event)}
        onPointerDown={(event) => event.stopPropagation()}
        ref={menuRef}
        role="menu"
        style={{ left: `${placement.x}px`, top: `${placement.y}px` }}
      >
        {items.map((item) => (
          <button
            key={item.action}
            onClick={(event) => {
              blockPointerEvent(event)
              onSelect(item.action)
            }}
            onPointerDown={(event) => blockPointerEvent(event)}
            role="menuitem"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
