import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
} from 'react'

import styles from './Port.module.css'

type PortDirection = 'input' | 'output'

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
}: PortProps) {
  const wireMode = Boolean(onWirePointerDown)
  const classes = [
    styles.port,
    styles[direction],
    active ? styles.active : '',
    compatible ? styles.compatible : '',
    onClick || wireMode ? styles.interactive : '',
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
