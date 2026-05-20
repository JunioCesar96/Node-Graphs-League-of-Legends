import type { CanvasConnection, CanvasNode, CanvasScene, ConnectionRouting } from '@/core/canvasScene'

function isBodyCollapsed(node: CanvasNode): boolean {
  return node.bodyCollapsed === true
}
import { isElementRetracted, isElementViewCompact, slotIdsForElement } from '@/core/elementViewState'
import type { ElementViewKey } from '@/core/nodeSchema'

function slotIdSet(slotIds: readonly string[]): Set<string> {
  return new Set(slotIds)
}

function connectionTouchesNode(connection: CanvasConnection, nodeId: string): boolean {
  return connection.fromNodeId === nodeId || connection.toNodeId === nodeId
}

function peerNodeIdForConnection(connection: CanvasConnection, nodeId: string): string {
  return connection.fromNodeId === nodeId ? connection.toNodeId : connection.fromNodeId
}

function restoreConnectionFromBackup(
  connection: CanvasConnection,
  previous: ConnectionRouting | undefined,
): CanvasConnection {
  if (previous === undefined) {
    const { routing: _removed, ...rest } = connection
    return rest as CanvasConnection
  }
  return { ...connection, routing: previous }
}

export function applyCompactWireless(
  scene: CanvasScene,
  nodeId: string,
  slotIds: readonly string[],
): CanvasScene {
  const allowed = slotIdSet(slotIds)
  if (allowed.size === 0) {
    return scene
  }

  const backups = { ...(scene.compactRoutingBackups ?? {}) }

  const connections = scene.connections.map((connection) => {
    if (connection.fromNodeId !== nodeId || !allowed.has(connection.fromInternalStructureId)) {
      return connection
    }
    if (connection.routing === 'wireless') {
      return connection
    }
    if (!(connection.id in backups)) {
      backups[connection.id] = connection.routing
    }
    return { ...connection, routing: 'wireless' as const }
  })

  return {
    ...scene,
    connections,
    compactRoutingBackups: backups,
  }
}

export function restoreCompactWireless(
  scene: CanvasScene,
  nodeId: string,
  slotIds: readonly string[],
): CanvasScene {
  const allowed = slotIdSet(slotIds)
  if (allowed.size === 0) {
    return scene
  }

  const backups = { ...(scene.compactRoutingBackups ?? {}) }

  const connections = scene.connections.map((connection) => {
    if (connection.fromNodeId !== nodeId || !allowed.has(connection.fromInternalStructureId)) {
      return connection
    }
    if (!(connection.id in backups)) {
      return connection
    }
    const previous = backups[connection.id]
    delete backups[connection.id]
    return restoreConnectionFromBackup(connection, previous)
  })

  const nextBackups = Object.keys(backups).length > 0 ? backups : undefined

  return {
    ...scene,
    connections,
    compactRoutingBackups: nextBackups,
  }
}

/** Todas as ligações que tocam o nó (entrada ou saída) passam a sem fio. */
export function applyCollapsedBodyWireless(scene: CanvasScene, nodeId: string): CanvasScene {
  const backups = { ...(scene.compactRoutingBackups ?? {}) }

  const connections = scene.connections.map((connection) => {
    if (!connectionTouchesNode(connection, nodeId)) {
      return connection
    }
    if (connection.routing === 'wireless') {
      return connection
    }
    if (!(connection.id in backups)) {
      backups[connection.id] = connection.routing
    }
    return { ...connection, routing: 'wireless' as const }
  })

  return {
    ...scene,
    connections,
    compactRoutingBackups: backups,
  }
}

/** Restaura routing após expandir corpo; mantém sem fio se o outro extremo ainda está retraído. */
export function restoreCollapsedBodyWireless(scene: CanvasScene, nodeId: string): CanvasScene {
  const collapsedById = new Map(scene.nodes.map((node) => [node.id, isBodyCollapsed(node)]))
  const backups = { ...(scene.compactRoutingBackups ?? {}) }

  const connections = scene.connections.map((connection) => {
    if (!connectionTouchesNode(connection, nodeId)) {
      return connection
    }
    if (!(connection.id in backups)) {
      return connection
    }

    const peerId = peerNodeIdForConnection(connection, nodeId)
    if (collapsedById.get(peerId)) {
      return connection
    }

    const previous = backups[connection.id]
    delete backups[connection.id]
    return restoreConnectionFromBackup(connection, previous)
  })

  const nextBackups = Object.keys(backups).length > 0 ? backups : undefined

  return {
    ...scene,
    connections,
    compactRoutingBackups: nextBackups,
  }
}

/** Reaplica wireless dos blocos ainda em modo compacto após expandir o corpo. */
export function reapplyCompactElementWireless(scene: CanvasScene, canvasNode: CanvasNode): CanvasScene {
  const elementView = canvasNode.node.elementView
  if (!elementView) {
    return scene
  }

  let nextScene = scene
  for (const key of Object.keys(elementView) as ElementViewKey[]) {
    if (!isElementViewCompact(canvasNode.node, key)) {
      continue
    }
    const slotIds = slotIdsForElement(canvasNode.node, key)
    nextScene = applyCompactWireless(nextScene, canvasNode.id, slotIds)
  }

  return nextScene
}

/** Reaplica wireless dos elementos ainda retraídos (ex.: após expandir o corpo do nó). */
export function reapplyRetractedElementWireless(scene: CanvasScene, canvasNode: CanvasNode): CanvasScene {
  const elementView = canvasNode.node.elementView
  if (!elementView) {
    return scene
  }

  let nextScene = scene
  for (const key of Object.keys(elementView) as ElementViewKey[]) {
    if (!isElementRetracted(canvasNode.node, key)) {
      continue
    }
    const slotIds = slotIdsForElement(canvasNode.node, key)
    nextScene = applyCompactWireless(nextScene, canvasNode.id, slotIds)
  }

  return nextScene
}

/** Reaplica wireless de elementos compactos e retraídos para um nó. */
export function reapplyElementViewWireless(scene: CanvasScene, canvasNode: CanvasNode): CanvasScene {
  return reapplyRetractedElementWireless(reapplyCompactElementWireless(scene, canvasNode), canvasNode)
}

/** Garante wireless para corpo retraído, elementos compactos e retraídos após hydrate. */
export function syncSceneElementWireless(scene: CanvasScene): CanvasScene {
  return scene.nodes.reduce((current, node) => {
    let next = current
    if (isBodyCollapsed(node)) {
      next = applyCollapsedBodyWireless(next, node.id)
    }
    return reapplyElementViewWireless(next, node)
  }, scene)
}

/** Garante wireless nas ligações de nós com corpo retraído (ex.: após carregar layout.json). */
export function syncSceneCollapsedBodyWireless(scene: CanvasScene): CanvasScene {
  return syncSceneElementWireless(scene)
}
