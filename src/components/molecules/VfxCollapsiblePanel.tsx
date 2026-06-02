import { useState, type ReactNode } from 'react'

import styles from './VfxCollapsiblePanel.module.css'

type VfxCollapsiblePanelProps = {
  title: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
  placement?: 'topLeft' | 'bottomRight'
}

export function VfxCollapsiblePanel({
  title,
  children,
  className,
  defaultOpen = true,
  placement = 'topLeft',
}: VfxCollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={[
        styles.panel,
        placement === 'bottomRight' ? styles.panelBottomRight : styles.panelTopLeft,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        aria-expanded={open}
        className={styles.head}
        onClick={() => setOpen((previous) => !previous)}
        type="button"
      >
        <span className={styles.chevron} data-open={open ? '1' : '0'} />
        <span className={styles.title}>{title}</span>
      </button>
      {open ? <div className={styles.body}>{children}</div> : null}
    </div>
  )
}
