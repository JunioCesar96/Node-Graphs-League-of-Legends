import type { PointerEvent as ReactPointerEvent } from 'react'

import { Port } from '@/components/atoms/Port'
import type { NodeEntityDefinition } from '@/core/nodeSchema'

import styles from './EntityItem.module.css'

type EntityItemProps = {
  canvasNodeId: string
  active?: boolean
  entity: NodeEntityDefinition
  onOutputWireKeyboard?: (entity: NodeEntityDefinition) => void
  onOutputWirePointerCancel?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerDown?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerMove?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
  onOutputWirePointerUp?: (entity: NodeEntityDefinition, event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function EntityItem({
  active = false,
  canvasNodeId,
  entity,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
}: EntityItemProps) {
  return (
    <li className={styles.item}>
      <span className={styles.name}>{entity.name}</span>
      <Port
        active={active}
        direction="output"
        graphEntityId={entity.id}
        graphNodeId={canvasNodeId}
        graphPortKind="output"
        label={`Start link from ${entity.name}`}
        onWireActivateKeyboard={onOutputWireKeyboard ? () => onOutputWireKeyboard(entity) : undefined}
        onWirePointerCancel={
          onOutputWirePointerCancel ? (event) => onOutputWirePointerCancel(entity, event) : undefined
        }
        onWirePointerDown={onOutputWirePointerDown ? (event) => onOutputWirePointerDown(entity, event) : undefined}
        onWirePointerMove={onOutputWirePointerMove ? (event) => onOutputWirePointerMove(entity, event) : undefined}
        onWirePointerUp={onOutputWirePointerUp ? (event) => onOutputWirePointerUp(entity, event) : undefined}
      />
    </li>
  )
}
