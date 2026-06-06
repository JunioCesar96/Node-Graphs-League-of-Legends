import type { GraphSnapActionId } from '@/core/graphSnapMenu/graphSnapActions'

import styles from './SnapMenu.module.css'

function SnapSelectionPointerIcon() {
  return (
    <svg aria-hidden height="14" viewBox="0 0 18 18" width="14">
      <path d="M4.5 3.5 14 9 9.5 10 8.5 14.5Z" fill="currentColor" />
    </svg>
  )
}

function SnapCursor2DIcon() {
  return (
    <svg aria-hidden height="14" viewBox="0 0 18 18" width="14">
      <line
        className={styles.cursorIconCrosshair}
        strokeWidth="0.9"
        x1="9"
        x2="9"
        y1="1.5"
        y2="16.5"
      />
      <line
        className={styles.cursorIconCrosshair}
        strokeWidth="0.9"
        x1="1.5"
        x2="16.5"
        y1="9"
        y2="9"
      />
      <circle
        className={styles.cursorIconRingBase}
        cx="9"
        cy="9"
        fill="none"
        r="4.4"
        strokeWidth="1.4"
      />
      <circle
        className={styles.cursorIconRingAccent}
        cx="9"
        cy="9"
        fill="none"
        r="4.4"
        strokeDasharray="3 3"
        strokeWidth="1.1"
      />
    </svg>
  )
}

function SnapCameraIcon() {
  return (
    <svg aria-hidden height="14" viewBox="0 0 18 18" width="14">
      <rect fill="none" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" width="10" x="4" y="6.5" />
      <path d="M7.5 6.5 8.8 4.8h2.4l1.3 1.7" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

export function renderGraphSnapMenuIcon(actionId: string) {
  switch (actionId as GraphSnapActionId) {
    case 'cursorToWorldOrigin':
    case 'cursorToSelected':
    case 'cursorToCamera':
      return <SnapCursor2DIcon />
    case 'cameraFocusCursor':
    case 'cameraFocusSelection':
    case 'cameraFocusWorldOrigin':
      return <SnapCameraIcon />
    case 'selectionToCursor':
    case 'selectionToWorldOrigin':
    case 'selectionToCamera':
      return <SnapSelectionPointerIcon />
    default:
      return <SnapCursor2DIcon />
  }
}
