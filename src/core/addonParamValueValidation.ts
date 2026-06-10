import {
  INTEGER_TYPE_BOUNDS,
  isBoundedIntegerType,
  isValidPartialBoundedInteger,
  type BoundedIntegerType,
} from '@/core/parameterBoundedTypes'
import { parseMtx44String } from '@/core/mtx44Value'
import {
  isValidPartialParameterValue,
  normalizeParameterValueForCommit,
} from '@/core/parameterValueInput'
import type { NodeDataType } from '@/core/nodeSchema'

export type AddonParamValueValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string }

const FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

/** Mapeia tipo ritual do add-on `addon-value-*` para `NodeDataType`. */
export function ritualParamTypeToNodeDataType(ritualType: string): NodeDataType {
  const ritual = ritualType.trim()
  switch (ritual) {
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
    case 'double':
      return 'double'
    case 'bool':
      return 'bool'
    case 'flag':
      return 'flag'
    case 'rgba':
      return 'rgba'
    case 'mtx44':
      return 'mtx44'
    case 'string':
      return 'string'
    default:
      if (isBoundedIntegerType(ritual)) {
        return ritual
      }
      return 'string'
  }
}

function isCommittedBoolValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === 'false'
}

function isCommittedFloatValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return false
  }
  if (!FLOAT_PARTIAL.test(trimmed)) {
    return false
  }
  return Number.isFinite(Number.parseFloat(trimmed))
}

function isCommittedBoundedInteger(type: BoundedIntegerType, value: string): boolean {
  if (!isValidPartialBoundedInteger(type, value)) {
    return false
  }
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') {
    return false
  }

  try {
    const { min, max, unsigned } = INTEGER_TYPE_BOUNDS[type]
    const parsed = unsigned ? BigInt(trimmed.replace(/\D/g, '')) : BigInt(trimmed)
    return parsed >= min && parsed <= max
  } catch {
    return false
  }
}

function vectorInnerParts(raw: string): string[] {
  let inner = raw.trim()
  const braced = /^\{\s*([^}]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  return inner.split(/[\s,]+/).filter(Boolean)
}

function isCommittedVectorComponents(value: string, count: number): boolean {
  const parts = vectorInnerParts(value)
  if (parts.length < count) {
    return false
  }
  return parts.slice(0, count).every((part) => Number.isFinite(Number.parseFloat(part)))
}

function trimMtx44Float(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}

function isCommittedMtx44Value(value: string): boolean {
  const parts = vectorInnerParts(value)
  if (parts.length < 16) {
    return false
  }
  return parts.slice(0, 16).every((part) => {
    const trimmed = part.trim()
    if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
      return false
    }
    return Number.isFinite(Number.parseFloat(trimmed))
  })
}

function normalizeMtx44FlatString(raw: string): string {
  return parseMtx44String(raw).map(trimMtx44Float).join(', ')
}

function isCommittedParameterValue(type: NodeDataType, value: string): boolean {
  if (!isValidPartialParameterValue(type, value)) {
    return false
  }

  if (type === 'string' || type === 'comment') {
    return !/[\r\n]/.test(value)
  }

  if (type === 'bool' || type === 'flag') {
    return isCommittedBoolValue(value)
  }

  if (isBoundedIntegerType(type)) {
    return isCommittedBoundedInteger(type, value)
  }

  if (type === 'float' || type === 'double' || type === 'f32') {
    return isCommittedFloatValue(value)
  }

  if (type === 'vector2') {
    return isCommittedVectorComponents(value, 2)
  }

  if (type === 'vector3') {
    return isCommittedVectorComponents(value, 3)
  }

  if (type === 'vector4' || type === 'rgba') {
    return isCommittedVectorComponents(value, 4)
  }

  if (type === 'mtx44') {
    return isCommittedMtx44Value(value)
  }

  return false
}

export function validateAddonParamLiteral(
  ritualType: string,
  raw: string,
): AddonParamValueValidationResult {
  const dataType = ritualParamTypeToNodeDataType(ritualType)

  if (!isCommittedParameterValue(dataType, raw)) {
    return {
      ok: false,
      reason: rejectionMessageForType(dataType),
    }
  }

  if (dataType === 'mtx44') {
    return {
      ok: true,
      value: normalizeMtx44FlatString(raw),
    }
  }

  return {
    ok: true,
    value: normalizeParameterValueForCommit(dataType, raw),
  }
}

function rejectionMessageForType(type: NodeDataType): string {
  if (isBoundedIntegerType(type)) {
    const { min, max, unsigned } = INTEGER_TYPE_BOUNDS[type]
    return unsigned
      ? `Valor inválido: use um inteiro entre ${min} e ${max}.`
      : `Valor inválido: use um inteiro entre ${min} e ${max}.`
  }

  switch (type) {
    case 'bool':
    case 'flag':
      return 'Valor inválido: use true ou false.'
    case 'f32':
    case 'float':
    case 'double':
      return 'Valor inválido: use um número decimal válido.'
    case 'vector2':
      return 'Valor inválido: use dois números separados por vírgula (x, y).'
    case 'vector3':
      return 'Valor inválido: use três números separados por vírgula (x, y, z).'
    case 'vector4':
      return 'Valor inválido: use quatro números separados por vírgula (x, y, z, w).'
    case 'rgba':
      return 'Valor inválido: use quatro números separados por vírgula (r, g, b, a).'
    case 'mtx44':
      return 'Valor inválido: use 16 números decimais (matriz 4×4).'
    case 'string':
      return 'Valor inválido: texto numa única linha.'
    default:
      return 'Valor inválido para este tipo.'
  }
}

export function isAddonValuePackageId(addonId: string): boolean {
  return addonId.startsWith('addon-value-')
}

export function ritualTypeFromAddonValuePackageId(addonId: string): string | null {
  if (!isAddonValuePackageId(addonId)) {
    return null
  }
  const ritual = addonId.slice('addon-value-'.length).trim()
  return ritual || null
}
