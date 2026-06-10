import type { CanvasConnection, CanvasScene } from '@/core/canvasScene'

function isSlotDataFlowConnection(connection: CanvasConnection): boolean {
  return Boolean(
    connection.fromBlockSlotId ||
      connection.fromAddonSlotId ||
      connection.fromGroupSlotId ||
      connection.toBlockSlotId ||
      connection.toAddonSlotId ||
      connection.toGroupSlotId,
  )
}

function collectSlotDependencyAdjacency(
  connections: readonly CanvasConnection[],
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()

  const addEdge = (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) {
      return
    }

    const next = adjacency.get(fromNodeId) ?? []
    next.push(toNodeId)
    adjacency.set(fromNodeId, next)
  }

  for (const connection of connections) {
    if (!isSlotDataFlowConnection(connection)) {
      continue
    }

    addEdge(connection.fromNodeId, connection.toNodeId)
  }

  return adjacency
}

function hasDependencyPath(
  adjacency: Map<string, string[]>,
  startNodeId: string,
  targetNodeId: string,
  visited = new Set<string>(),
): boolean {
  if (startNodeId === targetNodeId) {
    return true
  }

  if (visited.has(startNodeId)) {
    return false
  }

  visited.add(startNodeId)

  for (const nextNodeId of adjacency.get(startNodeId) ?? []) {
    if (hasDependencyPath(adjacency, nextNodeId, targetNodeId, visited)) {
      return true
    }
  }

  return false
}

/**
 * Verifica se ligar a saída `fromNodeId` à entrada `toNodeId` fecha um ciclo
 * (ex.: bloco A → add-on B → voltar B → A).
 */
export function wouldCreateSlotConnectionLoop(
  scene: Pick<CanvasScene, 'connections'>,
  fromNodeId: string,
  toNodeId: string,
): boolean {
  if (fromNodeId === toNodeId) {
    return true
  }

  const adjacency = collectSlotDependencyAdjacency(scene.connections)
  return hasDependencyPath(adjacency, toNodeId, fromNodeId)
}
