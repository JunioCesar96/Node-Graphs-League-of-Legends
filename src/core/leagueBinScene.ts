import type { CanvasConnection, CanvasScene, ConnectionRouting, SceneCamera } from '@/core/canvasScene'
import type { SceneChromeState } from '@/core/canvasScene'
import {
  canvasNodeOverlayFromPresentation,
  canvasNodePresentationFromNode,
  parseSceneCamera,
  parseSceneChrome,
  presentationEntryFromRawLayout,
  type CanvasNodePresentationEntry,
} from '@/core/scenePresentation'
import {
  applySceneBlocksToCanvas,
  extractSceneBlocksFromCanvas,
  parseSceneBlocks,
  type StoredSceneBlockEntry,
} from '@/core/blockScenePersistence'
import {
  applySceneGroupsToCanvas,
  extractSceneGroupsFromCanvas,
  parseSceneGroups,
  type StoredSceneGroupEntry,
} from '@/core/groupScenePersistence'
import {
  applySceneLabelsToCanvas,
  extractSceneLabelsFromCanvas,
  parseSceneLabels,
  type StoredSceneLabelEntry,
} from '@/core/labelScenePersistence'
import { hydrateSceneBlockViews } from '@/core/codeToBlockStructure'
import { hydrateSceneGroupViews } from '@/core/codeToGroupStructure'
import type {
  ElementViewKey,
  ElementViewState,
  NodeInstance,
  NodeParameterValue,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'

export type LeagueBinGraphDocumentV1 = {
  connections: CanvasConnection[]
  format: 'node-graphs-lol'
  meta?: Record<string, string>
  nodes: StoredCanvasNodePayloadV1[]
  version: 1
  width: number
  height: number
}

export type StoredCanvasNodePayloadV1 = {
  id: string
  node: StoredNodeBodyPayload
  position: { x: number; y: number }
}

export type LeagueBinGraphDocumentV2 = {
  connections: CanvasConnection[]
  format: 'node-graphs-lol'
  meta?: Record<string, string>
  nodes: StoredCanvasNodePayloadV2[]
  version: 2
  width: number
  height: number
  camera?: SceneCamera
  compactRoutingBackups?: Record<string, ConnectionRouting | undefined>
  sceneChrome?: SceneChromeState
  blocks?: StoredSceneBlockEntry[]
  groups?: StoredSceneGroupEntry[]
  labels?: StoredSceneLabelEntry[]
}

export type StoredNodeBodyPayload = {
  id: string
  schema: NodeSchemaDefinition
  values: NodeParameterValue[]
  required_parameter?: string[]
  parameter_value_links?: Array<readonly [string, string]>
  hashString?: string
  hashStringParameterId?: string
  elementView?: Partial<Record<ElementViewKey, ElementViewState>>
}

export type StoredCanvasNodePayloadV2 = {
  id: string
  node: StoredNodeBodyPayload
  presentation: CanvasNodePresentationEntry
}

export type LeagueBinGraphDocument = LeagueBinGraphDocumentV1 | LeagueBinGraphDocumentV2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNodeParameterValue(value: unknown): value is NodeParameterValue {
  return isRecord(value) && typeof value.parameterId === 'string' && typeof value.value === 'string'
}

function hasStructuresArray(schema: Record<string, unknown>): boolean {
  return Array.isArray(schema.internalStructures) || Array.isArray(schema.entities)
}

function isNodeSchemaDefinition(value: unknown): value is NodeSchemaDefinition {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value.id !== 'string' || typeof value.title !== 'string') {
    return false
  }

  if (!Array.isArray(value.parameters) || !hasStructuresArray(value)) {
    return false
  }

  return value.parameters.every(
    (p) =>
      isRecord(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.type === 'string' &&
      typeof p.defaultValue === 'string',
  )
}

function isElementViewState(value: unknown): value is ElementViewState {
  if (!isRecord(value) || (value.mode !== 'list' && value.mode !== 'compact')) {
    return false
  }
  if (value.selectedIndex !== undefined && typeof value.selectedIndex !== 'number') {
    return false
  }
  if (value.retracted !== undefined && typeof value.retracted !== 'boolean') {
    return false
  }
  return true
}

function parseElementView(raw: unknown): Partial<Record<ElementViewKey, ElementViewState>> | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const out: Partial<Record<ElementViewKey, ElementViewState>> = {}
  for (const [key, state] of Object.entries(raw)) {
    if (typeof key !== 'string' || !isElementViewState(state)) {
      return undefined
    }
    out[key] = state
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function storedNodeBodyFromRaw(raw: unknown): StoredNodeBodyPayload | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !Array.isArray(raw.values)) {
    return null
  }
  if (!isNodeSchemaDefinition(raw.schema) || !raw.values.every(isNodeParameterValue)) {
    return null
  }

  const requiredRaw = raw.required_parameter
  let required_parameter: string[] | undefined
  if (requiredRaw !== undefined) {
    if (!Array.isArray(requiredRaw) || !requiredRaw.every((item) => typeof item === 'string')) {
      return null
    }
    required_parameter = requiredRaw as string[]
  }

  const linksRaw = raw.parameter_value_links
  let parameter_value_links: Array<readonly [string, string]> | undefined
  if (linksRaw !== undefined) {
    if (!Array.isArray(linksRaw)) {
      return null
    }
    const pairs: Array<readonly [string, string]> = []
    for (const entry of linksRaw) {
      if (!Array.isArray(entry) || entry.length !== 2) {
        return null
      }
      if (typeof entry[0] !== 'string' || typeof entry[1] !== 'string') {
        return null
      }
      pairs.push([entry[0], entry[1]])
    }
    parameter_value_links = pairs.length > 0 ? pairs : undefined
  }

  const hashStringRaw = raw.hashString
  let hashString: string | undefined
  if (hashStringRaw !== undefined) {
    if (typeof hashStringRaw !== 'string') {
      return null
    }
    hashString = hashStringRaw
  }

  const hashPidRaw = raw.hashStringParameterId
  let hashStringParameterId: string | undefined
  if (hashPidRaw !== undefined) {
    if (typeof hashPidRaw !== 'string') {
      return null
    }
    hashStringParameterId = hashPidRaw
  }

  const elementView = parseElementView(raw.elementView)
  if (raw.elementView !== undefined && elementView === undefined) {
    return null
  }

  return {
    id: raw.id,
    schema: structuredClone(raw.schema),
    values: structuredClone(raw.values as NodeParameterValue[]),
    ...(required_parameter?.length ? { required_parameter: structuredClone(required_parameter) } : {}),
    ...(parameter_value_links?.length
      ? { parameter_value_links: structuredClone(parameter_value_links) }
      : {}),
    ...(hashString !== undefined ? { hashString } : {}),
    ...(hashStringParameterId !== undefined ? { hashStringParameterId } : {}),
    ...(elementView ? { elementView: structuredClone(elementView) } : {}),
  }
}

function nodeInstanceFromStored(body: StoredNodeBodyPayload): NodeInstance {
  return {
    id: body.id,
    schema: body.schema,
    values: body.values,
    ...(body.required_parameter?.length ? { required_parameter: body.required_parameter } : {}),
    ...(body.parameter_value_links?.length
      ? { parameter_value_links: body.parameter_value_links }
      : {}),
    ...(body.hashString !== undefined ? { hashString: body.hashString } : {}),
    ...(body.hashStringParameterId !== undefined
      ? { hashStringParameterId: body.hashStringParameterId }
      : {}),
    ...(body.elementView ? { elementView: structuredClone(body.elementView) } : {}),
  }
}

function parseConnection(c: unknown): CanvasConnection | null {
  if (!isRecord(c) || typeof c.id !== 'string') {
    return null
  }

  const routing =
    c.routing === 'flex' || c.routing === 'rigid' || c.routing === 'wireless' ? c.routing : undefined

  const fromInternalStructureIdRaw =
    typeof c.fromInternalStructureId === 'string'
      ? c.fromInternalStructureId
      : typeof c.fromEntityId === 'string'
        ? c.fromEntityId
        : null

  if (
    typeof c.fromNodeId !== 'string' ||
    fromInternalStructureIdRaw === null ||
    typeof c.toNodeId !== 'string'
  ) {
    return null
  }

  return {
    id: c.id,
    fromNodeId: c.fromNodeId,
    fromInternalStructureId: fromInternalStructureIdRaw,
    toNodeId: c.toNodeId,
    ...(routing ? { routing } : {}),
    ...(typeof c.fromBlockSlotId === 'string' ? { fromBlockSlotId: c.fromBlockSlotId } : {}),
    ...(typeof c.fromBlockParameterId === 'string'
      ? { fromBlockParameterId: c.fromBlockParameterId }
      : {}),
    ...(typeof c.toBlockSlotId === 'string' ? { toBlockSlotId: c.toBlockSlotId } : {}),
    ...(typeof c.toBlockParameterId === 'string'
      ? { toBlockParameterId: c.toBlockParameterId }
      : {}),
    ...(typeof c.fromGroupSlotId === 'string' ? { fromGroupSlotId: c.fromGroupSlotId } : {}),
    ...(typeof c.fromGroupParameterId === 'string'
      ? { fromGroupParameterId: c.fromGroupParameterId }
      : {}),
    ...(typeof c.toGroupSlotId === 'string' ? { toGroupSlotId: c.toGroupSlotId } : {}),
    ...(typeof c.toGroupParameterId === 'string'
      ? { toGroupParameterId: c.toGroupParameterId }
      : {}),
    ...(typeof c.fromAddonSlotId === 'string' ? { fromAddonSlotId: c.fromAddonSlotId } : {}),
    ...(typeof c.toAddonSlotId === 'string' ? { toAddonSlotId: c.toAddonSlotId } : {}),
    ...(typeof c.fromLabelSlotId === 'string' ? { fromLabelSlotId: c.fromLabelSlotId } : {}),
    ...(c.forced === true ? { forced: true } : {}),
  }
}

function parseCompactRoutingBackups(
  raw: unknown,
): CanvasScene['compactRoutingBackups'] | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const out: NonNullable<CanvasScene['compactRoutingBackups']> = {}
  for (const [connectionId, routing] of Object.entries(raw)) {
    if (
      routing !== undefined &&
      routing !== 'flex' &&
      routing !== 'rigid' &&
      routing !== 'wireless'
    ) {
      return undefined
    }
    out[connectionId] = routing
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function serializeScene(scene: CanvasScene): LeagueBinGraphDocumentV2 {
  const blocks = extractSceneBlocksFromCanvas(scene)
  const groups = extractSceneGroupsFromCanvas(scene)
  const labels = extractSceneLabelsFromCanvas(scene)

  return {
    format: 'node-graphs-lol',
    version: 2,
    meta: {
      exportedAt: new Date().toISOString(),
    },
    width: scene.width,
    height: scene.height,
    connections: structuredClone(scene.connections),
    ...(scene.camera ? { camera: structuredClone(scene.camera) } : {}),
    ...(scene.compactRoutingBackups && Object.keys(scene.compactRoutingBackups).length > 0
      ? { compactRoutingBackups: structuredClone(scene.compactRoutingBackups) }
      : {}),
    ...(scene.sceneChrome ? { sceneChrome: structuredClone(scene.sceneChrome) } : {}),
    ...(blocks.length > 0 ? { blocks: structuredClone(blocks) } : {}),
    ...(groups.length > 0 ? { groups: structuredClone(groups) } : {}),
    ...(labels.length > 0 ? { labels: structuredClone(labels) } : {}),
    nodes: scene.nodes.map((n) => ({
      id: n.id,
      presentation: canvasNodePresentationFromNode(n),
      node: {
        id: n.node.id,
        schema: structuredClone(n.node.schema),
        values: structuredClone(n.node.values),
        ...(Array.isArray(n.node.required_parameter) && n.node.required_parameter.length > 0
          ? { required_parameter: structuredClone(n.node.required_parameter) }
          : {}),
        ...(Array.isArray(n.node.parameter_value_links) && n.node.parameter_value_links.length > 0
          ? { parameter_value_links: structuredClone(n.node.parameter_value_links) }
          : {}),
        ...(typeof n.node.hashString === 'string' ? { hashString: n.node.hashString } : {}),
        ...(typeof n.node.hashStringParameterId === 'string'
          ? { hashStringParameterId: n.node.hashStringParameterId }
          : {}),
        ...(n.node.elementView && Object.keys(n.node.elementView).length > 0
          ? { elementView: structuredClone(n.node.elementView) }
          : {}),
      },
    })),
  }
}

function parseV1Document(data: Record<string, unknown>): CanvasScene | null {
  if (data.version !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
    return null
  }
  if (typeof data.width !== 'number' || typeof data.height !== 'number') {
    return null
  }

  const nodes: CanvasScene['nodes'] = []

  for (const item of data.nodes) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isRecord(item.position)) {
      return null
    }
    if (typeof item.position.x !== 'number' || typeof item.position.y !== 'number') {
      return null
    }
    const nodeBody = storedNodeBodyFromRaw(item.node)
    if (!nodeBody) {
      return null
    }
    const nodeInstance = nodeInstanceFromStored(nodeBody)
    const presentation: CanvasNodePresentationEntry = {
      position: { x: item.position.x, y: item.position.y },
      cardBodyLayout: 'freeform',
    }
    nodes.push({
      id: item.id,
      position: presentation.position,
      ...canvasNodeOverlayFromPresentation(presentation, nodeInstance),
      node: nodeInstance,
    })
  }

  const connections: CanvasConnection[] = []
  for (const c of data.connections) {
    const connection = parseConnection(c)
    if (!connection) {
      return null
    }
    connections.push(connection)
  }

  return {
    width: data.width,
    height: data.height,
    connections,
    nodes,
  }
}

function parseV2Document(data: Record<string, unknown>): CanvasScene | null {
  if (data.version !== 2 || !Array.isArray(data.nodes) || !Array.isArray(data.connections)) {
    return null
  }
  if (typeof data.width !== 'number' || typeof data.height !== 'number') {
    return null
  }

  const nodes: CanvasScene['nodes'] = []

  for (const item of data.nodes) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isRecord(item.presentation)) {
      return null
    }
    const presentation = presentationEntryFromRawLayout(item.presentation)
    if (!presentation) {
      return null
    }
    const nodeBody = storedNodeBodyFromRaw(item.node)
    if (!nodeBody) {
      return null
    }
    const nodeInstance = nodeInstanceFromStored(nodeBody)
    nodes.push({
      id: item.id,
      position: presentation.position,
      ...(presentation.bodyCollapsed ? { bodyCollapsed: true } : {}),
      ...canvasNodeOverlayFromPresentation(presentation, nodeInstance),
      node: nodeInstance,
    })
  }

  const connections: CanvasConnection[] = []
  for (const c of data.connections) {
    const connection = parseConnection(c)
    if (!connection) {
      return null
    }
    connections.push(connection)
  }

  const camera = data.camera !== undefined ? parseSceneCamera(data.camera) : undefined
  if (data.camera !== undefined && camera === undefined) {
    return null
  }

  const sceneChrome =
    data.sceneChrome !== undefined ? parseSceneChrome(data.sceneChrome) : undefined
  if (data.sceneChrome !== undefined && sceneChrome === undefined) {
    return null
  }

  const compactRoutingBackups =
    data.compactRoutingBackups !== undefined
      ? parseCompactRoutingBackups(data.compactRoutingBackups)
      : undefined
  if (data.compactRoutingBackups !== undefined && compactRoutingBackups === undefined) {
    return null
  }

  const blocks = parseSceneBlocks(data.blocks)
  if (data.blocks !== undefined && blocks === null) {
    return null
  }

  const groups = parseSceneGroups(data.groups)
  if (data.groups !== undefined && groups === null) {
    return null
  }

  const labels = parseSceneLabels(data.labels)
  if (data.labels !== undefined && labels === null) {
    return null
  }

  const baseScene: CanvasScene = {
    width: data.width,
    height: data.height,
    connections,
    nodes,
    ...(camera ? { camera } : {}),
    ...(sceneChrome ? { sceneChrome } : {}),
    ...(compactRoutingBackups ? { compactRoutingBackups } : {}),
  }

  const withBlocks =
    blocks && blocks.length > 0 ? applySceneBlocksToCanvas(baseScene, blocks) : baseScene
  if (!withBlocks) {
    return null
  }

  const withGroups =
    groups && groups.length > 0 ? applySceneGroupsToCanvas(withBlocks, groups) : withBlocks
  if (!withGroups) {
    return null
  }

  const withLabels =
    labels && labels.length > 0 ? applySceneLabelsToCanvas(withGroups, labels) : withGroups
  if (!withLabels) {
    return null
  }

  return hydrateSceneGroupViews(hydrateSceneBlockViews(withLabels))
}

export function parseSceneDocument(data: unknown): CanvasScene | null {
  if (!isRecord(data) || data.format !== 'node-graphs-lol') {
    return null
  }

  if (data.version === 2) {
    return parseV2Document(data)
  }

  if (data.version === 1) {
    return parseV1Document(data)
  }

  return null
}
