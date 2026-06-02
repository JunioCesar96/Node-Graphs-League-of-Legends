import type { CanvasNode, CanvasScene } from './canvasScene'
import type { BlockStructurePayload } from './blockSchema'
import { extractBlockStructureFromNode } from './blockTokenCodegen'

export function codeToBlockStructure(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): BlockStructurePayload | null {
  if (canvasNode.blockStructure) {
    return canvasNode.blockStructure
  }
  return extractBlockStructureFromNode(scene, canvasNode)
}

export function hydrateCanvasNodeBlockView(scene: CanvasScene, canvasNode: CanvasNode): CanvasNode {
  const structure = codeToBlockStructure(scene, canvasNode)
  if (!structure) {
    return canvasNode
  }
  return {
    ...canvasNode,
    blockStructure: structure,
    blockViewActive: canvasNode.blockViewActive ?? true,
  }
}

export function hydrateSceneBlockViews(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => hydrateCanvasNodeBlockView(scene, node)),
  }
}
