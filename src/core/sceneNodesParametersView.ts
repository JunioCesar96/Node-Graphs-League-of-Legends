import { getAddonManifest } from '@/blockStructures/addonRegistry'
import {
  blockParameterSlotId,
  blockParameterTypeToNodeDataType,
  isBlockListCollectionParameter,
  isBlockMapStructureType,
  isBlockStructuralSourcePath,
  isBlockTokenValue,
  type BlockParameterDef,
} from '@/core/blockSchema'
import {
  findConnectionForBlockSlot,
  findConnectionsForBlockOutputSlot,
} from '@/core/blockSlotConnections'
import {
  blockElementViewKeyForParameter,
  blockElementViewKeyForSlot,
  clampBlockSelectedIndex,
  getBlockElementViewState,
  resolveBlockOutputSlotConnectionIndexFromNode,
  type BlockElementViewKey,
} from '@/core/blockElementViewState'
import { hasMapHashEmbedStructure, parseMapHashEmbedString } from '@/core/mapHashEmbedValue'
import { mapHashEmbedSlotId } from '@/core/mapHashEmbedSlots'
import { hasMapHashPointerStructure, parseMapHashPointerString } from '@/core/mapHashPointerValue'
import { mapHashPointerSlotId } from '@/core/mapHashPointerSlots'
import type { MapHashStructureEntry } from '@/core/mapHashStructureValue'
import { hasMapU64PointerStructure, parseMapU64PointerString } from '@/core/mapU64PointerValue'
import { mapU64PointerSlotId } from '@/core/mapU64PointerSlots'
import type { OutgoingLink } from '@/core/canvasToClassGroupRitual'
import { parseListEmbedSlotIndex } from '@/core/listEmbedSlots'
import { parseListPointerSlotIndex } from '@/core/listPointerSlots'
import { resolveBlockParameterInputValue } from '@/core/blockParameterInputValue'
import { parseBlockToken } from '@/core/blockTokenParser'
import { resolveWiredAddonInputSlotNames } from '@/core/addonSlotConnections'
import { getNodeDisplayTitle, isNodeLocked } from '@/core/canvasNodePresentation'
import type { CanvasConnection, CanvasNode, CanvasScene } from '@/core/canvasScene'
import { resolveBlockSlotPeer } from '@/core/blockSlotPeerState'
import type { NodeDataType } from '@/core/nodeSchema'
import {
  buildOutgoingLinksIndex,
  findOutgoingLinksForField,
  formatOutgoingLinksDisplayLabel,
  isSchemaStructuralParameter,
  outgoingLinkFieldName,
  resolveConnectedNodeDisplayLabel,
  resolveSceneNodesParameterParentNodeId,
} from '@/core/sceneNodesParameterGraphLinks'
import { enrichSceneNodesParameterRowsWithInputAddons } from '@/core/inputAddonMatcher'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'

export { resolveSceneNodesParameterParentNodeId } from '@/core/sceneNodesParameterGraphLinks'

const MAX_PARAMETER_DISPLAY_LENGTH = 96

function readAddonFieldValueFromDom(nodeId: string, fieldName: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }

  const root = document.querySelector(`[data-instance-id="${CSS.escape(nodeId)}"]`)
  const namedInput = root?.querySelector(`input[name="${CSS.escape(fieldName)}"]`)

  if (namedInput instanceof HTMLInputElement) {
    return namedInput.value
  }

  return undefined
}

export type SceneNodesParameterKind = 'schema' | 'block' | 'addon'

export type SceneNodesParameterListIndex = {
  connectionCount: number
  connectionIndex: number
  childNodeIds: string[]
  entryLabels?: string[]
  outputSlotId?: string
  /** Chave em `canvasNode.blockElementView` — sincroniza com o BlockCard. */
  elementViewKey?: BlockElementViewKey
}

export type SceneNodesParameterRow = {
  id: string
  name: string
  displayValue: string
  fullValue: string
  editValue: string
  valueType: NodeDataType
  kind: SceneNodesParameterKind
  editable: boolean
  childNodeId?: string
  navigable: boolean
  listIndex?: SceneNodesParameterListIndex
  inputAddonMatches?: InputAddonManifest[]
  activeInputAddonId?: string
  inputAddonPreferenceKey?: string
}

export function clampSceneNodesParameterListIndex(
  listIndex: SceneNodesParameterListIndex,
  rawIndex?: number,
): number {
  if (listIndex.connectionCount <= 0) {
    return 0
  }
  const index = rawIndex ?? listIndex.connectionIndex
  return Math.min(Math.max(0, index), listIndex.connectionCount - 1)
}

export function resolveSceneNodesParameterRowAtListIndex(
  row: SceneNodesParameterRow,
  scene: Pick<CanvasScene, 'nodes'>,
  rawIndex?: number,
): SceneNodesParameterRow {
  if (!row.listIndex || row.listIndex.connectionCount <= 1) {
    return row
  }

  const connectionIndex = clampSceneNodesParameterListIndex(row.listIndex, rawIndex)
  const childNodeId = row.listIndex.childNodeIds[connectionIndex]
  const entryLabel = row.listIndex.entryLabels?.[connectionIndex]?.trim()
  const displayValue = childNodeId
    ? truncateSceneNodesParameterDisplay(resolveConnectedNodeDisplayLabel(scene, childNodeId))
    : entryLabel
      ? truncateSceneNodesParameterDisplay(entryLabel)
      : row.displayValue

  return {
    ...row,
    childNodeId: childNodeId || undefined,
    navigable: Boolean(childNodeId),
    displayValue,
    listIndex: {
      ...row.listIndex,
      connectionIndex,
    },
  }
}

function resolveBlockParameterEditValue(fullValue: string, typeParameter?: string): string {
  return resolveBlockParameterInputValue(fullValue, typeParameter)
}

export function shouldShowSceneNodesParametersPanel(selectedNodeCount: number): boolean {
  return selectedNodeCount === 1
}

export function truncateSceneNodesParameterDisplay(value: string, maxLength = MAX_PARAMETER_DISPLAY_LENGTH): string {
  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, maxLength - 1)}…`
}

export function formatSceneNodesParameterDisplayValue(raw: string): string {
  const trimmed = raw.trim()

  if (!trimmed) {
    return '—'
  }

  if (isBlockTokenValue(trimmed)) {
    const parsed = parseBlockToken(trimmed)

    if (parsed) {
      if (parsed.slotRules?.outputs?.length) {
        const blockLabel = parsed.typeParameter.replace(/\{\}$/, '').trim()
        return blockLabel || '…'
      }

      const scalar = parsed.defaultValue.trim()

      if (scalar.startsWith('{') && scalar.endsWith('}')) {
        return truncateSceneNodesParameterDisplay(scalar.slice(1, -1))
      }

      if (scalar) {
        return truncateSceneNodesParameterDisplay(scalar)
      }
    }

    return '…'
  }

  return truncateSceneNodesParameterDisplay(trimmed)
}

function isSceneNodesNestedBlockOutputParameter(
  parameter: Pick<BlockParameterDef, 'sourcePath' | 'typeParameter'>,
): boolean {
  if (isBlockStructuralSourcePath(parameter.sourcePath)) {
    return true
  }

  if (isBlockMapStructureType(parameter.typeParameter)) {
    return true
  }

  return parameter.typeParameter.endsWith('{}')
}

function resolveBlockParameterChildNodeId(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameterId: string,
): string | undefined {
  const peer = resolveBlockSlotPeer(
    scene,
    canvasNode.id,
    blockParameterSlotId(parameterId, 'output'),
    'output',
  )

  return peer?.peerNodeId
}

/** Nome do bloco, parâmetro ou add-on ligado na saída do parâmetro. */
export function resolveBlockParameterConnectedDisplayLabel(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameterId: string,
): string | undefined {
  const peer = resolveBlockSlotPeer(
    scene,
    canvasNode.id,
    blockParameterSlotId(parameterId, 'output'),
    'output',
  )

  if (!peer) {
    return undefined
  }

  const { peerCanvasNode, connection } = peer

  if (peerCanvasNode.blockViewActive && peerCanvasNode.blockStructure) {
    const structure = peerCanvasNode.blockStructure
    const blockLabel = structure.blockName.trim() || structure.blockType.trim()
    if (blockLabel) {
      return blockLabel
    }
  }

  if (connection.toBlockParameterId && peerCanvasNode.blockStructure) {
    const targetParam = peerCanvasNode.blockStructure.parameters.find(
      (entry) => entry.idParameter === connection.toBlockParameterId,
    )
    const paramName = targetParam?.nameParameter.trim()
    if (paramName) {
      return paramName
    }
  }

  const title = getNodeDisplayTitle(peerCanvasNode).trim()
  return title || undefined
}

function resolveBlockParameterDisplayValue(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameter: BlockParameterDef,
  fullValue: string,
  outgoingLinks: readonly OutgoingLink[] = [],
): string {
  const linkedLabel = formatOutgoingLinksDisplayLabel(scene, outgoingLinks)
  if (linkedLabel) {
    return truncateSceneNodesParameterDisplay(linkedLabel)
  }

  if (isBlockMapStructureType(parameter.typeParameter)) {
    return truncateSceneNodesParameterDisplay(fullValue.replace(/\t/g, ' · '))
  }

  const formatted = formatSceneNodesParameterDisplayValue(fullValue)
  if (formatted !== '—') {
    return formatted
  }

  const connectedLabel = resolveBlockParameterConnectedDisplayLabel(
    scene,
    canvasNode,
    parameter.idParameter,
  )

  if (connectedLabel) {
    return truncateSceneNodesParameterDisplay(connectedLabel)
  }

  return formatted
}

function normalizeParameterFieldKey(name: string): string {
  return name.trim().toLowerCase()
}

function outgoingLinkSortIndex(link: OutgoingLink): number {
  if ('index' in link && typeof link.index === 'number') {
    return link.index
  }
  if ('instanceIndex' in link && typeof link.instanceIndex === 'number') {
    return link.instanceIndex
  }
  return 0
}

function sortOutgoingLinksForSceneNodesParameter(links: readonly OutgoingLink[]): OutgoingLink[] {
  return [...links].sort((left, right) => outgoingLinkSortIndex(left) - outgoingLinkSortIndex(right))
}

function sortBlockListCollectionOutputConnections(
  connections: readonly CanvasConnection[],
  parameterId: string,
): CanvasConnection[] {
  return [...connections].sort((left, right) => {
    const leftIndex =
      parseListPointerSlotIndex(left.fromBlockSlotId ?? '', parameterId) ??
      parseListEmbedSlotIndex(left.fromBlockSlotId ?? '', parameterId)
    const rightIndex =
      parseListPointerSlotIndex(right.fromBlockSlotId ?? '', parameterId) ??
      parseListEmbedSlotIndex(right.fromBlockSlotId ?? '', parameterId)

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

type MapHashIndexConfig = {
  parseEntries: (raw: string) => MapHashStructureEntry[]
  slotIdForKey: (parameterId: string, key: string) => string
  hasStructure: (entry: MapHashStructureEntry) => boolean
}

const MAP_HASH_INDEX_CONFIG: Partial<Record<string, MapHashIndexConfig>> = {
  mapHashEmbed: {
    parseEntries: parseMapHashEmbedString,
    slotIdForKey: mapHashEmbedSlotId,
    hasStructure: hasMapHashEmbedStructure,
  },
  mapHashPointer: {
    parseEntries: parseMapHashPointerString,
    slotIdForKey: mapHashPointerSlotId,
    hasStructure: hasMapHashPointerStructure,
  },
  mapU64Pointer: {
    parseEntries: parseMapU64PointerString,
    slotIdForKey: mapU64PointerSlotId,
    hasStructure: hasMapU64PointerStructure,
  },
}

function resolveMapHashParameterIndex(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameterId: string,
  parameterType: string,
  fullValue: string,
  outgoingLinks: readonly OutgoingLink[] = [],
): SceneNodesParameterListIndex | undefined {
  const config = MAP_HASH_INDEX_CONFIG[parameterType]
  if (!config) {
    return undefined
  }

  const entries = config.parseEntries(fullValue)
  if (entries.length <= 1) {
    return undefined
  }

  const linkByEntryKey = new Map<string, string>()
  for (const link of outgoingLinks) {
    if (
      link.kind === 'mapHashEmbed' ||
      link.kind === 'mapHashPointer' ||
      link.kind === 'mapU64Pointer'
    ) {
      linkByEntryKey.set(link.entryKey, link.childCanvasId)
    }
  }

  const viewKey = blockElementViewKeyForParameter(parameterId)
  const connectionIndex = clampBlockSelectedIndex(
    entries.length,
    getBlockElementViewState(canvasNode, viewKey).selectedIndex,
  )

  const childNodeIds = entries.map((entry) => {
    if (!config.hasStructure(entry)) {
      return ''
    }
    const linkedChild = linkByEntryKey.get(entry.key)
    if (linkedChild) {
      return linkedChild
    }
    const slotId = config.slotIdForKey(parameterId, entry.key)
    return findConnectionForBlockSlot(scene, canvasNode.id, slotId)?.toNodeId ?? ''
  })

  const entryLabels = entries.map((entry) => entry.typeName.trim() || entry.key)

  return {
    connectionCount: entries.length,
    connectionIndex,
    childNodeIds,
    entryLabels,
    elementViewKey: blockElementViewKeyForParameter(parameterId),
  }
}

function resolveBlockMapHashParameterIndex(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameter: BlockParameterDef,
  fullValue: string,
  outgoingLinks: readonly OutgoingLink[],
): SceneNodesParameterListIndex | undefined {
  if (!isBlockMapStructureType(parameter.typeParameter)) {
    return undefined
  }

  return resolveMapHashParameterIndex(
    scene,
    canvasNode,
    parameter.idParameter,
    parameter.typeParameter,
    fullValue,
    outgoingLinks,
  )
}

function resolveBlockListParameterIndex(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  parameter: BlockParameterDef,
): SceneNodesParameterListIndex | undefined {
  if (!isBlockListCollectionParameter(parameter)) {
    return undefined
  }

  const outputSlot = blockParameterSlotId(parameter.idParameter, 'output')
  let connections = findConnectionsForBlockOutputSlot(scene, canvasNode.id, outputSlot)
  if (connections.length <= 1) {
    return undefined
  }

  connections = sortBlockListCollectionOutputConnections(connections, parameter.idParameter)
  const connectionCount = connections.length
  const connectionIndex = resolveBlockOutputSlotConnectionIndexFromNode(
    canvasNode,
    outputSlot,
    connectionCount,
  )

  return {
    connectionCount,
    connectionIndex,
    childNodeIds: connections.map((connection) => connection.toNodeId),
    outputSlotId: outputSlot,
    elementViewKey: blockElementViewKeyForSlot(outputSlot),
  }
}

function resolveOutgoingLinksListIndex(
  outgoingLinks: readonly OutgoingLink[],
): SceneNodesParameterListIndex | undefined {
  if (outgoingLinks.length <= 1) {
    return undefined
  }

  const hasIndexedListKind = outgoingLinks.some(
    (link) =>
      link.kind === 'listPointer' ||
      link.kind === 'listEmbed' ||
      link.kind === 'list2Pointer' ||
      link.kind === 'list2Embed',
  )
  if (!hasIndexedListKind) {
    return undefined
  }

  const sortedLinks = sortOutgoingLinksForSceneNodesParameter(outgoingLinks)
  const childNodeIds = sortedLinks.map((link) => link.childCanvasId)
  const connectionCount = childNodeIds.length

  return {
    connectionCount,
    connectionIndex: connectionCount - 1,
    childNodeIds,
  }
}

function applyListIndexToParameterRow(
  row: SceneNodesParameterRow,
  scene: CanvasScene,
  listIndex?: SceneNodesParameterListIndex,
): SceneNodesParameterRow {
  if (!listIndex || listIndex.connectionCount <= 1) {
    return row
  }

  return resolveSceneNodesParameterRowAtListIndex(
    {
      ...row,
      listIndex,
      navigable: true,
    },
    scene,
    listIndex.connectionIndex,
  )
}

function mergeStructuralOutgoingLinkRows(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  rows: SceneNodesParameterRow[],
  kind: SceneNodesParameterKind,
): SceneNodesParameterRow[] {
  const outgoingByField = buildOutgoingLinksIndex(scene, canvasNode)
  const coveredKeys = new Set(rows.map((row) => normalizeParameterFieldKey(row.name)))
  const additional: SceneNodesParameterRow[] = []

  for (const links of outgoingByField.values()) {
    if (links.length === 0) {
      continue
    }

    const fieldName = outgoingLinkFieldName(links[0]!)
    const fieldKey = normalizeParameterFieldKey(fieldName)
    if (coveredKeys.has(fieldKey)) {
      continue
    }

    coveredKeys.add(fieldKey)
    const primaryLink = links[0]!
    const linkedLabel = formatOutgoingLinksDisplayLabel(scene, links)

    const listIndex = resolveOutgoingLinksListIndex(links)
    const row: SceneNodesParameterRow = {
      id: `outgoing:${fieldKey}`,
      name: fieldName,
      displayValue: linkedLabel ?? '—',
      fullValue: '',
      editValue: '',
      valueType: 'string',
      kind,
      editable: false,
      childNodeId: primaryLink.childCanvasId,
      navigable: Boolean(primaryLink.childCanvasId),
      listIndex,
    }

    additional.push(applyListIndexToParameterRow(row, scene, listIndex))
  }

  if (additional.length === 0) {
    return rows
  }

  return [...rows, ...additional]
}

function buildBlockParameterRows(scene: CanvasScene, canvasNode: CanvasNode): SceneNodesParameterRow[] {
  const structure = canvasNode.blockStructure

  if (!structure) {
    return []
  }

  const nodeLocked = isNodeLocked(canvasNode)
  const outgoingByField = buildOutgoingLinksIndex(scene, canvasNode)

  return structure.parameters.map((parameter) => {
    const outgoingLinks = findOutgoingLinksForField(outgoingByField, parameter.nameParameter)
    const primaryLink = outgoingLinks[0]
    const fullValue = readBlockParameterDisplayValue(scene, canvasNode, structure, parameter.idParameter)
    const childNodeId =
      primaryLink?.childCanvasId ??
      resolveBlockParameterChildNodeId(scene, canvasNode, parameter.idParameter)
    const hasOutputSlot = Boolean(parameter.slotRules?.outputs?.length)
    const structural = isSceneNodesNestedBlockOutputParameter(parameter)
    const navigable = Boolean(childNodeId) && (hasOutputSlot || structural || outgoingLinks.length > 0)
    const editable = !nodeLocked && !structural

    const listIndex =
      resolveBlockListParameterIndex(scene, canvasNode, parameter) ??
      resolveBlockMapHashParameterIndex(scene, canvasNode, parameter, fullValue, outgoingLinks)
    const row: SceneNodesParameterRow = {
      id: parameter.idParameter,
      name: parameter.nameParameter,
      displayValue: resolveBlockParameterDisplayValue(
        scene,
        canvasNode,
        parameter,
        fullValue,
        outgoingLinks,
      ),
      fullValue,
      editValue: resolveBlockParameterEditValue(fullValue, parameter.typeParameter),
      valueType: blockParameterTypeToNodeDataType(parameter.typeParameter),
      kind: 'block',
      editable,
      childNodeId,
      navigable,
      listIndex,
    }

    return applyListIndexToParameterRow(row, scene, listIndex)
  })
}

function buildSchemaParameterRows(scene: CanvasScene, canvasNode: CanvasNode): SceneNodesParameterRow[] {
  const nodeLocked = isNodeLocked(canvasNode)
  const outgoingByField = buildOutgoingLinksIndex(scene, canvasNode)

  return canvasNode.node.schema.parameters.map((parameter) => {
    const outgoingLinks = findOutgoingLinksForField(outgoingByField, parameter.name)
    const primaryLink = outgoingLinks[0]
    const fullValue =
      canvasNode.node.values.find((entry) => entry.parameterId === parameter.id)?.value ??
      parameter.defaultValue
    const structural = isSchemaStructuralParameter(parameter, canvasNode.node.schema)
    const linkedLabel = formatOutgoingLinksDisplayLabel(scene, outgoingLinks)
    const displayValue = linkedLabel ?? formatSceneNodesParameterDisplayValue(fullValue)

    const listIndex =
      resolveMapHashParameterIndex(
        scene,
        canvasNode,
        parameter.id,
        parameter.type,
        fullValue,
        outgoingLinks,
      ) ?? resolveOutgoingLinksListIndex(outgoingLinks)
    const row: SceneNodesParameterRow = {
      id: parameter.id,
      name: parameter.name,
      displayValue,
      fullValue,
      editValue: fullValue,
      valueType: parameter.type,
      kind: 'schema',
      editable: !nodeLocked && !structural,
      childNodeId: primaryLink?.childCanvasId,
      navigable: Boolean(primaryLink?.childCanvasId && structural),
      listIndex,
    }

    return applyListIndexToParameterRow(row, scene, listIndex)
  })
}

function buildAddonParameterRows(scene: CanvasScene, canvasNode: CanvasNode): SceneNodesParameterRow[] {
  const addonInstance = canvasNode.addonInstance

  if (!addonInstance) {
    return []
  }

  const manifest = getAddonManifest(addonInstance.addonId)
  const outputValues = addonInstance.outputValues ?? {}
  const nodeLocked = isNodeLocked(canvasNode)
  const wiredInputSlots = manifest
    ? resolveWiredAddonInputSlotNames(scene, canvasNode, manifest)
    : new Set<string>()

  const buildRow = (
    name: string,
    raw: unknown,
    slotDirection: 'input' | 'output',
    slotType: string,
  ): SceneNodesParameterRow => {
    const fullValue =
      raw === undefined || raw === null
        ? ''
        : typeof raw === 'string'
          ? raw
          : JSON.stringify(raw)
    const editable =
      !nodeLocked && (slotDirection === 'output' || !wiredInputSlots.has(name))

    return {
      id: name,
      name,
      displayValue: formatSceneNodesParameterDisplayValue(fullValue),
      fullValue,
      editValue: fullValue,
      valueType: blockParameterTypeToNodeDataType(slotType),
      kind: 'addon',
      editable,
      navigable: false,
    }
  }

  if (manifest?.data?.length) {
    return manifest.data.map((field) => {
      const cached = outputValues[field.name]
      const raw =
        cached !== undefined && cached !== null
          ? cached
          : field.direction === 'input'
            ? readAddonFieldValueFromDom(canvasNode.id, field.name)
            : undefined

      return buildRow(field.name, raw, field.direction, field.type)
    })
  }

  return Object.entries(outputValues).map(([name, raw]) => buildRow(name, raw, 'output', 'string'))
}

export function buildSceneNodesParameterRows(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): SceneNodesParameterRow[] {
  let rows: SceneNodesParameterRow[]

  if (canvasNode.addonViewActive && canvasNode.addonInstance) {
    rows = buildAddonParameterRows(scene, canvasNode)
  } else if (canvasNode.blockViewActive && canvasNode.blockStructure) {
    rows = mergeStructuralOutgoingLinkRows(
      scene,
      canvasNode,
      buildBlockParameterRows(scene, canvasNode),
      'block',
    )
  } else {
    rows = mergeStructuralOutgoingLinkRows(
      scene,
      canvasNode,
      buildSchemaParameterRows(scene, canvasNode),
      'schema',
    )
  }

  return enrichSceneNodesParameterRowsWithInputAddons(canvasNode, rows)
}
