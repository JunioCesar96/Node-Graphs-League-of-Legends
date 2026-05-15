import type { CanvasScene } from '@/core/canvasScene'
import type { NodeInstance } from '@/core/nodeSchema'

export type NodeElementKind = 'parameter' | 'internalStructure'

export type NodeElementListItem = {
  id: string
  kind: NodeElementKind
  meta?: string
  name: string
}

export function listNodeElements(node: NodeInstance): NodeElementListItem[] {
  const parameters: NodeElementListItem[] = node.schema.parameters.map((parameter) => ({
    id: parameter.id,
    kind: 'parameter',
    meta: parameter.type,
    name: parameter.name,
  }))

  const structures: NodeElementListItem[] = node.schema.internalStructures.map((structure) => ({
    id: structure.id,
    kind: 'internalStructure',
    meta: structure.schemaId,
    name: structure.name,
  }))

  return [...parameters, ...structures]
}

export function countElementDependencies(
  scene: CanvasScene,
  nodeId: string,
  elementId: string,
  kind: NodeElementKind,
): number {
  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
  if (!canvasNode) {
    return 0
  }

  if (kind === 'internalStructure') {
    return scene.connections.filter(
      (connection) =>
        connection.fromNodeId === nodeId && connection.fromInternalStructureId === elementId,
    ).length
  }

  const links = canvasNode.node.parameter_value_links ?? []
  return links.filter(([a, b]) => a === elementId || b === elementId).length
}

export function formatElementDependencyWarning(count: number): string {
  if (count <= 0) {
    return ''
  }

  if (count === 1) {
    return ' Isso pode afetar 1 conexão ou vínculo existente.'
  }

  return ` Isso pode afetar ${count} conexões ou vínculos existentes.`
}
