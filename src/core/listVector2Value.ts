import {
  formatNewlineList,
  formatListVectorPreview,
  isValidPartialBracedListValue,
  parseBracedBlocksFromRitualBody,
  parseNewlineList,
} from '@/core/listVectorBracedValue'
import { formatVector2String, parseVector2String, type Vector2 } from '@/core/vector2Value'

export function isListVec2RitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bvec2\b[^\]]*\]/i.test(ritType.trim())
}

export function parseListVec2BlocksFromRitualBody(inner: string): Vector2[] {
  return parseBracedBlocksFromRitualBody(inner, (block) => parseVector2String(block))
}

export function formatListVector2String(items: readonly Vector2[]): string {
  return formatNewlineList(items, formatVector2String)
}

export function parseListVector2String(raw: string): Vector2[] {
  return parseNewlineList(raw, parseVector2String, parseListVec2BlocksFromRitualBody)
}

export function normalizeListVector2String(raw: string): string {
  return formatListVector2String(parseListVector2String(raw))
}

export function normalizeListVec2RitualBody(inner: string): string {
  return formatListVector2String(parseListVec2BlocksFromRitualBody(inner))
}

export function isValidPartialListVector2Value(value: string): boolean {
  return isValidPartialBracedListValue(value)
}

export function formatVector2RitualBrace(item: Vector2): string {
  const parts = formatVector2String(item)
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(' , ')} }`
}

export function formatListVector2Preview(items: readonly Vector2[], maxItems = 2): string {
  return formatListVectorPreview(items, formatVector2RitualBrace, maxItems)
}
