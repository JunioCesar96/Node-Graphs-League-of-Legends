import { populatedSlotsForEmbed } from '@/core/embedSlots'
import { mapHashEmbedSlotsForParameter } from '@/core/mapHashEmbedSlots'
import { mapHashPointerSlotsForParameter } from '@/core/mapHashPointerSlots'
import { mapU64PointerSlotsForParameter } from '@/core/mapU64PointerSlots'
import { populatedSlotsForListEmbed } from '@/core/listEmbedSlots'
import { populatedSlotsForListPointer } from '@/core/listPointerSlots'
import { populatedSlotsForList2EmbedInstance } from '@/core/list2EmbedSlots'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'
import type {
  ElementViewKey,
  ElementViewMode,
  ElementViewState,
  NodeInstance,
  NodeParameterDefinition,
} from '@/core/nodeSchema'
import { populatedSlotsForPointer } from '@/core/pointerSlots'

export const ELEMENT_VIEW_KEY_PARAM = 'param:'
export const ELEMENT_VIEW_KEY_EMBED = 'embed:'
export const ELEMENT_VIEW_KEY_POINTER = 'pointer:'
export const ELEMENT_VIEW_KEY_LIST_EMBED = 'listEmbed:'
export const ELEMENT_VIEW_KEY_LIST_POINTER = 'listPointer:'
export const ELEMENT_VIEW_KEY_LIST2_EMBED = 'list2Embed:'
export const ELEMENT_VIEW_KEY_LIST2_POINTER = 'list2Pointer:'

export function elementViewKeyForParameter(parameterId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_PARAM}${parameterId}`
}

export function elementViewKeyForEmbed(embedId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_EMBED}${embedId}`
}

export function elementViewKeyForPointer(pointerId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_POINTER}${pointerId}`
}

export function elementViewKeyForListEmbed(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST_EMBED}${blockId}`
}

export function elementViewKeyForListPointer(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST_POINTER}${blockId}`
}

export function elementViewKeyForList2Embed(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST2_EMBED}${blockId}`
}

export function elementViewKeyForList2Pointer(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST2_POINTER}${blockId}`
}

const MAP_STRUCTURE_PARAMETER_TYPES = new Set<NodeParameterDefinition['type']>([
  'mapHashPointer',
  'mapHashEmbed',
  'mapU64Pointer',
])

function isMapStructureParameter(type: NodeParameterDefinition['type']): boolean {
  return MAP_STRUCTURE_PARAMETER_TYPES.has(type)
}

/** Chaves de blocos que suportam toggle lista/compacto. */
export function collectStructureElementViewKeys(node: NodeInstance): ElementViewKey[] {
  const keys: ElementViewKey[] = []
  const schema = node.schema

  for (const parameter of schema.parameters) {
    if (isMapStructureParameter(parameter.type)) {
      keys.push(elementViewKeyForParameter(parameter.id))
    }
  }

  for (const block of schema.embed ?? []) {
    keys.push(elementViewKeyForEmbed(block.id))
  }
  for (const block of schema.pointer ?? []) {
    keys.push(elementViewKeyForPointer(block.id))
  }
  for (const block of schema.listEmbed ?? []) {
    keys.push(elementViewKeyForListEmbed(block.id))
  }
  for (const block of schema.listPointer ?? []) {
    keys.push(elementViewKeyForListPointer(block.id))
  }
  for (const block of schema.list2Embed ?? []) {
    keys.push(elementViewKeyForList2Embed(block.id))
  }
  for (const block of schema.list2Pointer ?? []) {
    keys.push(elementViewKeyForList2Pointer(block.id))
  }

  return keys
}

/** Novos nós começam com todos os blocos estruturais em modo compacto. */
export function applyDefaultCompactElementView(node: NodeInstance): NodeInstance {
  const keys = collectStructureElementViewKeys(node)
  if (keys.length === 0) {
    return node
  }

  const elementView: Record<ElementViewKey, ElementViewState> = {
    ...(node.elementView ?? {}),
  }
  for (const key of keys) {
    elementView[key] = { mode: 'compact', selectedIndex: 0 }
  }

  return { ...node, elementView }
}

export function getElementViewState(
  node: NodeInstance,
  key: ElementViewKey,
): ElementViewState {
  return node.elementView?.[key] ?? { mode: 'list' }
}

export function isElementViewCompact(node: NodeInstance, key: ElementViewKey): boolean {
  return getElementViewState(node, key).mode === 'compact'
}

export function isElementRetracted(node: NodeInstance, key: ElementViewKey): boolean {
  return Boolean(getElementViewState(node, key).retracted)
}

export function clampSelectedIndex(count: number, index: number | undefined): number {
  if (count <= 0) {
    return 0
  }
  const raw = index ?? 0
  if (raw < 0) {
    return 0
  }
  if (raw >= count) {
    return count - 1
  }
  return raw
}

export function resolvedSelectedIndex(node: NodeInstance, key: ElementViewKey, count: number): number {
  const state = getElementViewState(node, key)
  return clampSelectedIndex(count, state.selectedIndex)
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((v) => v.parameterId === parameterId)?.value ?? fallback
}

function mapSlotsForParameter(
  parameter: NodeParameterDefinition,
  value: string,
): { id: string }[] {
  if (parameter.type === 'mapHashPointer') {
    return mapHashPointerSlotsForParameter(parameter, value)
  }
  if (parameter.type === 'mapHashEmbed') {
    return mapHashEmbedSlotsForParameter(parameter, value)
  }
  if (parameter.type === 'mapU64Pointer') {
    return mapU64PointerSlotsForParameter(parameter, value)
  }
  return []
}

export function slotIdsForElement(node: NodeInstance, key: ElementViewKey): string[] {
  const schema = node.schema

  if (key.startsWith(ELEMENT_VIEW_KEY_PARAM)) {
    const parameterId = key.slice(ELEMENT_VIEW_KEY_PARAM.length)
    const parameter = schema.parameters.find((p) => p.id === parameterId)
    if (!parameter) {
      return []
    }
    const value =
      parameterValue(node, parameterId, parameter.defaultValue) ?? parameter.defaultValue
    return mapSlotsForParameter(parameter, value).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_EMBED)) {
    const embedId = key.slice(ELEMENT_VIEW_KEY_EMBED.length)
    const block = schema.embed?.find((e) => e.id === embedId)
    if (!block) {
      return []
    }
    return populatedSlotsForEmbed(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_POINTER)) {
    const pointerId = key.slice(ELEMENT_VIEW_KEY_POINTER.length)
    const block = schema.pointer?.find((p) => p.id === pointerId)
    if (!block) {
      return []
    }
    return populatedSlotsForPointer(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST_EMBED)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST_EMBED.length)
    const block = schema.listEmbed?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    return populatedSlotsForListEmbed(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST_POINTER)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST_POINTER.length)
    const block = schema.listPointer?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    return populatedSlotsForListPointer(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST2_EMBED)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST2_EMBED.length)
    const block = schema.list2Embed?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    const ids: string[] = []
    for (const instance of block.instances) {
      for (const slot of populatedSlotsForList2EmbedInstance(instance)) {
        ids.push(slot.id)
      }
    }
    return ids
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST2_POINTER)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST2_POINTER.length)
    const block = schema.list2Pointer?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    const ids: string[] = []
    for (const instance of block.instances) {
      for (const slot of populatedSlotsForList2PointerInstance(instance)) {
        ids.push(slot.id)
      }
    }
    return ids
  }

  return []
}

/** True se o slot de saída pertence a um bloco em modo compacto. */
export function isSlotInCompactElementView(
  node: NodeInstance,
  fromInternalStructureId: string,
): boolean {
  const schema = node.schema

  for (const parameter of schema.parameters) {
    if (
      parameter.type === 'mapHashPointer' ||
      parameter.type === 'mapHashEmbed' ||
      parameter.type === 'mapU64Pointer'
    ) {
      const key = elementViewKeyForParameter(parameter.id)
      if (!isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      const slots = mapSlotsForParameter(parameter, value)
      if (slots.some((s) => s.id === fromInternalStructureId)) {
        return true
      }
    }
  }

  for (const block of schema.embed ?? []) {
    const key = elementViewKeyForEmbed(block.id)
    if (
      isElementViewCompact(node, key) &&
      populatedSlotsForEmbed(block).some((s) => s.id === fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.pointer ?? []) {
    const key = elementViewKeyForPointer(block.id)
    if (
      isElementViewCompact(node, key) &&
      populatedSlotsForPointer(block).some((s) => s.id === fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.listEmbed ?? []) {
    const key = elementViewKeyForListEmbed(block.id)
    if (
      isElementViewCompact(node, key) &&
      populatedSlotsForListEmbed(block).some((s) => s.id === fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.listPointer ?? []) {
    const key = elementViewKeyForListPointer(block.id)
    if (
      isElementViewCompact(node, key) &&
      populatedSlotsForListPointer(block).some((s) => s.id === fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.list2Embed ?? []) {
    const key = elementViewKeyForList2Embed(block.id)
    if (!isElementViewCompact(node, key)) {
      continue
    }
    for (const instance of block.instances) {
      if (
        populatedSlotsForList2EmbedInstance(instance).some(
          (s) => s.id === fromInternalStructureId,
        )
      ) {
        return true
      }
    }
  }

  for (const block of schema.list2Pointer ?? []) {
    const key = elementViewKeyForList2Pointer(block.id)
    if (!isElementViewCompact(node, key)) {
      continue
    }
    for (const instance of block.instances) {
      if (
        populatedSlotsForList2PointerInstance(instance).some(
          (s) => s.id === fromInternalStructureId,
        )
      ) {
        return true
      }
    }
  }

  return false
}

export function patchElementViewMode(
  node: NodeInstance,
  key: ElementViewKey,
  mode: ElementViewMode,
  selectedIndex?: number,
): NodeInstance {
  const prev = getElementViewState(node, key)
  const nextState: ElementViewState = {
    mode,
    ...(prev.retracted ? { retracted: true } : {}),
    ...(mode === 'compact'
      ? { selectedIndex: selectedIndex ?? prev.selectedIndex ?? 0 }
      : prev.selectedIndex !== undefined
        ? { selectedIndex: prev.selectedIndex }
        : {}),
  }
  return {
    ...node,
    elementView: {
      ...(node.elementView ?? {}),
      [key]: nextState,
    },
  }
}

export function patchElementSelectedIndex(
  node: NodeInstance,
  key: ElementViewKey,
  selectedIndex: number,
): NodeInstance {
  const prev = getElementViewState(node, key)
  return {
    ...node,
    elementView: {
      ...(node.elementView ?? {}),
      [key]: {
        ...prev,
        selectedIndex,
      },
    },
  }
}

export function patchElementRetracted(
  node: NodeInstance,
  key: ElementViewKey,
  retracted: boolean,
): NodeInstance {
  const prev = getElementViewState(node, key)
  const nextState: ElementViewState = retracted
    ? { ...prev, retracted: true }
    : {
        mode: prev.mode,
        ...(prev.selectedIndex !== undefined ? { selectedIndex: prev.selectedIndex } : {}),
      }
  return {
    ...node,
    elementView: {
      ...(node.elementView ?? {}),
      [key]: nextState,
    },
  }
}
