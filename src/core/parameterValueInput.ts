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
import {
  isValidPartialOptionF32Value,
  isValidPartialOptionStringValue,
  isValidPartialOptionVector3Value,
  normalizeOptionF32String,
  normalizeOptionStringString,
  normalizeOptionVector3String,
} from '@/core/optionValue'
import {
  isValidPartialMapHashLinkValue,
  normalizeMapHashLinkString,
} from '@/core/mapHashLinkValue'
import {
  isValidPartialMapHashEmbedValue,
  normalizeMapHashEmbedString,
} from '@/core/mapHashEmbedValue'
import {
  isValidPartialMapHashPointerValue,
  normalizeMapHashPointerString,
} from '@/core/mapHashPointerValue'
import {
  isValidPartialMapU64PointerValue,
  normalizeMapU64PointerString,
} from '@/core/mapU64PointerValue'
import { isValidPartialLinkValue, normalizeLinkPath } from '@/core/linkValue'
import { isValidPartialMtx44Value, normalizeMtx44String } from '@/core/mtx44Value'
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
    case 'flag':
      return 'Flag: clique para escolher true ou false.'
    case 'vector2':
      return 'Vec2: clique para abrir o seletor (x, y) ou edite «x, y» manualmente.'
    case 'vector3':
      return 'Vec3: clique para abrir o seletor (x, y, z) ou edite «x, y, z» manualmente.'
    case 'vector4':
      return 'Vec4: clique para abrir o seletor (x, y, z, w) ou edite «x, y, z, w» manualmente.'
    case 'mtx44':
      return 'Mtx44: clique para abrir o seletor (escala e translação) ou edite os 16 valores manualmente.'
    case 'link':
      return 'Link: clique para abrir o editor de caminho (segmentos separados por /).'
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
    case 'optionF32':
      return 'Option[f32]: clique para abrir o editor (no máximo um valor).'
    case 'optionString':
      return 'Option[string]: clique para abrir o editor (no máximo um valor).'
    case 'optionVector3':
      return 'Option[vec3]: clique para abrir o editor (no máximo um vec3).'
    case 'mapHashLink':
      return 'Map[hash,link]: clique para abrir o editor de pares hash → valor.'
    case 'mapHashPointer':
      return 'Map[hash,pointer]: pares hash → estrutura interna (ligação no canvas).'
    case 'mapHashEmbed':
      return 'Map[hash,embed]: pares hash → estrutura interna (ligação no canvas).'
    case 'mapU64Pointer':
      return 'Map[u64,pointer]: pares u64 → estrutura interna (ligação no canvas).'
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
    case 'flag':
      return 'Escolha true ou false na lista.'
    case 'vector2':
      return 'Use o seletor Vec2 ou valores numéricos separados por vírgula.'
    case 'vector3':
      return 'Use o seletor Vec3 ou valores numéricos separados por vírgula.'
    case 'vector4':
      return 'Use o seletor Vec4 ou valores numéricos separados por vírgula.'
    case 'mtx44':
      return 'Use o seletor mtx44 ou 16 números (escala diagonal + translação).'
    case 'link':
      return 'Use o editor de caminho link ou um texto numa linha sem quebras.'
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
    case 'optionF32':
      return 'Use o editor Option[f32] para definir um único valor.'
    case 'optionString':
      return 'Use o editor Option[string] para definir um único texto.'
    case 'optionVector3':
      return 'Use o editor Option[vec3] para definir um único vec3.'
    case 'mapHashLink':
      return 'Use o editor Map[hash,link]; valores com / abrem o picker link.'
    case 'mapHashPointer':
      return 'Edite as entradas hash e ligue cada estrutura pela porta.'
    case 'mapHashEmbed':
      return 'Edite as entradas hash e ligue cada estrutura pela porta.'
    case 'mapU64Pointer':
      return 'Edite as entradas u64 e ligue cada estrutura pela porta.'
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
  if (type === 'bool' || type === 'flag') {
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
  if (type === 'mtx44') {
    return isValidPartialMtx44Value(value)
  }
  if (type === 'link') {
    return isValidPartialLinkValue(value)
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
  if (type === 'optionF32') {
    return isValidPartialOptionF32Value(value)
  }
  if (type === 'optionString') {
    return isValidPartialOptionStringValue(value)
  }
  if (type === 'optionVector3') {
    return isValidPartialOptionVector3Value(value)
  }
  if (type === 'mapHashLink') {
    return isValidPartialMapHashLinkValue(value)
  }
  if (type === 'mapHashPointer') {
    return isValidPartialMapHashPointerValue(value)
  }
  if (type === 'mapHashEmbed') {
    return isValidPartialMapHashEmbedValue(value)
  }
  if (type === 'mapU64Pointer') {
    return isValidPartialMapU64PointerValue(value)
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
  if (type === 'bool' || type === 'flag') {
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
  if (type === 'mtx44') {
    return normalizeMtx44String(value)
  }
  if (type === 'link') {
    return normalizeLinkPath(value)
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
  if (type === 'optionF32') {
    return normalizeOptionF32String(value)
  }
  if (type === 'optionString') {
    return normalizeOptionStringString(value)
  }
  if (type === 'optionVector3') {
    return normalizeOptionVector3String(value)
  }
  if (type === 'mapHashLink') {
    return normalizeMapHashLinkString(value)
  }
  if (type === 'mapHashPointer') {
    return normalizeMapHashPointerString(value)
  }
  if (type === 'mapHashEmbed') {
    return normalizeMapHashEmbedString(value)
  }
  if (type === 'mapU64Pointer') {
    return normalizeMapU64PointerString(value)
  }
  if (isBoundedIntegerType(type)) {
    return normalizeBoundedIntegerForCommit(type, value)
  }
  return value
}
