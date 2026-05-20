import type { PointerEvent as ReactPointerEvent } from 'react'

import { Port, type WirelessPortLinkProps } from '@/components/atoms/Port'
import { canvasContextElementProps } from '@/core/canvasContextMenuAttributes'
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
  wirelessLink?: WirelessPortLinkProps
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
  wirelessLink,
}: InternalStructureItemProps) {
  return (
    <li
      className={styles.item}
      {...canvasContextElementProps({
        nodeId: canvasNodeId,
        kind: 'internalStructure',
        elementId: structure.id,
      })}
    >
      <span className={styles.name} title={structure.name}>
        {structure.name}
      </span>
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
        wirelessLink={wirelessLink}
      />
    </li>
  )
}
