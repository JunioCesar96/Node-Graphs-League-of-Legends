import type { CanvasScene } from '@/core/canvasScene'
import { findLabelNodesForParent } from '@/core/labelScenePersistence'
import { normalizeLabelColor } from '@/core/syncLabelToParent'

export type LabelParentEffects = {
  highlighted: Map<string, string>
  hidden: Set<string>
}

export function resolveLabelEffectsForParent(
  scene: CanvasScene,
  parentBlockNodeId: string,
): LabelParentEffects {
  const highlighted = new Map<string, string>()
  const hidden = new Set<string>()

  const labels = findLabelNodesForParent(scene, parentBlockNodeId)
  for (const labelNode of labels) {
    const structure = labelNode.labelStructure
    if (!structure) {
      continue
    }
    const color = normalizeLabelColor(structure.color)
    for (const entry of structure.parameters) {
      if (!highlighted.has(entry.parameterId)) {
        highlighted.set(entry.parameterId, color)
      }
      if (entry.hiddenInParent) {
        hidden.add(entry.parameterId)
      }
    }
  }

  return { highlighted, hidden }
}
