import type { BlockParameterDef } from '@/core/blockSchema'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { LabelParameterEntry, LabelStructurePayload } from '@/core/labelSchema'
import {
  findMatchingBlockParameterForLabelEntry,
  isLabelParentUnlinked,
} from '@/core/labelParentLinking'
import { readBlockParameterDisplayValue } from '@/core/syncBlockToCode'

export function resolveLabelParentNode(
  scene: CanvasScene,
  structure: LabelStructurePayload,
): CanvasNode | undefined {
  if (isLabelParentUnlinked(structure.parentBlockNodeId)) {
    return undefined
  }
  return scene.nodes.find(
    (node) =>
      node.id === structure.parentBlockNodeId &&
      node.blockViewActive &&
      node.blockStructure,
  )
}

export function resolveLabelParameterDef(
  parentNode: CanvasNode,
  parameterId: string,
): BlockParameterDef | undefined {
  const structure = parentNode.blockStructure
  if (!structure) {
    return undefined
  }
  return findMatchingBlockParameterForLabelEntry(structure, parameterId)
}

export function resolveLabelParameterDisplayValue(
  scene: CanvasScene,
  parentNode: CanvasNode,
  parameterId: string,
): string {
  const structure = parentNode.blockStructure
  if (!structure) {
    return ''
  }
  return readBlockParameterDisplayValue(scene, parentNode, structure, parameterId)
}

export function listAvailableParentParameters(
  parentNode: CanvasNode,
  labelParameters: readonly LabelParameterEntry[],
): BlockParameterDef[] {
  const structure = parentNode.blockStructure
  if (!structure) {
    return []
  }
  const used = new Set(labelParameters.map((entry) => entry.parameterId))
  return structure.parameters.filter((param) => !used.has(param.idParameter))
}

export function normalizeLabelColor(color: string): string {
  const trimmed = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed
  }
  return '#f5d000'
}
