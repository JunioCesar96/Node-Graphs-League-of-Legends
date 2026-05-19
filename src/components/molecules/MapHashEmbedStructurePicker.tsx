import { MapHashStructurePicker } from '@/components/molecules/MapHashStructurePicker'
import type { MapHashEmbedStructureCatalogItem } from '@/core/mapHashEmbedValue'

export const MAP_HASH_EMBED_STRUCTURE_PICKER_ROOT_ATTR = 'data-map-hash-embed-structure-picker'

type MapHashEmbedStructurePickerProps = {
  catalog: readonly MapHashEmbedStructureCatalogItem[]
  onClose: () => void
  onConfirm: (item: MapHashEmbedStructureCatalogItem) => void
  open: boolean
  parameterTitle: string
  titleDomId?: string
}

export function MapHashEmbedStructurePicker({
  catalog,
  onClose,
  onConfirm,
  open,
  parameterTitle,
  titleDomId,
}: MapHashEmbedStructurePickerProps) {
  return (
    <MapHashStructurePicker
      catalog={catalog}
      onClose={onClose}
      onConfirm={onConfirm}
      open={open}
      parameterKind="embed"
      parameterTitle={parameterTitle}
      titleDomId={titleDomId ?? 'map-hash-embed-structure-picker-title'}
    />
  )
}
