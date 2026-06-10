/** Tipos do sistema Label Block (segmentação visual de blocos). */

/** Largura fixa do LabelCard no canvas (px). */
export const LABEL_CARD_WIDTH = 360

/** Valor de `parentBlockNodeId` quando a label ainda não foi vinculada a um bloco. */
export const UNLINKED_LABEL_PARENT_ID = ''

export type LabelParameterEntry = {
  parameterId: string
  hiddenInParent?: boolean
}

export type LabelStructurePayload = {
  labelName: string
  color: string
  parentBlockNodeId: string
  /** Tipo de bloco do catálogo usado para filtrar parâmetros e candidatos ao vínculo. */
  catalogBlockType?: string
  parameters: LabelParameterEntry[]
}

export type CreateLabelDraft = {
  labelName: string
  color: string
  parameters: LabelParameterEntry[]
  catalogBlockType?: string
}

export function labelHeaderSlotId(labelNodeId: string, slotIndex = 0): string {
  return `label-header:${labelNodeId}:${slotIndex}`
}

export function parseLabelHeaderSlotId(
  slotId: string,
): { labelNodeId: string; slotIndex: number } | null {
  const match = /^label-header:([^:]+):(\d+)$/.exec(slotId.trim())
  if (!match) {
    return null
  }
  return {
    labelNodeId: match[1]!,
    slotIndex: Number.parseInt(match[2]!, 10),
  }
}

export const LABEL_JSON_OUTPUT_TYPE = 'json'
