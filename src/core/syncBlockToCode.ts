import { resolveIncomingAddonOutputForBlockParameter } from './addonOutputPropagation'
import type { CanvasNode, CanvasScene } from './canvasScene'
import type { BlockStructurePayload } from './blockSchema'
import { isBlockMapStructureType } from './blockSchema'
import { blockParameterDefaultValueFromJsonDocument } from './blockParameterFromJson'
import { blockParameterCatalogByName } from './blockParameterCatalogRegistry'
import {
  resolveBlockParameterValue,
  updateBlockParameterTokenValue,
  writeBlockParameterValue,
} from './blockTokenCodegen'
import { blockTokenFromParameterDef } from './blockTokenParser'

export function applyBlockStructureToNodeValues(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: BlockStructurePayload,
): { node: CanvasNode['node']; childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }> } {
  const childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }> = []
  let node = canvasNode.node

  for (const param of structure.parameters) {
    const token = blockTokenFromParameterDef(structure.blockType, structure.blockName, param)
    if (param.sourcePath.kind === 'parameter') {
      node = writeBlockParameterValue(node, param.sourcePath, token)
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
    const updated = writeBlockParameterValue(child.node, {
      kind: 'parameter',
      parameterId: param.sourcePath.childParameterId,
    }, token)
    childPatches.push({ nodeId: child.id, node: updated })
  }

  return { node, childPatches }
}

export function syncBlockParameterEdit(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: BlockStructurePayload,
  paramId: string,
  newValue: string,
): {
  structure: BlockStructurePayload
  node: CanvasNode['node']
  childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }>
} {
  const updatedStructure = updateBlockParameterTokenValue(structure, paramId, newValue)
  const patchedNode: CanvasNode = {
    ...canvasNode,
    node: canvasNode.node,
    blockStructure: updatedStructure,
  }
  const applied = applyBlockStructureToNodeValues(scene, patchedNode, updatedStructure)
  return {
    structure: updatedStructure,
    node: applied.node,
    childPatches: applied.childPatches,
  }
}

export function readBlockParameterDisplayValue(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: BlockStructurePayload,
  paramId: string,
): string {
  const param = structure.parameters.find((entry) => entry.idParameter === paramId)
  if (!param) {
    return ''
  }
  const wiredAddonValue = resolveIncomingAddonOutputForBlockParameter(scene, canvasNode, paramId)
  if (wiredAddonValue !== undefined) {
    return wiredAddonValue
  }
  const resolved = resolveBlockParameterValue(scene, canvasNode, param.sourcePath) || param.defaultValue
  if (resolved.trim() || !isBlockMapStructureType(param.typeParameter)) {
    return resolved
  }
  const catalogDoc = blockParameterCatalogByName(structure.blockType, param.nameParameter)
  if (!catalogDoc) {
    return resolved
  }
  return blockParameterDefaultValueFromJsonDocument(catalogDoc) || resolved
}

export function ritualExportScalarOrToken(raw: string): string {
  if (raw.includes('_blockType&') && raw.includes('_endParameter')) {
    return raw.trim()
  }
  return raw
}
