import type { CanvasScene } from '@/core/canvasScene'
import type {
  ElementViewKey,
  List2EmbedDefinition,
  List2PointerDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeInstance,
  NodeParameterDefinition,
} from '@/core/nodeSchema'
import { listEmbedSlotId, populatedSlotsForListEmbed } from '@/core/listEmbedSlots'
import { listPointerSlotId, populatedSlotsForListPointer } from '@/core/listPointerSlots'
import { populatedSlotsForList2EmbedInstance } from '@/core/list2EmbedSlots'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { hasMapHashEmbedStructure, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import { hasMapHashPointerStructure, parseMapHashPointerString } from '@/core/mapHashPointerValue'
const ELEMENT_VIEW_KEY_PARAM = 'param:'
const ELEMENT_VIEW_KEY_LIST_EMBED = 'listEmbed:'
const ELEMENT_VIEW_KEY_LIST_POINTER = 'listPointer:'
const ELEMENT_VIEW_KEY_LIST2_EMBED = 'list2Embed:'
const ELEMENT_VIEW_KEY_LIST2_POINTER = 'list2Pointer:'

function elementViewKeyForParameter(parameterId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_PARAM}${parameterId}`
}

function elementViewKeyForListEmbed(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST_EMBED}${blockId}`
}

function elementViewKeyForListPointer(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST_POINTER}${blockId}`
}

function elementViewKeyForList2Embed(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST2_EMBED}${blockId}`
}

function elementViewKeyForList2Pointer(blockId: string): ElementViewKey {
  return `${ELEMENT_VIEW_KEY_LIST2_POINTER}${blockId}`
}

function isElementViewCompact(node: NodeInstance, key: ElementViewKey): boolean {
  return node.elementView?.[key]?.mode === 'compact'
}

function resolvedSelectedIndex(node: NodeInstance, key: ElementViewKey, count: number): number {
  if (count <= 0) {
    return 0
  }
  const raw = node.elementView?.[key]?.selectedIndex ?? 0
  if (raw < 0) {
    return 0
  }
  if (raw >= count) {
    return count - 1
  }
  return raw
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((v) => v.parameterId === parameterId)?.value ?? fallback
}

/** Todos os descendentes alcançáveis por ligações de saída (exclui `rootNodeId`). */
export function collectDescendantNodeIds(
  scene: Pick<CanvasScene, 'connections'>,
  rootNodeId: string,
): Set<string> {
  const descendants = new Set<string>()
  const queue: string[] = []

  for (const connection of scene.connections) {
    if (connection.fromNodeId === rootNodeId) {
      queue.push(connection.toNodeId)
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    if (descendants.has(current)) {
      continue
    }
    descendants.add(current)
    for (const connection of scene.connections) {
      if (connection.fromNodeId === current) {
        queue.push(connection.toNodeId)
      }
    }
  }

  return descendants
}

/** Nós alcançáveis a partir dos slots de saída indicados (filhos directos + descendentes). */
export function collectBranchNodeIdsFromOutputSlots(
  scene: Pick<CanvasScene, 'connections'>,
  fromNodeId: string,
  slotIds: readonly string[],
): Set<string> {
  const target = new Set<string>()
  hideBranchesFromOutputSlots(
    { connections: scene.connections, nodes: [], width: 0, height: 0 },
    fromNodeId,
    slotIds,
    target,
  )
  return target
}

function hideBranchesFromOutputSlots(
  scene: CanvasScene,
  fromNodeId: string,
  slotIds: readonly string[],
  target: Set<string>,
): void {
  for (const slotId of slotIds) {
    for (const connection of scene.connections) {
      if (
        connection.fromNodeId !== fromNodeId ||
        connection.fromInternalStructureId !== slotId
      ) {
        continue
      }

      target.add(connection.toNodeId)
      for (const descendantId of collectDescendantNodeIds(scene, connection.toNodeId)) {
        target.add(descendantId)
      }
    }
  }
}

function inactiveMapHashSlotIds(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey: string,
  parseEntries: (raw: string) => Array<{ key: string; schemaId: string; typeName: string }>,
  hasStructure: (entry: { schemaId: string; typeName: string }) => boolean,
  slotIdForKey: (parameterId: string, key: string) => string,
): string[] {
  if (!isElementViewCompact(node, elementKey)) {
    return []
  }

  const entries = parseEntries(value)
  const activeIndex = resolvedSelectedIndex(node, elementKey, entries.length)
  const inactive: string[] = []

  for (let index = 0; index < entries.length; index += 1) {
    if (index === activeIndex) {
      continue
    }
    const entry = entries[index]!
    if (!hasStructure(entry)) {
      continue
    }
    inactive.push(slotIdForKey(parameter.id, entry.key))
  }

  return inactive
}

export function activeMapHashEmbedSlotIds(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey: string,
): string[] {
  if (parameter.type !== 'mapHashEmbed' || !isElementViewCompact(node, elementKey)) {
    return []
  }

  const entries = parseMapHashEmbedString(value)
  const index = resolvedSelectedIndex(node, elementKey, entries.length)
  const entry = entries[index]
  if (!entry || !hasMapHashEmbedStructure(entry)) {
    return []
  }

  return [mapHashEmbedSlotId(parameter.id, entry.key)]
}

export function inactiveMapHashEmbedSlotIds(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey: string,
): string[] {
  if (parameter.type !== 'mapHashEmbed') {
    return []
  }
  return inactiveMapHashSlotIds(
    node,
    parameter,
    value,
    elementKey,
    parseMapHashEmbedString,
    hasMapHashEmbedStructure,
    mapHashEmbedSlotId,
  )
}

export function activeMapHashPointerSlotIds(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey: string,
): string[] {
  if (parameter.type !== 'mapHashPointer' || !isElementViewCompact(node, elementKey)) {
    return []
  }

  const entries = parseMapHashPointerString(value)
  const index = resolvedSelectedIndex(node, elementKey, entries.length)
  const entry = entries[index]
  if (!entry || !hasMapHashPointerStructure(entry)) {
    return []
  }

  return [mapHashPointerSlotId(parameter.id, entry.key)]
}

export function inactiveMapHashPointerSlotIds(
  node: NodeInstance,
  parameter: NodeParameterDefinition,
  value: string,
  elementKey: string,
): string[] {
  if (parameter.type !== 'mapHashPointer') {
    return []
  }
  return inactiveMapHashSlotIds(
    node,
    parameter,
    value,
    elementKey,
    parseMapHashPointerString,
    hasMapHashPointerStructure,
    mapHashPointerSlotId,
  )
}

function inactiveListBlockSlotIds(
  node: NodeInstance,
  blockId: string,
  elementKey: string,
  slots: readonly { id: string }[],
  slotIdForIndex: (blockId: string, index: number) => string,
): string[] {
  if (!isElementViewCompact(node, elementKey)) {
    return []
  }

  const activeIndex = resolvedSelectedIndex(node, elementKey, slots.length)
  const inactive: string[] = []

  for (let index = 0; index < slots.length; index += 1) {
    if (index === activeIndex) {
      continue
    }
    inactive.push(slotIdForIndex(blockId, index))
  }

  return inactive
}

export function activeListEmbedSlotIds(
  node: NodeInstance,
  block: ListEmbedDefinition,
  elementKey: string,
): string[] {
  const slots = populatedSlotsForListEmbed(block)
  if (!isElementViewCompact(node, elementKey) || slots.length === 0) {
    return []
  }

  const index = resolvedSelectedIndex(node, elementKey, slots.length)
  const slot = slots[index]
  return slot ? [slot.id] : []
}

export function inactiveListEmbedSlotIds(
  node: NodeInstance,
  block: ListEmbedDefinition,
  elementKey: string,
): string[] {
  return inactiveListBlockSlotIds(
    node,
    block.id,
    elementKey,
    populatedSlotsForListEmbed(block),
    listEmbedSlotId,
  )
}

export function activeListPointerSlotIds(
  node: NodeInstance,
  block: ListPointerDefinition,
  elementKey: string,
): string[] {
  const slots = populatedSlotsForListPointer(block)
  if (!isElementViewCompact(node, elementKey) || slots.length === 0) {
    return []
  }

  const index = resolvedSelectedIndex(node, elementKey, slots.length)
  const slot = slots[index]
  return slot ? [slot.id] : []
}

export function inactiveListPointerSlotIds(
  node: NodeInstance,
  block: ListPointerDefinition,
  elementKey: string,
): string[] {
  return inactiveListBlockSlotIds(
    node,
    block.id,
    elementKey,
    populatedSlotsForListPointer(block),
    listPointerSlotId,
  )
}

function inactiveList2InstanceSlotIds(
  node: NodeInstance,
  block: List2EmbedDefinition | List2PointerDefinition,
  elementKey: string,
  slotsForInstance: (instance: (typeof block.instances)[number]) => { id: string }[],
): string[] {
  if (!isElementViewCompact(node, elementKey)) {
    return []
  }

  const activeIndex = resolvedSelectedIndex(node, elementKey, block.instances.length)
  const inactive: string[] = []

  for (let index = 0; index < block.instances.length; index += 1) {
    if (index === activeIndex) {
      continue
    }
    const instance = block.instances[index]!
    for (const slot of slotsForInstance(instance)) {
      inactive.push(slot.id)
    }
  }

  return inactive
}

export function activeList2EmbedSlotIds(
  node: NodeInstance,
  block: List2EmbedDefinition,
  elementKey: string,
): string[] {
  if (!isElementViewCompact(node, elementKey) || block.instances.length === 0) {
    return []
  }

  const index = resolvedSelectedIndex(node, elementKey, block.instances.length)
  const instance = block.instances[index]
  if (!instance) {
    return []
  }

  return populatedSlotsForList2EmbedInstance(instance).map((slot) => slot.id)
}

export function inactiveList2EmbedSlotIds(
  node: NodeInstance,
  block: List2EmbedDefinition,
  elementKey: string,
): string[] {
  return inactiveList2InstanceSlotIds(node, block, elementKey, populatedSlotsForList2EmbedInstance)
}

export function activeList2PointerSlotIds(
  node: NodeInstance,
  block: List2PointerDefinition,
  elementKey: string,
): string[] {
  if (!isElementViewCompact(node, elementKey) || block.instances.length === 0) {
    return []
  }

  const index = resolvedSelectedIndex(node, elementKey, block.instances.length)
  const instance = block.instances[index]
  if (!instance) {
    return []
  }

  return populatedSlotsForList2PointerInstance(instance).map((slot) => slot.id)
}

export function inactiveList2PointerSlotIds(
  node: NodeInstance,
  block: List2PointerDefinition,
  elementKey: string,
): string[] {
  return inactiveList2InstanceSlotIds(node, block, elementKey, populatedSlotsForList2PointerInstance)
}

function collectCompactInactiveSlotsForNode(
  canvasNodeId: string,
  node: NodeInstance,
): string[] {
  const inactive: string[] = []

  for (const parameter of node.schema.parameters) {
    if (parameter.type === 'mapHashEmbed') {
      const key = elementViewKeyForParameter(parameter.id)
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      inactive.push(...inactiveMapHashEmbedSlotIds(node, parameter, value, key))
    } else if (parameter.type === 'mapHashPointer') {
      const key = elementViewKeyForParameter(parameter.id)
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      inactive.push(...inactiveMapHashPointerSlotIds(node, parameter, value, key))
    }
  }

  for (const block of node.schema.listEmbed ?? []) {
    const key = elementViewKeyForListEmbed(block.id)
    inactive.push(...inactiveListEmbedSlotIds(node, block, key))
  }

  for (const block of node.schema.listPointer ?? []) {
    const key = elementViewKeyForListPointer(block.id)
    inactive.push(...inactiveListPointerSlotIds(node, block, key))
  }

  for (const block of node.schema.list2Embed ?? []) {
    const key = elementViewKeyForList2Embed(block.id)
    inactive.push(...inactiveList2EmbedSlotIds(node, block, key))
  }

  for (const block of node.schema.list2Pointer ?? []) {
    const key = elementViewKeyForList2Pointer(block.id)
    inactive.push(...inactiveList2PointerSlotIds(node, block, key))
  }

  return inactive
}

/** Nós ocultos no canvas por política de índice em blocos multi-estrutura compactos. */
export function computeCompactHiddenNodeIds(scene: CanvasScene): Set<string> {
  const hidden = new Set<string>()

  for (const canvasNode of scene.nodes) {
    const inactiveSlots = collectCompactInactiveSlotsForNode(canvasNode.id, canvasNode.node)
    hideBranchesFromOutputSlots(scene, canvasNode.id, inactiveSlots, hidden)
  }

  return hidden
}

function collectListModeOutputSlotsForNode(node: NodeInstance): string[] {
  const slots: string[] = []

  for (const parameter of node.schema.parameters) {
    if (parameter.type === 'mapHashEmbed') {
      const key = elementViewKeyForParameter(parameter.id)
      if (isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      for (const entry of parseMapHashEmbedString(value)) {
        if (hasMapHashEmbedStructure(entry)) {
          slots.push(mapHashEmbedSlotId(parameter.id, entry.key))
        }
      }
    } else if (parameter.type === 'mapHashPointer') {
      const key = elementViewKeyForParameter(parameter.id)
      if (isElementViewCompact(node, key)) {
        continue
      }
      const value = parameterValue(node, parameter.id, parameter.defaultValue)
      for (const entry of parseMapHashPointerString(value)) {
        if (hasMapHashPointerStructure(entry)) {
          slots.push(mapHashPointerSlotId(parameter.id, entry.key))
        }
      }
    }
  }

  for (const block of node.schema.listEmbed ?? []) {
    const key = elementViewKeyForListEmbed(block.id)
    if (isElementViewCompact(node, key)) {
      continue
    }
    for (const slot of populatedSlotsForListEmbed(block)) {
      slots.push(slot.id)
    }
  }

  for (const block of node.schema.listPointer ?? []) {
    const key = elementViewKeyForListPointer(block.id)
    if (isElementViewCompact(node, key)) {
      continue
    }
    for (const slot of populatedSlotsForListPointer(block)) {
      slots.push(slot.id)
    }
  }

  for (const block of node.schema.list2Embed ?? []) {
    const key = elementViewKeyForList2Embed(block.id)
    if (isElementViewCompact(node, key)) {
      continue
    }
    for (const instance of block.instances) {
      for (const slot of populatedSlotsForList2EmbedInstance(instance)) {
        slots.push(slot.id)
      }
    }
  }

  for (const block of node.schema.list2Pointer ?? []) {
    const key = elementViewKeyForList2Pointer(block.id)
    if (isElementViewCompact(node, key)) {
      continue
    }
    for (const instance of block.instances) {
      for (const slot of populatedSlotsForList2PointerInstance(instance)) {
        slots.push(slot.id)
      }
    }
  }

  return slots
}

/** Nós ligados desde blocos multi-estrutura em modo lista — corpo retraído efectivo. */
export function computeListModeCollapsedBodyNodeIds(scene: CanvasScene): Set<string> {
  const collapsed = new Set<string>()

  for (const canvasNode of scene.nodes) {
    const outputSlots = collectListModeOutputSlotsForNode(canvasNode.node)
    hideBranchesFromOutputSlots(scene, canvasNode.id, outputSlots, collapsed)
  }

  return collapsed
}

export type CompactElementCanvasVisibility = {
  hiddenNodeIds: ReadonlySet<string>
  listCollapsedBodyNodeIds: ReadonlySet<string>
}

export function createCompactElementCanvasVisibility(scene: CanvasScene): CompactElementCanvasVisibility {
  return {
    hiddenNodeIds: computeCompactHiddenNodeIds(scene),
    listCollapsedBodyNodeIds: computeListModeCollapsedBodyNodeIds(scene),
  }
}

// Aliases retrocompatíveis com mapHashEmbedBranchVisibility
export const computeMapHashEmbedHiddenNodeIds = computeCompactHiddenNodeIds
export const computeMapHashEmbedListCollapsedNodeIds = computeListModeCollapsedBodyNodeIds
export type MapHashEmbedCanvasVisibility = CompactElementCanvasVisibility
export const createMapHashEmbedCanvasVisibility = createCompactElementCanvasVisibility

export function isNodeHiddenByMapHashEmbedPolicy(
  scene: CanvasScene,
  nodeId: string,
  hiddenIds?: ReadonlySet<string>,
): boolean {
  const hidden = hiddenIds ?? computeCompactHiddenNodeIds(scene)
  return hidden.has(nodeId)
}

export function shouldCollapseBodyForMapHashEmbedList(
  scene: CanvasScene,
  nodeId: string,
  collapsedIds?: ReadonlySet<string>,
): boolean {
  const collapsed = collapsedIds ?? computeListModeCollapsedBodyNodeIds(scene)
  return collapsed.has(nodeId)
}
