import type { ElementViewMode } from '@/core/nodeSchema'

import styles from './StructureViewToggle.module.css'

type StructureViewToggleProps = {
  mode: ElementViewMode
  onModeChange: (mode: ElementViewMode) => void
  title?: string
}

function ListIcon() {
  return (
    <svg aria-hidden className={styles.icon} viewBox="0 0 16 16">
      <circle cx="3" cy="4" fill="currentColor" r="1" />
      <circle cx="3" cy="8" fill="currentColor" r="1" />
      <circle cx="3" cy="12" fill="currentColor" r="1" />
      <rect fill="currentColor" height="1.5" rx="0.5" width="9" x="6" y="3.25" />
      <rect fill="currentColor" height="1.5" rx="0.5" width="9" x="6" y="7.25" />
      <rect fill="currentColor" height="1.5" rx="0.5" width="9" x="6" y="11.25" />
    </svg>
  )
}

function CompactIcon() {
  return (
    <svg aria-hidden className={styles.icon} viewBox="0 0 16 16">
      <path
        d="M4 2.5 2.5 4 4 5.5M12 2.5 13.5 4 12 5.5M4 10.5 2.5 12 4 13.5M12 10.5 13.5 12 12 13.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
      <rect fill="currentColor" height="4" opacity="0.35" rx="0.5" width="4" x="6" y="6" />
    </svg>
  )
}

export function StructureViewToggle({ mode, onModeChange, title }: StructureViewToggleProps) {
  const isCompact = mode === 'compact'
  const label = isCompact ? 'Modo compacto activo' : 'Modo lista activo'

  return (
    <button
      aria-label={title ?? label}
      aria-pressed={isCompact}
      className={styles.toggle}
      onClick={() => onModeChange(isCompact ? 'list' : 'compact')}
      title={
        title ??
        (isCompact ? 'Mudar para visualização em lista' : 'Mudar para visualização compacta')
      }
      type="button"
    >
      {isCompact ? <ListIcon /> : <CompactIcon />}
    </button>
  )
}
