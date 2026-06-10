/**
 * Converte texto ritual (preview de bloco) para estrutura JSON.
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
export function ritualCodeToJson(source) {
  const preview = extractPreviewLine(source)
  const lines = preprocessLines(source)
  if (lines.length === 0) {
    return preview ? { preview, type: null, fields: {} } : { type: null, fields: {} }
  }

  const first = lines[0].text.trim()
  const rootMatch = /^([A-Za-z_]\w*)\s*\{\s*$/.exec(first)
  if (!rootMatch) {
    return {
      ...(preview ? { preview } : {}),
      error: 'Tipo raiz não encontrado.',
      raw: first,
    }
  }

  const rootType = rootMatch[1]
  const parsed = parseBlock(lines, 1, lines[0].indent)
  const result = {
    ...(preview ? { preview } : {}),
    type: rootType,
    fields: parsed.fields,
  }
  if (parsed.items.length > 0) {
    result.items = parsed.items
  }
  return result
}

/**
 * @param {string} source
 * @returns {string | null}
 */
function extractPreviewLine(source) {
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    const match = /^#\s*Preview:\s*(.+)$/i.exec(line)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

/**
 * @param {string} source
 * @returns {{ text: string, indent: number }[]}
 */
function preprocessLines(source) {
  return source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0
      return { text: line, indent }
    })
    .filter((line) => line.text.trim() && !line.text.trim().startsWith('#'))
}

/**
 * @param {{ text: string, indent: number }[]} lines
 * @param {number} start
 * @param {number} blockIndent
 * @returns {{ fields: Record<string, unknown>, items: unknown[], next: number }}
 */
function parseBlock(lines, start, blockIndent) {
  /** @type {Record<string, unknown>} */
  const fields = {}
  /** @type {unknown[]} */
  const items = []
  let index = start

  while (index < lines.length) {
    const line = lines[index]

    if (line.indent === blockIndent && line.text.trim() === '}') {
      return { fields, items, next: index + 1 }
    }

    if (line.indent <= blockIndent) {
      index += 1
      continue
    }

    const trimmed = line.text.trim()

    if (trimmed === '}') {
      return { fields, items, next: index + 1 }
    }

    const mapMatch =
      /^(?:"([^"]+)"|(0x[0-9a-fA-F]+))\s*=\s*([A-Za-z_]\w*)\s*\{\s*$/.exec(trimmed)
    if (mapMatch) {
      const key = mapMatch[1] ?? mapMatch[2]
      const typeName = mapMatch[3]
      const child = parseBlock(lines, index + 1, line.indent)
      items.push({
        kind: 'mapEntry',
        key,
        type: typeName,
        fields: child.fields,
        items: child.items,
      })
      index = child.next
      continue
    }

    const listOpen = /^([A-Za-z_][\w.@]*)\s*:\s*(list2?\[[^\]]+\]|list\[[^\]]+\])\s*=\s*\{\s*$/.exec(
      trimmed,
    )
    if (listOpen) {
      const fieldName = listOpen[1]
      const ritType = listOpen[2].trim()
      const listBody = parseListBody(lines, index + 1, line.indent)
      fields[fieldName] = {
        type: ritType,
        value: listBody.value,
      }
      index = listBody.next
      continue
    }

    const pointerOpen =
      /^([A-Za-z_][\w.@]*)\s*:\s*(embed|pointer|link)\s*=\s*([A-Za-z_]\w*)\s*\{\s*$/.exec(trimmed)
    if (pointerOpen) {
      const fieldName = pointerOpen[1]
      const linkKind = pointerOpen[2]
      const typeName = pointerOpen[3]
      const child = parseBlock(lines, index + 1, line.indent)
      fields[fieldName] = {
        type: linkKind,
        ref: typeName,
        fields: child.fields,
        items: child.items,
      }
      index = child.next
      continue
    }

    const typeOpen = /^([A-Za-z_]\w*)\s*\{\s*$/.exec(trimmed)
    if (typeOpen) {
      const typeName = typeOpen[1]
      const child = parseBlock(lines, index + 1, line.indent)
      items.push({
        kind: 'object',
        type: typeName,
        fields: child.fields,
        items: child.items,
      })
      index = child.next
      continue
    }

    const bracedScalar =
      /^([A-Za-z_][\w.@]*)\s*:\s*([^=\n]+?)\s*=\s*\{([^}]*)\}\s*$/.exec(trimmed)
    if (bracedScalar) {
      fields[bracedScalar[1]] = {
        type: bracedScalar[2].trim(),
        value: parseBraceLiteral(`{${bracedScalar[3]}}`),
      }
      index += 1
      continue
    }

    const scalar = /^([A-Za-z_][\w.@]*)\s*:\s*([^=\n]+?)\s*=\s*(.*)$/.exec(trimmed)
    if (scalar) {
      const fieldName = scalar[1]
      const ritType = scalar[2].trim()
      const rawValue = scalar[3].trim()
      fields[fieldName] = {
        type: ritType,
        value: parseScalarValue(ritType, rawValue),
      }
      index += 1
      continue
    }

    index += 1
  }

  return { fields, items, next: index }
}

/**
 * @param {{ text: string, indent: number }[]} lines
 * @param {number} start
 * @param {number} listIndent
 */
function parseListBody(lines, start, listIndent) {
  /** @type {unknown[]} */
  const value = []
  let index = start

  while (index < lines.length) {
    const line = lines[index]

    if (line.indent === listIndent && line.text.trim() === '}') {
      return { value, next: index + 1 }
    }

    if (line.indent <= listIndent) {
      break
    }

    const trimmed = line.text.trim()

    const typeOpen = /^([A-Za-z_]\w*)\s*\{\s*$/.exec(trimmed)
    if (typeOpen) {
      const child = parseBlock(lines, index + 1, line.indent)
      value.push({
        type: typeOpen[1],
        fields: child.fields,
        items: child.items,
      })
      index = child.next
      continue
    }

    const vecMatch = /^\{\s*([^}]*)\}\s*$/.exec(trimmed)
    if (vecMatch) {
      value.push(parseBraceLiteral(`{${vecMatch[1]}}`))
      index += 1
      continue
    }

    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      value.push(Number(trimmed))
      index += 1
      continue
    }

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      value.push(trimmed.slice(1, -1))
      index += 1
      continue
    }

    index += 1
  }

  return { value, next: index }
}

/**
 * @param {string} ritType
 * @param {string} raw
 */
function parseScalarValue(ritType, raw) {
  if (!raw) {
    return null
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1)
  }
  if (/^(true|false)$/i.test(raw)) {
    return raw.toLowerCase() === 'true'
  }
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
    return Number(raw)
  }
  if (raw.startsWith('{') && raw.endsWith('}')) {
    return parseBraceLiteral(raw)
  }
  if (/^0x[0-9a-fA-F]+$/i.test(raw)) {
    return raw
  }
  return raw
}

/**
 * @param {string} raw
 */
function parseBraceLiteral(raw) {
  const inner = raw.trim().replace(/^\{|\}$/g, '').trim()
  if (!inner) {
    return []
  }

  const parts = splitCommaValues(inner)
  if (parts.length === 1 && !/^-?\d/.test(parts[0])) {
    return parts[0]
  }

  return parts.map((part) => {
    const trimmed = part.trim()
    if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      return Number(trimmed)
    }
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1)
    }
    return trimmed
  })
}

/**
 * @param {string} inner
 * @returns {string[]}
 */
function splitCommaValues(inner) {
  /** @type {string[]} */
  const parts = []
  let current = ''
  let depth = 0
  let inString = false

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]
    if (ch === '"' && inner[i - 1] !== '\\') {
      inString = !inString
      current += ch
      continue
    }
    if (!inString && ch === '{') {
      depth += 1
      current += ch
      continue
    }
    if (!inString && ch === '}') {
      depth -= 1
      current += ch
      continue
    }
    if (!inString && depth === 0 && ch === ',') {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function formatRitualParseError(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
