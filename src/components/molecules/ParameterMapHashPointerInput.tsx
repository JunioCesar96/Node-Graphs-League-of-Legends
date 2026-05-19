import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapHashPointerBlock } from '@/components/molecules/MapHashPointerBlock'
import type {
  WirelessPortHandlers,
  WirelessPortLink,
  WirelessPortPulseTarget,
} from '@/core/connectionDisplay'
import type { InternalStructureDefinition } from '@/core/nodeSchema'
import { normalizeMapHashPointerString } from '@/core/mapHashPointerValue'

type ParameterMapHashPointerInputProps = {
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
}

export function ParameterMapHashPointerInput({
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
}: ParameterMapHashPointerInputProps) {
  return (
    <div className={className} data-parameter-type="mapHashPointer">
      <MapHashPointerBlock
        activeSlotId={activeSlotId}
        canvasNodeId={canvasNodeId}
        defaultValue={defaultValue}
        onChange={(next) => onCommit(normalizeMapHashPointerString(next))}
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
        parameterId={parameterId}
        value={value}
      />
    </div>
  )
}
