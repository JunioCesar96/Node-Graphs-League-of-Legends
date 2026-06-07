import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { BlockParameterDef, BlockStructurePayload } from '@/core/blockSchema'
import { blockParameterSlotId, isBlockListPointerParameter, isBlockMapStructureType } from '@/core/blockSchema'
import {
  collectBlockFanOutPolicyOutputSlotIds,
  findConnectionsForBlockOutputSlot,
} from '@/core/blockSlotConnections'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'
import { listPointerSlotId, parseListPointerSlotIndex } from '@/core/listPointerSlots'
import { hasMapHashEmbedStructure, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { hasMapHashPointerStructure, parseMapHashPointerString } from '@/core/mapHashPointerValue'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import { hasMapU64PointerStructure, parseMapU64PointerString } from '@/core/mapU64PointerValue'
import { mapU64PointerSlotId } from '@/core/mapU64PointerSlots'

export type BlockElementViewMode = 'list' | 'compact'

export type BlockElementViewState = {
  mode: BlockElementViewMode
  selectedIndex?: number
}

export type BlockElementViewKey = `param:${string}` | `slot:${string}`

export const BLOCK_ELEMENT_VIEW_KEY_PARAM = 'param:'
export const BLOCK_ELEMENT_VIEW_KEY_SLOT = 'slot:'

export function blockElementViewKeyForParameter(parameterId: string): BlockElementViewKey {
  return `${BLOCK_ELEMENT_VIEW_KEY_PARAM}${parameterId}`
}

export function blockElementViewKeyForSlot(slotId: string): BlockElementViewKey {
  return `${BLOCK_ELEMENT_VIEW_KEY_SLOT}${slotId}`
}

export function isBlockEntriesParameter(
  parameter: Pick<BlockParameterDef, 'nameParameter' | 'typeParameter'>,
): boolean {
  return parameter.nameParameter === 'entries' && isBlockMapStructureType(parameter.typeParameter)
}

function defaultBlockElementViewState(
  canvasNode: CanvasNode,
  key: BlockElementViewKey,
): BlockElementViewState {
  if (key.startsWith(BLOCK_ELEMENT_VIEW_KEY_PARAM)) {
    const parameterId = key.slice(BLOCK_ELEMENT_VIEW_KEY_PARAM.length)
    const parameter = canvasNode.blockStructure?.parameters.find(
      (entry) => entry.idParameter === parameterId,
    )
    if (parameter && isBlockEntriesParameter(parameter)) {
      return { mode: 'compact', selectedIndex: 0 }
    }
    if (parameter && isBlockMapStructureType(parameter.typeParameter)) {
      return { mode: 'compact', selectedIndex: 0 }
    }
  }
  return { mode: 'list', selectedIndex: 0 }
}

export function getBlockElementViewState(
  canvasNode: CanvasNode,
  key: BlockElementViewKey,
): BlockElementViewState {
  const stored = canvasNode.blockElementView?.[key]
  if (stored) {
    return { ...defaultBlockElementViewState(canvasNode, key), ...stored }
  }
  return defaultBlockElementViewState(canvasNode, key)
}

export function isBlockElementViewCompact(canvasNode: CanvasNode, key: BlockElementViewKey): boolean {
  return getBlockElementViewState(canvasNode, key).mode === 'compact'
}

export function clampBlockSelectedIndex(count: number, raw: number | undefined): number {
  if (count <= 0) {
    return 0
  }
  const index = raw ?? 0
  if (index < 0) {
    return 0
  }
  if (index >= count) {
    return count - 1
  }
  return index
}

export function collectBlockMapParameterKeys(structure: BlockStructurePayload): BlockElementViewKey[] {
  const keys: BlockElementViewKey[] = []
  for (const parameter of structure.parameters) {
    if (isBlockMapStructureType(parameter.typeParameter)) {
      keys.push(blockElementViewKeyForParameter(parameter.idParameter))
    }
  }
  return keys
}

/** Chaves de parâmetros map* no bloco (modo lista/compacto). */
export function collectBlockStructureElementKeys(structure: BlockStructurePayload): BlockElementViewKey[] {
  return collectBlockMapParameterKeys(structure)
}

export function patchBlockElementViewMode(
  canvasNode: CanvasNode,
  key: BlockElementViewKey,
  mode: BlockElementViewMode,
  selectedIndex?: number,
): CanvasNode {
  const current = getBlockElementViewState(canvasNode, key)
  const nextIndex = selectedIndex ?? current.selectedIndex ?? 0
  return {
    ...canvasNode,
    blockElementView: {
      ...(canvasNode.blockElementView ?? {}),
      [key]: { mode, selectedIndex: nextIndex },
    },
  }
}

export function patchBlockElementSelectedIndex(
  canvasNode: CanvasNode,
  key: BlockElementViewKey,
  selectedIndex: number,
): CanvasNode {
  const current = getBlockElementViewState(canvasNode, key)
  return patchBlockElementViewMode(canvasNode, key, current.mode, selectedIndex)
}

export function applyDefaultCompactBlockElementView(canvasNode: CanvasNode): CanvasNode {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return canvasNode
  }

  const keys = collectBlockStructureElementKeys(structure)
  if (keys.length === 0) {
    return canvasNode
  }

  let next = canvasNode
  for (const key of keys) {
    const state = getBlockElementViewState(next, key)
    if (state.mode === 'compact' && state.selectedIndex === 0) {
      continue
    }
    next = patchBlockElementViewMode(next, key, 'compact', 0)
  }
  return next
}

export function applyLightModeCompactToBlockNode(
  canvasNode: CanvasNode,
  options?: { initBlockIndices?: boolean },
): CanvasNode {
  if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
    return canvasNode
  }

  let next = canvasNode
  for (const key of collectBlockStructureElementKeys(canvasNode.blockStructure)) {
    const state = getBlockElementViewState(next, key)
    const selectedIndex = options?.initBlockIndices ? 0 : (state.selectedIndex ?? 0)
    if (state.mode !== 'compact') {
      next = patchBlockElementViewMode(next, key, 'compact', selectedIndex)
    } else if (options?.initBlockIndices && state.selectedIndex !== 0) {
      next = patchBlockElementSelectedIndex(next, key, 0)
    }
  }

  for (const param of next.blockStructure.parameters) {
    if (!isBlockListPointerParameter(param)) {
      continue
    }
    const outputSlot = blockParameterSlotId(param.idParameter, 'output')
    const key = blockElementViewKeyForSlot(outputSlot)
    const state = getBlockElementViewState(next, key)
    const selectedIndex = options?.initBlockIndices ? 0 : (state.selectedIndex ?? 0)
    if (state.mode !== 'compact') {
      next = patchBlockElementViewMode(next, key, 'compact', selectedIndex)
    } else if (options?.initBlockIndices && state.selectedIndex !== 0) {
      next = patchBlockElementSelectedIndex(next, key, 0)
    }
  }

  if (options?.initBlockIndices && next.blockElementView) {
    const slotKeys = Object.keys(next.blockElementView).filter((key) =>
      key.startsWith(BLOCK_ELEMENT_VIEW_KEY_SLOT),
    ) as BlockElementViewKey[]
    for (const key of slotKeys) {
      next = patchBlockElementSelectedIndex(next, key, 0)
    }
  }

  return next
}

export function resolveBlockOutputSlotConnectionIndexFromNode(
  canvasNode: CanvasNode,
  slotId: string,
  connectionCount: number,
  options?: { lightModeDefaultFirst?: boolean },
): number {
  if (connectionCount <= 0) {
    return 0
  }

  const key = blockElementViewKeyForSlot(slotId)
  const stored = canvasNode.blockElementView?.[key]?.selectedIndex
  if (stored !== undefined) {
    return clampBlockSelectedIndex(connectionCount, stored)
  }

  if (options?.lightModeDefaultFirst) {
    return 0
  }

  return connectionCount - 1
}

export function shouldApplyBlockListPointerIndexPolicy(
  canvasNode: CanvasNode,
  outputSlot: string,
  options?: { lightModeDefaultFirst?: boolean },
): boolean {
  if (options?.lightModeDefaultFirst) {
    return true
  }

  return isBlockElementViewCompact(canvasNode, blockElementViewKeyForSlot(outputSlot))
}

export function sortBlockListPointerOutputConnections(
  connections: readonly CanvasConnection[],
  parameterId: string,
): CanvasConnection[] {
  return [...connections].sort((left, right) => {
    const leftIndex = parseListPointerSlotIndex(left.fromBlockSlotId ?? '', parameterId)
    const rightIndex = parseListPointerSlotIndex(right.fromBlockSlotId ?? '', parameterId)

    if (leftIndex !== null && rightIndex !== null) {
      return leftIndex - rightIndex
    }
    if (leftIndex !== null) {
      return -1
    }
    if (rightIndex !== null) {
      return 1
    }

    return 0
  })
}

export function buildBlockOutputSlotIndexMap(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  options?: { lightModeDefaultFirst?: boolean },
): Map<string, number> {
  const indexByKey = new Map<string, number>()

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
      continue
    }

    const slotIds = collectBlockFanOutPolicyOutputSlotIds(scene, canvasNode)

    for (const slotId of slotIds) {
      const count = findConnectionsForBlockOutputSlot(scene, canvasNode.id, slotId).length
      if (count <= 1) {
        continue
      }
      const index = resolveBlockOutputSlotConnectionIndexFromNode(canvasNode, slotId, count, options)
      indexByKey.set(`${canvasNode.id}::${slotId}`, index)
    }
  }

  return indexByKey
}

function inactiveMapBlockSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  parameter: BlockParameterDef,
  value: string,
  key: BlockElementViewKey,
  parseEntries: (raw: string) => Array<{ key: string; schemaId: string; typeName: string }>,
  hasStructure: (entry: { schemaId: string; typeName: string }) => boolean,
  slotIdForKey: (parameterId: string, key: string) => string,
  options?: { requireCompact?: boolean },
): string[] {
  if (options?.requireCompact !== false && !isBlockElementViewCompact(canvasNode, key)) {
    return []
  }

  const entries = parseEntries(value)
  if (entries.length <= 1) {
    return []
  }

  const activeIndex = clampBlockSelectedIndex(
    entries.length,
    getBlockElementViewState(canvasNode, key).selectedIndex,
  )
  const inactive: string[] = []

  for (let index = 0; index < entries.length; index += 1) {
    if (index === activeIndex) {
      continue
    }
    const entry = entries[index]!
    if (!hasStructure(entry)) {
      continue
    }
    inactive.push(slotIdForKey(parameter.idParameter, entry.key))
  }

  return inactive
}

export function collectInactiveBlockMapSlotIdsForActiveIndex(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
): string[] {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return []
  }

  const inactive: string[] = []
  for (const parameter of structure.parameters) {
    if (!isBlockMapStructureType(parameter.typeParameter)) {
      continue
    }
    const value = readBlockParameterDisplayValue(scene, canvasNode, structure, parameter.idParameter)
    if (parameter.typeParameter === 'mapHashEmbed') {
      inactive.push(...inactiveBlockMapEmbedSlotIds(canvasNode, scene, parameter, value, { requireCompact: false }))
    } else if (parameter.typeParameter === 'mapHashPointer') {
      inactive.push(...inactiveBlockMapPointerSlotIds(canvasNode, scene, parameter, value, { requireCompact: false }))
    } else if (parameter.typeParameter === 'mapU64Pointer') {
      inactive.push(...inactiveBlockMapU64PointerSlotIds(canvasNode, scene, parameter, value, { requireCompact: false }))
    }
  }
  return inactive
}

export function inactiveBlockMapEmbedSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  parameter: BlockParameterDef,
  value: string,
  options?: { requireCompact?: boolean },
): string[] {
  const key = blockElementViewKeyForParameter(parameter.idParameter)
  return inactiveMapBlockSlotIds(
    canvasNode,
    scene,
    parameter,
    value,
    key,
    parseMapHashEmbedString,
    hasMapHashEmbedStructure,
    mapHashEmbedSlotId,
    options,
  )
}

export function inactiveBlockMapPointerSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  parameter: BlockParameterDef,
  value: string,
  options?: { requireCompact?: boolean },
): string[] {
  const key = blockElementViewKeyForParameter(parameter.idParameter)
  return inactiveMapBlockSlotIds(
    canvasNode,
    scene,
    parameter,
    value,
    key,
    parseMapHashPointerString,
    hasMapHashPointerStructure,
    mapHashPointerSlotId,
    options,
  )
}

export function inactiveBlockMapU64PointerSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  parameter: BlockParameterDef,
  value: string,
  options?: { requireCompact?: boolean },
): string[] {
  const key = blockElementViewKeyForParameter(parameter.idParameter)
  return inactiveMapBlockSlotIds(
    canvasNode,
    scene,
    parameter,
    value,
    key,
    parseMapU64PointerString,
    hasMapU64PointerStructure,
    mapU64PointerSlotId,
    options,
  )
}

export function collectInactiveBlockListPointerSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  options?: { lightModeDefaultFirst?: boolean },
): string[] {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return []
  }

  const inactive: string[] = []

  for (const param of structure.parameters) {
    if (!isBlockListPointerParameter(param)) {
      continue
    }

    const outputSlot = blockParameterSlotId(param.idParameter, 'output')
    if (!shouldApplyBlockListPointerIndexPolicy(canvasNode, outputSlot, options)) {
      continue
    }

    const connections = findConnectionsForBlockOutputSlot(scene, canvasNode.id, outputSlot)
    if (connections.length <= 1) {
      continue
    }

    const sortedConnections = sortBlockListPointerOutputConnections(connections, param.idParameter)

    const activeIndex = resolveBlockOutputSlotConnectionIndexFromNode(
      canvasNode,
      outputSlot,
      sortedConnections.length,
      options,
    )

    for (let index = 0; index < sortedConnections.length; index += 1) {
      if (index === activeIndex) {
        continue
      }

      const connection = sortedConnections[index]!
      const slotId = connection.fromBlockSlotId
      if (slotId && parseListPointerSlotIndex(slotId, param.idParameter) !== null) {
        inactive.push(slotId)
      } else {
        inactive.push(listPointerSlotId(param.idParameter, index))
      }
    }
  }

  return inactive
}

export function collectInactiveBlockMapSlotIds(
  canvasNode: CanvasNode,
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
): string[] {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return []
  }

  const inactive: string[] = []
  for (const parameter of structure.parameters) {
    if (!isBlockMapStructureType(parameter.typeParameter)) {
      continue
    }
    const value = readBlockParameterDisplayValue(scene, canvasNode, structure, parameter.idParameter)
    if (parameter.typeParameter === 'mapHashEmbed') {
      inactive.push(...inactiveBlockMapEmbedSlotIds(canvasNode, scene, parameter, value))
    } else if (parameter.typeParameter === 'mapHashPointer') {
      inactive.push(...inactiveBlockMapPointerSlotIds(canvasNode, scene, parameter, value))
    } else if (parameter.typeParameter === 'mapU64Pointer') {
      inactive.push(...inactiveBlockMapU64PointerSlotIds(canvasNode, scene, parameter, value))
    }
  }
  return inactive
}

export function parseBlockElementView(
  raw: unknown,
): Partial<Record<BlockElementViewKey, BlockElementViewState>> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined
  }

  const out: Partial<Record<BlockElementViewKey, BlockElementViewState>> = {}
  for (const [key, state] of Object.entries(raw)) {
    if (typeof key !== 'string') {
      return undefined
    }
    if (!key.startsWith(BLOCK_ELEMENT_VIEW_KEY_PARAM) && !key.startsWith(BLOCK_ELEMENT_VIEW_KEY_SLOT)) {
      continue
    }
    if (typeof state !== 'object' || state === null || Array.isArray(state)) {
      return undefined
    }
    const mode = (state as BlockElementViewState).mode
    if (mode !== 'list' && mode !== 'compact') {
      return undefined
    }
    const selectedIndex = (state as BlockElementViewState).selectedIndex
    if (selectedIndex !== undefined && typeof selectedIndex !== 'number') {
      return undefined
    }
    out[key as BlockElementViewKey] = {
      mode,
      ...(selectedIndex !== undefined ? { selectedIndex } : {}),
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}
