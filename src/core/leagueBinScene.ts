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
    required_parameter?: string[]
    parameter_value_links?: Array<readonly [string, string]>
    hashString?: string
    hashStringParameterId?: string
  }
  position: { x: number; y: number }
}

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

    const requiredRaw = nodeBody.required_parameter
    let required_parameter: string[] | undefined
    if (requiredRaw !== undefined) {
      if (!Array.isArray(requiredRaw) || !requiredRaw.every((item) => typeof item === 'string')) {
        return null
      }
      required_parameter = requiredRaw as string[]
    }

    const linksRaw = nodeBody.parameter_value_links
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

    const hashStringRaw = nodeBody.hashString
    let hashString: string | undefined
    if (hashStringRaw !== undefined) {
      if (typeof hashStringRaw !== 'string') {
        return null
      }
      hashString = hashStringRaw
    }

    const hashPidRaw = nodeBody.hashStringParameterId
    let hashStringParameterId: string | undefined
    if (hashPidRaw !== undefined) {
      if (typeof hashPidRaw !== 'string') {
        return null
      }
      hashStringParameterId = hashPidRaw
    }

    nodes.push({
      id: item.id,
      position: { x: item.position.x, y: item.position.y },
      node: {
        id: nodeBody.id,
        schema: structuredClone(nodeBody.schema),
        values: structuredClone(nodeBody.values as NodeParameterValue[]),
        ...(required_parameter?.length ? { required_parameter: structuredClone(required_parameter) } : {}),
        ...(parameter_value_links?.length
          ? { parameter_value_links: structuredClone(parameter_value_links) }
          : {}),
        ...(hashString !== undefined ? { hashString } : {}),
        ...(hashStringParameterId !== undefined ? { hashStringParameterId } : {}),
      },
    })
  }

  const connections: CanvasConnection[] = []

  for (const c of data.connections) {
    if (!isRecord(c) || typeof c.id !== 'string') {
      return null
    }

    const routing =
      c.routing === 'flex' || c.routing === 'rigid' || c.routing === 'wireless'
        ? c.routing
        : undefined

    const fromInternalStructureIdRaw =
      typeof c.fromInternalStructureId === 'string'
        ? c.fromInternalStructureId
        : typeof c.fromEntityId === 'string'
          ? c.fromEntityId
          : null

    if (typeof c.fromNodeId === 'string' && fromInternalStructureIdRaw !== null && typeof c.toNodeId === 'string') {
      connections.push({
        id: c.id,
        fromNodeId: c.fromNodeId,
        fromInternalStructureId: fromInternalStructureIdRaw,
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
