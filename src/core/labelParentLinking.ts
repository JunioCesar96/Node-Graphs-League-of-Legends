import { blockDefinitionsList } from './blockDefinitionRegistry'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import {
  blockParameterCatalogForBlock,
  listAllBlockParametersFromCatalog,
} from './blockParameterCatalogRegistry'
import { isBlockCanvasNode } from './blockOrganizationLayout'
import { isParameterAlreadyOnBlock } from './blockParameterFromJson'
import type { BlockParameterDef, BlockStructurePayload } from './blockSchema'
import type { CanvasNode, CanvasScene } from './canvasScene'
import type { LabelParameterEntry, LabelStructurePayload } from './labelSchema'
import { UNLINKED_LABEL_PARENT_ID } from './labelSchema'
import { findLabelNodesForParent } from './labelScenePersistence'

export function isLabelParentUnlinked(parentBlockNodeId: string): boolean {
  return parentBlockNodeId.trim() === UNLINKED_LABEL_PARENT_ID
}

export function findBlockParameterDocBySourceId(
  parameterId: string,
): BlockParameterJsonDocument | undefined {
  const trimmed = parameterId.trim()
  if (!trimmed) {
    return undefined
  }
  return listAllBlockParametersFromCatalog().find(
    (doc) =>
      doc.source.parameterId.trim() === trimmed ||
      doc.id.trim() === trimmed ||
      doc.parameterName.trim() === trimmed,
  )
}

export function findBlockParameterDocForLabelEntry(
  blockType: string,
  parameterKey: string,
): BlockParameterJsonDocument | undefined {
  const trimmedKey = parameterKey.trim()
  const trimmedBlock = blockType.trim()
  if (!trimmedKey || !trimmedBlock) {
    return undefined
  }

  for (const doc of blockParameterCatalogForBlock(trimmedBlock)) {
    if (
      doc.id.trim() === trimmedKey ||
      doc.parameterName.trim() === trimmedKey ||
      doc.source.parameterId.trim() === trimmedKey
    ) {
      return doc
    }
  }

  return findBlockParameterDocBySourceId(trimmedKey)
}

function parameterMatchesCatalogDoc(
  param: BlockParameterDef,
  doc: BlockParameterJsonDocument,
): boolean {
  if (param.idParameter.trim() === doc.id.trim()) {
    return true
  }
  if (param.nameParameter.trim() === doc.parameterName.trim()) {
    return true
  }
  if (param.sourcePath.kind === 'parameter') {
    return param.sourcePath.parameterId.trim() === doc.source.parameterId.trim()
  }
  if (doc.type === 'pointer' && param.sourcePath.kind === 'pointerChild') {
    return (
      param.nameParameter.trim() === doc.parameterName.trim() ||
      param.typeParameter.trim() === String(doc.pointer ?? '').trim()
    )
  }
  if (doc.type === 'embed' && param.sourcePath.kind === 'embedChild') {
    return param.nameParameter.trim() === doc.parameterName.trim()
  }
  return false
}

export function findMatchingBlockParameterForLabelEntry(
  structure: BlockStructurePayload,
  parameterKey: string,
): BlockParameterDef | undefined {
  const trimmedKey = parameterKey.trim()
  if (!trimmedKey) {
    return undefined
  }

  const byId = structure.parameters.find((param) => param.idParameter.trim() === trimmedKey)
  if (byId) {
    return byId
  }

  const doc = findBlockParameterDocForLabelEntry(structure.blockType, trimmedKey)
  if (!doc) {
    return structure.parameters.find((param) => param.nameParameter.trim() === trimmedKey)
  }

  if (isParameterAlreadyOnBlock(structure.parameters, doc)) {
    return structure.parameters.find((param) => parameterMatchesCatalogDoc(param, doc))
  }

  return structure.parameters.find((param) => parameterMatchesCatalogDoc(param, doc))
}

export function remapLabelParametersForBlockStructure(
  structure: BlockStructurePayload,
  labelParameters: readonly LabelParameterEntry[],
): LabelParameterEntry[] {
  return labelParameters.map((entry) => {
    const matched = findMatchingBlockParameterForLabelEntry(structure, entry.parameterId)
    return {
      parameterId: matched?.idParameter ?? entry.parameterId,
      ...(entry.hiddenInParent ? { hiddenInParent: true } : {}),
    }
  })
}

/** Parâmetros do bloco pai já atribuídos a outras labels (exclui a label em edição). */
export function listParameterIdsReservedBySiblingLabels(
  scene: CanvasScene,
  parentBlockNodeId: string,
  parentStructure: BlockStructurePayload,
  excludeLabelNodeId?: string,
): string[] {
  const reserved = new Set<string>()

  for (const labelNode of findLabelNodesForParent(scene, parentBlockNodeId)) {
    if (excludeLabelNodeId && labelNode.id === excludeLabelNodeId) {
      continue
    }
    const structure = labelNode.labelStructure
    if (!structure) {
      continue
    }
    for (const entry of structure.parameters) {
      const matched = findMatchingBlockParameterForLabelEntry(parentStructure, entry.parameterId)
      reserved.add(matched?.idParameter ?? entry.parameterId.trim())
    }
  }

  return [...reserved]
}

export function resolveCatalogParameterLabel(parameterId: string): string {
  const doc = findBlockParameterDocBySourceId(parameterId)
  if (!doc) {
    return parameterId
  }
  return doc.name?.trim() || doc.parameterName.trim() || parameterId
}

export function listLinkableBlockNodes(scene: CanvasScene): CanvasNode[] {
  return scene.nodes.filter(
    (node) => isBlockCanvasNode(node) && node.blockViewActive && Boolean(node.blockStructure),
  )
}

export function resolveLabelCatalogBlockType(structure: LabelStructurePayload): string | undefined {
  const explicit = structure.catalogBlockType?.trim()
  if (explicit) {
    return explicit
  }

  for (const entry of structure.parameters) {
    const doc = findBlockParameterDocBySourceId(entry.parameterId)
    const blockType = doc?.block.trim()
    if (blockType) {
      return blockType
    }
  }

  return undefined
}

export function listLinkableBlockNodesForCatalogType(
  scene: CanvasScene,
  catalogBlockType: string | undefined,
): CanvasNode[] {
  const trimmedType = catalogBlockType?.trim()
  if (!trimmedType) {
    return []
  }

  return listLinkableBlockNodes(scene).filter(
    (node) => node.blockStructure?.blockType.trim() === trimmedType,
  )
}

export type LabelBlockTypeOption = {
  blockType: string
  label: string
}

export function listBlockTypeOptionsForLabelPicker(): LabelBlockTypeOption[] {
  const seen = new Set<string>()
  const options: LabelBlockTypeOption[] = []

  for (const definition of blockDefinitionsList()) {
    const blockType = definition.blockName.trim()
    if (!blockType || seen.has(blockType)) {
      continue
    }
    seen.add(blockType)
    options.push({
      blockType,
      label: definition.name?.trim() || blockType,
    })
  }

  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
}

function dedupeCatalogParameters(
  docs: readonly BlockParameterJsonDocument[],
): Array<{ idParameter: string; nameParameter: string }> {
  const seen = new Set<string>()
  const items: Array<{ idParameter: string; nameParameter: string }> = []

  for (const doc of docs) {
    const parameterName = doc.parameterName.trim()
    if (!parameterName || seen.has(parameterName)) {
      continue
    }
    seen.add(parameterName)
    items.push({
      idParameter: doc.id.trim() || parameterName,
      nameParameter: doc.name?.trim() || parameterName,
    })
  }

  items.sort((a, b) => a.nameParameter.localeCompare(b.nameParameter))
  return items
}

export function catalogParametersForBlockType(
  blockType: string,
): Array<{ idParameter: string; nameParameter: string }> {
  const trimmed = blockType.trim()
  if (!trimmed) {
    return []
  }
  return dedupeCatalogParameters(blockParameterCatalogForBlock(trimmed))
}

export function catalogParametersForLabelPicker(): Array<{
  idParameter: string
  nameParameter: string
}> {
  return dedupeCatalogParameters(listAllBlockParametersFromCatalog())
}
