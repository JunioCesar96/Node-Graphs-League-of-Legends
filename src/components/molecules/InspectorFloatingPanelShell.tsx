import type { HTMLAttributes, ReactNode } from 'react'

import dockStyles from '@/styles/inspectorViewportDock.module.css'

type InspectorFloatingPanelShellProps = {
  ariaLabel: string
  title: ReactNode
  eyebrow?: ReactNode
  headerActions: ReactNode
  body: ReactNode
  bodyClassName?: string
  shellSurfaceClassName?: string
  dragHandleProps?: HTMLAttributes<HTMLElement>
  onContextMenu?: (event: React.MouseEvent) => void
}

export function InspectorFloatingPanelShell({
  ariaLabel,
  title,
  eyebrow,
  headerActions,
  body,
  bodyClassName = '',
  shellSurfaceClassName = '',
  dragHandleProps,
  onContextMenu,
}: InspectorFloatingPanelShellProps) {
  const headerClassName = [
    dockStyles.dockedHeader,
    dragHandleProps?.onPointerDown ? dockStyles.dockedHeaderDraggable : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside
      aria-label={ariaLabel}
      className={[
        dockStyles.dockedShell,
        dockStyles.inspectorFloatingShell,
        shellSurfaceClassName,
        'inspectorScrollHost',
      ]
        .filter(Boolean)
        .join(' ')}
      onContextMenu={onContextMenu}
    >
      <header className={headerClassName} {...dragHandleProps}>
        <div className={dockStyles.dockedHeaderMain}>
          <h2 className={dockStyles.dockedTitle}>{title}</h2>
          {eyebrow ? <div className={dockStyles.dockedEyebrow}>{eyebrow}</div> : null}
        </div>
        <div className={dockStyles.dockedHeaderActions}>{headerActions}</div>
      </header>
      <div
        className={[dockStyles.dockedBody, dockStyles.dockedBodyPad, bodyClassName, 'panelViewportDockedBody']
          .filter(Boolean)
          .join(' ')}
      >
        {body}
      </div>
    </aside>
  )
}
