import { parseBlockHeaderSlotDescriptor } from './blockCardHeaderSlots'
import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'

export type BlockDropLinkPaletteContext = {
  fromParameterName?: string
  outTypes: readonly string[]
}

function normalizeBlockTypeName(value: string): string {
  return value.trim().toLowerCase().replace(/preview$/i, '')
}

function headerInputTypes(definition: BlockDefinitionJsonDocument): string[] {
  return definition.headerSlots
    .map((slot) => parseBlockHeaderSlotDescriptor(slot))
    .filter(
      (parsed): parsed is NonNullable<ReturnType<typeof parseBlockHeaderSlotDescriptor>> =>
        parsed !== null && parsed.direction === 'input',
    )
    .flatMap((parsed) => parsed.types)
}

function headerInputMatchesContext(
  inTypes: readonly string[],
  context: BlockDropLinkPaletteContext,
  definition: BlockDefinitionJsonDocument,
): boolean {
  const normalizedParam = normalizeBlockTypeName(context.fromParameterName ?? '')
  const normalizedBlockName = normalizeBlockTypeName(definition.blockName)
  const normalizedDisplayName = normalizeBlockTypeName(definition.name)
  const normalizedParentBlock = normalizeBlockTypeName(definition.block)

  return inTypes.some((inType) => {
    const normalizedIn = normalizeBlockTypeName(inType)

    if (normalizedParam && normalizedIn === normalizedParam) {
      return true
    }

    if (normalizedParam && normalizedParentBlock === normalizedParam) {
      return true
    }

    return context.outTypes.some((outType) => {
      const normalizedOut = normalizeBlockTypeName(outType)
      return (
        normalizedIn === normalizedOut ||
        normalizedOut === normalizedBlockName ||
        normalizedOut === normalizedDisplayName
      )
    })
  })
}

/** Blocos cujo cabeçalho IN aceita o tipo de saída ou o campo pai do parâmetro de origem. */
export function blockDefinitionMatchesLinkDrop(
  definition: BlockDefinitionJsonDocument,
  context: BlockDropLinkPaletteContext,
): boolean {
  const outTypes = context.outTypes
  const fromParameterName = context.fromParameterName?.trim() ?? ''

  if (outTypes.length === 0 && !fromParameterName) {
    return true
  }

  const inputTypes = headerInputTypes(definition)
  if (inputTypes.length === 0) {
    return false
  }

  return headerInputMatchesContext(inputTypes, context, definition)
}

/** Correspondência exacta entre o tipo de saída e o nome do bloco (rank 0). */
export function blockDefinitionMatchesExactOutputType(
  definition: BlockDefinitionJsonDocument,
  context: BlockDropLinkPaletteContext,
): boolean {
  return blockDefinitionLinkDropRank(definition, context) === 0
}

/** Prioridade menor = aparece primeiro na paleta de ligação. */
export function blockDefinitionLinkDropRank(
  definition: BlockDefinitionJsonDocument,
  context: BlockDropLinkPaletteContext,
): number {
  const blockName = normalizeBlockTypeName(definition.blockName)
  const displayName = normalizeBlockTypeName(definition.name)
  const fromParam = normalizeBlockTypeName(context.fromParameterName ?? '')

  for (const outType of context.outTypes) {
    const normalizedOut = normalizeBlockTypeName(outType)
    if (normalizedOut && (normalizedOut === blockName || normalizedOut === displayName)) {
      return 0
    }
  }

  if (fromParam && normalizeBlockTypeName(definition.block) === fromParam) {
    return 1
  }

  const inputTypes = headerInputTypes(definition)
  if (fromParam && inputTypes.some((inType) => normalizeBlockTypeName(inType) === fromParam)) {
    return 2
  }

  return 3
}

export function compareBlockDefinitionsForLinkDrop(
  left: BlockDefinitionJsonDocument,
  right: BlockDefinitionJsonDocument,
  context: BlockDropLinkPaletteContext,
): number {
  const rankDelta =
    blockDefinitionLinkDropRank(left, context) - blockDefinitionLinkDropRank(right, context)
  if (rankDelta !== 0) {
    return rankDelta
  }

  const titleCompare = left.name.localeCompare(right.name)
  if (titleCompare !== 0) {
    return titleCompare
  }

  return left.blockName.localeCompare(right.blockName)
}

export function sortBlockDefinitionsForLinkDrop(
  definitions: readonly BlockDefinitionJsonDocument[],
  context: BlockDropLinkPaletteContext,
): BlockDefinitionJsonDocument[] {
  return [...definitions].sort((left, right) => compareBlockDefinitionsForLinkDrop(left, right, context))
}
