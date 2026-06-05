import type { ComponentProps } from 'react'

import { mapU64PointerSlotId } from '@/core/mapU64PointerSlots'
import {
  MAP_U64_POINTER_NEW_KEY_DEFAULT,
  formatMapU64PointerString,
  normalizeU64Key,
  parseMapU64PointerString,
} from '@/core/mapU64PointerValue'

import {
  BlockMapHashStructureField,
  type BlockMapHashStructureFieldConfig,
} from './BlockMapHashStructureField'

const config: BlockMapHashStructureFieldConfig = {
  parameterKind: 'u64Pointer',
  newKeyDefault: MAP_U64_POINTER_NEW_KEY_DEFAULT,
  normalizeKey: normalizeU64Key,
  parseEntries: parseMapU64PointerString,
  formatEntries: formatMapU64PointerString,
  slotIdForKey: mapU64PointerSlotId,
  emptyHint: 'Mapa vazio — use + para adicionar',
}

type BlockMapU64PointerFieldProps = Omit<
  ComponentProps<typeof BlockMapHashStructureField>,
  keyof BlockMapHashStructureFieldConfig
>

export function BlockMapU64PointerField(props: BlockMapU64PointerFieldProps) {
  return <BlockMapHashStructureField {...config} {...props} />
}
