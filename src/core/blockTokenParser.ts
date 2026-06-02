import type { BlockParameterDef, BlockParameterIconHint, BlockSlotRules } from './blockSchema'

export type ParsedBlockToken = {
  blockType: string
  blockName: string
  idParameter: string
  nameParameter: string
  typeParameter: string
  defaultValue: string
  slotRules?: BlockSlotRules
  iconHint?: BlockParameterIconHint
}

const TOKEN_START = '_blockType&'
const TOKEN_END = '_endParameter'

function parseIconHint(nameParameter: string): { label: string; iconHint: BlockParameterIconHint } {
  if (nameParameter.startsWith('@iconImg@')) {
    return { label: nameParameter.slice('@iconImg@'.length), iconHint: 'Img' }
  }
  if (nameParameter.startsWith('@iconText@')) {
    return { label: nameParameter.slice('@iconText@'.length), iconHint: 'Text' }
  }
  if (nameParameter.startsWith('@iconInput@')) {
    return { label: nameParameter.slice('@iconInput@'.length), iconHint: 'Input' }
  }
  return { label: nameParameter, iconHint: null }
}

function encodeIconHint(label: string, iconHint?: BlockParameterIconHint): string {
  if (iconHint === 'Img') {
    return `@iconImg@${label}`
  }
  if (iconHint === 'Text') {
    return `@iconText@${label}`
  }
  if (iconHint === 'Input') {
    return `@iconInput@${label}`
  }
  return label
}

function parseTypeAndDefault(raw: string): { typeParameter: string; defaultValue: string } {
  const braceIndex = raw.indexOf('{')
  if (braceIndex === -1) {
    return { typeParameter: raw, defaultValue: '' }
  }
  const typeParameter = raw.slice(0, braceIndex)
  const defaultValue = raw.slice(braceIndex)
  return { typeParameter, defaultValue }
}

function parseSlotRules(raw: string | undefined): BlockSlotRules | undefined {
  if (!raw) {
    return undefined
  }
  const rules: BlockSlotRules = {}
  const parts = raw.split('&').filter(Boolean)
  for (const part of parts) {
    const outputMatch = /^output\[(.+)\]$/.exec(part)
    if (outputMatch) {
      rules.outputs = outputMatch[1].split(',').map((item) => item.trim()).filter(Boolean)
      continue
    }
    const inputMatch = /^input\[(.+)\]$/.exec(part)
    if (inputMatch) {
      rules.inputs = inputMatch[1].split(',').map((item) => item.trim()).filter(Boolean)
      continue
    }
  }
  return rules.outputs || rules.inputs ? rules : undefined
}

function serializeSlotRules(rules?: BlockSlotRules): string {
  if (!rules) {
    return ''
  }
  const parts: string[] = []
  if (rules.outputs?.length) {
    parts.push(`output[${rules.outputs.join(',')}]`)
  }
  if (rules.inputs?.length) {
    parts.push(`input[${rules.inputs.join(',')}]`)
  }
  return parts.length > 0 ? `_slotParameter&${parts.join('&')}` : ''
}

export function parseBlockToken(token: string): ParsedBlockToken | null {
  const trimmed = token.trim()
  if (!trimmed.startsWith(TOKEN_START) || !trimmed.endsWith(TOKEN_END)) {
    return null
  }

  const body = trimmed.slice(0, trimmed.length - TOKEN_END.length)
  const fieldKeys = [
    'blockType',
    'blockName',
    'idParameter',
    'nameParameter',
    'typeParameter',
    'slotParameter',
  ] as const
  const fields = new Map<string, string>()

  for (const key of fieldKeys) {
    const marker = `_${key}&`
    const start = body.indexOf(marker)
    if (start === -1) {
      continue
    }
    const valueStart = start + marker.length
    let valueEnd = body.length
    for (const nextKey of fieldKeys) {
      if (nextKey === key) {
        continue
      }
      const nextMarker = `_${nextKey}&`
      const nextIdx = body.indexOf(nextMarker, valueStart)
      if (nextIdx !== -1 && nextIdx < valueEnd) {
        valueEnd = nextIdx
      }
    }
    fields.set(key, body.slice(valueStart, valueEnd))
  }

  const blockType = fields.get('blockType')
  const blockName = fields.get('blockName')
  const idParameter = fields.get('idParameter')
  const nameParameterRaw = fields.get('nameParameter')
  const typeParameterRaw = fields.get('typeParameter')

  if (!blockType || !blockName || !idParameter || !nameParameterRaw || !typeParameterRaw) {
    return null
  }

  const { label, iconHint } = parseIconHint(nameParameterRaw)
  const { typeParameter, defaultValue } = parseTypeAndDefault(typeParameterRaw)

  return {
    blockType,
    blockName,
    idParameter,
    nameParameter: label,
    typeParameter,
    defaultValue,
    slotRules: parseSlotRules(fields.get('slotParameter')),
    iconHint,
  }
}

export function serializeBlockToken(parsed: ParsedBlockToken): string {
  const nameParameter = encodeIconHint(parsed.nameParameter, parsed.iconHint)
  const typeSegment = `${parsed.typeParameter}${parsed.defaultValue}`
  const slotSegment = serializeSlotRules(parsed.slotRules)

  return (
    `${TOKEN_START}${parsed.blockType}` +
    `_blockName&${parsed.blockName}` +
    `_idParameter&${parsed.idParameter}` +
    `_nameParameter&${nameParameter}` +
    `_typeParameter&${typeSegment}` +
    slotSegment +
    TOKEN_END
  )
}

export function blockTokenFromParameterDef(
  blockType: string,
  blockName: string,
  param: BlockParameterDef,
): string {
  return serializeBlockToken({
    blockType,
    blockName,
    idParameter: param.idParameter,
    nameParameter: param.nameParameter,
    typeParameter: param.typeParameter,
    defaultValue: formatDefaultForToken(param.typeParameter, param.defaultValue),
    slotRules: param.slotRules,
    iconHint: param.iconHint ?? null,
  })
}

function formatDefaultForToken(typeParameter: string, defaultValue: string): string {
  const trimmed = defaultValue.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
    return trimmed
  }
  if (typeParameter === 'string') {
    return `{"${trimmed.replace(/^"|"$/g, '')}"}`
  }
  return `{${trimmed}}`
}

export function extractBlockTokensFromText(text: string): string[] {
  const tokens: string[] = []
  let searchFrom = 0
  while (searchFrom < text.length) {
    const start = text.indexOf(TOKEN_START, searchFrom)
    if (start === -1) {
      break
    }
    const end = text.indexOf(TOKEN_END, start)
    if (end === -1) {
      break
    }
    tokens.push(text.slice(start, end + TOKEN_END.length))
    searchFrom = end + TOKEN_END.length
  }
  return tokens
}
