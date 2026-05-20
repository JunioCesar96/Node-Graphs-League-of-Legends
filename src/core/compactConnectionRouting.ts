import type { CanvasConnection, CanvasScene, ConnectionRouting } from '@/core/canvasScene'

function slotIdSet(slotIds: readonly string[]): Set<string> {
  return new Set(slotIds)
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
    if (previous === undefined) {
      const { routing: _removed, ...rest } = connection
      return rest as CanvasConnection
    }
    return { ...connection, routing: previous }
  })

  const nextBackups = Object.keys(backups).length > 0 ? backups : undefined

  return {
    ...scene,
    connections,
    compactRoutingBackups: nextBackups,
  }
}
