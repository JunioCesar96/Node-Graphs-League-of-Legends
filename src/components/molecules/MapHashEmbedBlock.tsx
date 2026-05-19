import type { PointerEvent as ReactPointerEvent } from 'react'

import { MapHashStructureBlock } from '@/components/molecules/MapHashStructureBlock'
import { normalizeHashItem } from '@/core/listHashValue'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import {
  MAP_HASH_EMBED_NEW_KEY_DEFAULT,
  formatMapHashEmbedString,
  parseMapHashEmbedString,
} from '@/core/mapHashEmbedValue'
import type { InternalStructureDefinition } from '@/core/nodeSchema'

type MapHashEmbedBlockProps = {
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

export function MapHashEmbedBlock(props: MapHashEmbedBlockProps) {
  return (
    <MapHashStructureBlock
      {...props}
      formatEntries={formatMapHashEmbedString}
      keyEntryLabel="hash"
      newKeyDefault={MAP_HASH_EMBED_NEW_KEY_DEFAULT}
      normalizeKey={normalizeHashItem}
      parameterKind="embed"
      parseEntries={parseMapHashEmbedString}
      slotIdForKey={mapHashEmbedSlotId}
    />
  )
}
