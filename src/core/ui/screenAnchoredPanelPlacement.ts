import type { CSSProperties } from 'react'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'

import { computeContextMenuPlacement } from './contextMenuPlacement'

const VIEWPORT_MARGIN = 8

/** Mesmo tamanho estimado para menus e inspector — mesma posição no clique. */
export const BLOCK_PARAMETER_PANEL_PLACEMENT_ESTIMATE = { width: 260, height: 200 }

/** Lista Editar/Remover no card — alinhada à largura real do painel. */
export const BLOCK_PARAMETER_LIST_PLACEMENT_ESTIMATE = { width: 240, height: 220 }

/** Inspector de edição de parâmetro (`.dockedShell` / `.panel`). */
export const BLOCK_PARAMETER_INSPECTOR_PLACEMENT_ESTIMATE = { width: 380, height: 520 }

export function buildFrozenScreenAnchoredStyle(
  anchor: CanvasContextMenuAnchor,
  size: { width: number; height: number } = BLOCK_PARAMETER_PANEL_PLACEMENT_ESTIMATE,
  zIndex = 12000,
): CSSProperties {
  const resolved = computeContextMenuPlacement(
    anchor.left,
    anchor.top,
    size.width,
    size.height,
    VIEWPORT_MARGIN,
  )
  const maxHeight = resolved.expandDown
    ? Math.max(140, window.innerHeight - resolved.y - VIEWPORT_MARGIN)
    : Math.max(140, anchor.top - VIEWPORT_MARGIN)

  return {
    position: 'fixed',
    left: resolved.x,
    top: resolved.y,
    zIndex,
    maxHeight,
    overflow: 'auto',
    pointerEvents: 'auto',
  }
}

export function screenAnchorKey(anchor: CanvasContextMenuAnchor | null | undefined): string | null {
  if (!anchor) {
    return null
  }
  return `${anchor.left}:${anchor.top}`
}

export const BLOCK_PARAMETER_PANEL_FALLBACK_STYLE: CSSProperties = {
  position: 'fixed',
  right: 24,
  top: 96,
  zIndex: 9000,
  maxHeight: 'min(70vh, calc(100vh - 120px))',
  overflow: 'auto',
  pointerEvents: 'auto',
}
