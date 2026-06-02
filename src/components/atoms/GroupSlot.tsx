import type { MouseEventHandler, PointerEventHandler } from 'react'

import styles from './GroupSlot.module.css'

type GroupSlotProps = {
  variant?: 'default' | 'out' | 'in'
  active?: boolean
  linked?: boolean
  pulsing?: boolean
  disabled?: boolean
  ariaLabel: string
  slotId?: string
  nodeId?: string
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  onPointerUp?: PointerEventHandler<HTMLButtonElement>
  onPointerMove?: PointerEventHandler<HTMLButtonElement>
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
  onContextMenu?: MouseEventHandler<HTMLButtonElement>
}

export function GroupSlot({
  variant = 'default',
  active = false,
  linked = false,
  pulsing = false,
  disabled = false,
  ariaLabel,
  slotId,
  nodeId,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onContextMenu,
}: GroupSlotProps) {
  return (
    <button
      type="button"
      className={styles.GroupSlot}
      data-variant={variant}
      data-active={active ? '1' : '0'}
      data-linked={linked ? '1' : '0'}
      data-pulsing={pulsing ? '1' : '0'}
      data-group-slot-id={slotId}
      data-group-slot-node-id={nodeId}
      data-group-slot-direction={variant === 'in' ? 'input' : variant === 'out' ? 'output' : 'generic'}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    />
  )
}
