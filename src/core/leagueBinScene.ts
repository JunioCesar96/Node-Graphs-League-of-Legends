import type { CanvasConnection, CanvasScene } from '@/core/canvasScene'
import type { NodeParameterValue, NodeSchemaDefinition } from '@/core/nodeSchema'

export type LeagueBinGraphDocumentV1 = {
  connections: CanvasConnection[]
  format: 'node-graphs-lol'
  meta?: Record<string, string>
  nodes: StoredCanvasNodePayload[]
  version: 1
  width: number
  height: number
}

/** Instância completa compatível com round-trip grafo atual (schemas isolados por nó). */
export type StoredCanvasNodePayload = {
  id: string
  node: {
    id: string
    schema: NodeSchemaDefinition
    values: NodeParameterValue[]
  }
  position: { x: number; y: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

  if (!Array.isArray(value.parameters) || !Array.isArray(value.entities)) {
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

export function serializeScene(scene: CanvasScene): LeagueBinGraphDocumentV1 {
  return {
    format: 'node-graphs-lol',
    version: 1,
    meta: {
      exportedAt: new Date().toISOString(),
    },
    width: scene.width,
    height: scene.height,
    connections: structuredClone(scene.connections),
    nodes: scene.nodes.map((n) => ({
      id: n.id,
      position: { ...n.position },
      node: {
        id: n.node.id,
        schema: structuredClone(n.node.schema),
        values: structuredClone(n.node.values),
      },
    })),
  }
}

export function parseSceneDocument(data: unknown): CanvasScene | null {
  if (!isRecord(data)) {
    return null
  }

  if (data.format !== 'node-graphs-lol') {
    return null
  }

  if (data.version !== 1) {
    return null
  }

  if (
    typeof data.width !== 'number' ||
    typeof data.height !== 'number' ||
    !Array.isArray(data.nodes) ||
    !Array.isArray(data.connections)
  ) {
    return null
  }

  const nodes: CanvasScene['nodes'] = []

  for (const item of data.nodes) {
    if (!isRecord(item) || typeof item.id !== 'string' || !isRecord(item.position)) {
      return null
    }

    if (
      typeof item.position.x !== 'number' ||
      typeof item.position.y !== 'number' ||
      !isRecord(item.node)
    ) {
      return null
    }

    const nodeBody = item.node

    if (typeof nodeBody.id !== 'string' || !Array.isArray(nodeBody.values)) {
      return null
    }

    if (!isNodeSchemaDefinition(nodeBody.schema)) {
      return null
    }

    if (!nodeBody.values.every(isNodeParameterValue)) {
      return null
    }

    nodes.push({
      id: item.id,
      position: { x: item.position.x, y: item.position.y },
      node: {
        id: nodeBody.id,
        schema: structuredClone(nodeBody.schema),
        values: structuredClone(nodeBody.values as NodeParameterValue[]),
      },
    })
  }

  const connections: CanvasConnection[] = []

  for (const c of data.connections) {
    if (!isRecord(c) || typeof c.id !== 'string') {
      return null
    }

    const routing = c.routing === 'flex' || c.routing === 'rigid' ? c.routing : undefined

    if (
      typeof c.fromNodeId === 'string' &&
      typeof c.fromEntityId === 'string' &&
      typeof c.toNodeId === 'string'
    ) {
      connections.push({
        id: c.id,
        fromNodeId: c.fromNodeId,
        fromEntityId: c.fromEntityId,
        toNodeId: c.toNodeId,
        ...(routing ? { routing } : {}),
      })
    }
  }

  return {
    width: data.width,
    height: data.height,
    connections,
    nodes,
  }
}
