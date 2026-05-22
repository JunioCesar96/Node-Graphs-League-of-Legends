import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react'

import { Port } from '@/components/atoms/Port'
import { OutputSlotPeerToolbar } from '@/components/molecules/OutputSlotPeerToolbar'
import {
  isWirelessPortPulsing,
  portPulseVariantForTarget,
  toWirelessPortLinkProps,
  type WirelessPortHandlers,
  type WirelessPortLink,
  type WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import type { OutputSlotPeerActions } from '@/core/outputSlotPeerActions'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

import rowStyles from './StructureOutputSlotRow.module.css'

export type StructureOutputSlotRowProps = {
  activeSlotId?: string
  canvasNodeId: string
  liClassName?: string
  liProps?: HTMLAttributes<HTMLLIElement>
  outputSlotPeerActions?: OutputSlotPeerActions
  portLabel: string
  slot: InternalStructureDefinition
  slotName?: string
  slotNameClassName?: string
  onOutputWireKeyboard?: (slot: InternalStructureDefinition) => void
  onOutputWirePointerCancel?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerDown?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerMove?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerUp?: (
    slot: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  wirelessOutputLinks?: ReadonlyMap<string, WirelessPortLink>
  wirelessPortHandlers?: WirelessPortHandlers
  wirelessPortPulse?: WirelessPortPulseTarget
}

export function StructureOutputSlotRow({
  activeSlotId,
  canvasNodeId,
  liClassName,
  liProps,
  outputSlotPeerActions,
  portLabel,
  slot,
  slotName,
  slotNameClassName,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  wirelessOutputLinks,
  wirelessPortHandlers,
  wirelessPortPulse,
}: StructureOutputSlotRowProps) {
  const displayName = slotName ?? slot.name
  const peerState = outputSlotPeerActions?.getPeerState(slot.id)

  return (
    <li
      className={[rowStyles.slot, liClassName].filter(Boolean).join(' ')}
      key={slot.id}
      {...liProps}
    >
      <span
        className={[rowStyles.slotName, slotNameClassName].filter(Boolean).join(' ')}
        title={displayName}
      >
        {displayName}
      </span>
      <div className={rowStyles.slotTrailing}>
        {peerState ? (
          <OutputSlotPeerToolbar
            peer={peerState}
            onFocusPeer={() => outputSlotPeerActions!.onFocusPeer(slot.id)}
            onToggleLock={() => outputSlotPeerActions!.onToggleLock(slot.id)}
            onToggleVisibility={() => outputSlotPeerActions!.onToggleVisibility(slot.id)}
          />
        ) : null}
        <Port
        active={slot.id === activeSlotId}
        direction="output"
        graphInternalStructureId={slot.id}
        graphNodeId={canvasNodeId}
        graphPortKind="output"
        label={portLabel}
        onWireActivateKeyboard={
          onOutputWireKeyboard ? () => onOutputWireKeyboard(slot) : undefined
        }
        onWirePointerCancel={
          onOutputWirePointerCancel
            ? (event) => onOutputWirePointerCancel(slot, event)
            : undefined
        }
        onWirePointerDown={
          onOutputWirePointerDown ? (event) => onOutputWirePointerDown(slot, event) : undefined
        }
        onWirePointerMove={
          onOutputWirePointerMove ? (event) => onOutputWirePointerMove(slot, event) : undefined
        }
        onWirePointerUp={
          onOutputWirePointerUp ? (event) => onOutputWirePointerUp(slot, event) : undefined
        }
        portPulseVariant={portPulseVariantForTarget(
          wirelessPortPulse,
          canvasNodeId,
          'output',
          slot.id,
        )}
        wirelessLink={toWirelessPortLinkProps(
          wirelessOutputLinks?.get(slot.id),
          wirelessPortHandlers,
          isWirelessPortPulsing(
            wirelessPortPulse,
            wirelessOutputLinks?.get(slot.id)?.connectionId ?? '',
            'output',
            slot.id,
          ),
        )}
        />
      </div>
    </li>
  )
}
