import type { MouseEventHandler, PointerEventHandler } from 'react'

import styles from './SlotPin.module.css'

type SlotPinProps = {
  direction: 'input' | 'output'
  type: string
  slotId: string
  nodeId: string
  active?: boolean
  disabled?: boolean
  ariaLabel: string
  borderColor?: string
  title?: string
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  onPointerUp?: PointerEventHandler<HTMLButtonElement>
  onPointerCancel?: PointerEventHandler<HTMLButtonElement>
  onPointerMove?: PointerEventHandler<HTMLButtonElement>
  onContextMenu?: MouseEventHandler<HTMLButtonElement>
}

export function SlotPin({
  direction,
  type,
  slotId,
  nodeId,
  active = false,
  disabled = false,
  ariaLabel,
  borderColor,
  title,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerMove,
  onContextMenu,
}: SlotPinProps) {
  return (
    <button
      type="button"
      className={styles.slotPin}
      data-direction={direction}
      data-type={type}
      data-active={active ? '1' : '0'}
      data-addon-slot-id={slotId}
      data-addon-slot-node-id={nodeId}
      data-addon-slot-direction={direction}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      style={borderColor ? { borderColor } : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerMove={onPointerMove}
      onContextMenu={onContextMenu}
    />
  )
}
