export type RitualJsonLinkField = {
  type: 'embed' | 'pointer' | 'link' | string
  ref: string
  fields?: Record<string, RitualJsonField>
  items?: RitualJsonItem[]
}

export type RitualJsonScalarField = {
  type: string
  value?: unknown
}

export type RitualJsonField = RitualJsonScalarField | RitualJsonLinkField

export type RitualJsonMapEntry = {
  kind: 'mapEntry'
  key: string
  type: string
  fields?: Record<string, RitualJsonField>
  items?: RitualJsonItem[]
}

export type RitualJsonObjectItem = {
  kind: 'object'
  type: string
  fields?: Record<string, RitualJsonField>
  items?: RitualJsonItem[]
}

export type RitualJsonListItem = {
  type: string
  fields?: Record<string, RitualJsonField>
  items?: RitualJsonItem[]
}

export type RitualJsonItem = RitualJsonMapEntry | RitualJsonObjectItem | RitualJsonListItem

export type RitualJsonDocument = {
  preview?: string
  type?: string | null
  fields?: Record<string, RitualJsonField>
  items?: RitualJsonItem[]
  error?: string
  raw?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLinkField(field: RitualJsonField): field is RitualJsonLinkField {
  return typeof field.ref === 'string' && field.ref.trim().length > 0
}

function indentLine(depth: number, text: string): string {
  return `${'  '.repeat(depth)}${text}`
}

function formatScalarLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }
  if (typeof value === 'string') {
    if (/^0x[0-9a-fA-F]+$/i.test(value)) {
      return value
    }
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '{}'
    }
    const inner = value.map((entry) => formatScalarLiteral(entry)).join(', ')
    return `{${inner}}`
  }
  return String(value)
}

function formatListBodyValue(value: unknown, depth: number): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const lines: string[] = []
  for (const entry of value) {
    if (isRecord(entry) && typeof entry.type === 'string') {
      const typeName = entry.type.trim()
      lines.push(indentLine(depth + 1, `${typeName} {`))
      lines.push(...formatFields((entry.fields ?? {}) as Record<string, RitualJsonField>, depth + 2))
      lines.push(...formatItems((entry.items ?? []) as RitualJsonItem[], depth + 2))
      lines.push(indentLine(depth + 1, '}'))
      continue
    }
    if (Array.isArray(entry)) {
      lines.push(indentLine(depth + 1, formatScalarLiteral(entry)))
      continue
    }
    lines.push(indentLine(depth + 1, formatScalarLiteral(entry)))
  }
  return lines
}

function formatFieldLines(
  fieldName: string,
  field: RitualJsonField,
  depth: number,
): string[] {
  if (isLinkField(field)) {
    const linkKind = field.type === 'embed' || field.type === 'pointer' || field.type === 'link'
      ? field.type
      : 'pointer'
    const lines = [
      indentLine(depth, `${fieldName}: ${linkKind} = ${field.ref} {`),
      ...formatFields(field.fields ?? {}, depth + 1),
      ...formatItems(field.items ?? [], depth + 1),
      indentLine(depth, '}'),
    ]
    return lines
  }

  const ritType = field.type.trim()
  const value = field.value

  if (Array.isArray(value) && ritType.startsWith('list')) {
    return [
      indentLine(depth, `${fieldName}: ${ritType} = {`),
      ...formatListBodyValue(value, depth),
      indentLine(depth, '}'),
    ]
  }

  if (Array.isArray(value) || (typeof value === 'string' && value.startsWith('{'))) {
    return [indentLine(depth, `${fieldName}: ${ritType} = ${formatScalarLiteral(value)}`)]
  }

  return [indentLine(depth, `${fieldName}: ${ritType} = ${formatScalarLiteral(value)}`)]
}

function formatFields(fields: Record<string, RitualJsonField>, depth: number): string[] {
  const lines: string[] = []
  for (const [fieldName, field] of Object.entries(fields)) {
    if (!field || typeof field !== 'object') {
      continue
    }
    lines.push(...formatFieldLines(fieldName, field as RitualJsonField, depth))
  }
  return lines
}

function formatItems(items: RitualJsonItem[], depth: number): string[] {
  const lines: string[] = []

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue
    }

    if ('kind' in item && item.kind === 'mapEntry') {
      const key =
        typeof item.key === 'string' && /^0x[0-9a-fA-F]+$/i.test(item.key)
          ? item.key
          : `"${String(item.key).replace(/"/g, '\\"')}"`
      lines.push(indentLine(depth, `${key} = ${item.type} {`))
      lines.push(...formatFields(item.fields ?? {}, depth + 1))
      lines.push(...formatItems(item.items ?? [], depth + 1))
      lines.push(indentLine(depth, '}'))
      continue
    }

    const typeName =
      'kind' in item && item.kind === 'object'
        ? item.type
        : 'type' in item
          ? item.type
          : null
    if (!typeName) {
      continue
    }

    lines.push(indentLine(depth, `${typeName} {`))
    lines.push(...formatFields(item.fields ?? {}, depth + 1))
    lines.push(...formatItems(item.items ?? [], depth + 1))
    lines.push(indentLine(depth, '}'))
  }

  return lines
}

function formatBlockBody(
  block: { fields?: Record<string, RitualJsonField>; items?: RitualJsonItem[] },
  depth: number,
): string[] {
  return [...formatFields(block.fields ?? {}, depth), ...formatItems(block.items ?? [], depth)]
}

export function parseRitualJsonText(jsonText: string): RitualJsonDocument {
  const trimmed = jsonText.trim()
  if (!trimmed) {
    throw new Error('JSON vazio.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`JSON inválido: ${message}`)
  }

  if (!isRecord(parsed)) {
    throw new Error('JSON deve ser um objecto.')
  }

  return parsed as RitualJsonDocument
}

export function ritualJsonToCode(document: RitualJsonDocument): string {
  if (document.error) {
    throw new Error(document.error)
  }

  const rootType = typeof document.type === 'string' ? document.type.trim() : ''
  if (!rootType) {
    throw new Error('Tipo raiz em falta no JSON (campo "type").')
  }

  const lines: string[] = []
  if (typeof document.preview === 'string' && document.preview.trim()) {
    lines.push(`# Preview: ${document.preview.trim()}`)
  }

  lines.push(`${rootType} {`)
  lines.push(...formatBlockBody(document, 1))
  lines.push('}')

  return `${lines.join('\n')}\n`
}

export function ritualJsonTextToCode(jsonText: string): string {
  return ritualJsonToCode(parseRitualJsonText(jsonText))
}
