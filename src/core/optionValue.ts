import type { NodeDataType } from '@/core/nodeSchema'
import {
  formatF32ListDisplay,
  formatListF32Preview,
  normalizeListF32String,
  parseListF32String,
} from '@/core/listF32Value'
import {
  formatStringListDisplay,
  normalizeListStringString,
  parseListStringString,
} from '@/core/listStringValue'
import {
  formatListVector3Preview,
  formatVector3RitualBrace,
  parseListVec3BlocksFromRitualBody,
  parseListVector3String,
} from '@/core/listVector3Value'
import { formatVector3String, parseVector3String, type Vector3 } from '@/core/vector3Value'

export function isOptionRitType(ritType: string): boolean {
  return /^option\[/i.test(ritType.trim())
}

export function parseOptionInnerType(ritType: string): string | null {
  const match = /^option\[([^\]]+)\]/i.exec(ritType.trim())
  return match?.[1]?.trim().toLowerCase() ?? null
}

export function isOptionF32RitType(ritType: string): boolean {
  if (!isOptionRitType(ritType)) {
    return false
  }
  const inner = parseOptionInnerType(ritType)
  return inner === 'f32' || inner === 'float' || inner === 'double'
}

export function isOptionStringRitType(ritType: string): boolean {
  return isOptionRitType(ritType) && parseOptionInnerType(ritType) === 'string'
}

export function isOptionVec3RitType(ritType: string): boolean {
  return isOptionRitType(ritType) && parseOptionInnerType(ritType) === 'vec3'
}

export function resolveOptionParameterType(ritType: string): NodeDataType | null {
  if (!isOptionRitType(ritType)) {
    return null
  }
  if (isOptionF32RitType(ritType)) {
    return 'optionF32'
  }
  if (isOptionStringRitType(ritType)) {
    return 'optionString'
  }
  if (isOptionVec3RitType(ritType)) {
    return 'optionVector3'
  }
  return null
}

export function parseOptionF32Items(raw: string): string[] {
  return parseListF32String(raw).slice(0, 1)
}

export function formatOptionF32Scalar(items: readonly string[]): string {
  if (items.length === 0) {
    return ''
  }
  return parseListF32String(items[0]!)[0] ?? '0'
}

export function normalizeOptionF32String(raw: string): string {
  return formatOptionF32Scalar(parseOptionF32Items(raw))
}

export function normalizeOptionF32RitualBody(inner: string): string {
  return normalizeOptionF32String(normalizeListF32String(inner.split('\n').join(' ')))
}

export function isValidPartialOptionF32Value(value: string): boolean {
  return /^[0-9.\s\-eE+\n\r]*$/.test(value)
}

export function formatOptionF32Preview(value: string): string {
  const items = parseOptionF32Items(value)
  return formatListF32Preview(items, 1)
}

export { formatF32ListDisplay as formatOptionF32Display }

export function parseOptionStringItems(raw: string): string[] {
  return parseListStringString(raw).slice(0, 1)
}

export function formatOptionStringScalar(items: readonly string[]): string {
  if (items.length === 0) {
    return ''
  }
  return parseListStringString(items[0]!)[0] ?? ''
}

export function normalizeOptionStringString(raw: string): string {
  return formatOptionStringScalar(parseOptionStringItems(raw))
}

export function normalizeOptionStringRitualBody(inner: string): string {
  return normalizeOptionStringString(normalizeListStringString(inner))
}

export function isValidPartialOptionStringValue(value: string): boolean {
  return /^[\s\S]*$/.test(value)
}

export function formatOptionStringPreview(value: string): string {
  const items = parseOptionStringItems(value)
  if (items.length === 0) {
    return '∅'
  }
  return formatStringListDisplay(items[0]!)
}

export function parseOptionVector3Items(raw: string): Vector3[] {
  const fromList = parseListVector3String(raw)
  if (fromList.length > 0) {
    return fromList.slice(0, 1)
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }
  return [parseVector3String(trimmed)]
}

export function formatOptionVector3Scalar(items: readonly Vector3[]): string {
  if (items.length === 0) {
    return ''
  }
  return formatVector3String(items[0]!)
}

export function normalizeOptionVector3String(raw: string): string {
  return formatOptionVector3Scalar(parseOptionVector3Items(raw))
}

export function normalizeOptionVec3RitualBody(inner: string): string {
  const blocks = parseListVec3BlocksFromRitualBody(inner)
  if (blocks.length > 0) {
    return formatOptionVector3Scalar(blocks)
  }
  return normalizeOptionVector3String(inner)
}

export function isValidPartialOptionVector3Value(value: string): boolean {
  return /^[0-9.\s,\-eE+\n\r{}]*$/.test(value)
}

export function formatOptionVector3Preview(value: string): string {
  const items = parseOptionVector3Items(value)
  return formatListVector3Preview(items, 1)
}

export { formatVector3RitualBrace as formatOptionVector3Display }
