import { formatBoolString, parseBoolString } from '@/core/boolValue'
import { formatHashListDisplay } from '@/core/listHashValue'
import { parseListF32String } from '@/core/listF32Value'
import { parseListHashString } from '@/core/listHashValue'
import { formatStringListDisplay, parseListStringString } from '@/core/listStringValue'
import { formatVector2RitualBrace, parseListVector2String } from '@/core/listVector2Value'
import { formatVector3RitualBrace, parseListVector3String } from '@/core/listVector3Value'
import { formatVector4RitualBrace, parseListVector4String } from '@/core/listVector4Value'
import { formatMapHashLinkRitualLine, parseMapHashLinkString } from '@/core/mapHashLinkValue'
import { formatMapHashPointerString, parseMapHashPointerString } from '@/core/mapHashPointerValue'
import { formatMapU64PointerString, parseMapU64PointerString } from '@/core/mapU64PointerValue'
import { parseMtx44String } from '@/core/mtx44Value'
import type { NodeDataType, NodeParameterDefinition } from '@/core/nodeSchema'
import { nodeDataTypeToRitType } from '@/core/nodeDataTypeToRitType'
import { ritualExportFieldNameFromParameter } from '@/core/ritualFieldNames'
import {
  formatOptionF32Scalar,
  formatOptionStringScalar,
  formatOptionVector3Scalar,
  parseOptionF32Items,
  parseOptionStringItems,
  parseOptionVector3Items,
} from '@/core/optionValue'
import { parseRgbaString } from '@/core/rgbaColor'
import { formatVector2String, parseVector2String } from '@/core/vector2Value'
import { formatVector3String, parseVector3String } from '@/core/vector3Value'
import { formatVector4String, parseVector4String } from '@/core/vector4Value'

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(rounded)
}

function formatRgbaRitualBrace(raw: string): string {
  const color = parseRgbaString(raw)
  const max = Math.max(color.r, color.g, color.b, color.a)
  const scale = max <= 1 ? 255 : 1
  const r = Math.round(color.r * scale)
  const g = Math.round(color.g * scale)
  const b = Math.round(color.b * scale)
  const a = Math.round(color.a * scale)
  return `{ ${r}, ${g}, ${b}, ${a} }`
}

function formatVec2RitualBrace(raw: string): string {
  const parts = formatVector2String(parseVector2String(raw))
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(', ')} }`
}

function formatVec3RitualBrace(raw: string): string {
  const parts = formatVector3String(parseVector3String(raw))
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(', ')} }`
}

function formatVec4RitualBrace(raw: string): string {
  const parts = formatVector4String(parseVector4String(raw))
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(', ')} }`
}

function formatMtx44RitualBrace(raw: string, innerIndent: string): string {
  const values = parseMtx44String(raw)
  const rows: string[] = []
  for (let row = 0; row < 4; row += 1) {
    const slice = values.slice(row * 4, row * 4 + 4).map(trimFloat)
    rows.push(slice.join(', '))
  }
  const rowIndent = `${innerIndent}    `
  return `{\n${rows.map((line) => `${rowIndent}${line}`).join('\n')}\n${innerIndent}}`
}

function formatPrimitiveListRitualBody(
  ritType: string,
  raw: string,
  innerIndent: string,
): string {
  const itemIndent = `${innerIndent}    `
  const lower = ritType.toLowerCase()

  if (/\blist\[string\]/i.test(lower)) {
    const items = parseListStringString(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${formatStringListDisplay(item)}`).join('\n')}\n${innerIndent}}`
  }
  if (/\blist\[f32\]/i.test(lower)) {
    const items = parseListF32String(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${item}`).join('\n')}\n${innerIndent}}`
  }
  if (/\blist\[hash\]/i.test(lower)) {
    const items = parseListHashString(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${formatHashListDisplay(item)}`).join('\n')}\n${innerIndent}}`
  }
  if (/\blist\[vec2\]/i.test(lower)) {
    const items = parseListVector2String(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${formatVec2RitualBrace(formatVector2String(item))}`).join('\n')}\n${innerIndent}}`
  }
  if (/\blist\[vec3\]/i.test(lower)) {
    const items = parseListVector3String(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${formatVec3RitualBrace(formatVector3String(item))}`).join('\n')}\n${innerIndent}}`
  }
  if (/\blist\[vec4\]/i.test(lower)) {
    const items = parseListVector4String(raw)
    if (items.length === 0) {
      return '{ }'
    }
    return `{\n${items.map((item) => `${itemIndent}${formatVec4RitualBrace(formatVector4String(item))}`).join('\n')}\n${innerIndent}}`
  }
  return `{ ${raw.trim()} }`
}

function formatMapRitualBody(type: NodeDataType, raw: string, innerIndent: string): string {
  const itemIndent = `${innerIndent}    `
  if (type === 'mapHashLink') {
    const entries = parseMapHashLinkString(raw)
    if (entries.length === 0) {
      return '{ }'
    }
    return `{\n${entries.map((entry) => `${itemIndent}${formatMapHashLinkRitualLine(entry)}`).join('\n')}\n${innerIndent}}`
  }
  if (type === 'mapHashPointer') {
    return `{ ${formatMapHashPointerString(parseMapHashPointerString(raw))} }`
  }
  if (type === 'mapU64Pointer') {
    return `{ ${formatMapU64PointerString(parseMapU64PointerString(raw))} }`
  }
  return '{ }'
}

function formatScalarRitualValue(
  type: NodeDataType,
  ritType: string,
  raw: string,
  valueIndent: string,
): string {
  const trimmed = raw.trim()
  if (!trimmed && type !== 'string') {
    return trimmed
  }

  switch (type) {
    case 'string':
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed
      }
      if (trimmed.includes('"')) {
        return `"${trimmed.replace(/"/g, '\\"')}"`
      }
      return `"${trimmed}"`
    case 'link':
      if (trimmed.startsWith('"')) {
        return trimmed
      }
      return `"${trimmed.replace(/"/g, '\\"')}"`
    case 'bool':
    case 'flag':
      return formatBoolString(parseBoolString(trimmed))
    case 'rgba':
      return formatRgbaRitualBrace(trimmed)
    case 'vector2':
      return formatVec2RitualBrace(trimmed)
    case 'vector3':
    case 'optionVector3':
      return formatVec3RitualBrace(trimmed)
    case 'vector4':
      return formatVec4RitualBrace(trimmed)
    case 'mtx44':
      return formatMtx44RitualBrace(trimmed, valueIndent)
    case 'optionF32':
      return formatOptionF32Scalar(parseOptionF32Items(trimmed))
    case 'optionString':
      return formatOptionStringScalar(parseOptionStringItems(trimmed))
    case 'optionVector3':
      return formatOptionVector3Scalar(parseOptionVector3Items(trimmed))
    case 'listF32':
    case 'listString':
    case 'listHash':
    case 'listVector2':
    case 'listVector3':
    case 'listVector4':
      return formatPrimitiveListRitualBody(ritType, trimmed, valueIndent)
    case 'mapHashLink':
    case 'mapHashPointer':
    case 'mapU64Pointer':
      return formatMapRitualBody(type, trimmed, valueIndent)
    default:
      return trimmed
  }
}

export type RitualScalarFormatOptions = {
  /** Nome literal no ritual (ex. type, version, linked no cabeçalho Main). */
  fieldName?: string
}

export function formatRitualScalarAssignment(
  parameter: Pick<NodeParameterDefinition, 'id' | 'name' | 'type'>,
  rawValue: string,
  lineIndent: string,
  options?: RitualScalarFormatOptions,
): string {
  const fieldName = options?.fieldName ?? ritualExportFieldNameFromParameter(parameter)
  const ritType = nodeDataTypeToRitType(parameter.type, fieldName)
  const value = formatScalarRitualValue(parameter.type, ritType, rawValue, lineIndent)
  return `${fieldName}: ${ritType} = ${value}`
}

export function formatMapEntryKey(key: string): string {
  const normalized = key.trim()
  if (/^0x[0-9a-fA-F]+$/i.test(normalized)) {
    return normalized
  }
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    return normalized
  }
  return `"${normalized.replace(/"/g, '\\"')}"`
}
