import {
  formatNewlinePrimitiveList,
  formatPrimitiveListPreview,
  parseLinesFromRitualBody,
  parseNewlinePrimitiveList,
} from '@/core/listPrimitiveValue'

export function isListStringRitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bstring\b[^\]]*\]/i.test(ritType.trim())
}

function unquoteString(raw: string): string {
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed) as string
    } catch {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

function normalizeStringItem(raw: string): string {
  return unquoteString(raw)
}

export function parseListStringString(raw: string): string[] {
  return parseNewlinePrimitiveList(raw, normalizeStringItem, (body) =>
    parseLinesFromRitualBody(body).map(normalizeStringItem),
  )
}

export function formatListStringString(items: readonly string[]): string {
  return formatNewlinePrimitiveList(items.map(normalizeStringItem))
}

export function normalizeListStringString(raw: string): string {
  return formatListStringString(parseListStringString(raw))
}

export function normalizeListStringRitualBody(inner: string): string {
  return formatListStringString(parseLinesFromRitualBody(inner).map(normalizeStringItem))
}

export function isValidPartialListStringValue(value: string): boolean {
  return /^[\s\S]*$/.test(value)
}

export function formatStringListDisplay(item: string): string {
  const value = normalizeStringItem(item)
  if (value.includes('"')) {
    return value
  }
  return `"${value}"`
}

export function formatListStringPreview(items: readonly string[], maxItems = 2): string {
  return formatPrimitiveListPreview(items.map(formatStringListDisplay), maxItems)
}
