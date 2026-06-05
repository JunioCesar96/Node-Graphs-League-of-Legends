import type { ComponentProps } from 'react'

import { normalizeHashItem } from '@/core/listHashValue'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import {
  MAP_HASH_EMBED_NEW_KEY_DEFAULT,
  formatMapHashEmbedString,
  parseMapHashEmbedString,
} from '@/core/mapHashEmbedValue'

import {
  BlockMapHashStructureField,
  type BlockMapHashStructureFieldConfig,
} from './BlockMapHashStructureField'

const config: BlockMapHashStructureFieldConfig = {
  parameterKind: 'embed',
  newKeyDefault: MAP_HASH_EMBED_NEW_KEY_DEFAULT,
  normalizeKey: normalizeHashItem,
  parseEntries: parseMapHashEmbedString,
  formatEntries: formatMapHashEmbedString,
  slotIdForKey: mapHashEmbedSlotId,
  emptyHint: 'Mapa vazio — use + para adicionar',
}

type BlockMapHashEmbedFieldProps = Omit<
  ComponentProps<typeof BlockMapHashStructureField>,
  keyof BlockMapHashStructureFieldConfig
>

export function BlockMapHashEmbedField(props: BlockMapHashEmbedFieldProps) {
  return <BlockMapHashStructureField {...config} {...props} />
}
