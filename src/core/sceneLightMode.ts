import type { CanvasScene } from '@/core/canvasScene'
import { syncSceneElementWireless } from '@/core/compactConnectionRouting'
import { applyLightModeCompactToBlockNode } from '@/core/blockElementViewState'
import {
  clampSelectedIndex,
  collectStructureElementViewKeys,
  getElementViewState,
  patchElementViewMode,
  structureElementViewItemCount,
} from '@/core/elementViewState'
import { applyLightModeMainEntriesVfxIndexToScene } from '@/core/sceneLightModeMainEntries'
import type { NodeInstance } from '@/core/nodeSchema'

export type ApplyLightModeSceneOptions = {
  /** Primeira abertura / aba nova: índice `entries` do Main no primeiro VfxSystemDefinitionData. */
  initMainEntriesVfxIndex?: boolean
  /** Code To Node Block / aba nova: índices de blocos (map entries + fan-out) em 0. */
  initBlockIndices?: boolean
}

/** Força modo compacto em todos os blocos com toggle lista/compacto. */
export function applyLightModeCompactToNode(node: NodeInstance): NodeInstance {
  const keys = collectStructureElementViewKeys(node)
  let next = node

  for (const key of keys) {
    const state = getElementViewState(next, key)
    if (state.mode === 'compact') {
      continue
    }

    const count = structureElementViewItemCount(next, key)
    next = patchElementViewMode(
      next,
      key,
      'compact',
      clampSelectedIndex(count, state.selectedIndex),
    )
  }

  return next
}

export function applyLightModeToScene(
  scene: CanvasScene,
  options: ApplyLightModeSceneOptions = {},
): CanvasScene {
  const withCompactNodes: CanvasScene = {
    ...scene,
    nodes: scene.nodes.map((canvasNode) => {
      let next = {
        ...canvasNode,
        node: applyLightModeCompactToNode(canvasNode.node),
      }
      next = applyLightModeCompactToBlockNode(next, {
        initBlockIndices: options.initBlockIndices,
      })
      return next
    }),
  }

  const withMainEntriesIndex = options.initMainEntriesVfxIndex
    ? applyLightModeMainEntriesVfxIndexToScene(withCompactNodes)
    : withCompactNodes

  return syncSceneElementWireless(withMainEntriesIndex)
}
