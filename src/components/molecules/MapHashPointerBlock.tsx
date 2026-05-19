import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapHashStructureBlock } from '@/components/molecules/MapHashStructureBlock'
import { normalizeHashItem } from '@/core/listHashValue'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import {
  MAP_HASH_POINTER_NEW_KEY_DEFAULT,
  formatMapHashPointerString,
  parseMapHashPointerString,
} from '@/core/mapHashPointerValue'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

type MapHashPointerBlockProps = {
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
}

export function MapHashPointerBlock(props: MapHashPointerBlockProps) {
  return (
    <MapHashStructureBlock
      {...props}
      formatEntries={formatMapHashPointerString}
      keyEntryLabel="hash"
      newKeyDefault={MAP_HASH_POINTER_NEW_KEY_DEFAULT}
      normalizeKey={normalizeHashItem}
      parameterKind="pointer"
      parseEntries={parseMapHashPointerString}
      slotIdForKey={mapHashPointerSlotId}
    />
  )
}
