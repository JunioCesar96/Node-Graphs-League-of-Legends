import { blockParameterTypeToNodeDataType, isBlockTokenValue } from '@/core/blockSchema'
import { parseBlockToken } from '@/core/blockTokenParser'
import { normalizeListF32String } from '@/core/listF32Value'
import { normalizeListHashString } from '@/core/listHashValue'
import { normalizeListStringString } from '@/core/listStringValue'
import { normalizeListVector2String } from '@/core/listVector2Value'
import { normalizeListVector3String } from '@/core/listVector3Value'
import { normalizeListVector4String } from '@/core/listVector4Value'
import {
  normalizeOptionF32String,
  normalizeOptionStringString,
  normalizeOptionVector3String,
} from '@/core/optionValue'

function stripQuotedString(value: string): string {
  return value.replace(/^"|"$/g, '')
}

function stripOuterBraces(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function normalizeInputByNodeType(raw: string, typeParameter: string): string {
  const nodeType = blockParameterTypeToNodeDataType(typeParameter)
  const inner = stripOuterBraces(raw)

  switch (nodeType) {
    case 'string':
      return stripQuotedString(inner)
    case 'listF32':
      return normalizeListF32String(inner)
    case 'listString':
      return normalizeListStringString(inner)
    case 'listHash':
      return normalizeListHashString(inner)
    case 'listVector2':
      return normalizeListVector2String(inner)
    case 'listVector3':
      return normalizeListVector3String(inner)
    case 'listVector4':
      return normalizeListVector4String(inner)
    case 'optionF32':
      return normalizeOptionF32String(inner)
    case 'optionString':
      return normalizeOptionStringString(inner)
    case 'optionVector3':
      return normalizeOptionVector3String(inner)
    default:
      return inner
  }
}

/** Valor editável para `ParameterValueInput` a partir do token/scalar do bloco. */
export function resolveBlockParameterInputValue(
  fullValue: string,
  typeParameter?: string,
): string {
  const trimmed = fullValue.trim()
  if (!trimmed) {
    return trimmed
  }

  if (!isBlockTokenValue(trimmed)) {
    if (typeParameter) {
      return normalizeInputByNodeType(trimmed, typeParameter)
    }
    return trimmed
  }

  const parsed = parseBlockToken(trimmed)
  if (!parsed) {
    return trimmed
  }

  if (parsed.slotRules?.outputs?.length) {
    return trimmed
  }

  const resolvedType = typeParameter?.trim() || parsed.typeParameter
  return normalizeInputByNodeType(parsed.defaultValue, resolvedType)
}
