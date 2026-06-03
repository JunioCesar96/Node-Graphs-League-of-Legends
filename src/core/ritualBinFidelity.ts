import { findClosingBrace } from '@/core/listVectorBracedValue'
import { parseListF32String } from '@/core/listF32Value'
import type { CanvasNode } from '@/core/canvasScene'
import type { NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import { formatMapEntryKey } from '@/core/ritualValueFormat'

export const VFX_PROBABILITY_TABLE_TITLE = 'VfxProbabilityTableData'

const PROBABILITY_TABLES_FIELD_KEY = 'probabilitytables'

function parameterValue(
  node: CanvasNode['node'],
  parameterId: string,
  fallback = '',
): string {
  return node.values.find((entry) => entry.parameterId === parameterId)?.value ?? fallback
}

/**
 * Tabela vazia (slot sem dados) — no .bin vira `VfxProbabilityTableData {}`.
 * Valores como 0/1 + 1/1.5 são dados reais no .bin e devem ser exportados por completo.
 */
export function isPlaceholderProbabilityTableNode(canvasNode: CanvasNode): boolean {
  if (canvasNode.node.schema.title !== VFX_PROBABILITY_TABLE_TITLE) {
    return false
  }

  const instance = canvasNode.node
  const keyTimesParam = instance.schema.parameters.find((entry) => entry.name === 'keyTimes')
  const keyValuesParam = instance.schema.parameters.find((entry) => entry.name === 'keyValues')

  if (!keyTimesParam || !keyValuesParam) {
    return true
  }

  const keyTimesRaw = parameterValue(instance, keyTimesParam.id, keyTimesParam.defaultValue)
  const keyValuesRaw = parameterValue(instance, keyValuesParam.id, keyValuesParam.defaultValue)
  const times = parseListF32String(keyTimesRaw)
  const values = parseListF32String(keyValuesRaw)

  return times.length === 0 && values.length === 0
}

export function buildFieldNameMapFromBoundRitual(bound: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /^\s*([A-Za-z_]\w*)\s*:/gm

  for (const match of bound.matchAll(re)) {
    const name = match[1]
    if (!name) {
      continue
    }
    const key = name.toLowerCase()
    if (!map.has(key)) {
      map.set(key, name)
    }
  }

  return map
}

/** Substitui nomes de campo exportados (PascalCase) pelos do trecho vinculado (.bin). */
export function applyBoundFieldNameCasing(text: string, fieldNameByLowerCase: Map<string, string>): string {
  if (fieldNameByLowerCase.size === 0) {
    return text
  }

  return text.replace(/^(\s*)([A-Za-z_]\w*)(\s*:\s*)/gm, (full, indent, name, colon) => {
    const boundName = fieldNameByLowerCase.get(name.toLowerCase())
    return boundName ? `${indent}${boundName}${colon}` : full
  })
}

type ListPointerBlock = {
  fieldName: string
  openBrace: number
  closeBrace: number
}

function findListPointerBlocks(text: string, fieldKeyLower: string): ListPointerBlock[] {
  const blocks: ListPointerBlock[] = []
  const re = /^\s*(\w+)\s*:\s*list\[pointer\]\s*=\s*\{/gm

  for (const match of text.matchAll(re)) {
    const fieldName = match[1]
    if (!fieldName || fieldName.toLowerCase() !== fieldKeyLower) {
      continue
    }

    const openBrace = match.index! + match[0].length - 1
    const closeBrace = findClosingBrace(text, openBrace)
    if (closeBrace < 0) {
      continue
    }

    blocks.push({ fieldName, openBrace, closeBrace })
  }

  return blocks
}

export function parseProbabilityTableEntries(listBody: string): string[] {
  const entries: string[] = []
  const marker = 'VfxProbabilityTableData'
  let searchFrom = 0

  while (searchFrom < listBody.length) {
    const idx = listBody.indexOf(marker, searchFrom)
    if (idx < 0) {
      break
    }

    let pos = idx + marker.length
    while (pos < listBody.length && /\s/.test(listBody[pos] ?? '')) {
      pos += 1
    }

    if (listBody[pos] === '{') {
      const close = findClosingBrace(listBody, pos)
      if (close < 0) {
        break
      }
      entries.push(listBody.slice(idx, close + 1).trim())
      searchFrom = close + 1
      continue
    }

    const lineEnd = listBody.indexOf('\n', pos)
    const end = lineEnd >= 0 ? lineEnd : listBody.length
    entries.push(listBody.slice(idx, end).trim())
    searchFrom = end + 1
  }

  return entries
}

function formatProbabilityTableEntry(entry: string, itemIndent: string): string {
  const trimmed = entry.trim()
  if (/^VfxProbabilityTableData\s*\{\s*\}$/s.test(trimmed)) {
    return `${itemIndent}VfxProbabilityTableData {}`
  }

  const lines = trimmed.split('\n')
  return lines
    .map((line) => (line.trim().length > 0 ? `${itemIndent}${line.trimStart()}` : line))
    .join('\n')
}

function rebuildListPointerBody(
  originalBody: string,
  boundEntries: string[],
  exportEntries: string[],
): string {
  const openLineMatch = originalBody.match(/^(\s*)/)
  const baseIndent = openLineMatch?.[1] ?? '    '
  const itemIndent = `${baseIndent}    `

  const count = Math.max(boundEntries.length, exportEntries.length)
  const lines: string[] = []

  for (let i = 0; i < count; i++) {
    const boundEntry = boundEntries[i]
    const exportEntry = exportEntries[i]
    const chosen = boundEntry ?? exportEntry
    if (!chosen) {
      lines.push(`${itemIndent}VfxProbabilityTableData {}`)
      continue
    }
    lines.push(formatProbabilityTableEntry(chosen, itemIndent))
  }

  return lines.length > 0 ? `\n${lines.join('\n')}\n${baseIndent}` : ''
}

/** Alinha listas `probabilityTables` do export com o trecho vinculado (.bin). */
export function mergeProbabilityTableListsFromBound(exported: string, bound: string): string {
  const boundBlocks = findListPointerBlocks(bound, PROBABILITY_TABLES_FIELD_KEY)
  const exportBlocks = findListPointerBlocks(exported, PROBABILITY_TABLES_FIELD_KEY)
  const pairCount = Math.min(boundBlocks.length, exportBlocks.length)

  if (pairCount === 0) {
    return exported
  }

  let result = exported

  for (let i = pairCount - 1; i >= 0; i--) {
    const boundBlock = boundBlocks[i]!
    const exportBlock = exportBlocks[i]!
    const boundBody = bound.slice(boundBlock.openBrace + 1, boundBlock.closeBrace)
    const exportBody = result.slice(exportBlock.openBrace + 1, exportBlock.closeBrace)
    const boundEntries = parseProbabilityTableEntries(boundBody)
    const exportEntries = parseProbabilityTableEntries(exportBody)
    const mergedBody = rebuildListPointerBody(exportBody, boundEntries, exportEntries)
    result =
      result.slice(0, exportBlock.openBrace + 1) + mergedBody + result.slice(exportBlock.closeBrace)
  }

  return result
}

export type RitualExportFidelity = {
  fieldNameByLowerCase?: ReadonlyMap<string, string>
  useSchemaFieldNames?: boolean
  compactPlaceholderProbabilityTables?: boolean
  /** Quando activo, exporta apenas os parâmetros seleccionados no block card. */
  blockCardSelectedParametersOnly?: boolean
  boundSlice?: string
  /** Chave da entrada no mapa (`"Characters/.../tar"`). */
  mapEntryKey?: string
}

function stripRitualQuotedString(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  return trimmed
}

function parameterValueFromNode(node: NodeInstance, parameterName: string): string {
  const parameter = node.schema.parameters.find(
    (entry) => entry.name.toLowerCase() === parameterName.toLowerCase(),
  )
  if (!parameter) {
    return ''
  }
  return node.values.find((entry) => entry.parameterId === parameter.id)?.value ?? parameter.defaultValue
}

/** Chave mapa: `particlePath` se existir; senão `particleName`. */
export function resolveParticleMapEntryKeyFromNode(canvasNode: CanvasNode): string | null {
  const path = stripRitualQuotedString(parameterValueFromNode(canvasNode.node, 'particlePath'))
  if (path.length > 0) {
    return path
  }
  const name = stripRitualQuotedString(parameterValueFromNode(canvasNode.node, 'particleName'))
  return name.length > 0 ? name : null
}

function extractRitualStringScalar(text: string, fieldName: string): string | null {
  const re = new RegExp(
    `^\\s*${fieldName}\\s*:\\s*string\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`,
    'gim',
  )
  const match = re.exec(text)
  if (!match?.[1]) {
    return null
  }
  return stripRitualQuotedString(match[1])
}

/** Chave mapa a partir do ritual emitido: `particlePath` → `particleName`. */
export function resolveParticleMapEntryKeyFromRitual(text: string): string | null {
  const path = extractRitualStringScalar(text, 'particlePath')
  if (path) {
    return path
  }
  return extractRitualStringScalar(text, 'particleName')
}

export function parseMapEntryKeyFromBoundPrefix(bound: string): string | null {
  const match = bound.match(/^\s*("(?:[^"\\]|\\.)*"|0x[0-9a-fA-F]+)\s*=\s*\w+\s*\{/)
  return match?.[1] ? stripRitualQuotedString(match[1]) : null
}

export function extractRootTypeName(text: string): string | null {
  const previewMatch = text.match(/^#\s*Preview:\s*(\S+)/m)
  if (previewMatch?.[1]) {
    return previewMatch[1]
  }

  const firstLine = text.split('\n')[0]?.trim() ?? ''
  const mapEntryOnFirstLine = firstLine.match(
    /^("(?:[^"\\]|\\.)*"|0x[0-9a-fA-F]+)\s*=\s*(\w+)\s*\{/,
  )
  if (mapEntryOnFirstLine?.[2]) {
    return mapEntryOnFirstLine[2]
  }

  const directOnFirstLine = firstLine.match(/^(\w+)\s*\{/)
  if (directOnFirstLine?.[1]) {
    return directOnFirstLine[1]
  }

  return null
}

export function findTypeBlockInText(text: string, typeName: string): string | null {
  const marker = `${typeName} {`
  const idx = text.indexOf(marker)
  if (idx < 0) {
    return null
  }
  const openBrace = text.indexOf('{', idx)
  const closeBrace = findClosingBrace(text, openBrace)
  if (closeBrace < 0) {
    return null
  }
  return text.slice(idx, closeBrace + 1)
}

type RitualFieldChunk = {
  fieldKey: string
  text: string
}

function fieldKeyFromChunkLine(line: string, childIndent: number): string {
  const fieldMatch = line.match(new RegExp(`^\\s{${childIndent}}(\\w+)\\s*:`))
  if (fieldMatch?.[1]) {
    return fieldMatch[1].toLowerCase()
  }
  const typeMatch = line.match(new RegExp(`^\\s{${childIndent}}(\\w+)(?:\\s+.*)?\\{\\s*$`))
  if (typeMatch?.[1]) {
    return typeMatch[1].toLowerCase()
  }
  return ''
}

function getDirectChildIndent(blockBody: string): number | null {
  let min: number | null = null

  for (const line of blockBody.split('\n')) {
    if (!line.trim()) {
      continue
    }
    const match = line.match(/^(\s+)(\S)/)
    if (!match) {
      continue
    }
    const indent = match[1].length
    if (/^\s+\w+\s*:/.test(line) || /^\s+\w+.*\{\s*$/.test(line)) {
      min = min === null ? indent : Math.min(min, indent)
    }
  }

  return min
}

function splitDirectFieldChunks(blockBody: string, childIndent: number): RitualFieldChunk[] {
  const lines = blockBody.split('\n')
  const chunks: RitualFieldChunk[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.trim()) {
      i += 1
      continue
    }

    const lineIndent = line.match(/^(\s*)/)?.[1]?.length ?? 0
    if (lineIndent !== childIndent) {
      i += 1
      continue
    }

    const fieldKey = fieldKeyFromChunkLine(line, childIndent)
    if (!fieldKey) {
      i += 1
      continue
    }

    const chunkLines = [line]
    let braceDepth = (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)
    i += 1

    while (i < lines.length) {
      const next = lines[i] ?? ''
      if (!next.trim()) {
        chunkLines.push(next)
        i += 1
        continue
      }

      const nextIndent = next.match(/^(\s*)/)?.[1]?.length ?? 0
      if (nextIndent === childIndent && braceDepth === 0) {
        const isNewSibling =
          new RegExp(`^\\s{${childIndent}}\\w+\\s*:`).test(next) ||
          new RegExp(`^\\s{${childIndent}}\\w+.*\\{\\s*$`).test(next)
        if (isNewSibling) {
          break
        }
      }

      chunkLines.push(next)
      braceDepth += (next.match(/\{/g)?.length ?? 0) - (next.match(/\}/g)?.length ?? 0)
      i += 1
    }

    chunks.push({ fieldKey, text: chunkLines.join('\n') })
  }

  return chunks
}

function reorderChunksByBoundOrder(
  exportChunks: RitualFieldChunk[],
  boundOrder: string[],
): RitualFieldChunk[] {
  const used = new Set<number>()
  const result: RitualFieldChunk[] = []

  for (const boundKey of boundOrder) {
    const idx = exportChunks.findIndex((chunk, index) => !used.has(index) && chunk.fieldKey === boundKey)
    if (idx >= 0) {
      used.add(idx)
      result.push(exportChunks[idx]!)
    }
  }

  for (let index = 0; index < exportChunks.length; index += 1) {
    if (!used.has(index)) {
      result.push(exportChunks[index]!)
    }
  }

  return result
}

function findBoundChunkAtOccurrence(
  boundChunks: RitualFieldChunk[],
  fieldKey: string,
  occurrence: number,
): RitualFieldChunk | undefined {
  let seen = 0
  for (const chunk of boundChunks) {
    if (chunk.fieldKey !== fieldKey) {
      continue
    }
    if (seen === occurrence) {
      return chunk
    }
    seen += 1
  }
  return undefined
}

function reorderInsideChunk(exportChunkText: string, boundChunkText: string): string {
  const openExport = exportChunkText.indexOf('{')
  const openBound = boundChunkText.indexOf('{')
  if (openExport < 0 || openBound < 0) {
    return exportChunkText
  }

  const closeExport = findClosingBrace(exportChunkText, openExport)
  const closeBound = findClosingBrace(boundChunkText, openBound)
  if (closeExport < 0 || closeBound < 0) {
    return exportChunkText
  }

  const exportBody = exportChunkText.slice(openExport + 1, closeExport)
  const boundBody = boundChunkText.slice(openBound + 1, closeBound)
  const reorderedBody = reorderBlockBody(exportBody, boundBody)

  return exportChunkText.slice(0, openExport + 1) + reorderedBody + exportChunkText.slice(closeExport)
}

function reorderBlockBody(exportBody: string, boundBody: string): string {
  const exportIndent = getDirectChildIndent(exportBody)
  const boundIndent = getDirectChildIndent(boundBody)
  if (exportIndent === null || boundIndent === null) {
    return exportBody
  }

  const exportChunks = splitDirectFieldChunks(exportBody, exportIndent)
  if (exportChunks.length === 0) {
    return exportBody
  }

  const boundChunks = splitDirectFieldChunks(boundBody, boundIndent)
  const boundOrder = boundChunks.map((chunk) => chunk.fieldKey)
  const reordered = reorderChunksByBoundOrder(exportChunks, boundOrder)

  const occurrenceByKey = new Map<string, number>()
  const processed = reordered.map((chunk) => {
    const occurrence = occurrenceByKey.get(chunk.fieldKey) ?? 0
    occurrenceByKey.set(chunk.fieldKey, occurrence + 1)
    const boundChunk = findBoundChunkAtOccurrence(boundChunks, chunk.fieldKey, occurrence)
    if (!boundChunk) {
      return chunk.text
    }
    return reorderInsideChunk(chunk.text, boundChunk.text)
  })

  const leadingNewline = exportBody.startsWith('\n') ? '\n' : ''
  const trailingNewline = exportBody.endsWith('\n') ? '\n' : ''
  const joined = processed.join('\n')
  return `${leadingNewline}${joined}${trailingNewline}`
}

/** Reordena campos do export para coincidir com a ordem do trecho vinculado (.bin). */
export function reorderRitualExportToBoundFieldOrder(exported: string, bound: string): string {
  const typeName = extractRootTypeName(exported) ?? extractRootTypeName(bound)
  if (!typeName) {
    return exported
  }

  const exportBlock = findTypeBlockInText(exported, typeName)
  const boundBlock = findTypeBlockInText(bound, typeName) ?? bound
  if (!exportBlock) {
    return exported
  }

  const openExport = exportBlock.indexOf('{')
  const openBound = boundBlock.indexOf('{')
  if (openExport < 0 || openBound < 0) {
    return exported
  }

  const closeExport = findClosingBrace(exportBlock, openExport)
  const closeBound = findClosingBrace(boundBlock, openBound)
  if (closeExport < 0 || closeBound < 0) {
    return exported
  }

  const exportBody = exportBlock.slice(openExport + 1, closeExport)
  const boundBody = boundBlock.slice(openBound + 1, closeBound)
  const reorderedBody = reorderBlockBody(exportBody, boundBody)
  const newBlock = exportBlock.slice(0, openExport + 1) + reorderedBody + exportBlock.slice(closeExport)

  if (exported.includes(exportBlock)) {
    return exported.replace(exportBlock, newBlock)
  }

  return newBlock
}

export function buildRitualExportFidelity(options?: {
  boundSlice?: string
  mapEntryKey?: string | null
}): RitualExportFidelity {
  const bound = options?.boundSlice?.trim()
  const mapKey = options?.mapEntryKey?.trim()

  return {
    compactPlaceholderProbabilityTables: true,
    useSchemaFieldNames: true,
    fieldNameByLowerCase: bound ? buildFieldNameMapFromBoundRitual(bound) : undefined,
    boundSlice: bound || undefined,
    mapEntryKey: mapKey || undefined,
  }
}

export function formatPreviewWithMapEntryKey(
  previewText: string,
  mapKey: string | null | undefined,
): string {
  if (!mapKey?.trim()) {
    return previewText
  }

  const typeName = extractRootTypeName(previewText)
  if (!typeName) {
    return previewText
  }

  const lines = previewText.split('\n')
  const hasPreviewHeader = /^#\s*Preview:/.test(lines[0]?.trim() ?? '')
  const body = hasPreviewHeader ? lines.slice(1).join('\n') : previewText
  const keyLabel = formatMapEntryKey(mapKey.trim())
  const normalizedBody = body.endsWith('\n') || body.length === 0 ? body : `${body}\n`

  return `${keyLabel} = ${normalizedBody}`
}

export function resolveMapEntryKeyForExport(
  fidelity: RitualExportFidelity,
  ritualText: string,
  boundSlice?: string,
): string | null {
  if (fidelity.mapEntryKey?.trim()) {
    return fidelity.mapEntryKey.trim()
  }

  const fromBound = boundSlice ? parseMapEntryKeyFromBoundPrefix(boundSlice) : null
  if (fromBound) {
    return fromBound
  }

  return resolveParticleMapEntryKeyFromRitual(ritualText)
}

export function resolveExportFieldName(
  parameter: Pick<NodeParameterDefinition, 'id' | 'name'>,
  fidelity: RitualExportFidelity | undefined,
  fallbackPascal: (parameter: Pick<NodeParameterDefinition, 'id' | 'name'>) => string,
): string {
  if (fidelity?.fieldNameByLowerCase?.size) {
    const fromBound = fidelity.fieldNameByLowerCase.get(parameter.name.toLowerCase())
    if (fromBound) {
      return fromBound
    }
  }

  if (fidelity?.useSchemaFieldNames) {
    return parameter.name
  }

  return fallbackPascal(parameter)
}

export function resolveExportBlockTitle(
  title: string,
  fidelity: RitualExportFidelity | undefined,
  fallbackPascal: (title: string) => string,
): string {
  if (fidelity?.fieldNameByLowerCase?.size) {
    const fromBound = fidelity.fieldNameByLowerCase.get(title.toLowerCase())
    if (fromBound) {
      return fromBound
    }
  }

  if (fidelity?.useSchemaFieldNames) {
    return title
  }

  return fallbackPascal(title)
}

export function applyBinFidelityToRitualExport(text: string, boundSlice?: string): string {
  const bound = boundSlice?.trim()
  if (!bound) {
    return text
  }

  const fieldMap = buildFieldNameMapFromBoundRitual(bound)
  let out = applyBoundFieldNameCasing(text, fieldMap)
  out = mergeProbabilityTableListsFromBound(out, bound)
  return out
}

/** Casing, probability tables e ordem dos campos (quando há trecho vinculado). */
export function applyFullBinFidelityToRitualExport(
  text: string,
  fidelity: RitualExportFidelity,
): string {
  let out = applyBinFidelityToRitualExport(text, fidelity.boundSlice)
  if (fidelity.boundSlice?.trim()) {
    out = reorderRitualExportToBoundFieldOrder(out, fidelity.boundSlice)
  }
  return out
}

export function finalizeNodePreviewRitual(
  rawPreview: string,
  fidelity: RitualExportFidelity,
): string {
  let text = applyFullBinFidelityToRitualExport(rawPreview, fidelity)
  const mapKey = resolveMapEntryKeyForExport(fidelity, text, fidelity.boundSlice)
  text = formatPreviewWithMapEntryKey(text, mapKey)
  return text.endsWith('\n') ? text : `${text}\n`
}
