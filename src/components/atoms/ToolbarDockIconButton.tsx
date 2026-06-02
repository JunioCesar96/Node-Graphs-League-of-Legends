import { DockTabIcon, type DockTabKind } from '@/components/atoms/DockTabIcon'

import dockStyles from '@/styles/inspectorViewportDock.module.css'

type ToolbarDockIconButtonProps = {
  kind: DockTabKind
  ariaLabel: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  chromeStrip?: boolean
}

export function ToolbarDockIconButton({
  kind,
  ariaLabel,
  onClick,
  active = false,
  disabled = false,
  chromeStrip = false,
}: ToolbarDockIconButtonProps) {
  return (
    <div
      className={[
        dockStyles.dockTab,
        chromeStrip ? dockStyles.dockTabChrome : '',
        active ? dockStyles.dockTabActive : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        aria-label={ariaLabel}
        className={dockStyles.dockTabIconButton}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <DockTabIcon kind={kind} />
      </button>
    </div>
  )
}
