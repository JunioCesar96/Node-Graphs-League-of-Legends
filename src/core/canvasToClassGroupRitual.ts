import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { MAIN_SCHEMA_ID } from '@/core/classGroupRitualStackParser'
import { findEmbedBySlotId } from '@/core/embedSlots'
import { findList2EmbedByInstanceSlotId } from '@/core/list2EmbedSlots'
import { findList2PointerByInstanceSlotId } from '@/core/list2PointerSlots'
import { findListEmbedBySlotId, parseListEmbedSlotIndex, populatedSlotsForListEmbed } from '@/core/listEmbedSlots'
import {
  findListPointerBySlotId,
  parseListPointerSlotIndex,
  populatedSlotsForListPointer,
} from '@/core/listPointerSlots'
import {
  isPlaceholderProbabilityTableNode,
  type RitualExportFidelity,
  resolveExportBlockTitle,
  resolveExportFieldName,
  finalizeNodePreviewRitual,
  VFX_PROBABILITY_TABLE_TITLE,
} from '@/core/ritualBinFidelity'
import {
  findMapHashEmbedEntryBySlotId,
  mapHashEmbedSlotId,
  parseMapHashEmbedSlotId,
  resolveMapHashEmbedSlotIdFromConnection,
} from '@/core/mapHashEmbedSlots'
import { isMapHashPointerSlotId, parseMapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import { isMapU64PointerSlotId, parseMapU64PointerSlotId } from '@/core/mapU64PointerSlots'
import { isMapHashParameterType } from '@/core/nodeDataTypeToRitType'
import type {
  EmbedDefinition,
  ListEmbedDefinition,
  ListPointerDefinition,
  NodeDataType,
  NodeInstance,
  NodeParameterDefinition,
  NodeSchemaDefinition,
  PointerDefinition,
} from '@/core/nodeSchema'
import type { BlockParameterDef } from '@/core/blockSchema'
import { hasMapHashEmbedStructure, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { findPointerBySlotId } from '@/core/pointerSlots'
import {
  formatMapEntryKey,
  formatRitualScalarAssignment,
} from '@/core/ritualValueFormat'
import {
  ritualExportBlockTitle,
  ritualExportFieldName,
  ritualExportFieldNameFromParameter,
} from '@/core/ritualFieldNames'

const INDENT_STEP = 4
const PROGRESS_BATCH = 25

function structOnlyChildLine(itemPad: string, childTitle: string): string {
  return `${itemPad}${childTitle} {}`
}

function childTitleForListEmbedSlot(block: ListEmbedDefinition, slotIndex: number): string {
  const slot = populatedSlotsForListEmbed(block)[slotIndex]
  return slot?.name ?? block.internalStructures[slotIndex]?.name ?? block.title
}

function childTitleForListPointerSlot(block: ListPointerDefinition, slotIndex: number): string {
  const slot = populatedSlotsForListPointer(block)[slotIndex]
  return slot?.name ?? block.internalStructures[slotIndex]?.name ?? block.title
}

function defaultChildTitleForBlock(
  block: EmbedDefinition | PointerDefinition,
): string {
  return block.internalStructures[0]?.name ?? block.title
}

export type CanvasToClassGroupRitualResult =
  | { ok: true; text: string; warnings: string[] }
  | { ok: false; error: string }

export type CanvasToRitualProgress = { label: string; ratio: number }

export type OutgoingLink =
  | { kind: 'internal'; fieldName: string; childCanvasId: string }
  | { kind: 'embed'; fieldName: string; childCanvasId: string }
  | { kind: 'pointer'; fieldName: string; childCanvasId: string }
  | { kind: 'listEmbed'; fieldName: string; index: number; childCanvasId: string }
  | { kind: 'listPointer'; fieldName: string; index: number; childCanvasId: string }
  | { kind: 'list2Embed'; fieldName: string; instanceIndex: number; childCanvasId: string }
  | { kind: 'list2Pointer'; fieldName: string; instanceIndex: number; childCanvasId: string }
  | { kind: 'mapHashEmbed'; parameterName: string; entryKey: string; childCanvasId: string }
  | { kind: 'mapHashPointer'; parameterName: string; entryKey: string; childCanvasId: string }
  | { kind: 'mapU64Pointer'; parameterName: string; entryKey: string; childCanvasId: string }

function indent(level: number): string {
  return ' '.repeat(level)
}

function normalizeMapKey(key: string): string {
  return key.trim().replace(/\s+/g, '_')
}

function parameterValue(node: NodeInstance, parameterId: string, fallback = ''): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
}

function valuesByParameterId(node: NodeInstance): Record<string, string> {
  const out: Record<string, string> = {}
  for (const parameter of node.schema.parameters) {
    out[parameter.id] = parameterValue(node, parameter.id, parameter.defaultValue)
  }
  return out
}

function findCanvasNode(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((entry) => entry.id === nodeId)
}

function findMainNodes(scene: CanvasScene): CanvasNode[] {
  return scene.nodes.filter((entry) => entry.node.schema.id === MAIN_SCHEMA_ID)
}

function collectSubtreeNodeIds(scene: CanvasScene, rootId: string): Set<string> {
  const reached = new Set<string>()
  const queue = [rootId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reached.has(current)) {
      continue
    }
    reached.add(current)

    for (const connection of scene.connections) {
      if (connection.fromNodeId === current && !reached.has(connection.toNodeId)) {
        queue.push(connection.toNodeId)
      }
    }
  }

  return reached
}

function resolveBlockConnectionSlotId(connection: CanvasConnection): string | null {
  if (connection.fromBlockSlotId?.trim()) {
    return connection.fromBlockSlotId.trim()
  }
  const internal = connection.fromInternalStructureId?.trim() ?? ''
  const prefix = '__block__:'
  if (internal.startsWith(prefix)) {
    return internal.slice(prefix.length)
  }
  return internal.length > 0 ? internal : null
}

function blockFilterIncludesStructuralField(
  blockFilter: {
    pointerIds: Set<string>
    pointerTitles: Set<string>
    embedIds: Set<string>
    embedTitles: Set<string>
  },
  kind: 'pointer' | 'embed',
  block: { id: string; title: string },
): boolean {
  const title = block.title.trim()
  if (kind === 'pointer') {
    return blockFilter.pointerTitles.has(title) || blockFilter.pointerIds.has(block.id)
  }
  return blockFilter.embedTitles.has(title) || blockFilter.embedIds.has(block.id)
}

function normalizeStructuralFieldName(name: string): string {
  return name.trim()
}

function schemaListEmbedFieldNames(schema: NodeSchemaDefinition): Set<string> {
  return new Set(
    (schema.listEmbed ?? []).map((block) =>
      normalizeStructuralFieldName(block.parameterName ?? block.title),
    ),
  )
}

function schemaListPointerFieldNames(schema: NodeSchemaDefinition): Set<string> {
  return new Set(
    (schema.listPointer ?? []).map((block) => normalizeStructuralFieldName(block.title)),
  )
}

function schemaList2EmbedFieldNames(schema: NodeSchemaDefinition): Set<string> {
  return new Set(
    (schema.list2Embed ?? []).map((block) => normalizeStructuralFieldName(block.title)),
  )
}

function schemaList2PointerFieldNames(schema: NodeSchemaDefinition): Set<string> {
  return new Set(
    (schema.list2Pointer ?? []).map((block) => normalizeStructuralFieldName(block.title)),
  )
}

function resolveEmbedChildLinkKind(
  sourceParam: BlockParameterDef,
  schema: NodeSchemaDefinition,
): 'embed' | 'listEmbed' {
  if (sourceParam.listParameter) {
    return 'listEmbed'
  }
  const fieldName = normalizeStructuralFieldName(sourceParam.nameParameter)
  if (schemaListEmbedFieldNames(schema).has(fieldName)) {
    return 'listEmbed'
  }
  return 'embed'
}

function resolvePointerChildLinkKind(
  sourceParam: BlockParameterDef,
  schema: NodeSchemaDefinition,
): 'pointer' | 'listPointer' {
  if (sourceParam.listParameter) {
    return 'listPointer'
  }
  const fieldName = normalizeStructuralFieldName(sourceParam.nameParameter)
  if (schemaListPointerFieldNames(schema).has(fieldName)) {
    return 'listPointer'
  }
  return 'pointer'
}

function mergeStructuralListLinks<T extends { childCanvasId: string; index: number }>(
  primary: readonly T[],
  fallback: readonly T[],
): T[] {
  const seen = new Set(primary.map((link) => link.childCanvasId))
  const merged = [...primary]
  for (const link of fallback) {
    if (seen.has(link.childCanvasId)) {
      continue
    }
    seen.add(link.childCanvasId)
    merged.push(link)
  }
  return merged.sort((a, b) => a.index - b.index)
}

function blockCardListEmbedLinks(
  partitioned: ReturnType<typeof partitionLinks>,
  fieldName: string,
): Array<OutgoingLink & { kind: 'listEmbed'; index: number }> {
  const title = normalizeStructuralFieldName(fieldName)
  const fromList = (partitioned.linksByListEmbed.get(title) ?? []).filter(
    (link): link is OutgoingLink & { kind: 'listEmbed'; index: number } => link.kind === 'listEmbed',
  )
  const fromSimple = (partitioned.linksByEmbed.get(title) ?? []).map(
    (link, index): OutgoingLink & { kind: 'listEmbed'; index: number } => ({
      kind: 'listEmbed',
      fieldName: title,
      index,
      childCanvasId: link.childCanvasId,
    }),
  )
  return mergeStructuralListLinks(fromList, fromSimple)
}

function blockCardListPointerLinks(
  partitioned: ReturnType<typeof partitionLinks>,
  fieldName: string,
): Array<OutgoingLink & { kind: 'listPointer'; index: number }> {
  const title = normalizeStructuralFieldName(fieldName)
  const fromList = (partitioned.linksByListPointer.get(title) ?? []).filter(
    (link): link is OutgoingLink & { kind: 'listPointer'; index: number } =>
      link.kind === 'listPointer',
  )
  const fromSimple = (partitioned.linksByPointer.get(title) ?? []).map(
    (link, index): OutgoingLink & { kind: 'listPointer'; index: number } => ({
      kind: 'listPointer',
      fieldName: title,
      index,
      childCanvasId: link.childCanvasId,
    }),
  )
  return mergeStructuralListLinks(fromList, fromSimple)
}

function blockCardList2EmbedLinks(
  partitioned: ReturnType<typeof partitionLinks>,
  fieldName: string,
): Array<OutgoingLink & { kind: 'list2Embed'; instanceIndex: number }> {
  const title = normalizeStructuralFieldName(fieldName)
  const fromList2 = (partitioned.linksByList2Embed.get(title) ?? []).filter(
    (link): link is OutgoingLink & { kind: 'list2Embed'; instanceIndex: number } =>
      link.kind === 'list2Embed',
  )
  const fromSimple = (partitioned.linksByEmbed.get(title) ?? []).map(
    (link, instanceIndex): OutgoingLink & { kind: 'list2Embed'; instanceIndex: number } => ({
      kind: 'list2Embed',
      fieldName: title,
      instanceIndex,
      childCanvasId: link.childCanvasId,
    }),
  )
  return mergeStructuralListLinks(
    fromList2.map((link) => ({ ...link, index: link.instanceIndex })),
    fromSimple.map((link) => ({ ...link, index: link.instanceIndex })),
  ).map(({ index, ...link }) => ({ ...link, instanceIndex: index }))
}

function blockCardList2PointerLinks(
  partitioned: ReturnType<typeof partitionLinks>,
  fieldName: string,
): Array<OutgoingLink & { kind: 'list2Pointer'; instanceIndex: number }> {
  const title = normalizeStructuralFieldName(fieldName)
  const fromList2 = (partitioned.linksByList2Pointer.get(title) ?? []).filter(
    (link): link is OutgoingLink & { kind: 'list2Pointer'; instanceIndex: number } =>
      link.kind === 'list2Pointer',
  )
  const fromSimple = (partitioned.linksByPointer.get(title) ?? []).map(
    (link, instanceIndex): OutgoingLink & { kind: 'list2Pointer'; instanceIndex: number } => ({
      kind: 'list2Pointer',
      fieldName: title,
      instanceIndex,
      childCanvasId: link.childCanvasId,
    }),
  )
  return mergeStructuralListLinks(
    fromList2.map((link) => ({ ...link, index: link.instanceIndex })),
    fromSimple.map((link) => ({ ...link, index: link.instanceIndex })),
  ).map(({ index, ...link }) => ({ ...link, instanceIndex: index }))
}

export function classifyOutgoingLink(parent: CanvasNode, connection: CanvasConnection): OutgoingLink | null {
  const slotId = connection.fromInternalStructureId
  const schema = parent.node.schema
  const values = valuesByParameterId(parent.node)

  const mapEmbedSlotId = resolveMapHashEmbedSlotIdFromConnection(connection)
  if (mapEmbedSlotId) {
    const hit = findMapHashEmbedEntryBySlotId(schema, mapEmbedSlotId, values)
    if (hit) {
      return {
        kind: 'mapHashEmbed',
        parameterName: hit.parameter.name,
        entryKey: hit.entry.key,
        childCanvasId: connection.toNodeId,
      }
    }
    if (parent.blockViewActive && parent.blockStructure) {
      const parsed = parseMapHashEmbedSlotId(mapEmbedSlotId)
      if (parsed) {
        const blockParam = parent.blockStructure.parameters.find(
          (entry) => entry.idParameter === parsed.parameterId,
        )
        if (blockParam?.typeParameter === 'mapHashEmbed') {
          const entries = parseMapHashEmbedString(blockParam.defaultValue)
          const entry = entries.find(
            (item) =>
              hasMapHashEmbedStructure(item) &&
              mapHashEmbedSlotId(blockParam.idParameter, item.key) === mapEmbedSlotId,
          )
          if (entry) {
            return {
              kind: 'mapHashEmbed',
              parameterName: blockParam.nameParameter,
              entryKey: entry.key,
              childCanvasId: connection.toNodeId,
            }
          }
        }
      }
    }
    const parsed = parseMapHashEmbedSlotId(mapEmbedSlotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapHashEmbed',
          parameterName: param.name,
          entryKey: parsed.key.replace(/_/g, '/'),
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  if (isMapHashPointerSlotId(slotId)) {
    const parsed = parseMapHashPointerSlotId(slotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapHashPointer',
          parameterName: param.name,
          entryKey: parsed.key,
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  if (isMapU64PointerSlotId(slotId)) {
    const parsed = parseMapU64PointerSlotId(slotId)
    if (parsed) {
      const param = schema.parameters.find((p) => p.id === parsed.parameterId)
      if (param) {
        return {
          kind: 'mapU64Pointer',
          parameterName: param.name,
          entryKey: parsed.key,
          childCanvasId: connection.toNodeId,
        }
      }
    }
  }

  const list2Embed = findList2EmbedByInstanceSlotId(schema, slotId)
  if (list2Embed) {
    const instanceIndex = list2Embed.block.instances.findIndex((i) => i.id === list2Embed.instance.id)
    return {
      kind: 'list2Embed',
      fieldName: list2Embed.block.title,
      instanceIndex: instanceIndex >= 0 ? instanceIndex : 0,
      childCanvasId: connection.toNodeId,
    }
  }

  const list2Pointer = findList2PointerByInstanceSlotId(schema, slotId)
  if (list2Pointer) {
    const instanceIndex = list2Pointer.block.instances.findIndex(
      (i) => i.id === list2Pointer.instance.id,
    )
    return {
      kind: 'list2Pointer',
      fieldName: list2Pointer.block.title,
      instanceIndex: instanceIndex >= 0 ? instanceIndex : 0,
      childCanvasId: connection.toNodeId,
    }
  }

  const listEmbed = findListEmbedBySlotId(schema, slotId)
  if (listEmbed) {
    return {
      kind: 'listEmbed',
      fieldName: listEmbed.listEmbed.title,
      index: listEmbed.slotIndex,
      childCanvasId: connection.toNodeId,
    }
  }

  const listPointer = findListPointerBySlotId(schema, slotId)
  if (listPointer) {
    return {
      kind: 'listPointer',
      fieldName: listPointer.listPointer.title,
      index: listPointer.slotIndex,
      childCanvasId: connection.toNodeId,
    }
  }

  const embed = findEmbedBySlotId(schema, slotId)
  if (embed) {
    return {
      kind: 'embed',
      fieldName: embed.embed.title,
      childCanvasId: connection.toNodeId,
    }
  }

  const pointer = findPointerBySlotId(schema, slotId)
  if (pointer) {
    return {
      kind: 'pointer',
      fieldName: pointer.pointer.title,
      childCanvasId: connection.toNodeId,
    }
  }

  const internal = schema.internalStructures.find((slot) => slot.id === slotId)
  if (internal) {
    return {
      kind: 'internal',
      fieldName: internal.name,
      childCanvasId: connection.toNodeId,
    }
  }

  return null
}

export function resolveOutgoingLinks(parent: CanvasNode, scene: CanvasScene): OutgoingLink[] {
  const links: OutgoingLink[] = []
  const seen = new Set<string>()
  const schema = parent.node.schema

  const pushUnique = (link: OutgoingLink) => {
    const key = `${link.kind}:${'fieldName' in link ? link.fieldName : link.parameterName}:${link.childCanvasId}`
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    links.push(link)
  }

  for (const connection of scene.connections) {
    if (connection.fromNodeId !== parent.id) {
      continue
    }
    const link = classifyOutgoingLink(parent, connection)
    if (link) {
      pushUnique(link)
      continue
    }

    const blockParamId = connection.fromBlockParameterId
    if (!blockParamId || !parent.blockViewActive || !parent.blockStructure) {
      continue
    }

    const sourceParam = parent.blockStructure.parameters.find(
      (entry) => entry.idParameter === blockParamId,
    )
    if (!sourceParam) {
      continue
    }

    const fieldName = sourceParam.nameParameter.trim()
    if (!fieldName) {
      continue
    }

    if (sourceParam.sourcePath.kind === 'embedChild') {
      const linkKind = resolveEmbedChildLinkKind(sourceParam, schema)
      if (linkKind === 'listEmbed') {
        const slotId = resolveBlockConnectionSlotId(connection)
        const index =
          slotId != null ? parseListEmbedSlotIndex(slotId, sourceParam.idParameter) : null
        pushUnique({
          kind: 'listEmbed',
          fieldName,
          index: index ?? 0,
          childCanvasId: connection.toNodeId,
        })
      } else {
        pushUnique({
          kind: 'embed',
          fieldName,
          childCanvasId: connection.toNodeId,
        })
      }
      continue
    }

    if (sourceParam.sourcePath.kind === 'pointerChild') {
      const linkKind = resolvePointerChildLinkKind(sourceParam, schema)
      if (linkKind === 'listPointer') {
        const slotId = resolveBlockConnectionSlotId(connection)
        const index =
          slotId != null ? parseListPointerSlotIndex(slotId, sourceParam.idParameter) : null
        pushUnique({
          kind: 'listPointer',
          fieldName,
          index: index ?? 0,
          childCanvasId: connection.toNodeId,
        })
      } else {
        pushUnique({
          kind: 'pointer',
          fieldName,
          childCanvasId: connection.toNodeId,
        })
      }
      continue
    }

    if (sourceParam.typeParameter === 'mapHashEmbed') {
      const embedSlotId = resolveMapHashEmbedSlotIdFromConnection(connection)
      if (embedSlotId) {
        const entries = parseMapHashEmbedString(sourceParam.defaultValue)
        const entry = entries.find(
          (item) =>
            hasMapHashEmbedStructure(item) &&
            mapHashEmbedSlotId(sourceParam.idParameter, item.key) === embedSlotId,
        )
        if (entry) {
          pushUnique({
            kind: 'mapHashEmbed',
            parameterName: sourceParam.nameParameter,
            entryKey: entry.key,
            childCanvasId: connection.toNodeId,
          })
        }
      }
    }
  }

  return links
}

function partitionLinks(links: readonly OutgoingLink[]) {
  const linksByEmbed = new Map<string, OutgoingLink[]>()
  const linksByPointer = new Map<string, OutgoingLink[]>()
  const linksByListEmbed = new Map<string, OutgoingLink[]>()
  const linksByListPointer = new Map<string, OutgoingLink[]>()
  const linksByList2Embed = new Map<string, OutgoingLink[]>()
  const linksByList2Pointer = new Map<string, OutgoingLink[]>()
  const internalLinks: OutgoingLink[] = []

  for (const link of links) {
    switch (link.kind) {
      case 'embed': {
        const bucket = linksByEmbed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByEmbed.set(link.fieldName, bucket)
        break
      }
      case 'pointer': {
        const bucket = linksByPointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByPointer.set(link.fieldName, bucket)
        break
      }
      case 'listEmbed': {
        const bucket = linksByListEmbed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByListEmbed.set(link.fieldName, bucket)
        break
      }
      case 'listPointer': {
        const bucket = linksByListPointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByListPointer.set(link.fieldName, bucket)
        break
      }
      case 'list2Embed': {
        const bucket = linksByList2Embed.get(link.fieldName) ?? []
        bucket.push(link)
        linksByList2Embed.set(link.fieldName, bucket)
        break
      }
      case 'list2Pointer': {
        const bucket = linksByList2Pointer.get(link.fieldName) ?? []
        bucket.push(link)
        linksByList2Pointer.set(link.fieldName, bucket)
        break
      }
      case 'internal':
        internalLinks.push(link)
        break
      default:
        break
    }
  }

  return {
    linksByEmbed,
    linksByPointer,
    linksByListEmbed,
    linksByListPointer,
    linksByList2Embed,
    linksByList2Pointer,
    internalLinks,
  }
}

function groupListStructureBlocks<T extends { title: string }>(
  blocks: readonly T[] | undefined,
): T[][] {
  if (!blocks || blocks.length === 0) {
    return []
  }

  const groups: T[][] = []
  let current: T[] = []
  let currentTitle: string | null = null

  for (const block of blocks) {
    const title = block.title.trim()
    if (currentTitle !== null && title !== currentTitle) {
      groups.push(current)
      current = []
    }
    currentTitle = title
    current.push(block)
  }

  if (current.length > 0) {
    groups.push(current)
  }

  return groups
}

function listPointerLinksByGlobalIndex(
  parent: CanvasNode,
  scene: CanvasScene,
  blocks: ListPointerDefinition[],
  fieldLinks: OutgoingLink[],
): Map<number, OutgoingLink & { kind: 'listPointer' }> {
  const byIndex = new Map<number, OutgoingLink & { kind: 'listPointer' }>()

  if (blocks.length === 1) {
    for (const link of fieldLinks) {
      if (link.kind === 'listPointer') {
        byIndex.set(link.index, link)
      }
    }
    return byIndex
  }

  for (const link of fieldLinks) {
    if (link.kind !== 'listPointer') {
      continue
    }

    const connection = scene.connections.find(
      (entry) => entry.fromNodeId === parent.id && entry.toNodeId === link.childCanvasId,
    )
    if (!connection) {
      continue
    }

    const blockIndex = blocks.findIndex((block) =>
      populatedSlotsForListPointer(block).some(
        (slot) => slot.id === connection.fromInternalStructureId,
      ),
    )
    if (blockIndex >= 0) {
      byIndex.set(blockIndex, link)
    }
  }

  return byIndex
}

function listEmbedLinksByGlobalIndex(
  parent: CanvasNode,
  scene: CanvasScene,
  blocks: ListEmbedDefinition[],
  fieldLinks: OutgoingLink[],
): Map<number, OutgoingLink & { kind: 'listEmbed' }> {
  const byIndex = new Map<number, OutgoingLink & { kind: 'listEmbed' }>()

  if (blocks.length === 1) {
    for (const link of fieldLinks) {
      if (link.kind === 'listEmbed') {
        byIndex.set(link.index, link)
      }
    }
    return byIndex
  }

  for (const link of fieldLinks) {
    if (link.kind !== 'listEmbed') {
      continue
    }

    const connection = scene.connections.find(
      (entry) => entry.fromNodeId === parent.id && entry.toNodeId === link.childCanvasId,
    )
    if (!connection) {
      continue
    }

    const blockIndex = blocks.findIndex((block) =>
      populatedSlotsForListEmbed(block).some(
        (slot) => slot.id === connection.fromInternalStructureId,
      ),
    )
    if (blockIndex >= 0) {
      byIndex.set(blockIndex, link)
    }
  }

  return byIndex
}

function exportSlotCountForListPointerGroup(blocks: ListPointerDefinition[]): number {
  if (blocks.length === 1) {
    return populatedSlotsForListPointer(blocks[0]!).length
  }
  return blocks.length
}

function exportSlotCountForListEmbedGroup(blocks: ListEmbedDefinition[]): number {
  if (blocks.length === 1) {
    return populatedSlotsForListEmbed(blocks[0]!).length
  }
  return blocks.length
}

function childTitleForListPointerExportSlot(
  blocks: ListPointerDefinition[],
  slotIndex: number,
): string {
  if (blocks.length === 1) {
    return childTitleForListPointerSlot(blocks[0]!, slotIndex)
  }

  const block = blocks[slotIndex]
  if (!block) {
    return childTitleForListPointerSlot(blocks[0]!, 0)
  }

  const slots = populatedSlotsForListPointer(block)
  return slots[0]?.name ?? block.internalStructures[0]?.name ?? block.title
}

function childTitleForListEmbedExportSlot(blocks: ListEmbedDefinition[], slotIndex: number): string {
  if (blocks.length === 1) {
    return childTitleForListEmbedSlot(blocks[0]!, slotIndex)
  }

  const block = blocks[slotIndex]
  if (!block) {
    return childTitleForListEmbedSlot(blocks[0]!, 0)
  }

  const slots = populatedSlotsForListEmbed(block)
  return slots[0]?.name ?? block.internalStructures[0]?.name ?? block.title
}

export class RitualEmitter {
  readonly scene: CanvasScene

  readonly registry: Record<string, NodeSchemaDefinition>

  readonly warnings: string[] = []

  readonly visitedBodies = new Set<string>()

  private emittedNodes = 0

  private readonly totalNodes: number

  private readonly fidelity: RitualExportFidelity

  constructor(
    scene: CanvasScene,
    registry: Record<string, NodeSchemaDefinition>,
    rootId: string,
    fidelity: RitualExportFidelity = {},
  ) {
    this.scene = scene
    this.registry = registry
    this.fidelity = fidelity
    this.totalNodes = collectSubtreeNodeIds(scene, rootId).size
  }

  private exportFieldName(parameter: NodeParameterDefinition): string {
    return resolveExportFieldName(parameter, this.fidelity, ritualExportFieldNameFromParameter)
  }

  private exportBlockTitle(title: string): string {
    return resolveExportBlockTitle(title, this.fidelity, ritualExportBlockTitle)
  }

  childTitle(childCanvasId: string): string {
    const node = findCanvasNode(this.scene, childCanvasId)
    return node?.node.schema.title ?? 'Unknown'
  }

  private blockCardExportFilter(canvasNode: CanvasNode): {
    parameterIds: Set<string>
    parameterNames: Set<string>
    parameterValueByName: Map<string, string>
    embedIds: Set<string>
    pointerIds: Set<string>
    embedTitles: Set<string>
    pointerTitles: Set<string>
  } | null {
    if (!this.fidelity.blockCardSelectedParametersOnly) {
      return null
    }
    if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
      return null
    }

    const looksSynthetic = (id: string) => id.startsWith('catalog-embed-') || id.startsWith('catalog-ptr-')
    const parameterIds = new Set<string>()
    const parameterNames = new Set<string>()
    const parameterValueByName = new Map<string, string>()
    const embedIds = new Set<string>()
    const pointerIds = new Set<string>()
    const embedTitles = new Set<string>()
    const pointerTitles = new Set<string>()

    for (const parameter of canvasNode.blockStructure.parameters) {
      this.collectBlockFilterFromParameter(
        parameter,
        looksSynthetic,
        parameterIds,
        parameterNames,
        parameterValueByName,
        embedIds,
        pointerIds,
        embedTitles,
        pointerTitles,
      )
    }

    return {
      parameterIds,
      parameterNames,
      parameterValueByName,
      embedIds,
      pointerIds,
      embedTitles,
      pointerTitles,
    }
  }

  private pushMapHashEmbedParameterLines(
    canvasNode: CanvasNode,
    parameter: Pick<NodeParameterDefinition, 'id' | 'name' | 'defaultValue'>,
    exportFieldName: string,
    rawValue: string,
    allLinks: readonly OutgoingLink[],
    depth: number,
    lines: string[],
  ): void {
    lines.push(
      ...emitMapHashEmbedMapBlock(
        this,
        canvasNode,
        parameter,
        exportFieldName,
        rawValue,
        allLinks,
        depth,
        {
          includeOrphanLinks: !this.fidelity.blockCardSelectedParametersOnly,
        },
      ),
    )
  }

  private collectBlockFilterFromParameter(
    parameter: BlockParameterDef,
    looksSynthetic: (id: string) => boolean,
    parameterIds: Set<string>,
    parameterNames: Set<string>,
    parameterValueByName: Map<string, string>,
    embedIds: Set<string>,
    pointerIds: Set<string>,
    embedTitles: Set<string>,
    pointerTitles: Set<string>,
  ): void {
    const source = parameter.sourcePath
    if (source.kind === 'parameter') {
      parameterIds.add(source.parameterId)
      const normalizedName = parameter.nameParameter.trim().toLowerCase()
      parameterNames.add(normalizedName)
      parameterValueByName.set(normalizedName, parameter.defaultValue)
      return
    }
    if (source.kind === 'embedChild') {
      if (looksSynthetic(source.embedId)) {
        embedTitles.add(parameter.nameParameter.trim())
      } else {
        embedIds.add(source.embedId)
      }
      return
    }
    if (source.kind === 'pointerChild') {
      if (looksSynthetic(source.pointerId)) {
        pointerTitles.add(parameter.nameParameter.trim())
      } else {
        pointerIds.add(source.pointerId)
      }
    }
  }

  emitTypeBody(canvasNode: CanvasNode, depth: number): string[] {
    if (this.visitedBodies.has(canvasNode.id)) {
      return []
    }
    this.visitedBodies.add(canvasNode.id)
    this.emittedNodes += 1

    const lines: string[] = []
    const pad = indent(depth)
    const instance = canvasNode.node
    const schema = instance.schema
    const links = resolveOutgoingLinks(canvasNode, this.scene)
    const partitioned = partitionLinks(links)
    const blockFilter = this.blockCardExportFilter(canvasNode)

    if (blockFilter && canvasNode.blockViewActive && canvasNode.blockStructure) {
      const emittedParameterIds = new Set<string>()

      for (const selected of canvasNode.blockStructure.parameters) {
        if (selected.sourcePath.kind !== 'parameter') {
          continue
        }

        const normalizedName = selected.nameParameter.trim().toLowerCase()
        const parameterFromSchema =
          schema.parameters.find((entry) => entry.id === selected.sourcePath.parameterId) ??
          schema.parameters.find((entry) => entry.name.trim().toLowerCase() === normalizedName)
        const parameter =
          parameterFromSchema ??
          ({
            id: selected.idParameter,
            name: selected.nameParameter,
            type: selected.typeParameter as unknown as NodeDataType,
          } satisfies Pick<NodeParameterDefinition, 'id' | 'name' | 'type'>)

        if (emittedParameterIds.has(parameter.id)) {
          continue
        }
        emittedParameterIds.add(parameter.id)

        if (parameter.type === 'mapHashEmbed') {
          const raw =
            parameterFromSchema != null
              ? parameterValue(instance, parameter.id, parameter.defaultValue)
              : selected.defaultValue
          const blockCardOverride =
            blockFilter.parameterValueByName.get(parameter.name.trim().toLowerCase()) ?? null
          this.pushMapHashEmbedParameterLines(
            canvasNode,
            parameter,
            this.exportFieldName(parameter),
            blockCardOverride ?? raw,
            links,
            depth,
            lines,
          )
          continue
        }
        if (isMapHashParameterType(parameter.type)) {
          continue
        }
        if (parameter.type === 'comment' || parameter.type === 'property') {
          continue
        }

        const raw =
          parameterFromSchema != null
            ? parameterValue(instance, parameter.id, parameter.defaultValue)
            : selected.defaultValue
        const blockCardOverride =
          blockFilter.parameterValueByName.get(parameter.name.trim().toLowerCase()) ?? null
        lines.push(
          `${pad}${formatRitualScalarAssignment(parameter, blockCardOverride ?? raw, pad, {
            fieldName: this.exportFieldName(parameter),
          })}`,
        )
      }
    } else {
      for (const parameter of schema.parameters) {
        if (
          blockFilter &&
          !blockFilter.parameterIds.has(parameter.id) &&
          !blockFilter.parameterNames.has(parameter.name.trim().toLowerCase())
        ) {
          continue
        }
        if (parameter.type === 'mapHashEmbed') {
          const raw = parameterValue(instance, parameter.id, parameter.defaultValue)
          const blockCardOverride =
            blockFilter?.parameterValueByName.get(parameter.name.trim().toLowerCase()) ?? null
          this.pushMapHashEmbedParameterLines(
            canvasNode,
            parameter,
            this.exportFieldName(parameter),
            blockCardOverride ?? raw,
            links,
            depth,
            lines,
          )
          continue
        }
        if (isMapHashParameterType(parameter.type)) {
          continue
        }
        if (parameter.type === 'comment' || parameter.type === 'property') {
          continue
        }
        const raw = parameterValue(instance, parameter.id, parameter.defaultValue)
        const blockCardOverride =
          blockFilter?.parameterValueByName.get(parameter.name.trim().toLowerCase()) ?? null
        lines.push(
          `${pad}${formatRitualScalarAssignment(parameter, blockCardOverride ?? raw, pad, {
            fieldName: this.exportFieldName(parameter),
          })}`,
        )
      }
    }

    for (const link of partitioned.internalLinks) {
      const child = findCanvasNode(this.scene, link.childCanvasId)
      if (!child) {
        this.warnings.push(`Filho «${link.childCanvasId}» não encontrado para «${link.fieldName}».`)
        continue
      }
      const fieldName = this.exportBlockTitle(link.fieldName)
      const childTitle = this.childTitle(link.childCanvasId)
      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: link = ${childTitle} {`)
      lines.push(...this.emitTypeBody(child, bodyDepth))
      lines.push(`${pad}}`)
    }

    for (const block of schema.embed ?? []) {
      if (
        blockFilter &&
        !blockFilter.embedIds.has(block.id) &&
        !blockFilter.embedTitles.has(block.title.trim())
      ) {
        continue
      }
      if (
        blockFilter &&
        (schemaListEmbedFieldNames(schema).has(block.title.trim()) ||
          schemaList2EmbedFieldNames(schema).has(block.title.trim()))
      ) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const fieldLinks = partitioned.linksByEmbed.get(block.title) ?? []
      const child = fieldLinks[0] ? findCanvasNode(this.scene, fieldLinks[0].childCanvasId) : null
      const childTitle = child ? this.childTitle(child.id) : defaultChildTitleForBlock(block)

      if (!child) {
        lines.push(`${pad}${fieldName}: embed = ${childTitle} {}`)
        continue
      }

      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: embed = ${childTitle} {`)
      lines.push(...this.emitTypeBody(child, bodyDepth))
      lines.push(`${pad}}`)
    }

    for (const block of schema.pointer ?? []) {
      if (
        blockFilter &&
        !blockFilter.pointerIds.has(block.id) &&
        !blockFilter.pointerTitles.has(block.title.trim())
      ) {
        continue
      }
      if (
        blockFilter &&
        (schemaListPointerFieldNames(schema).has(block.title.trim()) ||
          schemaList2PointerFieldNames(schema).has(block.title.trim()))
      ) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const fieldLinks = partitioned.linksByPointer.get(block.title) ?? []
      const child = fieldLinks[0] ? findCanvasNode(this.scene, fieldLinks[0].childCanvasId) : null
      const childTitle = child ? this.childTitle(child.id) : defaultChildTitleForBlock(block)

      if (!child) {
        lines.push(`${pad}${fieldName}: pointer = ${childTitle} {}`)
        continue
      }

      const bodyDepth = depth + INDENT_STEP
      lines.push(`${pad}${fieldName}: pointer = ${childTitle} {`)
      lines.push(...this.emitTypeBody(child, bodyDepth))
      lines.push(`${pad}}`)
    }

    for (const blocks of groupListStructureBlocks(schema.listEmbed)) {
      const block = blocks[0]!
      if (blockFilter && !blockFilterIncludesStructuralField(blockFilter, 'embed', block)) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByListEmbed.get(block.title) ?? []).sort(
        (a, b) => a.index - b.index,
      )
      const linksByIndex = listEmbedLinksByGlobalIndex(canvasNode, this.scene, blocks, fieldLinks)
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list[embed] = {`)

      if (blockFilter) {
        const linkedEmbeds = blockCardListEmbedLinks(partitioned, block.title)
        for (const link of linkedEmbeds) {
          const child = findCanvasNode(this.scene, link.childCanvasId)
          if (!child) {
            lines.push(
              structOnlyChildLine(itemPad, childTitleForListEmbedExportSlot(blocks, link.index)),
            )
            continue
          }
          const childTitle = this.childTitle(link.childCanvasId)
          const itemBodyDepth = bodyDepth + INDENT_STEP
          lines.push(`${itemPad}${childTitle} {`)
          lines.push(...this.emitTypeBody(child, itemBodyDepth))
          lines.push(`${itemPad}}`)
        }
        lines.push(`${pad}}`)
        continue
      }

      const populatedEmbedCount = exportSlotCountForListEmbedGroup(blocks)
      const slotCount = populatedEmbedCount > 0 ? populatedEmbedCount : fieldLinks.length

      for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const link = linksByIndex.get(slotIndex)
        const child = link ? findCanvasNode(this.scene, link.childCanvasId) : undefined

        if (!child) {
          lines.push(
            structOnlyChildLine(itemPad, childTitleForListEmbedExportSlot(blocks, slotIndex)),
          )
          continue
        }

        const childTitle = this.childTitle(link!.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }

      lines.push(`${pad}}`)
    }

    for (const blocks of groupListStructureBlocks(schema.listPointer)) {
      const block = blocks[0]!
      if (blockFilter && !blockFilterIncludesStructuralField(blockFilter, 'pointer', block)) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const fieldLinks = (partitioned.linksByListPointer.get(block.title) ?? []).sort(
        (a, b) => a.index - b.index,
      )
      const linksByIndex = listPointerLinksByGlobalIndex(canvasNode, this.scene, blocks, fieldLinks)
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      const compactProbTables =
        this.fidelity.compactPlaceholderProbabilityTables !== false &&
        fieldName.toLowerCase() === 'probabilitytables'

      lines.push(`${pad}${fieldName}: list[pointer] = {`)

      if (blockFilter) {
        const linkedPointers = blockCardListPointerLinks(partitioned, block.title)
        for (const link of linkedPointers) {
          const child = findCanvasNode(this.scene, link.childCanvasId)
          if (!child) {
            lines.push(
              structOnlyChildLine(
                itemPad,
                childTitleForListPointerExportSlot(blocks, link.index),
              ),
            )
            continue
          }

          if (
            compactProbTables &&
            child.node.schema.title === VFX_PROBABILITY_TABLE_TITLE &&
            isPlaceholderProbabilityTableNode(child)
          ) {
            lines.push(structOnlyChildLine(itemPad, VFX_PROBABILITY_TABLE_TITLE))
            continue
          }

          const childTitle = this.childTitle(link.childCanvasId)
          const itemBodyDepth = bodyDepth + INDENT_STEP
          lines.push(`${itemPad}${childTitle} {`)
          lines.push(...this.emitTypeBody(child, itemBodyDepth))
          lines.push(`${itemPad}}`)
        }
        lines.push(`${pad}}`)
        continue
      }

      const populatedPointerCount = exportSlotCountForListPointerGroup(blocks)
      const slotCount = populatedPointerCount > 0 ? populatedPointerCount : fieldLinks.length

      for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const link = linksByIndex.get(slotIndex)
        const child = link ? findCanvasNode(this.scene, link.childCanvasId) : undefined
        const slotChildTitle = childTitleForListPointerExportSlot(blocks, slotIndex)

        if (!child) {
          lines.push(structOnlyChildLine(itemPad, slotChildTitle))
          continue
        }

        if (
          compactProbTables &&
          child.node.schema.title === VFX_PROBABILITY_TABLE_TITLE &&
          isPlaceholderProbabilityTableNode(child)
        ) {
          lines.push(structOnlyChildLine(itemPad, VFX_PROBABILITY_TABLE_TITLE))
          continue
        }

        const childTitle = this.childTitle(link!.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }

      lines.push(`${pad}}`)
    }

    for (const block of schema.list2Embed ?? []) {
      if (blockFilter && !blockFilterIncludesStructuralField(blockFilter, 'embed', block)) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list2[embed] = {`)

      if (blockFilter) {
        const linkedEmbeds = blockCardList2EmbedLinks(partitioned, block.title)
        for (const link of linkedEmbeds) {
          const child = findCanvasNode(this.scene, link.childCanvasId)
          if (!child) {
            continue
          }
          const childTitle = this.childTitle(link.childCanvasId)
          const itemBodyDepth = bodyDepth + INDENT_STEP
          lines.push(`${itemPad}${childTitle} {`)
          lines.push(...this.emitTypeBody(child, itemBodyDepth))
          lines.push(`${itemPad}}`)
        }
        lines.push(`${pad}}`)
        continue
      }

      const fieldLinks = (partitioned.linksByList2Embed.get(block.title) ?? []).sort(
        (a, b) => a.instanceIndex - b.instanceIndex,
      )
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    for (const block of schema.list2Pointer ?? []) {
      if (blockFilter && !blockFilterIncludesStructuralField(blockFilter, 'pointer', block)) {
        continue
      }
      const fieldName = this.exportBlockTitle(block.title)
      const bodyDepth = depth + INDENT_STEP
      const itemPad = indent(bodyDepth)
      lines.push(`${pad}${fieldName}: list2[pointer] = {`)

      if (blockFilter) {
        const linkedPointers = blockCardList2PointerLinks(partitioned, block.title)
        for (const link of linkedPointers) {
          const child = findCanvasNode(this.scene, link.childCanvasId)
          if (!child) {
            continue
          }
          const childTitle = this.childTitle(link.childCanvasId)
          const itemBodyDepth = bodyDepth + INDENT_STEP
          lines.push(`${itemPad}${childTitle} {`)
          lines.push(...this.emitTypeBody(child, itemBodyDepth))
          lines.push(`${itemPad}}`)
        }
        lines.push(`${pad}}`)
        continue
      }

      const fieldLinks = (partitioned.linksByList2Pointer.get(block.title) ?? []).sort(
        (a, b) => a.instanceIndex - b.instanceIndex,
      )
      for (const link of fieldLinks) {
        const child = findCanvasNode(this.scene, link.childCanvasId)
        if (!child) {
          continue
        }
        const childTitle = this.childTitle(link.childCanvasId)
        const itemBodyDepth = bodyDepth + INDENT_STEP
        lines.push(`${itemPad}${childTitle} {`)
        lines.push(...this.emitTypeBody(child, itemBodyDepth))
        lines.push(`${itemPad}}`)
      }
      lines.push(`${pad}}`)
    }

    return lines
  }
}

type EmitMapHashEmbedMapBlockOptions = {
  /** Quando false (preview do block card), ignora ligações que não estão no catálogo do parâmetro. */
  includeOrphanLinks?: boolean
}

function emitMapHashEmbedMapBlock(
  emitter: RitualEmitter,
  canvasNode: CanvasNode,
  parameter: Pick<NodeParameterDefinition, 'id' | 'name' | 'defaultValue'>,
  exportFieldName: string,
  rawValue: string,
  allLinks: readonly OutgoingLink[],
  depth: number,
  options: EmitMapHashEmbedMapBlockOptions = {},
): string[] {
  const includeOrphanLinks = options.includeOrphanLinks ?? true
  const pad = indent(depth)
  const bodyDepth = depth + INDENT_STEP
  const itemPad = indent(bodyDepth)
  const childBodyDepth = bodyDepth + INDENT_STEP
  const parameterNameNorm = parameter.name.trim().toLowerCase()

  const entryLinks = allLinks.filter(
    (link): link is OutgoingLink & { kind: 'mapHashEmbed' } =>
      link.kind === 'mapHashEmbed' && link.parameterName.trim().toLowerCase() === parameterNameNorm,
  )

  const catalog = parseMapHashEmbedString(rawValue)
  const linkByKey = new Map<string, OutgoingLink & { kind: 'mapHashEmbed' }>()
  for (const link of entryLinks) {
    linkByKey.set(normalizeMapKey(link.entryKey), link)
  }

  const lines: string[] = [`${pad}${exportFieldName}: map[hash,embed] = {`]
  const used = new Set<string>()

  for (const entry of catalog) {
    if (!hasMapHashEmbedStructure(entry)) {
      continue
    }
    const key = normalizeMapKey(entry.key)
    const link = linkByKey.get(key)
    const keyLabel = formatMapEntryKey(entry.key)
    const child = link ? findCanvasNode(emitter.scene, link.childCanvasId) : undefined
    const typeTitle = child?.node.schema.title ?? entry.typeName
    lines.push(`${itemPad}${keyLabel} = ${typeTitle} {`)
    if (child) {
      lines.push(...emitter.emitTypeBody(child, childBodyDepth))
    }
    lines.push(`${itemPad}}`)
    if (link) {
      used.add(key)
    } else {
      emitter.warnings.push(
        `Entrada «${entry.key}» em ${parameter.name} sem nó ligado na cena.`,
      )
    }
  }

  for (const link of entryLinks) {
    const key = normalizeMapKey(link.entryKey)
    if (used.has(key)) {
      continue
    }
    emitter.warnings.push(
      `Ligação ${parameter.name} «${link.entryKey}» não está no catálogo mapHashEmbed.`,
    )
    if (!includeOrphanLinks) {
      continue
    }
    const keyLabel = formatMapEntryKey(link.entryKey)
    const child = findCanvasNode(emitter.scene, link.childCanvasId)
    const typeTitle = child?.node.schema.title ?? 'Unknown'
    lines.push(`${itemPad}${keyLabel} = ${typeTitle} {`)
    if (child) {
      lines.push(...emitter.emitTypeBody(child, childBodyDepth))
    }
    lines.push(`${itemPad}}`)
  }

  lines.push(`${pad}}`)
  return lines
}

export function emitMainBlockCardPreview(
  mainNode: CanvasNode,
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  fidelity: RitualExportFidelity = {},
): { text: string; warnings: string[] } {
  const structure = mainNode.blockStructure
  if (!structure) {
    return { text: '', warnings: ['Block card Main sem blockStructure.'] }
  }

  const emitter = new RitualEmitter(scene, registry, mainNode.id, fidelity)
  const lines: string[] = ['#PROP_text']
  const instance = mainNode.node
  const schema = instance.schema
  const mainTemplate = registry[MAIN_SCHEMA_ID] ?? schema
  const links = resolveOutgoingLinks(mainNode, scene)
  const emittedParameterIds = new Set<string>()

  for (const selected of structure.parameters) {
    if (selected.sourcePath.kind !== 'parameter') {
      continue
    }

    const normalizedName = selected.nameParameter.trim().toLowerCase()
    const parameterFromSchema =
      schema.parameters.find((entry) => entry.id === selected.sourcePath.parameterId) ??
      schema.parameters.find((entry) => entry.name.trim().toLowerCase() === normalizedName) ??
      mainTemplate.parameters.find((entry) => entry.id === selected.sourcePath.parameterId) ??
      mainTemplate.parameters.find((entry) => entry.name.trim().toLowerCase() === normalizedName)

    const parameter =
      parameterFromSchema ??
      ({
        id: selected.idParameter,
        name: selected.nameParameter,
        type: selected.typeParameter as unknown as NodeDataType,
        defaultValue: selected.defaultValue,
      } satisfies Pick<NodeParameterDefinition, 'id' | 'name' | 'type' | 'defaultValue'>)

    if (emittedParameterIds.has(parameter.id)) {
      continue
    }
    emittedParameterIds.add(parameter.id)

    const exportFieldName = resolveExportFieldName(
      parameter,
      fidelity,
      ritualExportFieldNameFromParameter,
    )
    const raw = selected.defaultValue

    if (parameter.type === 'mapHashEmbed') {
      lines.push(
        ...emitMapHashEmbedMapBlock(emitter, mainNode, parameter, exportFieldName, raw, links, 0, {
          includeOrphanLinks: false,
        }),
      )
      continue
    }

    if (isMapHashParameterType(parameter.type)) {
      continue
    }
    if (parameter.type === 'comment' || parameter.type === 'property') {
      continue
    }

    lines.push(formatRitualScalarAssignment(parameter, raw, '', { fieldName: exportFieldName }))
  }

  return { text: `${lines.join('\n')}\n`, warnings: emitter.warnings }
}

export function emitMainPropFile(
  mainNode: CanvasNode,
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
): { text: string; warnings: string[] } {
  const emitter = new RitualEmitter(scene, registry, mainNode.id)
  const lines: string[] = ['#PROP_text']
  const instance = mainNode.node
  const schema = instance.schema
  const mainTemplate = registry[MAIN_SCHEMA_ID] ?? schema
  const links = resolveOutgoingLinks(mainNode, scene)
  const entryLinks = links.filter((l) => l.kind === 'mapHashEmbed' && l.parameterName === 'entries')

  const metaOrder = ['type', 'version', 'linked'] as const
  for (const name of metaOrder) {
    const parameter =
      schema.parameters.find((p) => p.name === name) ??
      mainTemplate.parameters.find((p) => p.name === name)
    if (!parameter) {
      continue
    }
    const raw = parameterValue(instance, parameter.id, parameter.defaultValue)
    lines.push(formatRitualScalarAssignment(parameter, raw, '', { fieldName: name }))
  }

  const entriesParam =
    schema.parameters.find((p) => p.name === 'entries' && p.type === 'mapHashEmbed') ??
    mainTemplate.parameters.find((p) => p.name === 'entries' && p.type === 'mapHashEmbed')

  if (entriesParam) {
    const raw =
      parameterValue(instance, entriesParam.id, entriesParam.defaultValue) ??
      entriesParam.defaultValue
    lines.push(
      ...emitMapHashEmbedMapBlock(emitter, mainNode, entriesParam, 'entries', raw, links, 0),
    )
  } else {
    emitter.warnings.push('Parâmetro «entries» (mapHashEmbed) não encontrado em Main.')
  }

  return { text: `${lines.join('\n')}\n`, warnings: emitter.warnings }
}

export function canvasNodeSubtreeToRitual(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  rootNodeId: string,
  fidelity: RitualExportFidelity = {},
): CanvasToClassGroupRitualResult {
  const canvasNode = findCanvasNode(scene, rootNodeId)

  if (!canvasNode) {
    return { ok: false, error: 'Nó não encontrado na cena.' }
  }

  if (canvasNode.node.schema.id === MAIN_SCHEMA_ID) {
    const exportFidelity: RitualExportFidelity = {
      compactPlaceholderProbabilityTables: true,
      useSchemaFieldNames: true,
      ...fidelity,
    }
    if (
      exportFidelity.blockCardSelectedParametersOnly &&
      canvasNode.blockViewActive &&
      canvasNode.blockStructure
    ) {
      const { text, warnings } = emitMainBlockCardPreview(
        canvasNode,
        scene,
        registry,
        exportFidelity,
      )
      return { ok: true, text, warnings }
    }
    const { text, warnings } = emitMainPropFile(canvasNode, scene, registry)
    return { ok: true, text, warnings }
  }

  const exportFidelity: RitualExportFidelity = {
    compactPlaceholderProbabilityTables: true,
    useSchemaFieldNames: true,
    ...fidelity,
  }

  const emitter = new RitualEmitter(scene, registry, rootNodeId, exportFidelity)
  const title = canvasNode.node.schema.title
  const bodyLines = emitter.emitTypeBody(canvasNode, INDENT_STEP)
  const lines = [`# Preview: ${title}`, `${title} {`, ...bodyLines, '}']
  const rawPreview = `${lines.join('\n')}\n`
  const text = finalizeNodePreviewRitual(rawPreview, exportFidelity)

  return { ok: true, text, warnings: emitter.warnings }
}

export function canvasToClassGroupRitual(
  scene: CanvasScene,
  _registry: Record<string, NodeSchemaDefinition>,
): CanvasToClassGroupRitualResult {
  const mainNodes = findMainNodes(scene)

  if (mainNodes.length === 0) {
    return {
      ok: false,
      error: 'A cena não contém nenhum nó Main (schema id «main»). Adicione Main antes de exportar.',
    }
  }

  if (mainNodes.length > 1) {
    return {
      ok: false,
      error: `A cena contém ${String(mainNodes.length)} nós Main; deve existir exactamente um.`,
    }
  }

  const mainNode = mainNodes[0]!
  const { text, warnings } = emitMainPropFile(mainNode, scene, _registry)

  if (!text.includes('entries: map[hash,embed]')) {
    return {
      ok: false,
      error: 'Exportação incompleta: bloco entries: map[hash,embed] em falta.',
    }
  }

  return { ok: true, text, warnings }
}

export async function canvasToClassGroupRitualWithProgress(
  scene: CanvasScene,
  registry: Record<string, NodeSchemaDefinition>,
  onProgress?: (progress: CanvasToRitualProgress) => void,
): Promise<CanvasToClassGroupRitualResult> {
  onProgress?.({ label: 'A localizar nó Main…', ratio: 0.05 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  const mainNodes = findMainNodes(scene)
  if (mainNodes.length !== 1) {
    return canvasToClassGroupRitual(scene, registry)
  }

  onProgress?.({ label: 'A serializar parâmetros…', ratio: 0.2 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  onProgress?.({ label: 'A emitir entries e subárvore…', ratio: 0.55 })
  const result = canvasToClassGroupRitual(scene, registry)

  onProgress?.({ label: 'A concluir…', ratio: 0.95 })
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

  if (result.ok) {
    onProgress?.({ label: 'Concluído', ratio: 1 })
  }

  return result
}
