import type { CanvasScene, LinkVisibilityFilter } from '@/core/canvasScene'
import type { NodeElementKind } from '@/core/listNodeElements'

export const STRUCTURAL_SLOT_CONTEXT_KINDS = [
  'internalStructure',
  'embedSlot',
  'pointerSlot',
  'listEmbedSlot',
  'listPointerSlot',
] as const satisfies readonly NodeElementKind[]

export type StructuralSlotContextKind = (typeof STRUCTURAL_SLOT_CONTEXT_KINDS)[number]

export function isStructuralSlotContextKind(
  kind: string,
): kind is StructuralSlotContextKind {
  return (STRUCTURAL_SLOT_CONTEXT_KINDS as readonly string[]).includes(kind)
}

function collectAncestorNodeIds(scene: CanvasScene, seedNodeId: string): Set<string> {
  const visible = new Set<string>([seedNodeId])
  const queue = [seedNodeId]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const connection of scene.connections) {
      if (connection.toNodeId !== current) {
        continue
      }

      const parentId = connection.fromNodeId

      if (visible.has(parentId)) {
        continue
      }

      visible.add(parentId)
      queue.push(parentId)
    }
  }

  return visible
}

function collectDescendantNodeIds(scene: CanvasScene, seedNodeId: string): Set<string> {
  const visible = new Set<string>([seedNodeId])
  const queue = [seedNodeId]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const connection of scene.connections) {
      if (connection.fromNodeId !== current) {
        continue
      }

      const childId = connection.toNodeId

      if (visible.has(childId)) {
        continue
      }

      visible.add(childId)
      queue.push(childId)
    }
  }

  return visible
}

/** Descendentes transitivos ligados por saídas do nó (inclui o próprio `parentNodeId`). */
export function collectLinkedChildNodeIds(
  scene: CanvasScene,
  parentNodeId: string,
): Set<string> {
  const ids = collectDescendantNodeIds(scene, parentNodeId)
  ids.delete(parentNodeId)
  return ids
}

/**
 * Espinha ligada ao nó: ancestrais (ligações de entrada) + descendentes (saídas),
 * sem ramos paralelos (ex.: outros emitters do mesmo VfxSystem).
 */
export function collectNodeLinkBranchIds(scene: CanvasScene, seedNodeId: string): Set<string> {
  const visible = new Set<string>()

  for (const id of collectAncestorNodeIds(scene, seedNodeId)) {
    visible.add(id)
  }

  for (const id of collectDescendantNodeIds(scene, seedNodeId)) {
    visible.add(id)
  }

  return visible
}

/** @deprecated Alias — usar `collectNodeLinkBranchIds`. */
export const collectConnectedComponentNodeIds = collectNodeLinkBranchIds

/** Ramo orientado: ligações que saem do slot inicial e descendentes transitivos. */
export function collectSlotSubtreeNodeIds(
  scene: CanvasScene,
  fromNodeId: string,
  fromInternalStructureId: string,
): Set<string> {
  const visible = new Set<string>([fromNodeId])
  const queue: Array<{ nodeId: string; restrictToSlot: boolean }> = [{ nodeId: fromNodeId, restrictToSlot: true }]

  while (queue.length > 0) {
    const { nodeId, restrictToSlot } = queue.shift()!

    for (const connection of scene.connections) {
      if (connection.fromNodeId !== nodeId) {
        continue
      }

      if (restrictToSlot && connection.fromInternalStructureId !== fromInternalStructureId) {
        continue
      }

      const childId = connection.toNodeId

      if (visible.has(childId)) {
        continue
      }

      visible.add(childId)
      queue.push({ nodeId: childId, restrictToSlot: false })
    }
  }

  return visible
}

/** Ramo do slot de entrada: ligação que chega a `toNodeId` + subárvore desse slot no pai. */
export function collectIncomingSlotBranchNodeIds(scene: CanvasScene, toNodeId: string): Set<string> {
  const incoming = scene.connections.filter((connection) => connection.toNodeId === toNodeId)

  if (incoming.length === 0) {
    return new Set([toNodeId])
  }

  const visible = new Set<string>([toNodeId])

  for (const connection of incoming) {
    for (const id of collectSlotSubtreeNodeIds(
      scene,
      connection.fromNodeId,
      connection.fromInternalStructureId,
    )) {
      visible.add(id)
    }
  }

  return visible
}

export function collectLinkVisibilityVisibleIds(
  scene: Pick<CanvasScene, 'linkVisibilityFilter' | 'connections' | 'nodes'>,
): Set<string> | null {
  const filter = scene.linkVisibilityFilter

  if (!filter) {
    return null
  }

  switch (filter.mode) {
    case 'branch':
      return collectNodeLinkBranchIds(scene as CanvasScene, filter.seedNodeId)
    case 'slot':
      return collectSlotSubtreeNodeIds(scene as CanvasScene, filter.fromNodeId, filter.slotId)
    case 'incoming':
      return collectIncomingSlotBranchNodeIds(scene as CanvasScene, filter.toNodeId)
    default:
      return null
  }
}

/** Marca `sceneHidden` (ou limpa) apenas nos nós indicados; não altera `linkVisibilityFilter`. */
export function applySceneHiddenToNodeIds(
  scene: CanvasScene,
  nodeIds: ReadonlySet<string>,
  hidden: boolean,
): CanvasScene {
  if (nodeIds.size === 0) {
    return scene
  }

  return {
    ...scene,
    nodes: scene.nodes.map((node) => {
      if (!nodeIds.has(node.id)) {
        return node
      }

      if (hidden) {
        return { ...node, sceneHidden: true, branchForceVisible: undefined }
      }

      return { ...node, sceneHidden: undefined, branchForceVisible: undefined }
    }),
  }
}

export function applyShowOnlyNodeIds(
  scene: CanvasScene,
  visibleIds: ReadonlySet<string>,
  filter: LinkVisibilityFilter,
): CanvasScene {
  return {
    ...scene,
    linkVisibilityFilter: filter,
    nodes: scene.nodes.map((node) => {
      if (visibleIds.has(node.id)) {
        return {
          ...node,
          sceneHidden: undefined,
          branchForceVisible: undefined,
        }
      }

      return {
        ...node,
        sceneHidden: true,
        branchForceVisible: undefined,
      }
    }),
  }
}

export function clearLinkVisibilityFilter(scene: CanvasScene): CanvasScene {
  if (!scene.linkVisibilityFilter) {
    return scene
  }

  const { linkVisibilityFilter: _removed, ...rest } = scene

  return rest
}

/** Remove `sceneHidden` / `branchForceVisible` de todos os nós (passo de reset). */
export function resetAllNodesSceneVisibility(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => ({
      ...node,
      sceneHidden: undefined,
      branchForceVisible: undefined,
    })),
  }
}

/**
 * Com filtro activo: desoculta tudo e volta a aplicar ocultação do filtro
 * (útil após mudar índice em modo lista/compacto).
 */
export function reapplyLinkVisibilityFilter(scene: CanvasScene): CanvasScene {
  const filter = scene.linkVisibilityFilter

  if (!filter) {
    return scene
  }

  const resetScene = resetAllNodesSceneVisibility(scene)
  const visibleIds = collectLinkVisibilityVisibleIds(resetScene)

  if (!visibleIds) {
    return resetScene
  }

  return applyShowOnlyNodeIds(resetScene, visibleIds, filter)
}
