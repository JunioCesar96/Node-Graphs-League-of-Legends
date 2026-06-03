import type { CanvasNode, CanvasScene } from './canvasScene'
import type { GroupStructurePayload } from './groupSchema'
import { extractGroupStructureFromNode } from './groupTokenCodegen'

export function codeToGroupStructure(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): GroupStructurePayload | null {
  if (canvasNode.groupStructure) {
    return canvasNode.groupStructure
  }
  return extractGroupStructureFromNode(scene, canvasNode)
}

export function hydrateCanvasNodeGroupView(scene: CanvasScene, canvasNode: CanvasNode): CanvasNode {
  const structure = codeToGroupStructure(scene, canvasNode)
  if (!structure) {
    return canvasNode
  }
  return {
    ...canvasNode,
    groupStructure: structure,
    groupViewActive: canvasNode.groupViewActive ?? true,
  }
}

export function hydrateSceneGroupViews(scene: CanvasScene): CanvasScene {
  return {
    ...scene,
    nodes: scene.nodes.map((node) => hydrateCanvasNodeGroupView(scene, node)),
  }
}
