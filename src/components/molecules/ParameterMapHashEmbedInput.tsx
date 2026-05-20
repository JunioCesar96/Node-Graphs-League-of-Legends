import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapHashEmbedBlock } from '@/components/molecules/MapHashEmbedBlock'
import type {
  WirelessPortHandlers,
  WirelessPortLink,
  WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import type { ElementViewMode, InternalStructureDefinition } from '@/core/nodeSchema'
import { normalizeMapHashEmbedString } from '@/core/mapHashEmbedValue'

type ParameterMapHashEmbedInputProps = {
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
}

export function ParameterMapHashEmbedInput({
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
}: ParameterMapHashEmbedInputProps) {
  return (
    <div className={className} data-parameter-type="mapHashEmbed">
      <MapHashEmbedBlock
        activeSlotId={activeSlotId}
        canvasNodeId={canvasNodeId}
        defaultValue={defaultValue}
        onChange={(next) => onCommit(normalizeMapHashEmbedString(next))}
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
