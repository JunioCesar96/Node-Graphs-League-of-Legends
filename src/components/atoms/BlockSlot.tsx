import type { MouseEventHandler, PointerEventHandler } from 'react'

import styles from './BlockSlot.module.css'

type BlockSlotProps = {
  variant?: 'default' | 'out' | 'in'
  active?: boolean
  linked?: boolean
  wireless?: boolean
  forced?: boolean
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

export function BlockSlot({
  variant = 'default',
  active = false,
  linked = false,
  wireless = false,
  forced = false,
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
}: BlockSlotProps) {
  return (
    <button
      type="button"
      className={styles.blockSlot}
      data-variant={variant}
      data-active={active ? '1' : '0'}
      data-linked={linked ? '1' : '0'}
      data-wireless={wireless ? '1' : '0'}
      data-forced={forced ? '1' : '0'}
      data-pulsing={pulsing ? '1' : '0'}
      data-block-slot-id={slotId}
      data-block-slot-node-id={nodeId}
      data-block-slot-direction={variant === 'in' ? 'input' : variant === 'out' ? 'output' : 'generic'}
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onContextMenu={onContextMenu}
    >
      {wireless ? (
        <svg aria-hidden className={styles.chainIcon} viewBox="0 0 16 16">
          <path
            d="M5.5 6.5a2.5 2.5 0 0 1 3.54 0l.71.71M10.5 9.5a2.5 2.5 0 0 1-3.54 0l-.71-.71M6 7l4 2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      ) : null}
    </button>
  )
}
