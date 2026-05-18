import { formatVector4String, parseVector4String, type Vector4 } from '@/core/vector4Value'

const ITEM_SEPARATOR = '\n'

function findClosingBrace(source: string, openIdx: number): number {
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

export function isListVec4RitType(ritType: string): boolean {
  return /^list2?\[[^\]]*\bvec4\b[^\]]*\]/i.test(ritType.trim())
}

/** Extrai blocos `{ … }` de um corpo ritual `list[vec4]`. */
export function parseListVec4BlocksFromRitualBody(inner: string): Vector4[] {
  const items: Vector4[] = []
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
    const blockInner = inner.slice(open + 1, close)
    items.push(parseVector4String(blockInner))
    cursor = close + 1
  }

  return items
}

export function formatListVector4String(items: readonly Vector4[]): string {
  if (items.length === 0) {
    return ''
  }
  return items.map((item) => formatVector4String(item)).join(ITEM_SEPARATOR)
}

export function parseListVector4String(raw: string): Vector4[] {
  const trimmed = raw.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.includes('{')) {
    return parseListVec4BlocksFromRitualBody(trimmed)
  }

  return trimmed
    .split(ITEM_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseVector4String(line))
}

export function normalizeListVector4String(raw: string): string {
  return formatListVector4String(parseListVector4String(raw))
}

export function normalizeListVec4RitualBody(inner: string): string {
  return formatListVector4String(parseListVec4BlocksFromRitualBody(inner))
}

export function isValidPartialListVector4Value(value: string): boolean {
  return /^[0-9,.\s{}\-\n\r]*$/.test(value)
}

/** Formato visual ritual: `{ 1 , 1 , 1 , 1 }`. */
export function formatVector4RitualBrace(item: Vector4): string {
  const parts = formatVector4String(item)
    .split(',')
    .map((part) => part.trim())
  return `{ ${parts.join(' , ')} }`
}

export function formatListVector4Preview(items: readonly Vector4[], maxItems = 2): string {
  if (items.length === 0) {
    return '∅'
  }
  const head = items.slice(0, maxItems).map((item) => formatVector4RitualBrace(item))
  if (items.length <= maxItems) {
    return head.join(' · ')
  }
  return `${head.join(' · ')} · +${items.length - maxItems}`
}
