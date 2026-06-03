import type { CanvasNode, CanvasScene } from './canvasScene'
import { isBlockTokenValue } from './blockSchema'
import { parseBlockToken } from './blockTokenParser'
import type { NodeInstance } from './nodeSchema'
import { applyBlockStructureToNodeValues } from './syncBlockToCode'

export function expandBlockTokenToScalarValue(token: string): string {
  const parsed = parseBlockToken(token)
  if (!parsed) {
    return token
  }
  return parsed.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
}

function expandBlockTokensInNodeInstance(node: NodeInstance): NodeInstance {
  const nextValues = node.values.map((entry) => {
    if (!isBlockTokenValue(entry.value)) {
      return entry
    }
    return { ...entry, value: expandBlockTokenToScalarValue(entry.value) }
  })

  const changed = nextValues.some((entry, index) => entry.value !== node.values[index]?.value)
  if (!changed) {
    return node
  }

  return { ...node, values: nextValues }
}

/** Substitui tokens de bloco por valores escalares (export League bin). */
export function expandBlockTokensInScene(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    nodes: scene.nodes.map((canvasNode) => {
      const nextNode = expandBlockTokensInNodeInstance(canvasNode.node)
      if (nextNode === canvasNode.node) {
        return canvasNode
      }
      return { ...canvasNode, node: nextNode }
    }),
  }
}

/** Reaplica tokens `_blockType&` a partir de `blockStructure` antes de «Ver código de bloco». */
export function syncBlockStructureTokensInScene(scene: CanvasScene): CanvasScene {
  let nodes = scene.nodes.map((entry) => entry)

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
      continue
    }

    const applied = applyBlockStructureToNodeValues(scene, canvasNode, canvasNode.blockStructure)
    nodes = nodes.map((entry) => {
      if (entry.id === canvasNode.id) {
        return { ...entry, node: applied.node }
      }
      const childPatch = applied.childPatches.find((patch) => patch.nodeId === entry.id)
      return childPatch ? { ...entry, node: childPatch.node } : entry
    })
  }

  return { ...scene, nodes }
}

function nodeInstanceHasBlockTokens(node: NodeInstance): boolean {
  return node.values.some((entry) => isBlockTokenValue(entry.value))
}

/** Verifica se o nó ou filhos directos na cena contêm tokens de bloco. */
export function canvasNodeHasBlockCode(scene: CanvasScene, nodeId: string): boolean {
  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
  if (!canvasNode) {
    return false
  }

  if (canvasNode.blockViewActive && canvasNode.blockStructure) {
    return true
  }

  if (nodeInstanceHasBlockTokens(canvasNode.node)) {
    return true
  }

  for (const connection of scene.connections) {
    if (connection.fromNodeId !== nodeId) {
      continue
    }
    const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
    if (child && nodeInstanceHasBlockTokens(child.node)) {
      return true
    }
  }

  return false
}

export function findCanvasNodeInScene(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((entry) => entry.id === nodeId)
}
