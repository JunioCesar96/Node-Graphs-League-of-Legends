import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import { computeContextMenuPlacement } from '@/core/ui/contextMenuPlacement'

/** Layout partilhado do painel de lista flutuante (px). */
export const STRUCTURE_LIST_PANEL_MIN_WIDTH = 384.5
export const STRUCTURE_LIST_PANEL_MIN_HEIGHT = 100
export const STRUCTURE_LIST_PANEL_MAX_WIDTH = 720
export const STRUCTURE_LIST_PANEL_MAX_HEIGHT = 480
export const STRUCTURE_LIST_PANEL_CHROME_HEIGHT = 12
export const STRUCTURE_LIST_HEADER_HEIGHT = 30
export const STRUCTURE_LIST_ITEM_HEIGHT = 22
export const STRUCTURE_LIST_MAX_VISIBLE_ITEMS = 6

const SCREEN_ANCHOR_MARGIN = 8

export function structureListPanelDefaultHeight(entryCount: number): number {
  const listBody = Math.max(
    structureListBodyHeight(entryCount, true),
    STRUCTURE_LIST_ITEM_HEIGHT,
  )
  return STRUCTURE_LIST_HEADER_HEIGHT + listBody + STRUCTURE_LIST_PANEL_CHROME_HEIGHT
}

export function clampStructureListPanelSize(
  width: number,
  height: number,
  anchorTop = 0,
): { width: number; height: number } {
  const maxHeight = Math.min(
    STRUCTURE_LIST_PANEL_MAX_HEIGHT,
    Math.max(STRUCTURE_LIST_PANEL_MIN_HEIGHT, window.innerHeight - anchorTop - 8),
  )
  return {
    width: Math.min(
      STRUCTURE_LIST_PANEL_MAX_WIDTH,
      Math.max(STRUCTURE_LIST_PANEL_MIN_WIDTH, width),
    ),
    height: Math.min(maxHeight, Math.max(STRUCTURE_LIST_PANEL_MIN_HEIGHT, height)),
  }
}

export function structureListBodyHeight(entryCount: number, expanded = false): number {
  if (!expanded || entryCount === 0) {
    return 0
  }
  const rows = Math.max(entryCount, 1)
  const visibleRows = Math.min(rows, STRUCTURE_LIST_MAX_VISIBLE_ITEMS)
  return visibleRows * STRUCTURE_LIST_ITEM_HEIGHT
}

export type StructureListPanelRect = {
  left: number
  top: number
  width: number
}

/** Ancora a lista à linha do bloco (label → borda direita da linha). */
export function resolveBlockMapListPanelRect(
  anchor: HTMLElement,
  minWidth = STRUCTURE_LIST_PANEL_MIN_WIDTH,
): StructureListPanelRect {
  const row = anchor.closest('[data-map-list="1"]')
  const controlRect = anchor.getBoundingClientRect()
  if (row instanceof HTMLElement) {
    const rowRect = row.getBoundingClientRect()
    const labelEl = row.querySelector('[data-block-param-label="1"]')
    const labelRect = labelEl instanceof HTMLElement ? labelEl.getBoundingClientRect() : null
    const left = labelRect?.left ?? rowRect.left
    const width = Math.max(rowRect.right - left, minWidth)
    return {
      left,
      top: controlRect.bottom + 4,
      width,
    }
  }
  return {
    left: controlRect.left,
    top: controlRect.bottom + 4,
    width: Math.max(controlRect.width, minWidth),
  }
}

/** Posição inicial do painel no ponto de clique (menu do card, context menu). */
export function resolveStructureListScreenAnchorRect(
  anchor: CanvasContextMenuAnchor,
  width: number,
  estimatedHeight = STRUCTURE_LIST_PANEL_MAX_HEIGHT,
): StructureListPanelRect {
  const resolved = computeContextMenuPlacement(
    anchor.left,
    anchor.top,
    width,
    estimatedHeight,
    SCREEN_ANCHOR_MARGIN,
  )
  return {
    left: resolved.x,
    top: resolved.y,
    width,
  }
}

export function matchesStructureListLabelSearch(label: string, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  return label.toLowerCase().includes(normalized)
}
