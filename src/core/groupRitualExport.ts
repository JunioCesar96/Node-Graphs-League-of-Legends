import type { CanvasNode, CanvasScene } from './canvasScene'
import { isGroupTokenValue } from './groupSchema'
import { parseGroupToken } from './groupTokenParser'
import type { NodeInstance } from './nodeSchema'
import { applyGroupStructureToNodeValues } from './syncGroupToCode'

export function expandGroupTokenToScalarValue(token: string): string {
  const parsed = parseGroupToken(token)
  if (!parsed) {
    return token
  }
  return parsed.defaultValue.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
}

function expandGroupTokensInNodeInstance(node: NodeInstance): NodeInstance {
  const nextValues = node.values.map((entry) => {
    if (!isGroupTokenValue(entry.value)) {
      return entry
    }
    return { ...entry, value: expandGroupTokenToScalarValue(entry.value) }
  })

  const changed = nextValues.some((entry, index) => entry.value !== node.values[index]?.value)
  if (!changed) {
    return node
  }

  return { ...node, values: nextValues }
}

/** Substitui tokens de Grupo por valores escalares (export League bin). */
export function expandGroupTokensInScene(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    nodes: scene.nodes.map((canvasNode) => {
      const nextNode = expandGroupTokensInNodeInstance(canvasNode.node)
      if (nextNode === canvasNode.node) {
        return canvasNode
      }
      return { ...canvasNode, node: nextNode }
    }),
  }
}

/** Reaplica tokens `_groupType&` a partir de `groupStructure` antes de «Ver código de grupo». */
export function syncGroupStructureTokensInScene(scene: CanvasScene): CanvasScene {
  let nodes = scene.nodes.map((entry) => entry)

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.groupViewActive || !canvasNode.groupStructure) {
      continue
    }

    const applied = applyGroupStructureToNodeValues(scene, canvasNode, canvasNode.groupStructure)
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

function nodeInstanceHasGroupTokens(node: NodeInstance): boolean {
  return node.values.some((entry) => isGroupTokenValue(entry.value))
}

/** Verifica se o nó ou filhos directos na cena contêm tokens de Grupo. */
export function canvasNodeHasGroupCode(scene: CanvasScene, nodeId: string): boolean {
  const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
  if (!canvasNode) {
    return false
  }

  if (canvasNode.groupViewActive && canvasNode.groupStructure) {
    return true
  }

  if (nodeInstanceHasGroupTokens(canvasNode.node)) {
    return true
  }

  for (const connection of scene.connections) {
    if (connection.fromNodeId !== nodeId) {
      continue
    }
    const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
    if (child && nodeInstanceHasGroupTokens(child.node)) {
      return true
    }
  }

  return false
}

export function findCanvasNodeInScene(scene: CanvasScene, nodeId: string): CanvasNode | undefined {
  return scene.nodes.find((entry) => entry.id === nodeId)
}
