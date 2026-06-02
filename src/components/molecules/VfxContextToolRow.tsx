import type { ReactNode } from 'react'

import styles from './VfxContextToolRow.module.css'

type VfxContextToolRowProps = {
  checked: boolean
  children: ReactNode
  expanded: boolean
  onCheckedChange: (checked: boolean) => void
  onToggleExpand: () => void
  settingsEnabled?: boolean
  title: string
}

export function VfxContextToolRow({
  checked,
  children,
  expanded,
  onCheckedChange,
  onToggleExpand,
  settingsEnabled = true,
  title,
}: VfxContextToolRowProps) {
  return (
    <div>
      <div className={styles.row}>
        <input
          aria-label={title}
          checked={checked}
          className={styles.checkbox}
          onChange={(event) => onCheckedChange(event.target.checked)}
          type="checkbox"
        />
        <button
          aria-expanded={expanded}
          aria-label={`${title} settings`}
          className={styles.expandBtn}
          onClick={onToggleExpand}
          type="button"
        >
          <span className={styles.chevron} data-open={expanded ? '1' : '0'} />
        </button>
        <span className={styles.title}>{title}</span>
      </div>
      {expanded ? (
        <div className={[styles.body, settingsEnabled ? '' : styles.bodyDisabled].filter(Boolean).join(' ')}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
