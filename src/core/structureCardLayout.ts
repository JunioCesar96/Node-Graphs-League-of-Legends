import type { CanvasNode } from '@/core/canvasScene'
import { BLOCK_CARD_WIDTH } from '@/core/blockSchema'
import { GROUP_CARD_WIDTH } from '@/core/groupSchema'
import { LABEL_CARD_WIDTH } from '@/core/labelSchema'

export const STRUCTURE_CARD_MAX_WIDTH = 720

/** Métricas verticais do card grupo/bloco — manter alinhadas com tokens.css. */
export const STRUCTURE_CARD_HEADER_HEIGHT = 36
export const STRUCTURE_CARD_DIVIDER_HEIGHT = 2
export const STRUCTURE_CARD_BODY_PADDING_Y = 4
export const STRUCTURE_CARD_ROW_HEIGHT = 28

export function resolveGroupCardWidth(node: CanvasNode): number {
  const base = node.structureCardWidth ?? GROUP_CARD_WIDTH
  return Math.min(STRUCTURE_CARD_MAX_WIDTH, Math.max(GROUP_CARD_WIDTH, base))
}

export function resolveBlockCardWidth(node: CanvasNode): number {
  const base = node.structureCardWidth ?? BLOCK_CARD_WIDTH
  return Math.min(STRUCTURE_CARD_MAX_WIDTH, Math.max(BLOCK_CARD_WIDTH, base))
}

export function resolveLabelCardWidth(node: CanvasNode): number {
  const base = node.structureCardWidth ?? LABEL_CARD_WIDTH
  return Math.min(STRUCTURE_CARD_MAX_WIDTH, Math.max(LABEL_CARD_WIDTH, base))
}

export function clampStructureCardWidth(width: number, minWidth: number): number {
  return Math.min(STRUCTURE_CARD_MAX_WIDTH, Math.max(minWidth, Math.round(width)))
}

export function normalizeStructureCardWidth(
  width: number,
  minWidth: number,
): number | undefined {
  const clamped = clampStructureCardWidth(width, minWidth)
  return clamped === minWidth ? undefined : clamped
}

/** Ignora cliques em slots, inputs e alças de resize — resto do card arrasta/seleciona. */
export function isStructureCardDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  return !target.closest(
    '[data-structure-card-resize], [data-block-param-menu-root], [data-block-param-menu-portal], button, input, select, textarea, [contenteditable="true"]',
  )
}
