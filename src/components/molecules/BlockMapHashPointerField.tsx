import type { ComponentProps } from 'react'

import { normalizeHashItem } from '@/core/listHashValue'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import {
  MAP_HASH_POINTER_NEW_KEY_DEFAULT,
  formatMapHashPointerString,
  parseMapHashPointerString,
} from '@/core/mapHashPointerValue'

import {
  BlockMapHashStructureField,
  type BlockMapHashStructureFieldConfig,
} from './BlockMapHashStructureField'

const config: BlockMapHashStructureFieldConfig = {
  parameterKind: 'pointer',
  newKeyDefault: MAP_HASH_POINTER_NEW_KEY_DEFAULT,
  normalizeKey: normalizeHashItem,
  parseEntries: parseMapHashPointerString,
  formatEntries: formatMapHashPointerString,
  slotIdForKey: mapHashPointerSlotId,
  emptyHint: 'Mapa vazio — use + para adicionar',
}

type BlockMapHashPointerFieldProps = Omit<
  ComponentProps<typeof BlockMapHashStructureField>,
  keyof BlockMapHashStructureFieldConfig
>

export function BlockMapHashPointerField(props: BlockMapHashPointerFieldProps) {
  return <BlockMapHashStructureField {...config} {...props} />
}
