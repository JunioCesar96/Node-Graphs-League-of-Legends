import type { MouseEvent as ReactMouseEvent, PointerEventHandler } from 'react'

import { Port } from '@/components/atoms/Port'

import styles from './NodeHeader.module.css'

type NodeHeaderProps = {
  canvasNodeId: string
  canAcceptLink?: boolean
  infoTooltip?: string
  onInputPortClick?: () => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  selected?: boolean
  title: string
}

export function NodeHeader({
  canvasNodeId,
  canAcceptLink = false,
  infoTooltip,
  onInputPortClick,
  onSelect,
  onStartDrag,
  selected = false,
  title,
}: NodeHeaderProps) {
  return (
    <header
      aria-label={`Select ${title} node`}
      aria-pressed={selected}
      className={`${styles.header} ${onSelect ? styles.selectable : ''}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.()
        }
      }}
      onPointerDown={onStartDrag}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <Port
        compatible={canAcceptLink}
        direction="input"
        graphNodeId={canvasNodeId}
        graphPortKind="input"
        label={`Connect to ${title}`}
        onClick={onInputPortClick}
      />
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.actions}>
        {infoTooltip ? (
          <button
            className={styles.infoBadge}
            type="button"
            aria-label={infoTooltip}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            i
            <span className={styles.infoTooltip}>{infoTooltip}</span>
          </button>
        ) : null}
        <span className={styles.badge}>schema</span>
      </span>
    </header>
  )
}
