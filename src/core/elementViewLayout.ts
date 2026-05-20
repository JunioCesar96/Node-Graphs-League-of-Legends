import {
  elementViewKeyForParameter,
  getElementViewState,
  isElementRetracted,
} from '@/core/elementViewState'
import type { ElementViewKey, NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import {
  MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT,
  MAP_HASH_POINTER_ENTRY_GAP,
  MAP_HASH_POINTER_ENTRY_PADDING,
  MAP_HASH_POINTER_HASH_ROW_HEIGHT,
  MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT,
} from '@/core/mapHashPointerSlots'

export const STRUCTURE_INDEX_PAGER_HEIGHT = 28

/** Altura da barra retraída de um elemento no card (parâmetro ou bloco). */
export const ELEMENT_RETRACTED_ROW_HEIGHT = 44

const INTERNAL_STRUCTURE_ITEM_HEIGHT = 36
const ITEM_GAP = 8

export function isElementCompact(node: NodeInstance, elementKey: ElementViewKey): boolean {
  return getElementViewState(node, elementKey).mode === 'compact'
}

export { isElementRetracted }

export function mapHashStructureListHeight(entryCount: number, hasStructureInLast = false): number {
  if (entryCount <= 0) {
    return MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT + MAP_HASH_POINTER_HASH_ROW_HEIGHT
  }
  let height = MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT
  for (let i = 0; i < entryCount; i += 1) {
    height += MAP_HASH_POINTER_HASH_ROW_HEIGHT
    if (hasStructureInLast && i === entryCount - 1) {
      height += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
    }
    height += MAP_HASH_POINTER_ENTRY_PADDING
    if (i < entryCount - 1) {
      height += MAP_HASH_POINTER_ENTRY_GAP
    }
  }
  return height
}

export function mapHashStructureCompactHeight(hasStructure = false): number {
  let height =
    MAP_HASH_POINTER_BLOCK_HEADER_HEIGHT + MAP_HASH_POINTER_HASH_ROW_HEIGHT + MAP_HASH_POINTER_ENTRY_PADDING
  if (hasStructure) {
    height += MAP_HASH_POINTER_ENTRY_GAP + MAP_HASH_POINTER_STRUCTURE_ROW_HEIGHT
  }
  return height + STRUCTURE_INDEX_PAGER_HEIGHT
}

export function listSlotsListHeight(slotCount: number, blockHeaderHeight = 42): number {
  if (slotCount <= 0) {
    return blockHeaderHeight
  }
  const slotsHeight =
    slotCount * INTERNAL_STRUCTURE_ITEM_HEIGHT + Math.max(0, slotCount - 1) * ITEM_GAP + ITEM_GAP
  return blockHeaderHeight + slotsHeight
}

export function listSlotsCompactHeight(blockHeaderHeight = 42): number {
  return blockHeaderHeight + INTERNAL_STRUCTURE_ITEM_HEIGHT + ITEM_GAP + STRUCTURE_INDEX_PAGER_HEIGHT
}

export function parameterMapCompact(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
): boolean {
  if (
    parameter.type !== 'mapHashPointer' &&
    parameter.type !== 'mapHashEmbed' &&
    parameter.type !== 'mapU64Pointer'
  ) {
    return false
  }
  return isElementCompact(node, elementViewKeyForParameter(parameter.id))
}
