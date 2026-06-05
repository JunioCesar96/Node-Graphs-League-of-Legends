import { populatedSlotsForEmbed } from '@/core/embedSlots'
import {
  activeList2EmbedSlotIds,
  activeList2PointerSlotIds,
  activeListEmbedSlotIds,
  activeListPointerSlotIds,
  activeMapHashEmbedSlotIds,
  activeMapHashPointerSlotIds,
} from '@/core/compactElementBranchVisibility'
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
import { isBlockMapStructureType } from '@/core/blockSchema'
import { hasMapHashEmbedStructure, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { hasMapHashPointerStructure, parseMapHashPointerString } from '@/core/mapHashPointerValue'

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

/** Parâmetro `entries` (mapas) — sempre compacto por defeito; lista exige confirmação. */
export function isEntriesParameter(
  parameter: Pick<NodeParameterDefinition, 'name' | 'type'>,
): boolean {
  return parameter.name === 'entries' && isMapStructureParameter(parameter.type)
}

function parameterForElementViewKey(
  node: NodeInstance,
  key: ElementViewKey,
): NodeParameterDefinition | undefined {
  if (!key.startsWith(ELEMENT_VIEW_KEY_PARAM)) {
    return undefined
  }
  const parameterId = key.slice(ELEMENT_VIEW_KEY_PARAM.length)
  return node.schema.parameters.find((p) => p.id === parameterId)
}

export function isEntriesElementViewKey(node: NodeInstance, key: ElementViewKey): boolean {
  const parameter = parameterForElementViewKey(node, key)
  return parameter ? isEntriesParameter(parameter) : false
}

function defaultElementViewState(node: NodeInstance, key: ElementViewKey): ElementViewState {
  if (isEntriesElementViewKey(node, key)) {
    return { mode: 'compact', selectedIndex: 0 }
  }
  return { mode: 'list' }
}

export const ENTRIES_LIST_VIEW_CONFIRM_MESSAGE =
  'Em modo lista, aparecerão todos os nós. Isso pode travar a aplicação.\n\nDeseja continuar?'

export function confirmEntriesListViewMode(): boolean {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return true
  }
  return window.confirm(ENTRIES_LIST_VIEW_CONFIRM_MESSAGE)
}

/** Devolve o modo a aplicar ou `null` se o utilizador cancelou a confirmação. */
export function resolveElementViewModeChange(
  node: NodeInstance,
  key: ElementViewKey,
  nextMode: ElementViewMode,
): ElementViewMode | null {
  const current = getElementViewState(node, key).mode
  if (
    current === 'compact' &&
    nextMode === 'list' &&
    isEntriesElementViewKey(node, key) &&
    !confirmEntriesListViewMode()
  ) {
    return null
  }
  return nextMode
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
  return node.elementView?.[key] ?? defaultElementViewState(node, key)
}

/** Estado de vista compacto/lista para parâmetros map no BlockCard (ids distintos do schema do nó). */
export function getBlockParameterElementViewState(
  node: NodeInstance,
  parameter: { idParameter: string; nameParameter: string; typeParameter: string },
): ElementViewState {
  const key = elementViewKeyForParameter(parameter.idParameter)
  const stored = node.elementView?.[key]
  if (stored) {
    return { ...defaultElementViewState(node, key), ...stored }
  }
  if (
    parameter.nameParameter === 'entries' &&
    isBlockMapStructureType(parameter.typeParameter)
  ) {
    return { mode: 'compact', selectedIndex: 0 }
  }
  return getElementViewState(node, key)
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

/** Contagem de itens (slots/instâncias/entradas) para resolver índice compacto ao serializar presets. */
export function structureElementViewItemCount(node: NodeInstance, key: ElementViewKey): number {
  const schema = node.schema

  if (key.startsWith(ELEMENT_VIEW_KEY_PARAM)) {
    const parameterId = key.slice(ELEMENT_VIEW_KEY_PARAM.length)
    const parameter = schema.parameters.find((p) => p.id === parameterId)
    if (!parameter) {
      return 0
    }
    const value = parameterValue(node, parameterId, parameter.defaultValue)
    if (parameter.type === 'mapHashEmbed') {
      return parseMapHashEmbedString(value).filter((e) => hasMapHashEmbedStructure(e)).length
    }
    if (parameter.type === 'mapHashPointer') {
      return parseMapHashPointerString(value).filter((e) => hasMapHashPointerStructure(e)).length
    }
    return 0
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST2_EMBED)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST2_EMBED.length)
    return schema.list2Embed?.find((b) => b.id === blockId)?.instances.length ?? 0
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST2_POINTER)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST2_POINTER.length)
    return schema.list2Pointer?.find((b) => b.id === blockId)?.instances.length ?? 0
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST_EMBED)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST_EMBED.length)
    const block = schema.listEmbed?.find((b) => b.id === blockId)
    return block ? populatedSlotsForListEmbed(block).length : 0
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST_POINTER)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST_POINTER.length)
    const block = schema.listPointer?.find((b) => b.id === blockId)
    return block ? populatedSlotsForListPointer(block).length : 0
  }

  return allSlotIdsForElement(node, key).length
}

/** Snapshot normalizado de elementView para presets «Nodes em cena». */
export function captureElementViewSnapshot(
  node: NodeInstance,
): Partial<Record<ElementViewKey, ElementViewState>> | undefined {
  const structureKeys = collectStructureElementViewKeys(node)
  const out: Partial<Record<ElementViewKey, ElementViewState>> = {}
  const structureKeySet = new Set(structureKeys)

  for (const key of structureKeys) {
    const effective = getElementViewState(node, key)
    const snapshot: ElementViewState = { mode: effective.mode }

    if (effective.retracted === true) {
      snapshot.retracted = true
    }

    if (effective.mode === 'compact') {
      const count = structureElementViewItemCount(node, key)
      snapshot.selectedIndex = resolvedSelectedIndex(node, key, count)
    } else if (effective.selectedIndex !== undefined) {
      snapshot.selectedIndex = effective.selectedIndex
    }

    out[key] = snapshot
  }

  for (const key of collectCardElementViewKeys(node)) {
    if (structureKeySet.has(key) || !isElementRetracted(node, key)) {
      continue
    }
    const effective = getElementViewState(node, key)
    out[key] = {
      mode: effective.mode,
      retracted: true,
      ...(effective.selectedIndex !== undefined ? { selectedIndex: effective.selectedIndex } : {}),
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((v) => v.parameterId === parameterId)?.value ?? fallback
}

function mapSlotsForParameter(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey?: ElementViewKey,
  compactOnly = false,
): { id: string }[] {
  if (parameter.type === 'mapHashPointer') {
    const slots = mapHashPointerSlotsForParameter(parameter, value)
    if (compactOnly && elementKey && isElementViewCompact(node, elementKey)) {
      const active = new Set(activeMapHashPointerSlotIds(node, parameter, value, elementKey))
      return slots.filter((slot) => active.has(slot.id))
    }
    return slots
  }
  if (parameter.type === 'mapHashEmbed') {
    const slots = mapHashEmbedSlotsForParameter(parameter, value)
    if (compactOnly && elementKey && isElementViewCompact(node, elementKey)) {
      const active = new Set(activeMapHashEmbedSlotIds(node, parameter, value, elementKey))
      return slots.filter((slot) => active.has(slot.id))
    }
    return slots
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
    return mapSlotsForParameter(node, parameter, value, key, true).map((slot) => slot.id)
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
    if (isElementViewCompact(node, key)) {
      return activeListEmbedSlotIds(node, block, key)
    }
    return populatedSlotsForListEmbed(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST_POINTER)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST_POINTER.length)
    const block = schema.listPointer?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    if (isElementViewCompact(node, key)) {
      return activeListPointerSlotIds(node, block, key)
    }
    return populatedSlotsForListPointer(block).map((slot) => slot.id)
  }

  if (key.startsWith(ELEMENT_VIEW_KEY_LIST2_EMBED)) {
    const blockId = key.slice(ELEMENT_VIEW_KEY_LIST2_EMBED.length)
    const block = schema.list2Embed?.find((b) => b.id === blockId)
    if (!block) {
      return []
    }
    if (isElementViewCompact(node, key)) {
      return activeList2EmbedSlotIds(node, block, key)
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
    if (isElementViewCompact(node, key)) {
      return activeList2PointerSlotIds(node, block, key)
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

/** Todos os slots do elemento (ignora filtro de índice em modo compacto). */
export function allSlotIdsForElement(node: NodeInstance, key: ElementViewKey): string[] {
  const schema = node.schema

  if (key.startsWith(ELEMENT_VIEW_KEY_PARAM)) {
    const parameterId = key.slice(ELEMENT_VIEW_KEY_PARAM.length)
    const parameter = schema.parameters.find((p) => p.id === parameterId)
    if (!parameter) {
      return []
    }
    const value =
      parameterValue(node, parameterId, parameter.defaultValue) ?? parameter.defaultValue
    return mapSlotsForParameter(node, parameter, value).map((slot) => slot.id)
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
    if (parameter.type === 'mapHashEmbed') {
      const key = elementViewKeyForParameter(parameter.id)
      if (!isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      if (activeMapHashEmbedSlotIds(node, parameter, value, key).includes(fromInternalStructureId)) {
        return true
      }
      continue
    }

    if (parameter.type === 'mapHashPointer') {
      const key = elementViewKeyForParameter(parameter.id)
      if (!isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      if (
        activeMapHashPointerSlotIds(node, parameter, value, key).includes(fromInternalStructureId)
      ) {
        return true
      }
      continue
    }

    if (parameter.type === 'mapU64Pointer') {
      const key = elementViewKeyForParameter(parameter.id)
      if (!isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      const slots = mapSlotsForParameter(node, parameter, value, key)
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
      activeListEmbedSlotIds(node, block, key).includes(fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.listPointer ?? []) {
    const key = elementViewKeyForListPointer(block.id)
    if (
      isElementViewCompact(node, key) &&
      activeListPointerSlotIds(node, block, key).includes(fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.list2Embed ?? []) {
    const key = elementViewKeyForList2Embed(block.id)
    if (
      isElementViewCompact(node, key) &&
      activeList2EmbedSlotIds(node, block, key).includes(fromInternalStructureId)
    ) {
      return true
    }
  }

  for (const block of schema.list2Pointer ?? []) {
    const key = elementViewKeyForList2Pointer(block.id)
    if (
      isElementViewCompact(node, key) &&
      activeList2PointerSlotIds(node, block, key).includes(fromInternalStructureId)
    ) {
      return true
    }
  }

  return false
}

/** Chave do elemento do card que contém o slot de saída (qualquer modo de visualização). */
export function elementViewKeyForOutputSlot(
  node: NodeInstance,
  fromInternalStructureId: string,
): ElementViewKey | null {
  const schema = node.schema

  for (const parameter of schema.parameters) {
    if (
      parameter.type === 'mapHashPointer' ||
      parameter.type === 'mapHashEmbed' ||
      parameter.type === 'mapU64Pointer'
    ) {
      const key = elementViewKeyForParameter(parameter.id)
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      const slots = mapSlotsForParameter(node, parameter, value, key)
      if (slots.some((s) => s.id === fromInternalStructureId)) {
        return key
      }
    }
  }

  for (const block of schema.embed ?? []) {
    if (populatedSlotsForEmbed(block).some((s) => s.id === fromInternalStructureId)) {
      return elementViewKeyForEmbed(block.id)
    }
  }

  for (const block of schema.pointer ?? []) {
    if (populatedSlotsForPointer(block).some((s) => s.id === fromInternalStructureId)) {
      return elementViewKeyForPointer(block.id)
    }
  }

  for (const block of schema.listEmbed ?? []) {
    if (populatedSlotsForListEmbed(block).some((s) => s.id === fromInternalStructureId)) {
      return elementViewKeyForListEmbed(block.id)
    }
  }

  for (const block of schema.listPointer ?? []) {
    if (populatedSlotsForListPointer(block).some((s) => s.id === fromInternalStructureId)) {
      return elementViewKeyForListPointer(block.id)
    }
  }

  for (const block of schema.list2Embed ?? []) {
    for (const instance of block.instances) {
      if (
        populatedSlotsForList2EmbedInstance(instance).some(
          (s) => s.id === fromInternalStructureId,
        )
      ) {
        return elementViewKeyForList2Embed(block.id)
      }
    }
  }

  for (const block of schema.list2Pointer ?? []) {
    for (const instance of block.instances) {
      if (
        populatedSlotsForList2PointerInstance(instance).some(
          (s) => s.id === fromInternalStructureId,
        )
      ) {
        return elementViewKeyForList2Pointer(block.id)
      }
    }
  }

  return null
}

/** True se o slot de saída pertence a um elemento retraído no card. */
export function isSlotInRetractedElementView(
  node: NodeInstance,
  fromInternalStructureId: string,
): boolean {
  const key = elementViewKeyForOutputSlot(node, fromInternalStructureId)
  return key !== null && isElementRetracted(node, key)
}

/** True se o slot deve usar ligação sem fio (elemento compacto ou retraído). */
export function isSlotInWirelessElementView(
  node: NodeInstance,
  fromInternalStructureId: string,
): boolean {
  return (
    isSlotInCompactElementView(node, fromInternalStructureId) ||
    isSlotInRetractedElementView(node, fromInternalStructureId)
  )
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

/** Chaves de todos os elementos do card com estado de visualização (parâmetros + blocos). */
export function collectCardElementViewKeys(node: NodeInstance): ElementViewKey[] {
  const keys: ElementViewKey[] = []

  for (const parameter of node.schema.parameters) {
    keys.push(elementViewKeyForParameter(parameter.id))
  }

  for (const block of node.schema.embed ?? []) {
    keys.push(elementViewKeyForEmbed(block.id))
  }
  for (const block of node.schema.pointer ?? []) {
    keys.push(elementViewKeyForPointer(block.id))
  }
  for (const block of node.schema.listEmbed ?? []) {
    keys.push(elementViewKeyForListEmbed(block.id))
  }
  for (const block of node.schema.listPointer ?? []) {
    keys.push(elementViewKeyForListPointer(block.id))
  }
  for (const block of node.schema.list2Embed ?? []) {
    keys.push(elementViewKeyForList2Embed(block.id))
  }
  for (const block of node.schema.list2Pointer ?? []) {
    keys.push(elementViewKeyForList2Pointer(block.id))
  }

  return keys
}

export function areAllCardElementsRetracted(node: NodeInstance): boolean {
  const keys = collectCardElementViewKeys(node)
  return keys.length > 0 && keys.every((key) => isElementRetracted(node, key))
}

export function isAnyCardElementRetracted(node: NodeInstance): boolean {
  return collectCardElementViewKeys(node).some((key) => isElementRetracted(node, key))
}

export function patchAllCardElementsRetracted(node: NodeInstance, retracted: boolean): NodeInstance {
  let next = node
  for (const key of collectCardElementViewKeys(node)) {
    next = patchElementRetracted(next, key, retracted)
  }
  return next
}
