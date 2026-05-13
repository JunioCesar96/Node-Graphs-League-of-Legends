import type { PointerEvent as ReactPointerEvent } from 'react'

import { Port } from '@/components/atoms/Port'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

import styles from './InternalStructureItem.module.css'

type InternalStructureItemProps = {
  canvasNodeId: string
  active?: boolean
  structure: InternalStructureDefinition
  onOutputWireKeyboard?: (structure: InternalStructureDefinition) => void
  onOutputWirePointerCancel?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerDown?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerMove?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerUp?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
}

export function InternalStructureItem({
  active = false,
  canvasNodeId,
  structure,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
}: InternalStructureItemProps) {
  return (
    <li className={styles.item}>
      <span className={styles.name}>{structure.name}</span>
      <Port
        active={active}
        direction="output"
        graphInternalStructureId={structure.id}
        graphNodeId={canvasNodeId}
        graphPortKind="output"
        label={`Start link from ${structure.name}`}
        onWireActivateKeyboard={onOutputWireKeyboard ? () => onOutputWireKeyboard(structure) : undefined}
        onWirePointerCancel={
          onOutputWirePointerCancel
            ? (event) => onOutputWirePointerCancel(structure, event)
            : undefined
        }
        onWirePointerDown={onOutputWirePointerDown ? (event) => onOutputWirePointerDown(structure, event) : undefined}
        onWirePointerMove={onOutputWirePointerMove ? (event) => onOutputWirePointerMove(structure, event) : undefined}
        onWirePointerUp={onOutputWirePointerUp ? (event) => onOutputWirePointerUp(structure, event) : undefined}
      />
    </li>
  )
}
