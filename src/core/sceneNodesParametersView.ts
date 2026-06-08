import { getAddonManifest } from '@/blockStructures/addonRegistry'
import {
  blockParameterSlotId,
  blockParameterTypeToNodeDataType,
  isBlockMapStructureType,
  isBlockStructuralSourcePath,
  isBlockTokenValue,
  type BlockParameterDef,
} from '@/core/blockSchema'
import { resolveBlockParameterInputValue } from '@/core/blockParameterInputValue'
import { parseBlockToken } from '@/core/blockTokenParser'
import type { OutgoingLink } from '@/core/canvasToClassGroupRitual'
import { resolveWiredAddonInputSlotNames } from '@/core/addonSlotConnections'
import { getNodeDisplayTitle, isNodeLocked } from '@/core/canvasNodePresentation'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { resolveBlockSlotPeer } from '@/core/blockSlotPeerState'
import type { NodeDataType } from '@/core/nodeSchema'
import {
  buildOutgoingLinksIndex,
  findOutgoingLinksForField,
  formatOutgoingLinksDisplayLabel,
  isSchemaStructuralParameter,
  outgoingLinkFieldName,
  resolveSceneNodesParameterParentNodeId,
} from '@/core/sceneNodesParameterGraphLinks'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'

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

    additional.push({
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
    })
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

    return {
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
    }
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

    return {
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
    }
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
  if (canvasNode.addonViewActive && canvasNode.addonInstance) {
    return buildAddonParameterRows(scene, canvasNode)
  }

  if (canvasNode.blockViewActive && canvasNode.blockStructure) {
    return mergeStructuralOutgoingLinkRows(
      scene,
      canvasNode,
      buildBlockParameterRows(scene, canvasNode),
      'block',
    )
  }

  return mergeStructuralOutgoingLinkRows(
    scene,
    canvasNode,
    buildSchemaParameterRows(scene, canvasNode),
    'schema',
  )
}
