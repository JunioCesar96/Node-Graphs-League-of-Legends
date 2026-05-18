const ITEM_SEPARATOR = '\n'

export function findClosingBrace(source: string, openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') {
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

export function parseBracedBlocksFromRitualBody<T>(
  inner: string,
  parseBlock: (blockInner: string) => T,
): T[] {
  const items: T[] = []
  let cursor = 0

  while (cursor < inner.length) {
    const open = inner.indexOf('{', cursor)
    if (open < 0) {
      break
    }
    const close = findClosingBrace(inner, open)
    if (close < 0) {
      break
    }
    items.push(parseBlock(inner.slice(open + 1, close)))
    cursor = close + 1
  }

  return items
}

export function formatNewlineList<T>(items: readonly T[], formatItem: (item: T) => string): string {
  if (items.length === 0) {
    return ''
  }
  return items.map((item) => formatItem(item)).join(ITEM_SEPARATOR)
}

export function parseNewlineList<T>(
  raw: string,
  parseLine: (line: string) => T,
  parseBracedBody: (inner: string) => T[],
): T[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.includes('{')) {
    return parseBracedBody(trimmed)
  }

  return trimmed
    .split(ITEM_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseLine(line))
}

export function isValidPartialBracedListValue(value: string): boolean {
  return /^[0-9,.\s{}\-\n\r]*$/.test(value)
}

export function formatListVectorPreview<T>(
  items: readonly T[],
  formatBrace: (item: T) => string,
  maxItems = 2,
): string {
  if (items.length === 0) {
    return '∅'
  }
  const head = items.slice(0, maxItems).map((item) => formatBrace(item))
  if (items.length <= maxItems) {
    return head.join(' · ')
  }
  return `${head.join(' · ')} · +${items.length - maxItems}`
}
