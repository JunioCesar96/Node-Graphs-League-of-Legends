import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapU64PointerBlock } from '@/components/molecules/MapU64PointerBlock'
import type { InternalStructureDefinition } from '@/core/nodeSchema'
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
}: ParameterMapU64PointerInputProps) {
  return (
    <div className={className} data-parameter-type="mapU64Pointer">
      <MapU64PointerBlock
        activeSlotId={activeSlotId}
        canvasNodeId={canvasNodeId}
        defaultValue={defaultValue}
        onChange={(next) => onCommit(normalizeMapU64PointerString(next))}
        onStructureSlotRemoved={onStructureSlotRemoved}
        parameterTitle={parameterTitle}
        onOutputWireKeyboard={onOutputWireKeyboard}
        onOutputWirePointerCancel={onOutputWirePointerCancel}
        onOutputWirePointerDown={onOutputWirePointerDown}
        onOutputWirePointerMove={onOutputWirePointerMove}
        onOutputWirePointerUp={onOutputWirePointerUp}
        parameterId={parameterId}
        value={value}
      />
    </div>
  )
}
