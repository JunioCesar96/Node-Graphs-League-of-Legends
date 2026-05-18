import type { NodeDataType } from '@/core/nodeSchema'
import { isValidPartialRgbaValue, normalizeRgbaString } from '@/core/rgbaColor'
import { isValidPartialVector2Value, normalizeVector2String } from '@/core/vector2Value'
import { isValidPartialBoolValue, normalizeBoolString } from '@/core/boolValue'
import { isValidPartialVector3Value, normalizeVector3String } from '@/core/vector3Value'
import { isValidPartialListF32Value, normalizeListF32String } from '@/core/listF32Value'
import { isValidPartialListHashValue, normalizeListHashString } from '@/core/listHashValue'
import { isValidPartialListStringValue, normalizeListStringString } from '@/core/listStringValue'
import { isValidPartialListVector2Value, normalizeListVector2String } from '@/core/listVector2Value'
import { isValidPartialListVector3Value, normalizeListVector3String } from '@/core/listVector3Value'
import { isValidPartialListVector4Value, normalizeListVector4String } from '@/core/listVector4Value'
import { isValidPartialVector4Value, normalizeVector4String } from '@/core/vector4Value'
import {
  boundedIntegerInputHint,
  boundedIntegerRejectionMessage,
  isBoundedIntegerType,
  isValidPartialBoundedInteger,
  normalizeBoundedIntegerForCommit,
} from '@/core/parameterBoundedTypes'

export { U32_MAX } from '@/core/parameterBoundedTypes'

const INTEGER_PARTIAL = /^-?\d*$/

/** Número decimal em edição: opcional «-», dígitos, no máximo um «.» (permite «-» ou «.» a meio da edição). */
const FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

const SINGLE_LINE_TEXT = /^[^\r\n]*$/

const FLOAT_LIKE_TYPES = new Set<NodeDataType>(['float', 'double', 'f32'])

const NUMERIC_INPUT_TYPES = new Set<NodeDataType>([
  'integer',
  'i8',
  'u8',
  'i16',
  'u16',
  'i32',
  'u32',
  'i64',
  'u64',
])

export function usesDecimalInputMode(type: NodeDataType): boolean {
  return FLOAT_LIKE_TYPES.has(type)
}

export function usesNumericInputMode(type: NodeDataType): boolean {
  return NUMERIC_INPUT_TYPES.has(type)
}

export function getParameterInputHint(type: NodeDataType): string {
  if (isBoundedIntegerType(type)) {
    return boundedIntegerInputHint(type)
  }

  switch (type) {
    case 'integer':
      return 'Valor inteiro: só dígitos e «-» no início.'
    case 'float':
    case 'double':
    case 'f32':
      return 'Número decimal: dígitos e no máximo um ponto (ex.: -3.14).'
    case 'bool':
      return 'Bool: clique para escolher true ou false.'
    case 'vector2':
      return 'Vec2: clique para abrir o seletor (x, y) ou edite «x, y» manualmente.'
    case 'vector3':
      return 'Vec3: clique para abrir o seletor (x, y, z) ou edite «x, y, z» manualmente.'
    case 'vector4':
      return 'Vec4: clique para abrir o seletor (x, y, z, w) ou edite «x, y, z, w» manualmente.'
    case 'listF32':
      return 'List[f32]: clique para abrir o editor de lista ou edite um valor por linha.'
    case 'listString':
      return 'List[string]: clique para abrir o editor de lista ou edite um texto por linha.'
    case 'listHash':
      return 'List[hash]: clique para abrir o editor de lista ou edite um hash por linha (nome ou 0x…).'
    case 'listVector2':
      return 'List[Vec2]: clique para abrir o editor de lista ou edite itens «x, y» (um por linha).'
    case 'listVector3':
      return 'List[Vec3]: clique para abrir o editor de lista ou edite itens «x, y, z» (um por linha).'
    case 'listVector4':
      return 'List[Vec4]: clique para abrir o editor de lista ou edite itens «x, y, z, w» (um por linha).'
    case 'rgba':
      return 'Cor RGBA: clique para abrir o seletor (r, g, b, a em 0..1 ou 0..255).'
    case 'keyword':
    case 'property':
    case 'symbol':
      return 'Texto numa linha; sem quebras de linha.'
    case 'string':
    case 'comment':
      return 'Texto livre.'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function getParameterInputRejectionMessage(type: NodeDataType): string {
  if (isBoundedIntegerType(type)) {
    return boundedIntegerRejectionMessage(type)
  }

  switch (type) {
    case 'integer':
      return 'Este campo só inteiro: use apenas dígitos e «-» no início.'
    case 'float':
    case 'double':
    case 'f32':
      return 'Este campo só aceita números decimais (dígitos e um ponto decimal).'
    case 'bool':
      return 'Escolha true ou false na lista.'
    case 'vector2':
      return 'Use o seletor Vec2 ou valores numéricos separados por vírgula.'
    case 'vector3':
      return 'Use o seletor Vec3 ou valores numéricos separados por vírgula.'
    case 'vector4':
      return 'Use o seletor Vec4 ou valores numéricos separados por vírgula.'
    case 'listF32':
      return 'Use o editor List[f32] ou um número por linha.'
    case 'listString':
      return 'Use o editor List[string] ou um texto por linha.'
    case 'listHash':
      return 'Use o editor List[hash] ou um hash por linha (nome entre aspas ou 0x…).'
    case 'listVector2':
      return 'Use o editor List[Vec2] ou um vec2 por linha (formato «x, y»).'
    case 'listVector3':
      return 'Use o editor List[Vec3] ou um vec3 por linha (formato «x, y, z»).'
    case 'listVector4':
      return 'Use o editor List[Vec4] ou um vec4 por linha (formato «x, y, z, w»).'
    case 'rgba':
      return 'Use o seletor de cor ou valores numéricos separados por vírgula.'
    case 'keyword':
    case 'property':
    case 'symbol':
      return 'Não são permitidas quebras de linha neste campo.'
    case 'string':
    case 'comment':
      return 'Entrada não permitida.'
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

export function isValidPartialParameterValue(type: NodeDataType, value: string): boolean {
  if (type === 'rgba') {
    return isValidPartialRgbaValue(value)
  }
  if (type === 'bool') {
    return isValidPartialBoolValue(value)
  }
  if (type === 'vector2') {
    return isValidPartialVector2Value(value)
  }
  if (type === 'vector3') {
    return isValidPartialVector3Value(value)
  }
  if (type === 'vector4') {
    return isValidPartialVector4Value(value)
  }
  if (type === 'listF32') {
    return isValidPartialListF32Value(value)
  }
  if (type === 'listString') {
    return isValidPartialListStringValue(value)
  }
  if (type === 'listHash') {
    return isValidPartialListHashValue(value)
  }
  if (type === 'listVector2') {
    return isValidPartialListVector2Value(value)
  }
  if (type === 'listVector3') {
    return isValidPartialListVector3Value(value)
  }
  if (type === 'listVector4') {
    return isValidPartialListVector4Value(value)
  }

  if (isBoundedIntegerType(type)) {
    return isValidPartialBoundedInteger(type, value)
  }

  switch (type) {
    case 'integer':
      return INTEGER_PARTIAL.test(value)
    case 'float':
    case 'double':
    case 'f32':
      return FLOAT_PARTIAL.test(value)
    case 'keyword':
    case 'property':
    case 'symbol':
      return SINGLE_LINE_TEXT.test(value)
    case 'string':
    case 'comment':
      return true
    default: {
      const _exhaustive: never = type
      return _exhaustive
    }
  }
}

/** Normaliza valor ao confirmar edição (blur/Enter). */
export function normalizeParameterValueForCommit(type: NodeDataType, value: string): string {
  if (type === 'rgba') {
    return normalizeRgbaString(value)
  }
  if (type === 'bool') {
    return normalizeBoolString(value)
  }
  if (type === 'vector2') {
    return normalizeVector2String(value)
  }
  if (type === 'vector3') {
    return normalizeVector3String(value)
  }
  if (type === 'vector4') {
    return normalizeVector4String(value)
  }
  if (type === 'listF32') {
    return normalizeListF32String(value)
  }
  if (type === 'listString') {
    return normalizeListStringString(value)
  }
  if (type === 'listHash') {
    return normalizeListHashString(value)
  }
  if (type === 'listVector2') {
    return normalizeListVector2String(value)
  }
  if (type === 'listVector3') {
    return normalizeListVector3String(value)
  }
  if (type === 'listVector4') {
    return normalizeListVector4String(value)
  }
  if (isBoundedIntegerType(type)) {
    return normalizeBoundedIntegerForCommit(type, value)
  }
  return value
}
