import type { CanvasNode, CanvasScene } from './canvasScene'
import type { GroupStructurePayload } from './groupSchema'
import {
  resolveGroupParameterValue,
  updateGroupParameterTokenValue,
  writeGroupParameterValue,
} from './groupTokenCodegen'
import { groupTokenFromParameterDef } from './groupTokenParser'

export function applyGroupStructureToNodeValues(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: GroupStructurePayload,
): { node: CanvasNode['node']; childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }> } {
  const childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }> = []
  let node = canvasNode.node

  for (const param of structure.parameters) {
    const token = groupTokenFromParameterDef(structure.groupType, structure.groupName, param)
    if (param.sourcePath.kind === 'parameter') {
      node = writeGroupParameterValue(node, param.sourcePath, token)
      continue
    }
    if (param.sourcePath.kind === 'pointerChild') {
      continue
    }
    const connection = scene.connections.find(
      (entry) =>
        entry.fromNodeId === canvasNode.id &&
        entry.fromInternalStructureId === param.sourcePath.slotId,
    )
    if (!connection) {
      continue
    }
    const child = scene.nodes.find((entry) => entry.id === connection.toNodeId)
    if (!child) {
      continue
    }
    const updated = writeGroupParameterValue(child.node, {
      kind: 'parameter',
      parameterId: param.sourcePath.childParameterId,
    }, token)
    childPatches.push({ nodeId: child.id, node: updated })
  }

  return { node, childPatches }
}

export function syncGroupParameterEdit(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: GroupStructurePayload,
  paramId: string,
  newValue: string,
): {
  structure: GroupStructurePayload
  node: CanvasNode['node']
  childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }>
} {
  const updatedStructure = updateGroupParameterTokenValue(structure, paramId, newValue)
  const patchedNode: CanvasNode = {
    ...canvasNode,
    node: canvasNode.node,
    groupStructure: updatedStructure,
  }
  const applied = applyGroupStructureToNodeValues(scene, patchedNode, updatedStructure)
  return {
    structure: updatedStructure,
    node: applied.node,
    childPatches: applied.childPatches,
  }
}

export function readGroupParameterDisplayValue(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: GroupStructurePayload,
  paramId: string,
): string {
  const param = structure.parameters.find((entry) => entry.idParameter === paramId)
  if (!param) {
    return ''
  }
  return resolveGroupParameterValue(scene, canvasNode, param.sourcePath) || param.defaultValue
}

export function ritualExportScalarOrToken(raw: string): string {
  if (raw.includes('_groupType&') && raw.includes('_endParameter')) {
    return raw.trim()
  }
  return raw
}
