const ITEM_SEPARATOR = '\n'

export function parseLinesFromRitualBody(inner: string): string[] {
  return inner
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

export function formatNewlinePrimitiveList(items: readonly string[]): string {
  if (items.length === 0) {
    return ''
  }
  return items.join(ITEM_SEPARATOR)
}

export function parseNewlinePrimitiveList(
  raw: string,
  parseLine: (line: string) => string,
  parseBody: (inner: string) => string[],
): string[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.includes('\n')) {
    return trimmed
      .split(ITEM_SEPARATOR)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => parseLine(line))
  }

  return parseBody(trimmed)
}

export function formatPrimitiveListPreview(items: readonly string[], maxItems = 2): string {
  if (items.length === 0) {
    return '∅'
  }
  const head = items.slice(0, maxItems)
  if (items.length <= maxItems) {
    return head.join(' · ')
  }
  return `${head.join(' · ')} · +${items.length - maxItems}`
}
