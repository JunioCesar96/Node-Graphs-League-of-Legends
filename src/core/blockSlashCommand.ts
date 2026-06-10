import type { CanvasConnection, CanvasPosition, CanvasScene } from '@/core/canvasScene'
import { hydrateScene } from '@/core/canvasScene'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import { collectBlockSlotLinkedNodeIds } from '@/core/blockRevertToNodeViaNeeko'
import {
  createBlockSlashCommandDocument,
  normalizeSlashCommandName,
  parseSlashCommandDocument,
  type SlashCommandDocument,
} from '@/core/slashCommandTypes'
import {
  mergeWorkspaceToScene,
  splitSceneToWorkspace,
  type WorkspaceBundle,
} from '@/core/workspacePersistence'

function isBlockPresentationConnection(connection: {
  fromBlockSlotId?: string
  toBlockSlotId?: string
  fromBlockParameterId?: string
  toBlockParameterId?: string
}): boolean {
  return Boolean(
    connection.fromBlockSlotId ||
      connection.toBlockSlotId ||
      connection.fromBlockParameterId ||
      connection.toBlockParameterId,
  )
}

/** Nós do subgrafo: raiz + blocos ligados por slots + nós ritual alcançáveis. */
export function collectBlockSlashCommandNodeIds(scene: CanvasScene, rootNodeId: string): Set<string> {
  const nodeIds = new Set<string>([rootNodeId])

  for (const linkedId of collectBlockSlotLinkedNodeIds(scene, rootNodeId)) {
    nodeIds.add(linkedId)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const connection of scene.connections) {
      if (isBlockPresentationConnection(connection)) {
        continue
      }

      if (nodeIds.has(connection.fromNodeId) && !nodeIds.has(connection.toNodeId)) {
        nodeIds.add(connection.toNodeId)
        changed = true
      }
      if (nodeIds.has(connection.toNodeId) && !nodeIds.has(connection.fromNodeId)) {
        nodeIds.add(connection.fromNodeId)
        changed = true
      }
    }
  }

  return nodeIds
}

function filterSceneToNodeIds(scene: CanvasScene, nodeIds: ReadonlySet<string>): CanvasScene {
  const nodes = scene.nodes.filter((node) => nodeIds.has(node.id))
  const connections = scene.connections.filter(
    (connection) => nodeIds.has(connection.fromNodeId) && nodeIds.has(connection.toNodeId),
  )

  const compactRoutingBackups = scene.compactRoutingBackups
    ? Object.fromEntries(
        Object.entries(scene.compactRoutingBackups).filter(([connectionId]) =>
          connections.some((connection) => connection.id === connectionId),
        ),
      )
    : undefined

  return {
    ...scene,
    nodes,
    connections,
    ...(compactRoutingBackups && Object.keys(compactRoutingBackups).length > 0
      ? { compactRoutingBackups }
      : {}),
  }
}

function normalizeFragmentPositions(scene: CanvasScene, rootNodeId: string): CanvasScene {
  const root = scene.nodes.find((node) => node.id === rootNodeId)
  if (!root) {
    return scene
  }

  const offsetX = root.position.x
  const offsetY = root.position.y

  return {
    ...scene,
    nodes: scene.nodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x - offsetX,
        y: node.position.y - offsetY,
      },
    })),
  }
}

export type ExtractBlockSlashCommandResult =
  | { ok: true; document: SlashCommandDocument }
  | { ok: false; error: string }

export function extractBlockSlashCommandFragment(
  scene: CanvasScene,
  rootNodeId: string,
  commandName: string,
  locale?: string,
): ExtractBlockSlashCommandResult {
  const hydrated = hydrateScene(scene)
  const rootNode = hydrated.nodes.find((node) => node.id === rootNodeId)

  if (!rootNode?.blockStructure || rootNode.blockViewActive === false) {
    return { ok: false, error: 'Nó de bloco não encontrado ou vista de bloco inactiva.' }
  }

  const command = normalizeSlashCommandName(commandName)
  if (!command) {
    return { ok: false, error: 'Nome do comando inválido.' }
  }

  const nodeIds = collectBlockSlashCommandNodeIds(hydrated, rootNodeId)
  const filtered = filterSceneToNodeIds(hydrated, nodeIds)
  const normalized = normalizeFragmentPositions(filtered, rootNodeId)
  const payload = splitSceneToWorkspace(normalized)

  const document = createBlockSlashCommandDocument({
    name: command,
    rootBlockName: rootNode.blockStructure.blockName,
    rootNodeId,
    payload,
    ...(locale?.trim() ? { locale } : {}),
  })

  return { ok: true, document }
}

function remapConnectionId(connection: CanvasConnection, idMap: Map<string, string>): string {
  let nextId = connection.id
  for (const [oldId, newId] of idMap) {
    nextId = nextId.split(oldId).join(newId)
  }
  return nextId
}

function createUniqueConnectionId(
  connection: CanvasConnection,
  idMap: Map<string, string>,
  existingIds: Set<string>,
): string {
  let candidate = remapConnectionId(connection, idMap)
  if (!existingIds.has(candidate)) {
    return candidate
  }

  let suffix = 2
  while (existingIds.has(`${candidate}#${suffix}`)) {
    suffix += 1
  }
  return `${candidate}#${suffix}`
}

export function remapWorkspaceBundleIds(
  bundle: WorkspaceBundle,
  existingNodes: CanvasScene['nodes'],
  originalRootId: string,
): { bundle: WorkspaceBundle; rootNodeId: string; idMap: Map<string, string> } | null {
  if (!bundle.logic.nodes[originalRootId]) {
    return null
  }

  const idMap = new Map<string, string>()
  const combinedNodes = [...existingNodes]

  for (const oldId of Object.keys(bundle.logic.nodes)) {
    const logicNode = bundle.logic.nodes[oldId]
    const newId = createUniqueNodeId(logicNode.schema.id, combinedNodes)
    idMap.set(oldId, newId)
    combinedNodes.push({
      id: newId,
      position: { x: 0, y: 0 },
      node: {
        id: newId,
        schema: logicNode.schema,
        values: [],
      },
    })
  }

  const remapId = (id: string) => idMap.get(id) ?? id

  const logicNodes: WorkspaceBundle['logic']['nodes'] = {}
  for (const [oldId, logicNode] of Object.entries(bundle.logic.nodes)) {
    const newId = remapId(oldId)
    logicNodes[newId] = {
      ...structuredClone(logicNode),
      id: newId,
    }
  }

  const layoutNodes: WorkspaceBundle['layout']['nodes'] = {}
  for (const [oldId, layoutNode] of Object.entries(bundle.layout.nodes)) {
    const newId = remapId(oldId)
    layoutNodes[newId] = structuredClone(layoutNode)
  }

  const existingConnectionIds = new Set<string>()
  const connections: CanvasConnection[] = []
  for (const connection of bundle.graph.connections) {
    const remapped: CanvasConnection = {
      ...structuredClone(connection),
      fromNodeId: remapId(connection.fromNodeId),
      toNodeId: remapId(connection.toNodeId),
      id: connection.id,
    }
    remapped.id = createUniqueConnectionId(remapped, idMap, existingConnectionIds)
    existingConnectionIds.add(remapped.id)
    connections.push(remapped)
  }

  const compactRoutingBackups: WorkspaceBundle['graph']['compactRoutingBackups'] = {}
  if (bundle.graph.compactRoutingBackups) {
    for (const [oldConnectionId, routing] of Object.entries(bundle.graph.compactRoutingBackups)) {
      const original = bundle.graph.connections.find((entry) => entry.id === oldConnectionId)
      if (!original) {
        continue
      }
      const remapped = connections.find(
        (entry) =>
          entry.fromNodeId === remapId(original.fromNodeId) &&
          entry.toNodeId === remapId(original.toNodeId) &&
          entry.fromInternalStructureId === original.fromInternalStructureId &&
          entry.fromBlockSlotId === original.fromBlockSlotId &&
          entry.toBlockSlotId === original.toBlockSlotId,
      )
      if (remapped) {
        compactRoutingBackups[remapped.id] = routing
      }
    }
  }

  const remappedBundle: WorkspaceBundle = {
    logic: {
      version: bundle.logic.version,
      nodes: logicNodes,
    },
    layout: {
      version: bundle.layout.version,
      width: bundle.layout.width,
      height: bundle.layout.height,
      nodes: layoutNodes,
    },
    graph: {
      version: bundle.graph.version,
      connections,
      ...(Object.keys(compactRoutingBackups).length > 0 ? { compactRoutingBackups } : {}),
    },
    blocks: {
      version: bundle.blocks.version,
      blocks: bundle.blocks.blocks.map((entry) => ({
        ...structuredClone(entry),
        nodeId: remapId(entry.nodeId),
      })),
    },
    groups: {
      version: bundle.groups.version,
      groups: bundle.groups.groups.map((entry) => ({
        ...structuredClone(entry),
        nodeId: remapId(entry.nodeId),
      })),
    },
    labels: {
      version: bundle.labels.version,
      labels: bundle.labels.labels.map((entry) => ({
        ...structuredClone(entry),
        nodeId: remapId(entry.nodeId),
        parentBlockNodeId: remapId(entry.parentBlockNodeId),
      })),
    },
  }

  const rootNodeId = remapId(originalRootId)
  return { bundle: remappedBundle, rootNodeId, idMap }
}

export function applySpawnOffsetToBundle(bundle: WorkspaceBundle, spawnPosition: CanvasPosition): WorkspaceBundle {
  const layoutNodes = { ...bundle.layout.nodes }
  for (const [nodeId, entry] of Object.entries(layoutNodes)) {
    layoutNodes[nodeId] = {
      ...entry,
      position: {
        x: entry.position.x + spawnPosition.x,
        y: entry.position.y + spawnPosition.y,
      },
    }
  }

  return {
    ...bundle,
    layout: {
      ...bundle.layout,
      nodes: layoutNodes,
    },
  }
}

export type ApplyBlockSlashCommandResult =
  | { ok: true; scene: CanvasScene; rootNodeId: string }
  | { ok: false; error: string }

export function applyBlockSlashCommandToScene(
  scene: CanvasScene,
  document: SlashCommandDocument,
  spawnPosition: CanvasPosition,
): ApplyBlockSlashCommandResult {
  const parsed = parseSlashCommandDocument(document)
  if (!parsed) {
    return { ok: false, error: 'Documento de slash command inválido.' }
  }

  const originalRootId = parsed.source.rootNodeId
  const remapped = remapWorkspaceBundleIds(parsed.payload, scene.nodes, originalRootId)
  if (!remapped) {
    return { ok: false, error: 'Não foi possível remapear o subgrafo.' }
  }

  const offsetBundle = applySpawnOffsetToBundle(remapped.bundle, spawnPosition)
  const fragmentScene = mergeWorkspaceToScene(offsetBundle)
  if (!fragmentScene) {
    return { ok: false, error: 'Não foi possível materializar o subgrafo.' }
  }

  const merged: CanvasScene = {
    ...scene,
    nodes: [...scene.nodes, ...fragmentScene.nodes],
    connections: [...scene.connections, ...fragmentScene.connections],
    ...(fragmentScene.compactRoutingBackups
      ? {
          compactRoutingBackups: {
            ...scene.compactRoutingBackups,
            ...fragmentScene.compactRoutingBackups,
          },
        }
      : scene.compactRoutingBackups
        ? { compactRoutingBackups: scene.compactRoutingBackups }
        : {}),
  }

  return { ok: true, scene: hydrateScene(merged), rootNodeId: remapped.rootNodeId }
}
