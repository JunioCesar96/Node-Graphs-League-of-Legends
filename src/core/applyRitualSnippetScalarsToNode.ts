import { classifyRitualLine } from '@/core/classGroupFieldClassifier'
import type { NodeInstance, NodeParameterDefinition } from '@/core/nodeSchema'
import {
  ritualExportFieldName,
  ritualExportFieldNameFromParameter,
} from '@/core/ritualFieldNames'

export type RitualSnippetScalarUpdate = {
  parameterId: string
  value: string
}

export type ApplyRitualSnippetScalarsResult =
  | { ok: true; updates: RitualSnippetScalarUpdate[]; warnings: string[] }
  | { ok: false; error: string }

const TYPE_BLOCK_HEAD_REGEX = /^\s*([A-Za-z_]\w*)\s*\{\s*$/

function detectSnippetTypeTitle(snippet: string): string | null {
  for (const line of snippet.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const mapEntry = /^\s*(?:"[^"]+"|0x[0-9a-fA-F]+)\s*=\s*(\w+)\s*\{/.exec(line)
    if (mapEntry?.[1]) {
      return mapEntry[1]
    }

    const typeHead = TYPE_BLOCK_HEAD_REGEX.exec(trimmed)
    if (typeHead?.[1]) {
      return typeHead[1]
    }

    const structOnly = classifyRitualLine(line)
    if (structOnly.kind === 'structural' && structOnly.childTypeName) {
      return structOnly.childTypeName
    }
  }

  return null
}

function findParameterByRitualFieldName(
  schema: NodeInstance['schema'],
  fieldName: string,
): NodeParameterDefinition | undefined {
  const needle = fieldName.trim().toLowerCase()
  if (!needle) {
    return undefined
  }

  for (const parameter of schema.parameters) {
    const candidates = [
      ritualExportFieldNameFromParameter(parameter),
      ritualExportFieldName(parameter.name),
      parameter.name,
    ]
    if (candidates.some((name) => name.toLowerCase() === needle)) {
      return parameter
    }
  }

  return undefined
}

export function extractScalarFieldsFromRitualSnippet(
  snippet: string,
): Array<{ fieldName: string; ritType: string; rawValue: string }> {
  const fields: Array<{ fieldName: string; ritType: string; rawValue: string }> = []

  for (const line of snippet.split('\n')) {
    const parsed = classifyRitualLine(line)
    if (parsed.kind !== 'simple' || !parsed.fieldName || !parsed.ritType) {
      continue
    }

    fields.push({
      fieldName: parsed.fieldName,
      ritType: parsed.ritType,
      rawValue: (parsed.rawValue ?? '').trim(),
    })
  }

  return fields
}

export function ritualSnippetCanTargetNode(
  node: NodeInstance,
  snippet: string,
): { ok: true } | { ok: false; reason: string } {
  const typeTitle = detectSnippetTypeTitle(snippet)
  if (typeTitle && typeTitle !== node.schema.title) {
    return {
      ok: false,
      reason: `O trecho pertence a «${typeTitle}», não a «${node.schema.title}».`,
    }
  }

  const scalars = extractScalarFieldsFromRitualSnippet(snippet)
  if (scalars.length === 0) {
    return { ok: false, reason: 'O trecho não contém parâmetros simples (nome: tipo = valor).' }
  }

  const matched = scalars.filter((scalar) =>
    Boolean(findParameterByRitualFieldName(node.schema, scalar.fieldName)),
  )

  if (matched.length === 0) {
    return {
      ok: false,
      reason: `Nenhum campo do trecho corresponde aos parâmetros de «${node.schema.title}».`,
    }
  }

  return { ok: true }
}

export function applyRitualSnippetScalarsToNode(
  node: NodeInstance,
  snippet: string,
): ApplyRitualSnippetScalarsResult {
  const targetCheck = ritualSnippetCanTargetNode(node, snippet)
  if (!targetCheck.ok) {
    return { ok: false, error: targetCheck.reason }
  }

  const scalars = extractScalarFieldsFromRitualSnippet(snippet)
  const updates: RitualSnippetScalarUpdate[] = []
  const warnings: string[] = []

  for (const scalar of scalars) {
    const parameter = findParameterByRitualFieldName(node.schema, scalar.fieldName)
    if (!parameter) {
      warnings.push(`Campo «${scalar.fieldName}» ignorado (sem parâmetro no nó).`)
      continue
    }

    updates.push({
      parameterId: parameter.id,
      value: scalar.rawValue,
    })
  }

  if (updates.length === 0) {
    return { ok: false, error: 'Nenhum valor aplicável no trecho seleccionado.' }
  }

  return { ok: true, updates, warnings }
}
