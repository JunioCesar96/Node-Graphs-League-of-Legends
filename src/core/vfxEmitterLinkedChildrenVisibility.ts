import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { collectBlockLinkedChildNodeIds } from '@/core/blockRevertToNodeViaNeeko'
import {
  applySceneHiddenToNodeIds,
  collectLinkedChildNodeIds,
} from '@/core/sceneNodeLinkVisibility'

export const VFX_EMITTER_DEFINITION_DATA_TYPE = 'VfxEmitterDefinitionData'

export function isVfxEmitterDefinitionDataCanvasNode(canvasNode: CanvasNode): boolean {
  if (canvasNode.blockStructure?.blockType === VFX_EMITTER_DEFINITION_DATA_TYPE) {
    return true
  }

  return canvasNode.node.schema.title === VFX_EMITTER_DEFINITION_DATA_TYPE
}

/** Oculta filhos ligados de cada `VfxEmitterDefinitionData` (vista nó ou bloco). */
export function applyHideLinkedChildrenForVfxEmitterNodes(scene: CanvasScene): CanvasScene {
  const childIds = new Set<string>()

  for (const canvasNode of scene.nodes) {
    if (!isVfxEmitterDefinitionDataCanvasNode(canvasNode)) {
      continue
    }

    const linked =
      canvasNode.blockViewActive && canvasNode.blockStructure
        ? collectBlockLinkedChildNodeIds(scene, canvasNode.id)
        : collectLinkedChildNodeIds(scene, canvasNode.id)

    for (const nodeId of linked) {
      childIds.add(nodeId)
    }
  }

  if (childIds.size === 0) {
    return scene
  }

  return applySceneHiddenToNodeIds(scene, childIds, true)
}
