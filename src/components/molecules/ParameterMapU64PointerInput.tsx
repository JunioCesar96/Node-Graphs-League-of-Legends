import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapU64PointerBlock } from '@/components/molecules/MapU64PointerBlock'
import type {
  WirelessPortHandlers,
  WirelessPortLink,
  WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import type { ElementViewMode, InternalStructureDefinition } from '@/core/nodeSchema'
import { normalizeMapU64PointerString } from '@/core/mapU64PointerValue'

type ParameterMapU64PointerInputProps = {
  activeSlotId?: string
  canvasNodeId: string
  className?: string
  defaultValue?: string
  onCommit: (value: string) => void
  onStructureSlotRemoved?: (slotId: string) => void
  parameterId: string
  parameterTitle: string
  value: string
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
  viewMode?: ElementViewMode
  selectedIndex?: number
  onViewModeChange?: (mode: ElementViewMode) => void
  onSelectedIndexChange?: (index: number) => void
  interactionLocked?: boolean
  onBlockedInteraction?: () => void
}

export function ParameterMapU64PointerInput({
  activeSlotId,
  canvasNodeId,
  className,
  defaultValue,
  onCommit,
  onStructureSlotRemoved,
  parameterId,
  parameterTitle,
  value,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  wirelessOutputLinks,
  wirelessPortHandlers,
  wirelessPortPulse,
  viewMode,
  selectedIndex,
  onViewModeChange,
  onSelectedIndexChange,
  interactionLocked,
  onBlockedInteraction,
}: ParameterMapU64PointerInputProps) {
  return (
    <div className={className} data-parameter-type="mapU64Pointer">
      <MapU64PointerBlock
        activeSlotId={activeSlotId}
        canvasNodeId={canvasNodeId}
        defaultValue={defaultValue}
        interactionLocked={interactionLocked}
        onBlockedInteraction={onBlockedInteraction}
        onChange={(next) => onCommit(normalizeMapU64PointerString(next))}
        onStructureSlotRemoved={onStructureSlotRemoved}
        parameterTitle={parameterTitle}
        onOutputWireKeyboard={onOutputWireKeyboard}
        onOutputWirePointerCancel={onOutputWirePointerCancel}
        onOutputWirePointerDown={onOutputWirePointerDown}
        onOutputWirePointerMove={onOutputWirePointerMove}
        onOutputWirePointerUp={onOutputWirePointerUp}
        wirelessOutputLinks={wirelessOutputLinks}
        wirelessPortHandlers={wirelessPortHandlers}
        wirelessPortPulse={wirelessPortPulse}
        onSelectedIndexChange={onSelectedIndexChange}
        onViewModeChange={onViewModeChange}
        parameterId={parameterId}
        selectedIndex={selectedIndex}
        value={value}
        viewMode={viewMode}
      />
    </div>
  )
}
