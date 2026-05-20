import type { CanvasConnection, CanvasScene, ConnectionRouting } from '@/core/canvasScene'
import { hydrateScene } from '@/core/canvasScene'
import type {
  ElementViewKey,
  ElementViewState,
  NodeInstance,
  NodeParameterValue,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'

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
}

export type WorkspaceLogicFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  nodes: Record<string, WorkspaceLogicNodePayload>
}

export type WorkspaceLayoutFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  width: number
  height: number
  nodes: Record<string, { position: { x: number; y: number } }>
}

export type WorkspaceGraphFile = {
  version: typeof WORKSPACE_FORMAT_VERSION
  connections: CanvasConnection[]
  compactRoutingBackups?: Record<string, ConnectionRouting | undefined>
}

export type WorkspaceBundle = {
  logic: WorkspaceLogicFile
  layout: WorkspaceLayoutFile
  graph: WorkspaceGraphFile
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStructuresArray(schema: Record<string, unknown>): boolean {
  return Array.isArray(schema.internalStructures) || Array.isArray(schema.entities)
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
    logicNodes[canvasNode.id] = logicNodeFromInstance(canvasNode.node)
    layoutNodes[canvasNode.id] = { position: { ...canvasNode.position } }
  }

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
    },
    graph: {
      version: WORKSPACE_FORMAT_VERSION,
      connections: structuredClone(scene.connections),
      ...(scene.compactRoutingBackups && Object.keys(scene.compactRoutingBackups).length > 0
        ? { compactRoutingBackups: structuredClone(scene.compactRoutingBackups) }
        : {}),
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
  }
}

export function isWorkspaceBundleValid(bundle: unknown): bundle is WorkspaceBundle {
  if (!isRecord(bundle)) {
    return false
  }

  const { logic, layout, graph } = bundle
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
    const pos = layout.nodes[id]
    if (
      !isRecord(pos) ||
      !isRecord(pos.position) ||
      typeof pos.position.x !== 'number' ||
      typeof pos.position.y !== 'number'
    ) {
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
  if (!isWorkspaceBundleValid(bundle)) {
    return null
  }

  const nodes: CanvasScene['nodes'] = []

  for (const canvasNodeId of Object.keys(bundle.logic.nodes)) {
    const logicRaw = bundle.logic.nodes[canvasNodeId]
    const layoutEntry = bundle.layout.nodes[canvasNodeId]
    if (!layoutEntry) {
      return null
    }

    const logicNode = parseLogicNode(canvasNodeId, logicRaw)
    if (!logicNode) {
      return null
    }

    nodes.push({
      id: canvasNodeId,
      position: { x: layoutEntry.position.x, y: layoutEntry.position.y },
      node: {
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
      },
    })
  }

  const connections: CanvasConnection[] = []
  for (const raw of bundle.graph.connections) {
    const connection = parseConnection(raw)
    if (!connection) {
      return null
    }
    connections.push(connection)
  }

  const backupsRaw = bundle.graph.compactRoutingBackups
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

  return hydrateScene({
    width: bundle.layout.width,
    height: bundle.layout.height,
    nodes,
    connections,
    ...(compactRoutingBackups && Object.keys(compactRoutingBackups).length > 0
      ? { compactRoutingBackups }
      : {}),
  })
}
