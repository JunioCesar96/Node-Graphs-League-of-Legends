import type { BlockParameterJsonDocument } from './blockParameterJson'
import { isSimpleBlockParameterDocument } from './blockParameterJson'

export type BlockParameterValidationResult =
  | { ok: true; value: BlockParameterJsonDocument }
  | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isBlockParameterDocumentBase(raw: Record<string, unknown>): boolean {
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    return false
  }
  if (typeof raw.block !== 'string' || !raw.block.trim()) {
    return false
  }
  if (typeof raw.parameterName !== 'string') {
    return false
  }
  if (typeof raw.type !== 'string') {
    return false
  }
  if (typeof raw.name !== 'string' || raw.name.includes('_')) {
    return false
  }
  if (!isRecord(raw.source) || raw.source.kind !== 'parameter') {
    return false
  }
  if (typeof raw.source.parameterId !== 'string') {
    return false
  }
  if (!isRecord(raw.slots) || !isStringArray(raw.slots.out)) {
    return false
  }
  return true
}

export function validateBlockParameterDocument(
  raw: unknown,
  sourceLabel = 'block parameter JSON',
): BlockParameterValidationResult {
  const errors: string[] = []

  if (!isRecord(raw)) {
    return { ok: false, errors: [`${sourceLabel}: esperado objecto JSON`] }
  }

  if (!isBlockParameterDocumentBase(raw)) {
    errors.push(`${sourceLabel}: campos base inválidos`)
    return { ok: false, errors }
  }

  if (typeof raw.value === 'string') {
    if (!isStringArray(raw.slots.in)) {
      errors.push(`${sourceLabel}: slots.in obrigatório para parâmetro simples`)
    }
  } else if (raw.type === 'embed') {
    if (typeof raw.embed !== 'string' || !raw.embed.trim()) {
      errors.push(`${sourceLabel}: embed em falta`)
    }
  } else if (raw.type === 'pointer') {
    if (typeof raw.pointer !== 'string' || !raw.pointer.trim()) {
      errors.push(`${sourceLabel}: pointer em falta`)
    }
  } else if (raw.type === 'mapHashPointer' || raw.type === 'mapHashEmbed' || raw.type === 'mapU64Pointer') {
    if (raw.mapKind !== raw.type || !Array.isArray(raw.entries)) {
      errors.push(`${sourceLabel}: map inválido`)
    }
  } else if (
    raw.type === 'listF32' ||
    raw.type === 'listString' ||
    raw.type === 'listHash' ||
    raw.type === 'listVector2' ||
    raw.type === 'listVector3' ||
    raw.type === 'listVector4'
  ) {
    if (!isStringArray(raw.items)) {
      errors.push(`${sourceLabel}: items inválido`)
    }
  } else if (raw.type === 'optionF32' || raw.type === 'optionString' || raw.type === 'optionVector3') {
    if (raw.item !== null && typeof raw.item !== 'string') {
      errors.push(`${sourceLabel}: item inválido`)
    }
  } else {
    errors.push(`${sourceLabel}: tipo não suportado: ${String(raw.type)}`)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: raw as BlockParameterJsonDocument }
}

export function isStructuralParameterDocument(doc: BlockParameterJsonDocument): boolean {
  if (isSimpleBlockParameterDocument(doc)) {
    return false
  }
  return true
}
