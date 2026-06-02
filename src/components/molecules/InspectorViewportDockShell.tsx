import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useInspectorViewportDockLayout } from '@/hooks/useInspectorViewportDockLayout'

import dockStyles from '@/styles/inspectorViewportDock.module.css'

type InspectorViewportDockShellProps = {
  minimized: boolean
  eyebrow?: ReactNode
  title: ReactNode
  headerActions: ReactNode
  onExpand: () => void
  expandAriaLabel: string
  expandContent: ReactNode
  body: ReactNode
  bodyClassName: string
  shellSurfaceClassName?: string
  onContextMenu?: (event: React.MouseEvent) => void
  chromeStrip?: boolean
}

export function InspectorViewportDockShell({
  minimized,
  eyebrow,
  title,
  headerActions,
  onExpand,
  expandAriaLabel,
  expandContent,
  body,
  bodyClassName,
  shellSurfaceClassName = '',
  onContextMenu,
  chromeStrip = false,
}: InspectorViewportDockShellProps) {
  const tabAnchorRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const { panelStyle } = useInspectorViewportDockLayout(tabAnchorRef, panelRef, minimized ? null : 'panel')

  const tab = (
    <div
      className={[
        dockStyles.dockTab,
        chromeStrip ? dockStyles.dockTabChrome : '',
        minimized ? '' : dockStyles.dockTabActive,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={tabAnchorRef}
    >
      <button
        aria-label={expandAriaLabel}
        className={dockStyles.dockTabIconButton}
        onClick={onExpand}
        type="button"
      >
        {expandContent}
      </button>
    </div>
  )

  if (minimized) {
    return tab
  }

  if (typeof document === 'undefined') {
    return tab
  }

  const shell = (
    <div
      className={[dockStyles.dockedShell, shellSurfaceClassName, 'inspectorScrollHost'].filter(Boolean).join(' ')}
      onContextMenu={onContextMenu}
      ref={panelRef}
      style={panelStyle}
    >
      <header className={dockStyles.dockedHeader}>
        <div className={dockStyles.dockedHeaderMain}>
          <h2 className={dockStyles.dockedTitle}>{title}</h2>
          {eyebrow ? <div className={dockStyles.dockedEyebrow}>{eyebrow}</div> : null}
        </div>
        <div className={dockStyles.dockedHeaderActions}>{headerActions}</div>
      </header>
      <div
        className={[dockStyles.dockedBody, dockStyles.dockedBodyPad, bodyClassName, 'panelViewportDockedBody'].join(
          ' ',
        )}
      >
        {body}
      </div>
    </div>
  )

  return (
    <>
      {tab}
      {createPortal(shell, document.body)}
    </>
  )
}
