import {
  formatNewlinePrimitiveList,
  formatPrimitiveListPreview,
  parseLinesFromRitualBody,
  parseNewlinePrimitiveList,
} from '@/core/listPrimitiveValue'

export function isListF32RitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bf32\b[^\]]*\]/i.test(ritType.trim())
}

function trimF32Value(raw: string): string {
  const n = Number.parseFloat(raw.trim())
  if (!Number.isFinite(n)) {
    return '0'
  }
  const rounded = Math.round(n * 1_000_000) / 1_000_000
  return String(rounded)
}

export function parseListF32String(raw: string): string[] {
  return parseNewlinePrimitiveList(
    raw,
    trimF32Value,
    (body) => body.split(/\s+/).filter(Boolean).map(trimF32Value),
  )
}

export function formatListF32String(items: readonly string[]): string {
  return formatNewlinePrimitiveList(items.map(trimF32Value))
}

export function normalizeListF32String(raw: string): string {
  return formatListF32String(parseListF32String(raw))
}

export function normalizeListF32RitualBody(inner: string): string {
  return formatListF32String(parseLinesFromRitualBody(inner).map(trimF32Value))
}

export function isValidPartialListF32Value(value: string): boolean {
  return /^[0-9.\s\-eE+\n\r]*$/.test(value)
}

export function formatF32ListDisplay(item: string): string {
  return trimF32Value(item)
}

export function formatListF32Preview(items: readonly string[], maxItems = 2): string {
  return formatPrimitiveListPreview(items, maxItems)
}
