import type { CanvasNode } from '@/core/canvasScene'
import {
  LABEL_CARD_WIDTH,
  LABEL_JSON_OUTPUT_TYPE,
  labelHeaderSlotId,
  type LabelStructurePayload,
} from '@/core/labelSchema'
import {
  STRUCTURE_CARD_BODY_PADDING_Y,
  STRUCTURE_CARD_DIVIDER_HEIGHT,
  STRUCTURE_CARD_HEADER_HEIGHT,
  STRUCTURE_CARD_ROW_HEIGHT,
  resolveLabelCardWidth,
} from '@/core/structureCardLayout'

export type LabelSlotEndpoint = {
  kind: 'header'
  nodeId: string
  slotId: string
  direction: 'output'
  types: string[]
}

export function estimateLabelCardHeight(structure: LabelStructurePayload): number {
  const rowCount = structure.parameters.length
  const bodyHeight =
    STRUCTURE_CARD_BODY_PADDING_Y * 2 +
    Math.max(rowCount, 1) * STRUCTURE_CARD_ROW_HEIGHT
  return STRUCTURE_CARD_HEADER_HEIGHT + STRUCTURE_CARD_DIVIDER_HEIGHT + bodyHeight
}

export function findLabelSlotEndpoints(canvasNode: CanvasNode): LabelSlotEndpoint[] {
  if (!canvasNode.labelViewActive || !canvasNode.labelStructure) {
    return []
  }
  return [
    {
      kind: 'header',
      nodeId: canvasNode.id,
      slotId: labelHeaderSlotId(canvasNode.id, 0),
      direction: 'output',
      types: [LABEL_JSON_OUTPUT_TYPE],
    },
  ]
}

export function findLabelSlotEndpoint(
  canvasNode: CanvasNode,
  slotId: string,
): LabelSlotEndpoint | undefined {
  return findLabelSlotEndpoints(canvasNode).find((entry) => entry.slotId === slotId)
}

export function resolveLabelSlotCanvasPoint(
  node: CanvasNode,
  slotId: string,
): { x: number; y: number } | null {
  const endpoint = findLabelSlotEndpoint(node, slotId)
  if (!endpoint) {
    return null
  }
  const width = resolveLabelCardWidth(node)
  const headerCenterY = node.position.y + STRUCTURE_CARD_HEADER_HEIGHT / 2
  return {
    x: node.position.x + width,
    y: headerCenterY,
  }
}

export function labelCardWidthForLayout(node: CanvasNode): number {
  return resolveLabelCardWidth(node) || LABEL_CARD_WIDTH
}
