import { hydrateScene, type CanvasPosition, type CanvasScene } from '@/core/canvasScene'
import {
  applySpawnOffsetToBundle,
  remapWorkspaceBundleIds,
} from '@/core/blockSlashCommand'
import {
  mergeWorkspaceToScene,
  splitSceneToWorkspace,
  type WorkspaceBundle,
} from '@/core/workspacePersistence'

const PASTE_OFFSET: CanvasPosition = { x: 48, y: 48 }

type ClipboardState = {
  bundle: WorkspaceBundle
  pasteCount: number
}

let clipboardState: ClipboardState | null = null

export function filterSceneToSelectedNodes(
  scene: CanvasScene,
  nodeIds: ReadonlySet<string>,
): CanvasScene {
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

export function copyCanvasNodesToClipboard(scene: CanvasScene, nodeIds: readonly string[]): boolean {
  const idSet = new Set(nodeIds)
  if (idSet.size === 0) {
    return false
  }

  const hydrated = hydrateScene(scene)
  const filtered = filterSceneToSelectedNodes(hydrated, idSet)
  if (filtered.nodes.length === 0) {
    return false
  }

  clipboardState = {
    bundle: splitSceneToWorkspace(filtered),
    pasteCount: 0,
  }
  return true
}

export function hasCanvasNodeClipboard(): boolean {
  return (
    clipboardState !== null && Object.keys(clipboardState.bundle.logic.nodes).length > 0
  )
}

export function clearCanvasNodeClipboard(): void {
  clipboardState = null
}

export type PasteCanvasNodesResult = {
  scene: CanvasScene
  pastedNodeIds: string[]
}

export function pasteCanvasNodesFromClipboard(scene: CanvasScene): PasteCanvasNodesResult | null {
  if (!clipboardState) {
    return null
  }

  const sourceNodeIds = Object.keys(clipboardState.bundle.logic.nodes)
  if (sourceNodeIds.length === 0) {
    return null
  }

  clipboardState.pasteCount += 1

  const remapped = remapWorkspaceBundleIds(
    clipboardState.bundle,
    scene.nodes,
    sourceNodeIds[0],
  )
  if (!remapped) {
    return null
  }

  const offset = {
    x: PASTE_OFFSET.x * clipboardState.pasteCount,
    y: PASTE_OFFSET.y * clipboardState.pasteCount,
  }
  const offsetBundle = applySpawnOffsetToBundle(remapped.bundle, offset)
  const fragmentScene = mergeWorkspaceToScene(offsetBundle)
  if (!fragmentScene) {
    return null
  }

  const pastedNodeIds = [...remapped.idMap.values()]

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

  return {
    scene: hydrateScene(merged),
    pastedNodeIds,
  }
}
