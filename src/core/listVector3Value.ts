import {
  formatNewlineList,
  formatListVectorPreview,
  isValidPartialBracedListValue,
  parseBracedBlocksFromRitualBody,
  parseNewlineList,
} from '@/core/listVectorBracedValue'
import { formatVector3String, parseVector3String, type Vector3 } from '@/core/vector3Value'

export function isListVec3RitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bvec3\b[^\]]*\]/i.test(ritType.trim())
}

export function parseListVec3BlocksFromRitualBody(inner: string): Vector3[] {
  return parseBracedBlocksFromRitualBody(inner, (block) => parseVector3String(block))
}

export function formatListVector3String(items: readonly Vector3[]): string {
  return formatNewlineList(items, formatVector3String)
}

export function parseListVector3String(raw: string): Vector3[] {
  return parseNewlineList(raw, parseVector3String, parseListVec3BlocksFromRitualBody)
}

export function normalizeListVector3String(raw: string): string {
  return formatListVector3String(parseListVector3String(raw))
}

export function normalizeListVec3RitualBody(inner: string): string {
  return formatListVector3String(parseListVec3BlocksFromRitualBody(inner))
}

export function isValidPartialListVector3Value(value: string): boolean {
  return isValidPartialBracedListValue(value)
}

export function formatVector3RitualBrace(item: Vector3): string {
  const parts = formatVector3String(item)
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(' , ')} }`
}

export function formatListVector3Preview(items: readonly Vector3[], maxItems = 2): string {
  return formatListVectorPreview(items, formatVector3RitualBrace, maxItems)
}
