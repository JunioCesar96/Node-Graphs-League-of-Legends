import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import styles from './VfxTimelineContextMenu.module.css'

export type VfxTimelineContextMenuAnchor = {
  x: number
  y: number
}

type VfxTimelineContextMenuProps = {
  anchor: VfxTimelineContextMenuAnchor
  clickTime: number
  hasResetPoint: boolean
  resetPointTime: number | null
  onClose: () => void
  onSetResetPoint: () => void
  onRemoveResetPoint: () => void
}

function formatTime(seconds: number) {
  return `${seconds.toFixed(2)}s`
}

export function VfxTimelineContextMenu({
  anchor,
  clickTime,
  hasResetPoint,
  resetPointTime,
  onClose,
  onSetResetPoint,
  onRemoveResetPoint,
}: VfxTimelineContextMenuProps) {
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
      data-vfx-timeline-context-menu=""
      ref={menuRef}
      role="menu"
      style={{ left: anchor.x, top: anchor.y }}
    >
      <p className={styles.menuTitle}>Timeline</p>
      <button onClick={onSetResetPoint} role="menuitem" type="button">
        Reset point @ {formatTime(clickTime)}
      </button>
      <button
        disabled={!hasResetPoint}
        onClick={onRemoveResetPoint}
        role="menuitem"
        type="button"
      >
        Remove reset point
      </button>
    </div>,
    document.body,
  )
}
