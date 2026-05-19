import { MapHashStructurePicker } from '@/components/molecules/MapHashStructurePicker'
import type { MapHashPointerStructureCatalogItem } from '@/core/mapHashPointerValue'

export const MAP_HASH_POINTER_STRUCTURE_PICKER_ROOT_ATTR = 'data-map-hash-pointer-structure-picker'

type MapHashPointerStructurePickerProps = {
  catalog: readonly MapHashPointerStructureCatalogItem[]
  onClose: () => void
  onConfirm: (item: MapHashPointerStructureCatalogItem) => void
  open: boolean
  parameterTitle: string
  titleDomId?: string
}

export function MapHashPointerStructurePicker({
  catalog,
  onClose,
  onConfirm,
  open,
  parameterTitle,
  titleDomId,
}: MapHashPointerStructurePickerProps) {
  return (
    <MapHashStructurePicker
      catalog={catalog}
      onClose={onClose}
      onConfirm={onConfirm}
      open={open}
      parameterKind="pointer"
      parameterTitle={parameterTitle}
      titleDomId={titleDomId ?? 'map-hash-pointer-structure-picker-title'}
    />
  )
}
