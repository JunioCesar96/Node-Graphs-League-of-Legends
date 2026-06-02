/** Tipos do sistema Grupo (GroupNodes). */

import type { NodeDataType } from './nodeSchema'

export type GroupParameterIconHint = 'Img' | 'Text' | 'Input' | null

/** Tag de slot no rascunho do inspetor (`in:vec`, `out:f32`, …). */
export type GroupInspectorSlotTag = {
  direction: 'input' | 'output'
  type: string
  active: boolean
}

/** Largura fixa do GroupCard no canvas (px). */
export const GROUP_CARD_WIDTH = 360

/** Caminho do valor ritual exposto no Grupo. */
export type GroupParameterSourcePath =
  | { kind: 'parameter'; parameterId: string }
  | { kind: 'embedChild'; embedId: string; slotId: string; childParameterId: string }
  | { kind: 'pointerChild'; pointerId: string; slotId: string }

export function isGroupPointerSourcePath(
  source: GroupParameterSourcePath,
): source is Extract<GroupParameterSourcePath, { kind: 'pointerChild' }> {
  return source.kind === 'pointerChild'
}

export type GroupSlotRules = {
  outputs?: string[]
  inputs?: string[]
}

export type GroupParameterDef = {
  idParameter: string
  nameParameter: string
  typeParameter: string
  defaultValue: string
  slotRules?: GroupSlotRules
  iconHint?: GroupParameterIconHint
  /** Identificador de ícone (predefinido ou personalizado, ex.: blend.png). */
  iconId?: string
  sourcePath: GroupParameterSourcePath
}

export type GroupStructurePayload = {
  groupType: string
  groupName: string
  parameters: GroupParameterDef[]
  identification_codes: string[]
}

/** Definição de tipo de Grupo (registo `groupStructures/`). */
export type GroupTypeDefinition = {
  id: string
  title: string
  color: string
  /** Font Awesome (`fa-solid fa-*`), ficheiro em `groupStructures/icons/` (ex.: `VfxEmitter.png`), ou `none`. */
  icon?: string
  headerSlots: string[]
}

/** Rascunho do inspetor antes de gerar o Grupo. */
export type GroupInspectorDraft = {
  groupType: string
  groupName: string
  entries: GroupInspectorDraftEntry[]
}

export type GroupInspectorDraftEntry = {
  sourcePath: GroupParameterSourcePath
  /** Nome ritual legível (emitterName, Color, …). */
  ritualName: string
  typeParameter: string
  defaultValue: string
  exposed: boolean
  nameParameter: string
  iconHint: GroupParameterIconHint
  /** Ícone personalizado ou id predefinido escolhido no inspetor. */
  iconId: string
  slotRules?: GroupSlotRules
  slotTags?: GroupInspectorSlotTag[]
}

export type GroupGeneratedDocument = {
  code: string
  groups: Record<string, Pick<GroupTypeDefinition, 'color' | 'title'> & { slots: string[] }>
  identification_codes: string[]
}

export const GROUP_TOKEN_PREFIX = '_groupType&'

export function isGroupTokenValue(value: string): boolean {
  return value.includes(GROUP_TOKEN_PREFIX) && value.includes('_endParameter')
}

export function groupHeaderSlotId(groupType: string, slotIndex: number): string {
  return `group-header:${groupType}:${slotIndex}`
}

export function groupParameterSlotId(idParameter: string, direction: 'input' | 'output'): string {
  return `group-param:${idParameter}:${direction}`
}

/** Converte tipo ritual do Grupo para `NodeDataType` usado em `ParameterValueInput`. */
export function groupRitualTypeToNodeDataType(typeParameter: string): NodeDataType {
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
