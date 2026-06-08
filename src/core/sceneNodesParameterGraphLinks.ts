import type { OutgoingLink } from '@/core/canvasToClassGroupRitual'
import { resolveOutgoingLinks } from '@/core/canvasToClassGroupRitual'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { getNodeDisplayTitle } from '@/core/canvasNodePresentation'
import type { NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'

function normalizeFieldKey(name: string): string {
  return name.trim().toLowerCase()
}

export function outgoingLinkFieldName(link: OutgoingLink): string {
  return 'fieldName' in link ? link.fieldName : link.parameterName
}

export function buildOutgoingLinksIndex(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): Map<string, OutgoingLink[]> {
  const index = new Map<string, OutgoingLink[]>()

  for (const link of resolveOutgoingLinks(canvasNode, scene)) {
    const key = normalizeFieldKey(outgoingLinkFieldName(link))
    const bucket = index.get(key) ?? []
    bucket.push(link)
    index.set(key, bucket)
  }

  return index
}

export function findOutgoingLinksForField(
  index: ReadonlyMap<string, OutgoingLink[]>,
  fieldName: string,
): OutgoingLink[] {
  return index.get(normalizeFieldKey(fieldName)) ?? []
}

export function resolveConnectedNodeDisplayLabel(
  scene: Pick<CanvasScene, 'nodes'>,
  nodeId: string,
): string {
  const node = scene.nodes.find((entry) => entry.id === nodeId)
  if (!node) {
    return nodeId
  }

  if (node.blockStructure) {
    const blockLabel = node.blockStructure.blockName.trim() || node.blockStructure.blockType.trim()
    if (blockLabel) {
      return blockLabel
    }
  }

  return getNodeDisplayTitle(node)
}

export function formatOutgoingLinksDisplayLabel(
  scene: Pick<CanvasScene, 'nodes'>,
  links: readonly OutgoingLink[],
): string | undefined {
  if (links.length === 0) {
    return undefined
  }

  const firstLabel = resolveConnectedNodeDisplayLabel(scene, links[0]!.childCanvasId)
  if (links.length === 1) {
    return firstLabel
  }

  return `${firstLabel} (+${String(links.length - 1)})`
}

export function isSchemaStructuralParameter(
  parameter: NodeParameterDefinition,
  schema: NodeSchemaDefinition,
): boolean {
  if (
    parameter.type === 'mapHashEmbed' ||
    parameter.type === 'mapHashPointer' ||
    parameter.type === 'mapU64Pointer'
  ) {
    return true
  }

  const key = normalizeFieldKey(parameter.name)
  const matchesTitle = (title: string | undefined) => normalizeFieldKey(title ?? '') === key

  if (schema.embed?.some((block) => matchesTitle(block.title))) {
    return true
  }
  if (schema.pointer?.some((block) => matchesTitle(block.title))) {
    return true
  }
  if (schema.listEmbed?.some((block) => matchesTitle(block.title))) {
    return true
  }
  if (schema.listPointer?.some((block) => matchesTitle(block.title))) {
    return true
  }
  if (schema.list2Embed?.some((block) => matchesTitle(block.title))) {
    return true
  }
  if (schema.list2Pointer?.some((block) => matchesTitle(block.title))) {
    return true
  }

  return false
}

/** Nó upstream ligado a este nó (saída do pai → entrada do filho). */
export function resolveSceneNodesParameterParentNodeId(
  scene: Pick<CanvasScene, 'connections' | 'nodes'>,
  nodeId: string,
): string | undefined {
  for (const connection of scene.connections) {
    if (connection.toNodeId !== nodeId) {
      continue
    }

    const fromNode = scene.nodes.find((node) => node.id === connection.fromNodeId)
    if (!fromNode) {
      continue
    }

    if (connection.fromBlockParameterId || connection.fromBlockSlotId) {
      return connection.fromNodeId
    }

    if (connection.fromInternalStructureId?.startsWith('__block__:') === true) {
      return connection.fromNodeId
    }

    const slotId = connection.fromInternalStructureId?.trim() ?? ''
    if (slotId && !slotId.startsWith('__block__:')) {
      return connection.fromNodeId
    }
  }

  return undefined
}
