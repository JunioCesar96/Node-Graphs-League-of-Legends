import type { CSSProperties } from 'react'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  computeBlockCompactHiddenNodeIds,
  type BlockCompactVisibilityOptions,
} from '@/core/blockCompactBranchVisibility'
import {
  createCompactElementCanvasVisibility as createNodeCompactElementCanvasVisibility,
  expandHiddenNodeBranches,
  type CompactElementCanvasVisibility,
} from '@/core/compactElementBranchVisibility'
import { collectLinkVisibilityVisibleIds } from '@/core/sceneNodeLinkVisibility'
import { parseRgbaString, rgbaToCss } from '@/core/rgbaColor'

export function getNodeDisplayTitle(canvasNode: CanvasNode): string {
  const custom = canvasNode.displayLabel?.trim()

  if (custom) {
    return custom
  }

  return canvasNode.node.schema.title
}

export type MapHashEmbedCanvasVisibility = CompactElementCanvasVisibility

export type CompactElementCanvasVisibilityOptions = BlockCompactVisibilityOptions

export function createCompactElementCanvasVisibility(
  scene: CanvasScene,
  options?: CompactElementCanvasVisibilityOptions,
): CompactElementCanvasVisibility {
  const base = createNodeCompactElementCanvasVisibility(scene)
  const blockHidden = computeBlockCompactHiddenNodeIds(scene, options)
  const mergedHidden = new Set([...base.hiddenNodeIds, ...blockHidden])
  if (mergedHidden.size === 0) {
    return base
  }
  return {
    ...base,
    hiddenNodeIds: expandHiddenNodeBranches(scene, mergedHidden),
  }
}

export { type CompactElementCanvasVisibility }

export const createMapHashEmbedCanvasVisibility = createCompactElementCanvasVisibility

export type NodeVisibilitySceneContext = Pick<
  CanvasScene,
  'linkVisibilityFilter' | 'connections' | 'nodes'
>

export function isNodeVisibleOnCanvas(
  canvasNode: CanvasNode,
  compactVisibility?: CompactElementCanvasVisibility,
  sceneContext?: NodeVisibilitySceneContext,
): boolean {
  if (canvasNode.sceneHidden === true) {
    return false
  }

  if (canvasNode.branchForceVisible === true) {
    return true
  }

  if (sceneContext?.linkVisibilityFilter) {
    const allowed = collectLinkVisibilityVisibleIds(sceneContext)

    if (allowed && !allowed.has(canvasNode.id)) {
      return false
    }
  }

  if (compactVisibility?.hiddenNodeIds?.has(canvasNode.id)) {
    return false
  }

  return true
}

export function countVisibleCanvasNodes(
  scene: NodeVisibilitySceneContext & { nodes: readonly CanvasNode[] },
  compactVisibility?: CompactElementCanvasVisibility,
): number {
  let count = 0

  for (const canvasNode of scene.nodes) {
    if (isNodeVisibleOnCanvas(canvasNode, compactVisibility, scene)) {
      count += 1
    }
  }

  return count
}

export function isNodeBodyEffectivelyCollapsed(
  canvasNode: CanvasNode,
  compactVisibility?: CompactElementCanvasVisibility,
): boolean {
  if (canvasNode.bodyCollapsed === true) {
    return true
  }

  if (canvasNode.bodyCollapsed === false) {
    return false
  }

  return compactVisibility?.listCollapsedBodyNodeIds?.has(canvasNode.id) === true
}

/** Nós ocultos na cena não entram em seleccionar todos / marquee / clique no canvas. */
export function isNodeSelectableOnCanvas(
  canvasNode: CanvasNode,
  compactVisibility?: CompactElementCanvasVisibility,
  sceneContext?: NodeVisibilitySceneContext,
): boolean {
  return isNodeVisibleOnCanvas(canvasNode, compactVisibility, sceneContext)
}

export function filterSelectableNodeIds(
  scene: NodeVisibilitySceneContext & { nodes: CanvasNode[] },
  nodeIds: readonly string[],
  compactVisibility?: CompactElementCanvasVisibility,
): string[] {
  return nodeIds.filter((id) => {
    const node = scene.nodes.find((entry) => entry.id === id)

    return node !== undefined && isNodeSelectableOnCanvas(node, compactVisibility, scene)
  })
}

export function isNodeLocked(canvasNode: CanvasNode): boolean {
  return canvasNode.locked === true
}

/** Nós travados não podem ser apagados da cena (regra além de ROOT). */
export function isNodeRemovableFromScene(canvasNode: CanvasNode): boolean {
  return canvasNode.locked !== true
}

export function filterRemovableNodeIds(scene: { nodes: CanvasNode[] }, nodeIds: readonly string[]): string[] {
  return nodeIds.filter((id) => {
    const node = scene.nodes.find((entry) => entry.id === id)

    return node !== undefined && isNodeRemovableFromScene(node)
  })
}

/** Converte `bodyColor` persistido (formato `r, g, b, a` ou `rgba(...)`) para CSS válido. */
export function resolveCanvasNodeBodyCssColor(canvasNode: CanvasNode): string | undefined {
  if (!canvasNode.bodyColorEnabled || !canvasNode.bodyColor?.trim()) {
    return undefined
  }

  const raw = canvasNode.bodyColor.trim()

  if (raw.startsWith('rgba(') || raw.startsWith('rgb(')) {
    return raw
  }

  return rgbaToCss(parseRgbaString(raw))
}

export function canvasNodeBodyStyle(canvasNode: CanvasNode): CSSProperties | undefined {
  const background = resolveCanvasNodeBodyCssColor(canvasNode)

  if (!background) {
    return undefined
  }

  return {
    background,
    ['--node-body-fill' as string]: background,
  }
}

export function canvasNodeCardStyle(canvasNode: CanvasNode): CSSProperties | undefined {
  const fill = resolveCanvasNodeBodyCssColor(canvasNode)

  if (!fill) {
    return undefined
  }

  return { ['--node-body-fill' as string]: fill }
}

/** Cor do portão de entrada (orb no topo) — alinhada à cor do corpo quando activa. */
export function canvasNodeInputPortStyle(canvasNode: CanvasNode): CSSProperties | undefined {
  const background = resolveCanvasNodeBodyCssColor(canvasNode)

  if (!background) {
    return undefined
  }

  return {
    background,
    boxShadow: `0 0 0 1px rgb(255 255 255 / 22%), 0 0 14px color-mix(in srgb, ${background} 55%, transparent)`,
  }
}

export function isNodeCardBlockedInteractionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, [contenteditable="true"], [role="spinbutton"], label',
    ),
  )
}
