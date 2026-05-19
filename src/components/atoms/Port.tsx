import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
} from 'react'

import type { WirelessPeerHoverPayload } from '@/core/connectionDisplay'

import styles from './Port.module.css'

type PortDirection = 'input' | 'output'

export type WirelessPortLinkProps = {
  connectionId: string
  peerNodeId: string
  peerTitle: string
  peerPulsePortKind: 'input' | 'output'
  peerPulseOutputSlotId?: string
  wirelessPeerPulse?: boolean
  onCycleRouting?: (connectionId: string) => void
  onRemoveConnection?: (connectionId: string) => void
  onWirelessPeerHoverStart?: (payload: WirelessPeerHoverPayload) => void
  onWirelessPeerHoverEnd?: () => void
}

type PortProps = {
  active?: boolean
  compatible?: boolean
  direction: PortDirection
  graphInternalStructureId?: string
  graphNodeId?: string
  graphPortKind?: 'input' | 'output'
  label?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  onWireActivateKeyboard?: () => void
  onWirePointerCancel?: PointerEventHandler<HTMLButtonElement>
  onWirePointerDown?: PointerEventHandler<HTMLButtonElement>
  onWirePointerMove?: PointerEventHandler<HTMLButtonElement>
  onWirePointerUp?: PointerEventHandler<HTMLButtonElement>
  wirelessLink?: WirelessPortLinkProps
}

function ChainIcon() {
  return (
    <svg aria-hidden className={styles.chainIcon} viewBox="0 0 16 16">
      <path
        d="M5.5 6.5a2.5 2.5 0 0 1 3.54 0l.71.71M10.5 9.5a2.5 2.5 0 0 1-3.54 0l-.71-.71M6 7l4 2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function Port({
  active = false,
  compatible = false,
  direction,
  graphInternalStructureId,
  graphNodeId,
  graphPortKind,
  label,
  onClick,
  onWireActivateKeyboard,
  onWirePointerCancel,
  onWirePointerDown,
  onWirePointerMove,
  onWirePointerUp,
  wirelessLink,
}: PortProps) {
  const wireMode = Boolean(onWirePointerDown)
  const classes = [
    styles.port,
    styles[direction],
    wirelessLink ? styles.wireless : '',
    wirelessLink?.wirelessPeerPulse ? styles.wirelessPulse : '',
    active ? styles.active : '',
    compatible ? styles.compatible : '',
    onClick || wireMode || wirelessLink ? styles.interactive : '',
  ]
    .filter(Boolean)
    .join(' ')

  const graphDataProps: Record<string, string> = {}
  if (graphNodeId !== undefined && graphPortKind !== undefined) {
    graphDataProps['data-graph-node-id'] = graphNodeId
    graphDataProps['data-graph-port'] = graphPortKind
    if (graphPortKind === 'output' && graphInternalStructureId !== undefined) {
      graphDataProps['data-graph-internal-structure-id'] = graphInternalStructureId
    }
  }

  const wirelessTitle = wirelessLink
    ? `Este nó está conectado ao nó: ${wirelessLink.peerTitle}`
    : undefined

  if (wirelessLink) {
    return (
      <button
        {...graphDataProps}
        aria-label={label ?? wirelessTitle}
        className={classes}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()

          if (event.ctrlKey || event.metaKey) {
            wirelessLink.onRemoveConnection?.(wirelessLink.connectionId)
            return
          }

          wirelessLink.onCycleRouting?.(wirelessLink.connectionId)
        }}
        onMouseEnter={() =>
          wirelessLink.onWirelessPeerHoverStart?.({
            peerNodeId: wirelessLink.peerNodeId,
            pulseOnPeer: {
              connectionId: wirelessLink.connectionId,
              portKind: wirelessLink.peerPulsePortKind,
              outputSlotId: wirelessLink.peerPulseOutputSlotId,
            },
          })
        }
        onMouseLeave={() => wirelessLink.onWirelessPeerHoverEnd?.()}
        title={wirelessTitle}
        type="button"
      >
        <ChainIcon />
      </button>
    )
  }

  if (wireMode || onClick) {
    return (
      <button
        {...graphDataProps}
        aria-label={label}
        className={classes}
        onClick={
          wireMode || !onClick
            ? undefined
            : (event) => {
                event.stopPropagation()
                onClick(event)
              }
        }
        onKeyDown={
          wireMode && onWireActivateKeyboard
            ? ((event: ReactKeyboardEvent<HTMLButtonElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onWireActivateKeyboard()
                }
              }) satisfies KeyboardEventHandler<HTMLButtonElement>
            : undefined
        }
        onPointerCancel={(event) => {
          event.stopPropagation()
          onWirePointerCancel?.(event)
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
          onWirePointerDown?.(event)
        }}
        onPointerMove={(event) => {
          event.stopPropagation()
          onWirePointerMove?.(event)
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
          onWirePointerUp?.(event)
        }}
        type="button"
      />
    )
  }

  return (
    <span {...graphDataProps} aria-hidden="true" className={classes} />
  )
}
