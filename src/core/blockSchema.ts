/** Tipos do sistema Bloco (BlockNodes). */

import type { NodeDataType } from './nodeSchema'

export type BlockParameterIconHint = 'Img' | 'Text' | 'Input' | null

/** Tag de slot no rascunho do inspetor (`in:vec`, `out:f32`, …). */
export type BlockInspectorSlotTag = {
  direction: 'input' | 'output'
  type: string
  active: boolean
}

/** Largura fixa do BlockCard no canvas (px). */
export const BLOCK_CARD_WIDTH = 360

/** Caminho do valor ritual exposto no bloco. */
export type BlockParameterSourcePath =
  | { kind: 'parameter'; parameterId: string }
  | { kind: 'embedChild'; embedId: string; slotId: string; childParameterId: string }
  | { kind: 'pointerChild'; pointerId: string; slotId: string }

export function isBlockPointerSourcePath(
  source: BlockParameterSourcePath,
): source is Extract<BlockParameterSourcePath, { kind: 'pointerChild' }> {
  return source.kind === 'pointerChild'
}

export function isBlockStructuralSourcePath(
  source: BlockParameterSourcePath,
): source is Extract<BlockParameterSourcePath, { kind: 'embedChild' | 'pointerChild' }> {
  return source.kind === 'embedChild' || source.kind === 'pointerChild'
}

export type BlockSlotRules = {
  outputs?: string[]
  inputs?: string[]
}

export type BlockParameterDef = {
  idParameter: string
  nameParameter: string
  typeParameter: string
  defaultValue: string
  slotRules?: BlockSlotRules
  iconHint?: BlockParameterIconHint
  /** Identificador de ícone (predefinido ou personalizado, ex.: blend.png). */
  iconId?: string
  /** Campo ritual `list[pointer]` / `list[embed]` — saída pode ligar a vários destinos. */
  listParameter?: boolean
  sourcePath: BlockParameterSourcePath
}

export type BlockStructureAppearance = {
  color: string
  headerSlots: string[]
  /** Campo pai em `in[...]` (JSON de bloco: `block`). */
  parentBlockField?: string
}

export type BlockStructurePayload = {
  blockType: string
  blockName: string
  parameters: BlockParameterDef[]
  identification_codes: string[]
  /** Cor e slots de cabeçalho do JSON de bloco (paleta) quando o tipo não está no registo antigo. */
  appearance?: BlockStructureAppearance
}

/** Definição de tipo de bloco (registo `blockStructures/`). */
export type BlockTypeDefinition = {
  id: string
  title: string
  color: string
  headerSlots: string[]
}

/** Rascunho do inspetor antes de gerar o bloco. */
export type BlockInspectorDraft = {
  blockType: string
  blockName: string
  entries: BlockInspectorDraftEntry[]
}

export type BlockInspectorDraftEntry = {
  sourcePath: BlockParameterSourcePath
  /** Nome ritual legível (emitterName, Color, …). */
  ritualName: string
  typeParameter: string
  defaultValue: string
  exposed: boolean
  nameParameter: string
  iconHint: BlockParameterIconHint
  /** Ícone personalizado ou id predefinido escolhido no inspetor. */
  iconId: string
  slotRules?: BlockSlotRules
  slotTags?: BlockInspectorSlotTag[]
}

export type BlockGeneratedDocument = {
  code: string
  blocks: Record<string, Pick<BlockTypeDefinition, 'color' | 'title'> & { slots: string[] }>
  identification_codes: string[]
}

export const BLOCK_TOKEN_PREFIX = '_blockType&'

export function isBlockTokenValue(value: string): boolean {
  return value.includes(BLOCK_TOKEN_PREFIX) && value.includes('_endParameter')
}

export function blockHeaderSlotId(
  blockType: string,
  slotIndex: number,
  fieldKey?: string,
): string {
  const base = `block-header:${blockType}:${slotIndex}`
  const trimmedField = fieldKey?.trim()
  if (!trimmedField) {
    return base
  }
  return `${base}:${trimmedField}`
}

export function parseBlockHeaderSlotId(
  slotId: string,
): { blockType: string; slotIndex: number; fieldKey?: string } | null {
  const match = /^block-header:([^:]+):(\d+)(?::(.+))?$/.exec(slotId.trim())
  if (!match) {
    return null
  }
  const slotIndex = Number(match[2])
  if (!Number.isFinite(slotIndex)) {
    return null
  }
  return {
    blockType: match[1]!,
    slotIndex,
    fieldKey: match[3]?.trim() || undefined,
  }
}

export function blockParameterSlotId(idParameter: string, direction: 'input' | 'output'): string {
  return `block-param:${idParameter}:${direction}`
}

/** Campo ritual `list[pointer]` ligado a filhos via slot indexado (`paramId__slot__N`). */
export function isBlockListPointerParameter(
  param: Pick<BlockParameterDef, 'listParameter' | 'sourcePath'>,
): boolean {
  return param.listParameter === true && param.sourcePath.kind === 'pointerChild'
}

export function blockListPointerOutputSlotIds(
  parameterId: string,
  maxIndex = 0,
): string[] {
  const slotIds: string[] = [blockParameterSlotId(parameterId, 'output')]
  for (let index = 0; index <= maxIndex; index += 1) {
    slotIds.push(`${parameterId}__slot__${String(index)}`)
  }
  return slotIds
}

export function isBlockMapStructureType(typeParameter: string): boolean {
  return (
    typeParameter === 'mapHashEmbed' ||
    typeParameter === 'mapHashPointer' ||
    typeParameter === 'mapU64Pointer'
  )
}

/** Converte tipo ritual do bloco para `NodeDataType` usado em `ParameterValueInput`. */
export function blockRitualTypeToNodeDataType(typeParameter: string): NodeDataType {
  switch (typeParameter) {
    case 'vec4':
      return 'vector4'
    case 'vec3':
    case 'vec':
      return 'vector3'
    case 'vec2':
      return 'vector2'
    case 'f32':
    case 'float':
      return 'f32'
    case 'bool':
    case 'flag':
      return 'bool'
    case 'u8':
      return 'u8'
    case 'rgba':
      return 'rgba'
    case 'string':
    default:
      return 'string'
  }
}
