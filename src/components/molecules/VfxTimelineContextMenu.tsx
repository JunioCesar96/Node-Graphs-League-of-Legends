import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { LangId } from '@/core/language/languageIds'
import { computeContextMenuPlacement } from '@/core/ui/contextMenuPlacement'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './VfxTimelineContextMenu.module.css'

export type VfxTimelineContextMenuAnchor = {
  x: number
  y: number
}

type VfxTimelineContextMenuProps = {
  anchor: VfxTimelineContextMenuAnchor
  clickTime: number
  currentTime: number
  hasResetPoint: boolean
  hasPlaybackRange: boolean
  onClose: () => void
  onSetResetPoint: () => void
  onSetResetPointAtCurrent: () => void
  onRemoveResetPoint: () => void
  onSetRangeStart: () => void
  onSetRangeStartAtCurrent: () => void
  onSetRangeEnd: () => void
  onSetRangeEndAtCurrent: () => void
  onMovePlaybackRange: () => void
  onRemovePlaybackRange: () => void
}

type TimelineSubmenuId = 'reset-point' | 'playback-range'

function formatTime(seconds: number) {
  return `${seconds.toFixed(2)}s`
}

type TimelineSubmenuProps = {
  submenuId: TimelineSubmenuId
  isOpen: boolean
  onActivate: () => void
  label: string
  expandDown: boolean
  expandRight: boolean
  children: ReactNode
}

function TimelineSubmenu({
  submenuId,
  isOpen,
  onActivate,
  label,
  expandDown,
  expandRight,
  children,
}: TimelineSubmenuProps) {
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({})
  const [flipX, setFlipX] = useState(false)
  const flyoutRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!isOpen) {
      setFlyoutStyle({})
      return
    }

    const flyout = flyoutRef.current
    if (!flyout) {
      return
    }

    const margin = 8
    const rect = flyout.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let useRight = expandRight
    let useDown = expandDown

    if (rect.right > viewportWidth - margin) {
      useRight = false
    }
    if (rect.left < margin) {
      useRight = true
    }
    if (rect.bottom > viewportHeight - margin) {
      useDown = false
    }
    if (rect.top < margin) {
      useDown = true
    }

    setFlipX(!useRight)

    const style: CSSProperties = useRight
      ? { left: '100%', right: 'auto' }
      : { right: '100%', left: 'auto' }

    if (useDown) {
      style.top = 0
      style.bottom = 'auto'
    } else {
      style.top = 'auto'
      style.bottom = 0
    }

    setFlyoutStyle(style)
  }, [children, expandDown, expandRight, isOpen, submenuId])

  return (
    <div
      className={styles.submenuRow}
      data-open={isOpen ? 'true' : 'false'}
      onMouseEnter={onActivate}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={styles.submenuTrigger}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onActivate()
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="menuitem"
        type="button"
      >
        <span>{label}</span>
        <span aria-hidden className={styles.submenuCaret}>
          {expandRight ? '›' : '‹'}
        </span>
      </button>
      <div
        className={styles.submenuFlyout}
        data-flip-x={flipX ? 'true' : 'false'}
        data-open={isOpen ? 'true' : 'false'}
        ref={flyoutRef}
        role="menu"
        style={flyoutStyle}
      >
        <div className={styles.submenuFlyoutPanel}>{children}</div>
      </div>
    </div>
  )
}

export function VfxTimelineContextMenu({
  anchor,
  clickTime,
  currentTime,
  hasResetPoint,
  hasPlaybackRange,
  onClose,
  onSetResetPoint,
  onSetResetPointAtCurrent,
  onRemoveResetPoint,
  onSetRangeStart,
  onSetRangeStartAtCurrent,
  onSetRangeEnd,
  onSetRangeEndAtCurrent,
  onMovePlaybackRange,
  onRemovePlaybackRange,
}: VfxTimelineContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement>(null)
  const [openSubmenuId, setOpenSubmenuId] = useState<TimelineSubmenuId | null>(null)
  const [placement, setPlacement] = useState(() =>
    computeContextMenuPlacement(anchor.x, anchor.y, 200, 120),
  )

  useLayoutEffect(() => {
    const element = menuRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    setPlacement(computeContextMenuPlacement(anchor.x, anchor.y, rect.width, rect.height))
  }, [anchor.x, anchor.y])

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

  const closeAndRun = (action: () => void) => {
    action()
    onClose()
  }

  return createPortal(
    <div
      className={styles.menu}
      data-expand-down={placement.expandDown ? 'true' : 'false'}
      data-expand-right={placement.expandRight ? 'true' : 'false'}
      data-vfx-timeline-context-menu=""
      onMouseDown={(event) => event.stopPropagation()}
      ref={menuRef}
      role="menu"
      style={{ left: placement.x, top: placement.y }}
    >
      <p className={styles.menuTitle}>{t(LangId.VfxCtxTimelineTitle)}</p>

      <TimelineSubmenu
        expandDown={placement.expandDown}
        expandRight={placement.expandRight}
        isOpen={openSubmenuId === 'reset-point'}
        label={t(LangId.VfxCtxTimelineResetPointMenu)}
        onActivate={() => setOpenSubmenuId('reset-point')}
        submenuId="reset-point"
      >
        <button onClick={() => closeAndRun(onSetResetPoint)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineResetPoint, 'Reset point @ {time}', { time: formatTime(clickTime) })}
        </button>
        <button onClick={() => closeAndRun(onSetResetPointAtCurrent)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineResetPointCurrent, 'Reset point @ {time}', {
            time: formatTime(currentTime),
          })}
        </button>
        <button disabled={!hasResetPoint} onClick={() => closeAndRun(onRemoveResetPoint)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineRemoveReset)}
        </button>
      </TimelineSubmenu>

      <TimelineSubmenu
        expandDown={placement.expandDown}
        expandRight={placement.expandRight}
        isOpen={openSubmenuId === 'playback-range'}
        label={t(LangId.VfxCtxTimelinePlaybackRangeMenu)}
        onActivate={() => setOpenSubmenuId('playback-range')}
        submenuId="playback-range"
      >
        <button onClick={() => closeAndRun(onSetRangeStart)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineRangeStart, 'Start @ {time}', { time: formatTime(clickTime) })}
        </button>
        <button onClick={() => closeAndRun(onSetRangeStartAtCurrent)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineRangeStartCurrent, 'Start @ {time}', {
            time: formatTime(currentTime),
          })}
        </button>
        <button onClick={() => closeAndRun(onSetRangeEnd)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineRangeEnd, 'End @ {time}', { time: formatTime(clickTime) })}
        </button>
        <button onClick={() => closeAndRun(onSetRangeEndAtCurrent)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineRangeEndCurrent, 'End @ {time}', {
            time: formatTime(currentTime),
          })}
        </button>
        <button onClick={() => closeAndRun(onMovePlaybackRange)} role="menuitem" type="button">
          {t(LangId.VfxCtxTimelineMoveRange, 'Move range to {time}', { time: formatTime(clickTime) })}
        </button>
        <button
          disabled={!hasPlaybackRange}
          onClick={() => closeAndRun(onRemovePlaybackRange)}
          role="menuitem"
          type="button"
        >
          {t(LangId.VfxCtxTimelineRemoveRange)}
        </button>
      </TimelineSubmenu>
    </div>,
    document.body,
  )
}
