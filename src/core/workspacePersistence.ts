import type { CanvasConnection, CanvasScene, ConnectionRouting } from '@/core/canvasScene'
import { hydrateScene } from '@/core/canvasScene'
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
import { hydrateSceneBlockViews } from '@/core/codeToBlockStructure'
import { hydrateSceneGroupViews } from '@/core/codeToGroupStructure'
import { syncSceneCollapsedBodyWireless } from '@/core/compactConnectionRouting'
import type {
  ElementViewKey,
  ElementViewState,
  NodeInstance,
  NodeParameterValue,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import type { BlockStructurePayload } from '@/core/blockSchema'
import type { NodeCardBodyLayout, NodeCardSectionExpandedMap, NodeCardSectionId } from '@/core/nodeCardSections'
import type { SceneChromeState } from '@/core/canvasScene'
import type { SceneCamera } from '@/core/canvasScene'
import {
  canvasNodeOverlayFromPresentation,
  canvasNodePresentationFromNode,
  parseCardBodyLayout,
  parseCardSectionExpanded,
  parseCardSectionOrder,
  parseSceneCamera,
  parseSceneChrome,
  presentationEntryFromRawLayout,
  sceneChromeFromScene,
} from '@/core/scenePresentation'

export const WORKSPACE_FORMAT_VERSION = 1 as const

/** Payload lógico por nó — fonte da verdade para codegen. */
export type WorkspaceLogicNodePayload = {
  id: string
  schema: NodeSchemaDefinition
  values: NodeParameterValue[]
  required_parameter?: string[]
  parameter_value_links?: Array<readonly [string, string]>
  hashString?: string
  hashStringParameterId?: string
  elementView?: Partial<Record<ElementViewKey, ElementViewState>>
  blockStructure?: BlockStructurePayload
}

export type WorkspaceLogicFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  nodes: Record<string, WorkspaceLogicNodePayload>
}

export type WorkspaceLayoutNodeEntry = {
  position: { x: number; y: number }
  bodyCollapsed?: boolean
  cardSectionExpanded?: NodeCardSectionExpandedMap
  cardSectionOrder?: NodeCardSectionId[]
  cardBodyLayout?: NodeCardBodyLayout
  sceneHidden?: boolean
  branchForceVisible?: boolean
  displayLabel?: string
  bodyColor?: string
  bodyColorEnabled?: boolean
  locked?: boolean
  blockViewActive?: boolean
  groupViewActive?: boolean
}

export type WorkspaceLayoutFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  width: number
  height: number
  nodes: Record<string, WorkspaceLayoutNodeEntry>
  camera?: SceneCamera
  sceneChrome?: SceneChromeState
}

export type WorkspaceGraphFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  connections: CanvasConnection[]
  compactRoutingBackups?: Record<string, ConnectionRouting | undefined>
}

/** Blocos lean por nó — separado de logic.json (fase 2). */
export type WorkspaceBlocksFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  blocks: StoredSceneBlockEntry[]
}

export type WorkspaceGroupsFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  groups: StoredSceneGroupEntry[]
}

export type WorkspaceBundle = {
  logic: WorkspaceLogicFile
  layout: WorkspaceLayoutFile
  graph: WorkspaceGraphFile
  blocks: WorkspaceBlocksFile
  groups: WorkspaceGroupsFile
}

export function emptyWorkspaceBlocksFile(): WorkspaceBlocksFile {
  return {
    version: WORKSPACE_FORMAT_VERSION,
    blocks: [],
  }
}

export function emptyWorkspaceGroupsFile(): WorkspaceGroupsFile {
  return {
    version: WORKSPACE_FORMAT_VERSION,
    groups: [],
  }
}

export function normalizeWorkspaceBundle(raw: unknown): WorkspaceBundle | null {
  if (!isRecord(raw)) {
    return null
  }

  const { logic, layout, graph, blocks, groups } = raw
  if (!isRecord(logic) || !isRecord(layout) || !isRecord(graph)) {
    return null
  }

  const normalized: WorkspaceBundle = {
    logic: logic as WorkspaceLogicFile,
    layout: layout as WorkspaceLayoutFile,
    graph: graph as WorkspaceGraphFile,
    blocks:
      blocks !== undefined && isRecord(blocks)
        ? (blocks as WorkspaceBlocksFile)
        : emptyWorkspaceBlocksFile(),
    groups:
      groups !== undefined && isRecord(groups)
        ? (groups as WorkspaceGroupsFile)
        : emptyWorkspaceGroupsFile(),
  }

  return isWorkspaceBundleValid(normalized) ? normalized : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStructuresArray(schema: Record<string, unknown>): boolean {
  return Array.isArray(schema.internalStructures) || Array.isArray(schema.entities)
}

function isBlockStructurePayload(value: unknown): value is BlockStructurePayload {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.blockType !== 'string' || typeof value.blockName !== 'string') {
    return false
  }
  if (!Array.isArray(value.parameters) || !Array.isArray(value.identification_codes)) {
    return false
  }
  return true
}

function isNodeParameterValue(value: unknown): value is NodeParameterValue {
  return isRecord(value) && typeof value.parameterId === 'string' && typeof value.value === 'string'
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

function layoutEntryFromPresentation(
  presentation: ReturnType<typeof canvasNodePresentationFromNode>,
): WorkspaceLayoutNodeEntry {
  return {
    position: presentation.position,
    ...(presentation.bodyCollapsed ? { bodyCollapsed: true } : {}),
    ...(presentation.cardSectionExpanded
      ? { cardSectionExpanded: presentation.cardSectionExpanded }
      : {}),
    ...(presentation.cardSectionOrder ? { cardSectionOrder: presentation.cardSectionOrder } : {}),
    cardBodyLayout: presentation.cardBodyLayout,
    ...(presentation.sceneHidden ? { sceneHidden: true } : {}),
    ...(presentation.branchForceVisible ? { branchForceVisible: true } : {}),
    ...(presentation.displayLabel !== undefined ? { displayLabel: presentation.displayLabel } : {}),
    ...(presentation.bodyColor !== undefined ? { bodyColor: presentation.bodyColor } : {}),
    ...(presentation.bodyColorEnabled !== undefined
      ? { bodyColorEnabled: presentation.bodyColorEnabled }
      : {}),
    ...(presentation.locked ? { locked: true } : {}),
    ...(presentation.blockViewActive ? { blockViewActive: true } : {}),
    ...(presentation.groupViewActive ? { groupViewActive: true } : {}),
  }
}

function logicNodeFromCanvasNode(canvasNode: CanvasScene['nodes'][number]): WorkspaceLogicNodePayload {
  return logicNodeFromInstance(canvasNode.node)
}

function isValidLayoutNodeEntry(raw: unknown): raw is WorkspaceLayoutNodeEntry {
  return presentationEntryFromRawLayout(raw) !== null
}

function logicNodeFromInstance(node: NodeInstance): WorkspaceLogicNodePayload {
  return {
    id: node.id,
    schema: structuredClone(node.schema),
    values: structuredClone(node.values),
    ...(Array.isArray(node.required_parameter) && node.required_parameter.length > 0
      ? { required_parameter: structuredClone(node.required_parameter) }
      : {}),
    ...(Array.isArray(node.parameter_value_links) && node.parameter_value_links.length > 0
      ? { parameter_value_links: structuredClone(node.parameter_value_links) }
      : {}),
    ...(typeof node.hashString === 'string' ? { hashString: node.hashString } : {}),
    ...(typeof node.hashStringParameterId === 'string'
      ? { hashStringParameterId: node.hashStringParameterId }
      : {}),
    ...(node.elementView && Object.keys(node.elementView).length > 0
      ? { elementView: structuredClone(node.elementView) }
      : {}),
  }
}

export function splitSceneToWorkspace(scene: CanvasScene): WorkspaceBundle {
  const logicNodes: WorkspaceLogicFile['nodes'] = {}
  const layoutNodes: WorkspaceLayoutFile['nodes'] = {}

  for (const canvasNode of scene.nodes) {
    logicNodes[canvasNode.id] = logicNodeFromCanvasNode(canvasNode)
    layoutNodes[canvasNode.id] = layoutEntryFromPresentation(
      canvasNodePresentationFromNode(canvasNode),
    )
  }

  const sceneChrome = sceneChromeFromScene(scene)
  const blockEntries = extractSceneBlocksFromCanvas(scene)
  const groupEntries = extractSceneGroupsFromCanvas(scene)

  return {
    logic: {
      version: WORKSPACE_FORMAT_VERSION,
      nodes: logicNodes,
    },
    layout: {
      version: WORKSPACE_FORMAT_VERSION,
      width: scene.width,
      height: scene.height,
      nodes: layoutNodes,
      ...(scene.camera ? { camera: structuredClone(scene.camera) } : {}),
      ...(sceneChrome ? { sceneChrome } : {}),
    },
    graph: {
      version: WORKSPACE_FORMAT_VERSION,
      connections: structuredClone(scene.connections),
      ...(scene.compactRoutingBackups && Object.keys(scene.compactRoutingBackups).length > 0
        ? { compactRoutingBackups: structuredClone(scene.compactRoutingBackups) }
        : {}),
    },
    blocks: {
      version: WORKSPACE_FORMAT_VERSION,
      blocks: structuredClone(blockEntries),
    },
    groups: {
      version: WORKSPACE_FORMAT_VERSION,
      groups: structuredClone(groupEntries),
    },
  }
}

function parseLogicNode(id: string, raw: unknown): WorkspaceLogicNodePayload | null {
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
  if (hashStringRaw !== undefined && typeof hashStringRaw !== 'string') {
    return null
  }
  hashString = hashStringRaw

  const hashPidRaw = raw.hashStringParameterId
  let hashStringParameterId: string | undefined
  if (hashPidRaw !== undefined && typeof hashPidRaw !== 'string') {
    return null
  }
  hashStringParameterId = hashPidRaw

  const elementView = parseElementView(raw.elementView)
  if (raw.elementView !== undefined && elementView === undefined) {
    return null
  }

  const blockStructureRaw = raw.blockStructure
  let blockStructure: BlockStructurePayload | undefined
  if (blockStructureRaw !== undefined) {
    if (!isBlockStructurePayload(blockStructureRaw)) {
      return null
    }
    blockStructure = structuredClone(blockStructureRaw)
  }

  return {
    id,
    schema: structuredClone(raw.schema),
    values: structuredClone(raw.values as NodeParameterValue[]),
    ...(required_parameter?.length ? { required_parameter: structuredClone(required_parameter) } : {}),
    ...(parameter_value_links?.length
      ? { parameter_value_links: structuredClone(parameter_value_links) }
      : {}),
    ...(hashString !== undefined ? { hashString } : {}),
    ...(hashStringParameterId !== undefined ? { hashStringParameterId } : {}),
    ...(elementView ? { elementView: structuredClone(elementView) } : {}),
    ...(blockStructure ? { blockStructure } : {}),
  }
}

function parseConnection(raw: unknown): CanvasConnection | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') {
    return null
  }

  const routing =
    raw.routing === 'flex' || raw.routing === 'rigid' || raw.routing === 'wireless'
      ? raw.routing
      : undefined
  const fromInternalStructureIdRaw =
    typeof raw.fromInternalStructureId === 'string'
      ? raw.fromInternalStructureId
      : typeof raw.fromEntityId === 'string'
        ? raw.fromEntityId
        : null

  if (
    typeof raw.fromNodeId !== 'string' ||
    fromInternalStructureIdRaw === null ||
    typeof raw.toNodeId !== 'string'
  ) {
    return null
  }

  return {
    id: raw.id,
    fromNodeId: raw.fromNodeId,
    fromInternalStructureId: fromInternalStructureIdRaw,
    toNodeId: raw.toNodeId,
    ...(routing ? { routing } : {}),
    ...(typeof raw.fromBlockSlotId === 'string' ? { fromBlockSlotId: raw.fromBlockSlotId } : {}),
    ...(typeof raw.fromBlockParameterId === 'string'
      ? { fromBlockParameterId: raw.fromBlockParameterId }
      : {}),
    ...(typeof raw.toBlockSlotId === 'string' ? { toBlockSlotId: raw.toBlockSlotId } : {}),
    ...(typeof raw.toBlockParameterId === 'string'
      ? { toBlockParameterId: raw.toBlockParameterId }
      : {}),
    ...(typeof raw.fromGroupSlotId === 'string' ? { fromGroupSlotId: raw.fromGroupSlotId } : {}),
    ...(typeof raw.fromGroupParameterId === 'string'
      ? { fromGroupParameterId: raw.fromGroupParameterId }
      : {}),
    ...(typeof raw.toGroupSlotId === 'string' ? { toGroupSlotId: raw.toGroupSlotId } : {}),
    ...(typeof raw.toGroupParameterId === 'string'
      ? { toGroupParameterId: raw.toGroupParameterId }
      : {}),
    ...(raw.forced === true ? { forced: true } : {}),
  }
}

export function isWorkspaceBundleValid(bundle: unknown): bundle is WorkspaceBundle {
  if (!isRecord(bundle)) {
    return false
  }

  const { logic, layout, graph, blocks, groups } = bundle
  if (!isRecord(logic) || !isRecord(layout) || !isRecord(graph)) {
    return false
  }

  if (
    logic.version !== WORKSPACE_FORMAT_VERSION ||
    layout.version !== WORKSPACE_FORMAT_VERSION ||
    graph.version !== WORKSPACE_FORMAT_VERSION
  ) {
    return false
  }

  if (!isRecord(logic.nodes) || !isRecord(layout.nodes) || !Array.isArray(graph.connections)) {
    return false
  }

  if (typeof layout.width !== 'number' || typeof layout.height !== 'number') {
    return false
  }

  if (layout.camera !== undefined && parseSceneCamera(layout.camera) === undefined) {
    return false
  }

  if (layout.sceneChrome !== undefined && parseSceneChrome(layout.sceneChrome) === undefined) {
    return false
  }

  if (blocks !== undefined) {
    if (!isRecord(blocks) || blocks.version !== WORKSPACE_FORMAT_VERSION) {
      return false
    }
    if (parseSceneBlocks(blocks.blocks) === null) {
      return false
    }
  }

  if (groups !== undefined) {
    if (!isRecord(groups) || groups.version !== WORKSPACE_FORMAT_VERSION) {
      return false
    }
    if (parseSceneGroups(groups.groups) === null) {
      return false
    }
  }

  const logicIds = Object.keys(logic.nodes)
  const layoutIds = Object.keys(layout.nodes)

  if (logicIds.length === 0 || logicIds.length !== layoutIds.length) {
    return false
  }

  for (const id of logicIds) {
    if (!layout.nodes[id]) {
      return false
    }
    if (parseLogicNode(id, logic.nodes[id]) === null) {
      return false
    }
    if (!isValidLayoutNodeEntry(layout.nodes[id])) {
      return false
    }
  }

  for (const connection of graph.connections) {
    if (parseConnection(connection) === null) {
      return false
    }
  }

  return true
}

/** Disco sem nós úteis (ficheiros vazios ou só estrutura inicial). */
export function isWorkspaceBundleEmpty(bundle: WorkspaceBundle): boolean {
  return Object.keys(bundle.logic.nodes).length === 0
}

export function mergeWorkspaceToScene(bundle: WorkspaceBundle): CanvasScene | null {
  const normalized = normalizeWorkspaceBundle(bundle)
  if (!normalized) {
    return null
  }

  const nodes: CanvasScene['nodes'] = []

  for (const canvasNodeId of Object.keys(normalized.logic.nodes)) {
    const logicRaw = normalized.logic.nodes[canvasNodeId]
    const layoutRaw = normalized.layout.nodes[canvasNodeId]
    if (!layoutRaw) {
      return null
    }

    const presentation = presentationEntryFromRawLayout(layoutRaw)
    if (!presentation) {
      return null
    }

    const logicNode = parseLogicNode(canvasNodeId, logicRaw)
    if (!logicNode) {
      return null
    }

    const nodeInstance: NodeInstance = {
      id: logicNode.id,
      schema: logicNode.schema,
      values: logicNode.values,
      ...(logicNode.required_parameter?.length
        ? { required_parameter: logicNode.required_parameter }
        : {}),
      ...(logicNode.parameter_value_links?.length
        ? { parameter_value_links: logicNode.parameter_value_links }
        : {}),
      ...(logicNode.hashString !== undefined ? { hashString: logicNode.hashString } : {}),
      ...(logicNode.hashStringParameterId !== undefined
        ? { hashStringParameterId: logicNode.hashStringParameterId }
        : {}),
      ...(logicNode.elementView ? { elementView: structuredClone(logicNode.elementView) } : {}),
    }

    nodes.push({
      id: canvasNodeId,
      position: presentation.position,
      ...(presentation.bodyCollapsed ? { bodyCollapsed: true } : {}),
      ...canvasNodeOverlayFromPresentation(presentation, nodeInstance),
      node: nodeInstance,
      ...(logicNode.blockStructure ? { blockStructure: structuredClone(logicNode.blockStructure) } : {}),
      ...(presentation.blockViewActive ? { blockViewActive: true } : {}),
    })
  }

  const connections: CanvasConnection[] = []
  for (const raw of normalized.graph.connections) {
    const connection = parseConnection(raw)
    if (!connection) {
      return null
    }
    connections.push(connection)
  }

  const backupsRaw = normalized.graph.compactRoutingBackups
  let compactRoutingBackups: CanvasScene['compactRoutingBackups']
  if (backupsRaw !== undefined) {
    if (!isRecord(backupsRaw)) {
      return null
    }
    compactRoutingBackups = {}
    for (const [connectionId, routing] of Object.entries(backupsRaw)) {
      if (
        routing !== undefined &&
        routing !== 'flex' &&
        routing !== 'rigid' &&
        routing !== 'wireless'
      ) {
        return null
      }
      compactRoutingBackups[connectionId] = routing
    }
  }

  if (nodes.length === 0) {
    return null
  }

  const layoutCamera = normalized.layout.camera
  const layoutChrome = parseSceneChrome(normalized.layout.sceneChrome)

  const baseScene: CanvasScene = {
    width: normalized.layout.width,
    height: normalized.layout.height,
    nodes,
    connections,
    ...(compactRoutingBackups && Object.keys(compactRoutingBackups).length > 0
      ? { compactRoutingBackups }
      : {}),
    ...(layoutCamera
      ? {
          camera: {
            pan: { x: layoutCamera.pan.x, y: layoutCamera.pan.y },
            scale: layoutCamera.scale,
          },
        }
      : {}),
    ...(layoutChrome ? { sceneChrome: layoutChrome } : {}),
  }

  const blockEntries = normalized.blocks.blocks
  const withBlocks =
    blockEntries.length > 0 ? applySceneBlocksToCanvas(baseScene, blockEntries) : baseScene
  if (!withBlocks) {
    return null
  }

  const groupEntries = normalized.groups.groups
  const withGroups =
    groupEntries.length > 0 ? applySceneGroupsToCanvas(withBlocks, groupEntries) : withBlocks
  if (!withGroups) {
    return null
  }

  return syncSceneCollapsedBodyWireless(
    hydrateSceneGroupViews(hydrateSceneBlockViews(hydrateScene(withGroups))),
  )
}

// Re-export presentation helpers for leagueBinScene and tests
export {
  canvasNodePresentationFromNode,
  canvasNodeOverlayFromPresentation,
  parseSceneChrome,
  sceneChromeFromScene,
} from '@/core/scenePresentation'
