import type { CanvasScene } from '@/core/canvasScene'
import { hydrateScene } from '@/core/canvasScene'
import { emitNodeBlockCardPreviewCodeText } from '@/core/nodeCodeEditorBinding'
import {
  applyNeekoTransformToScene,
  buildNeekoSubtreePlan,
  persistNeekoSubtreeToDisk,
  prepareNeekoTransform,
  type NeekoTransformResult,
} from '@/core/neekoNodeTransform'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'

export type BlockRevertViaNeekoResult = NeekoTransformResult & {
  codeWarnings: string[]
}

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

/** Descendentes transitivos ligados por saídas de slot de bloco (exclui o próprio `parentNodeId`). */
export function collectBlockLinkedChildNodeIds(
  scene: CanvasScene,
  parentNodeId: string,
): Set<string> {
  const linked = new Set<string>()
  const queue = [parentNodeId]
  const visited = new Set<string>([parentNodeId])

  while (queue.length > 0) {
    const nodeId = queue.shift()!

    for (const connection of scene.connections) {
      if (!isBlockPresentationConnection(connection) || connection.fromNodeId !== nodeId) {
        continue
      }

      const childId = connection.toNodeId
      if (visited.has(childId)) {
        continue
      }

      visited.add(childId)
      linked.add(childId)
      queue.push(childId)
    }
  }

  return linked
}

/** Nós ligados apenas pela vista de bloco (filhos de slots do card). */
export function collectBlockSlotLinkedNodeIds(scene: CanvasScene, rootNodeId: string): Set<string> {
  const linked = new Set<string>()
  const queue = [rootNodeId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) {
      continue
    }
    visited.add(nodeId)

    for (const connection of scene.connections) {
      if (!isBlockPresentationConnection(connection)) {
        continue
      }

      if (connection.fromNodeId === nodeId && connection.toNodeId !== rootNodeId) {
        if (!linked.has(connection.toNodeId)) {
          linked.add(connection.toNodeId)
          queue.push(connection.toNodeId)
        }
      }

      if (connection.toNodeId === nodeId && connection.fromNodeId !== rootNodeId) {
        if (!linked.has(connection.fromNodeId)) {
          linked.add(connection.fromNodeId)
          queue.push(connection.fromNodeId)
        }
      }
    }
  }

  return linked
}

export function applyBlockRevertNeekoToScene(
  scene: CanvasScene,
  blockNodeId: string,
  plan: Parameters<typeof applyNeekoTransformToScene>[2],
): CanvasScene {
  const oldBlockChildIds = collectBlockSlotLinkedNodeIds(scene, blockNodeId)
  const planNodeIds = new Set(plan.nodes.map((node) => node.id))

  const merged = applyNeekoTransformToScene(scene, blockNodeId, plan)

  const removeOrphanIds = new Set(
    [...oldBlockChildIds].filter((nodeId) => !planNodeIds.has(nodeId)),
  )

  return {
    ...merged,
    nodes: merged.nodes
      .filter((node) => !removeOrphanIds.has(node.id))
      .map((node) => {
        if (node.id !== blockNodeId) {
          return node
        }

        const { blockStructure: _blockStructure, blockViewActive: _blockViewActive, ...rest } = node
        return rest
      }),
    connections: merged.connections.filter((connection) => {
      if (isBlockPresentationConnection(connection)) {
        return false
      }
      if (removeOrphanIds.has(connection.fromNodeId) || removeOrphanIds.has(connection.toNodeId)) {
        return false
      }
      return true
    }),
  }
}

/**
 * Reverte vista de bloco para subárvore de nós:
 * 1) Código Preview Block (`emitNodeBlockCardPreviewCodeText`)
 * 2) Materialização Neeko (`buildNeekoSubtreePlan` + `applyBlockRevertNeekoToScene`)
 */
export async function buildBlockRevertViaNeekoScene(
  scene: CanvasScene,
  blockNodeId: string,
  registry: Record<string, NodeSchemaDefinition>,
): Promise<BlockRevertViaNeekoResult> {
  const hydrated = hydrateScene(scene)
  const canvasNode = hydrated.nodes.find((node) => node.id === blockNodeId)

  if (!canvasNode?.blockStructure || !canvasNode.blockViewActive) {
    return { ok: false, error: 'Nó de bloco não encontrado ou vista de bloco inactiva.' }
  }

  const codeResult = emitNodeBlockCardPreviewCodeText(hydrated, registry, blockNodeId)
  if (!codeResult.ok) {
    return { ok: false, error: codeResult.error }
  }

  const prepared = prepareNeekoTransform(codeResult.text)
  if (!prepared.ok) {
    return { ok: false, error: prepared.error }
  }

  const plan = buildNeekoSubtreePlan(
    prepared.parseRegistry,
    prepared.warnings,
    prepared.rootParsedId,
    canvasNode.position,
    blockNodeId,
    canvasNode,
  )

  const diskPersist = await persistNeekoSubtreeToDisk(plan)
  const warnings = [...codeResult.warnings, ...plan.warnings, ...diskPersist.warnings]

  const nextScene = applyBlockRevertNeekoToScene(hydrated, blockNodeId, plan)

  return {
    ok: true,
    scene: nextScene,
    warnings,
    codeWarnings: codeResult.warnings,
    rootCanvasNodeId: blockNodeId,
  }
}
