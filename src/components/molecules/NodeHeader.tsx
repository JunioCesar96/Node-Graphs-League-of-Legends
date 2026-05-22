import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEventHandler } from 'react'

import { Port, type WirelessPortLinkProps } from '@/components/atoms/Port'
import { canvasContextNodeInputPortProps } from '@/core/canvasContextMenuAttributes'
import type { PortPulseVariant } from '@/core/connectionDisplay'

import styles from './NodeHeader.module.css'

type NodeHeaderProps = {
  canvasNodeId: string
  canAcceptLink?: boolean
  infoTooltip?: string
  onInputPortClick?: () => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
  selected?: boolean
  locked?: boolean
  inputPortStyle?: CSSProperties
  title: string
  wirelessLink?: WirelessPortLinkProps
  inputPortPulseVariant?: PortPulseVariant
}

export function NodeHeader({
  canvasNodeId,
  canAcceptLink = false,
  infoTooltip,
  onInputPortClick,
  onSelect,
  onStartDrag,
  selected = false,
  locked = false,
  inputPortStyle,
  title,
  wirelessLink,
  inputPortPulseVariant,
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
        extraDataAttrs={canvasContextNodeInputPortProps(canvasNodeId)}
        graphNodeId={canvasNodeId}
        graphPortKind="input"
        label={`Connect to ${title}`}
        onClick={wirelessLink?.routing === 'wireless' ? undefined : onInputPortClick}
        style={inputPortStyle}
        portPulseVariant={inputPortPulseVariant}
        wirelessLink={wirelessLink}
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
        {locked ? <span className={styles.lockBadge}>travado</span> : null}
        <span className={styles.badge}>schema</span>
      </span>
    </header>
  )
}
