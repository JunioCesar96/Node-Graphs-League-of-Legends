import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  blockElementViewKeyForSlot,
  collectInactiveBlockMapSlotIds,
  collectInactiveBlockMapSlotIdsForActiveIndex,
  resolveBlockOutputSlotConnectionIndexFromNode,
  shouldApplyBlockListPointerIndexPolicy,
  sortBlockListPointerOutputConnections,
} from '@/core/blockElementViewState'
import { blockParameterSlotId, isBlockListPointerParameter } from '@/core/blockSchema'
import { parseListPointerSlotIndex } from '@/core/listPointerSlots'
import { collectBlockFanOutPolicyOutputSlotIds, findConnectionsForBlockOutputSlot } from '@/core/blockSlotConnections'
import {
  collectBranchNodeIdsFromOutputSlots,
  collectDescendantNodeIds,
} from '@/core/compactElementBranchVisibility'

export type BlockCompactVisibilityOptions = {
  /** Usar índice 0 quando slot fan-out não tem índice persistido. */
  lightModeDefaultFirst?: boolean
}

export type BlockIndexBranchCollectionOptions = BlockCompactVisibilityOptions & {
  /** Acção manual (menu): não exige modo compacto no pager. */
  ignoreCompactMode?: boolean
}

function hideBranchFromNode(
  scene: CanvasScene,
  rootNodeId: string,
  hidden: Set<string>,
): void {
  hidden.add(rootNodeId)
  for (const descendantId of collectDescendantNodeIds(scene, rootNodeId)) {
    hidden.add(descendantId)
  }
}

function isListPointerFanOutSlot(canvasNode: CanvasNode, slotId: string): boolean {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return false
  }

  for (const param of structure.parameters) {
    if (!isBlockListPointerParameter(param)) {
      continue
    }

    if (slotId === blockParameterSlotId(param.idParameter, 'output')) {
      return true
    }

    if (parseListPointerSlotIndex(slotId, param.idParameter) !== null) {
      return true
    }
  }

  return false
}

function hideBlockFanOutInactivePeers(
  scene: CanvasScene,
  fromNodeId: string,
  slotId: string,
  inactivePeerIds: Set<string>,
  options?: BlockCompactVisibilityOptions,
): void {
  const canvasNode = scene.nodes.find((node) => node.id === fromNodeId)
  if (!canvasNode) {
    return
  }

  if (isListPointerFanOutSlot(canvasNode, slotId)) {
    return
  }

  const outputConnections = findConnectionsForBlockOutputSlot(scene, fromNodeId, slotId)
  if (outputConnections.length <= 1) {
    return
  }

  const activeIndex = resolveBlockOutputSlotConnectionIndexFromNode(
    canvasNode,
    slotId,
    outputConnections.length,
    options,
  )

  for (let index = 0; index < outputConnections.length; index += 1) {
    if (index === activeIndex) {
      continue
    }

    hideBranchFromNode(scene, outputConnections[index]!.toNodeId, inactivePeerIds)
  }
}

function hideInactiveBlockListPointerBranches(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  hidden: Set<string>,
  options?: BlockIndexBranchCollectionOptions,
): void {
  const structure = canvasNode.blockStructure
  if (!structure) {
    return
  }

  for (const param of structure.parameters) {
    if (!isBlockListPointerParameter(param)) {
      continue
    }

    const outputSlot = blockParameterSlotId(param.idParameter, 'output')
    const appliesPolicy =
      options?.ignoreCompactMode === true ||
      shouldApplyBlockListPointerIndexPolicy(canvasNode, outputSlot, options)
    if (!appliesPolicy) {
      continue
    }

    const connections = findConnectionsForBlockOutputSlot(scene, canvasNode.id, outputSlot)
    if (connections.length <= 1) {
      continue
    }

    const sortedConnections = sortBlockListPointerOutputConnections(connections, param.idParameter)
    const activeIndex = resolveBlockOutputSlotConnectionIndexFromNode(
      canvasNode,
      outputSlot,
      sortedConnections.length,
      options,
    )

    for (let index = 0; index < sortedConnections.length; index += 1) {
      if (index === activeIndex) {
        continue
      }
      hideBranchFromNode(scene, sortedConnections[index]!.toNodeId, hidden)
    }
  }
}

/** Ramificações fora do índice activo (list[pointer] + map*) para ocultar manualmente. */
export function collectInactiveBlockIndexBranchNodeIds(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  options?: BlockIndexBranchCollectionOptions,
): Set<string> {
  const hidden = new Set<string>()

  if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
    return hidden
  }

  hideInactiveBlockListPointerBranches(scene, canvasNode, hidden, options)

  const inactiveMapSlots =
    options?.ignoreCompactMode === true
      ? collectInactiveBlockMapSlotIdsForActiveIndex(canvasNode, scene)
      : collectInactiveBlockMapSlotIds(canvasNode, scene)

  if (inactiveMapSlots.length > 0) {
    for (const nodeId of collectBranchNodeIdsFromOutputSlots(
      scene,
      canvasNode.id,
      inactiveMapSlots,
    )) {
      hidden.add(nodeId)
    }
  }

  return hidden
}

export function hasVisibleInactiveBlockIndexBranches(
  scene: CanvasScene,
  canvasNode: CanvasNode,
): boolean {
  const branchIds = collectInactiveBlockIndexBranchNodeIds(scene, canvasNode, {
    ignoreCompactMode: true,
  })

  for (const nodeId of branchIds) {
    const node = scene.nodes.find((entry) => entry.id === nodeId)
    if (node && node.sceneHidden !== true) {
      return true
    }
  }

  return false
}

/** Nós ocultos no canvas por política de índice em blocos compactos (map entries + fan-out). */
export function computeBlockCompactHiddenNodeIds(
  scene: CanvasScene,
  options?: BlockCompactVisibilityOptions,
): Set<string> {
  if (!options?.lightModeDefaultFirst) {
    return new Set<string>()
  }

  const hidden = new Set<string>()

  for (const canvasNode of scene.nodes) {
    if (!canvasNode.blockViewActive || !canvasNode.blockStructure) {
      continue
    }

    const inactiveMapSlots = collectInactiveBlockMapSlotIds(canvasNode, scene)
    if (inactiveMapSlots.length > 0) {
      for (const nodeId of collectBranchNodeIdsFromOutputSlots(
        scene,
        canvasNode.id,
        inactiveMapSlots,
      )) {
        hidden.add(nodeId)
      }
    }

    hideInactiveBlockListPointerBranches(scene, canvasNode, hidden, options)

    const slotIds = collectBlockFanOutPolicyOutputSlotIds(scene, canvasNode)

    for (const slotId of slotIds) {
      hideBlockFanOutInactivePeers(scene, canvasNode.id, slotId, hidden, options)
    }
  }

  return hidden
}

export function patchBlockSlotConnectionIndex(
  canvasNode: CanvasNode,
  slotId: string,
  selectedIndex: number,
): CanvasNode {
  const key = blockElementViewKeyForSlot(slotId)
  return {
    ...canvasNode,
    blockElementView: {
      ...(canvasNode.blockElementView ?? {}),
      [key]: {
        mode: 'compact',
        selectedIndex,
      },
    },
  }
}
