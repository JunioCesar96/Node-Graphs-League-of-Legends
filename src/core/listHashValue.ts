import {
  formatNewlinePrimitiveList,
  formatPrimitiveListPreview,
  parseLinesFromRitualBody,
  parseNewlinePrimitiveList,
} from '@/core/listPrimitiveValue'

export function isListHashRitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bhash\b[^\]]*\]/i.test(ritType.trim())
}

function unquoteHashLiteral(raw: string): string {
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

function normalizeHexHashLiteral(raw: string): string {
  const trimmed = raw.trim()
  if (/^0x[0-9a-fA-F]+$/i.test(trimmed)) {
    const n = Number.parseInt(trimmed, 16)
    if (Number.isFinite(n)) {
      return `0x${(n >>> 0).toString(16).padStart(8, '0')}`
    }
  }
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10)
    if (Number.isFinite(n)) {
      return `0x${(n >>> 0).toString(16).padStart(8, '0')}`
    }
  }
  return trimmed
}

function isHexHashStored(value: string): boolean {
  return /^0x[0-9a-f]{8}$/i.test(value.trim())
}

export function normalizeHashItem(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return unquoteHashLiteral(trimmed)
  }

  if (/^0x[0-9a-fA-F]+$/i.test(trimmed) || /^-?\d+$/.test(trimmed)) {
    return normalizeHexHashLiteral(trimmed)
  }

  return trimmed
}

export function parseListHashString(raw: string): string[] {
  return parseNewlinePrimitiveList(raw, normalizeHashItem, (body) =>
    parseLinesFromRitualBody(body).map(normalizeHashItem),
  )
}

export function formatListHashString(items: readonly string[]): string {
  return formatNewlinePrimitiveList(items.map(normalizeHashItem).filter(Boolean))
}

export function normalizeListHashString(raw: string): string {
  return formatListHashString(parseListHashString(raw))
}

export function normalizeListHashRitualBody(inner: string): string {
  return formatListHashString(parseLinesFromRitualBody(inner).map(normalizeHashItem))
}

export function isValidPartialListHashValue(value: string): boolean {
  return /^[\w\s"'\-0-9xX.\n\r]*$/.test(value)
}

export function formatHashListDisplay(item: string): string {
  const value = normalizeHashItem(item)
  if (!value) {
    return '""'
  }
  if (isHexHashStored(value)) {
    return value.toLowerCase()
  }
  if (value.includes('"')) {
    return value
  }
  return `"${value}"`
}

export function formatListHashPreview(items: readonly string[], maxItems = 2): string {
  return formatPrimitiveListPreview(items.map(formatHashListDisplay), maxItems)
}
