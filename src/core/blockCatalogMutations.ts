import type { BlockInspectorDraftEntry, BlockParameterDef, BlockStructurePayload } from './blockSchema'
import { applyBlockStructureToNodeValues } from './syncBlockToCode'
import { blockTokenFromParameterDef } from './blockTokenParser'
import type { BlockParameterJsonDocument } from './blockParameterJson'
import { isSimpleBlockParameterDocument } from './blockParameterJson'
import {
  applyInspectorEntryToParameterDef,
  blockParameterDefFromJsonDocument,
  isParameterAlreadyOnBlock,
} from './blockParameterFromJson'
import type { CanvasNode, CanvasScene } from './canvasScene'

/** Política por defeito: simples sem slots; estruturais (embed/pointer) só saída. */
export const DEFAULT_BLOCK_PARAMETER_SLOT_POLICY = {
  disableSimpleSlotsByDefault: true,
  complexOutputOnlyByDefault: true,
} as const

export function identificationCodeForParameter(
  structure: BlockStructurePayload,
  param: BlockParameterDef,
): string {
  return blockTokenFromParameterDef(structure.blockType, structure.blockName, param)
}

export function addParameterToBlockStructure(
  structure: BlockStructurePayload,
  doc: BlockParameterJsonDocument,
  options?: Partial<typeof DEFAULT_BLOCK_PARAMETER_SLOT_POLICY>,
): { structure: BlockStructurePayload; error?: string } {
  if (isParameterAlreadyOnBlock(structure.parameters, doc)) {
    return { structure, error: 'Parâmetro já existe no bloco.' }
  }

  const slotPolicy = {
    disableSimpleSlotsByDefault:
      options?.disableSimpleSlotsByDefault ?? DEFAULT_BLOCK_PARAMETER_SLOT_POLICY.disableSimpleSlotsByDefault,
    complexOutputOnlyByDefault:
      options?.complexOutputOnlyByDefault ?? DEFAULT_BLOCK_PARAMETER_SLOT_POLICY.complexOutputOnlyByDefault,
  }

  const addedParam = blockParameterDefFromJsonDocument(doc, structure.blockName, structure.parameters)
  let param = addedParam

  if (slotPolicy.disableSimpleSlotsByDefault && isSimpleBlockParameterDocument(doc)) {
    param = { ...param, slotRules: undefined }
  }

  if (slotPolicy.complexOutputOnlyByDefault && !isSimpleBlockParameterDocument(doc)) {
    const outputs = param.slotRules?.outputs ?? []
    param = {
      ...param,
      slotRules: outputs.length > 0 ? { outputs } : undefined,
    }
  }
  const identification_codes = [...structure.identification_codes, identificationCodeForParameter(structure, param)]

  return {
    structure: {
      ...structure,
      parameters: [...structure.parameters, param],
      identification_codes,
    },
  }
}

export function removeParameterFromBlockStructure(
  structure: BlockStructurePayload,
  paramId: string,
): BlockStructurePayload {
  const parameters = structure.parameters.filter((entry) => entry.idParameter !== paramId)
  if (parameters.length === structure.parameters.length) {
    return structure
  }

  const identification_codes = parameters.map((param) =>
    identificationCodeForParameter(structure, param),
  )

  return {
    ...structure,
    parameters,
    identification_codes,
  }
}

export function updateParameterInBlockStructure(
  structure: BlockStructurePayload,
  paramId: string,
  entry: BlockInspectorDraftEntry,
): BlockStructurePayload {
  const parameters = structure.parameters.map((param) => {
    if (param.idParameter !== paramId) {
      return param
    }
    const updated = applyInspectorEntryToParameterDef(param, entry)
    return updated
  })

  const identification_codes = parameters.map((param) =>
    identificationCodeForParameter(structure, param),
  )

  return {
    ...structure,
    parameters,
    identification_codes,
  }
}

export function applyBlockStructureWithTokens(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  structure: BlockStructurePayload,
): { node: CanvasNode['node']; childPatches: Array<{ nodeId: string; node: CanvasNode['node'] }> } {
  return applyBlockStructureToNodeValues(scene, canvasNode, structure)
}
