import { useRef, type ReactNode } from 'react'

import { useMenuFlyoutFlip } from '@/hooks/useMenuFlyoutFlip'

import styles from '@/components/organisms/AppMenuBar.module.css'

type AppMenuDropdownProps = {
  buttonLabel: ReactNode
  children: ReactNode
  onButtonClick?: () => void
}

export function AppMenuDropdown({ buttonLabel, children, onButtonClick }: AppMenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { flipX, flipY, panelStyle, refresh } = useMenuFlyoutFlip(menuRef, panelRef, 'dropdown')

  const scheduleRefresh = () => {
    refresh()
    requestAnimationFrame(refresh)
  }

  return (
    <div
      className={styles.menu}
      onFocusCapture={scheduleRefresh}
      onMouseEnter={scheduleRefresh}
      ref={menuRef}
    >
      <button className={styles.menuButton} onClick={onButtonClick} type="button">
        {buttonLabel}
      </button>
      <div
        className={styles.menuPanel}
        data-flip-x={flipX ? 'true' : undefined}
        data-flip-y={flipY ? 'true' : undefined}
        ref={panelRef}
        role="menu"
        style={panelStyle}
      >
        {children}
      </div>
    </div>
  )
}
