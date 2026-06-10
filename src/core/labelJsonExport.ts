import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { LabelStructurePayload } from '@/core/labelSchema'
import {
  resolveLabelParameterDef,
  resolveLabelParameterDisplayValue,
  resolveLabelParentNode,
} from '@/core/syncLabelToParent'

export type LabelJsonFieldExport = {
  value: string
  type: string
}

export type LabelJsonExport = Record<string, LabelJsonFieldExport>

export function buildLabelJsonExport(
  scene: CanvasScene,
  labelNode: CanvasNode,
  structure: LabelStructurePayload,
): LabelJsonExport {
  const parentNode = resolveLabelParentNode(scene, structure)
  if (!parentNode) {
    return {}
  }

  const out: LabelJsonExport = {}
  for (const entry of structure.parameters) {
    const param = resolveLabelParameterDef(parentNode, entry.parameterId)
    if (!param) {
      continue
    }
    const key = param.nameParameter.trim() || param.idParameter
    out[key] = {
      value: resolveLabelParameterDisplayValue(scene, parentNode, entry.parameterId),
      type: param.typeParameter,
    }
  }
  return out
}

export function serializeLabelJsonExport(exportData: LabelJsonExport): string {
  return JSON.stringify(exportData, null, 2)
}

export function resolveLabelJsonOutputString(
  scene: CanvasScene,
  labelNode: CanvasNode,
): string {
  const structure = labelNode.labelStructure
  if (!structure) {
    return ''
  }
  return serializeLabelJsonExport(buildLabelJsonExport(scene, labelNode, structure))
}
