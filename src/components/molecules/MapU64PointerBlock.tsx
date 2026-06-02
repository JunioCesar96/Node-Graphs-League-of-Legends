import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapHashStructureBlock } from '@/components/molecules/MapHashStructureBlock'
import { mapU64PointerSlotId } from '@/core/mapU64PointerSlots'
import {
  MAP_U64_POINTER_NEW_KEY_DEFAULT,
  formatMapU64PointerString,
  normalizeU64Key,
  parseMapU64PointerString,
} from '@/core/mapU64PointerValue'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

type MapU64PointerBlockProps = {
  activeSlotId?: string
  canvasNodeId: string
  defaultValue?: string
  onChange: (next: string) => void
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
  onCycleConnectionRouting?: (connectionId: string) => void
  onRemoveConnection?: (connectionId: string) => void
  wirelessOutputLinks?: ReadonlyMap<string, import('@/core/connectionDisplay').WirelessPortLink>
  onRetractFromTitle?: () => void
}

export function MapU64PointerBlock(props: MapU64PointerBlockProps) {
  return (
    <MapHashStructureBlock
      {...props}
      formatEntries={formatMapU64PointerString}
      keyEntryLabel="u64"
      newKeyDefault={MAP_U64_POINTER_NEW_KEY_DEFAULT}
      normalizeKey={normalizeU64Key}
      parameterKind="u64Pointer"
      parseEntries={parseMapU64PointerString}
      slotIdForKey={mapU64PointerSlotId}
    />
  )
}
