import type { BlockDefinitionJsonDocument } from './blockDefinitionJson'

const modules = import.meta.glob<{ default: unknown }>('../blockStructures/blocks/**/*.json', {
  eager: true,
})

export type BlockDefinitionValidationResult =
  | { ok: true; value: BlockDefinitionJsonDocument }
  | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateBlockDefinitionDocument(
  raw: unknown,
  sourceLabel = 'blockStructures/blocks JSON',
): BlockDefinitionValidationResult {
  const errors: string[] = []

  if (!isRecord(raw)) {
    return { ok: false, errors: [`${sourceLabel}: esperado objecto JSON`] }
  }

  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    errors.push(`${sourceLabel}: campo "id" em falta ou inválido`)
  }
  if (typeof raw.block !== 'string' || !raw.block.trim()) {
    errors.push(`${sourceLabel}: campo "block" em falta ou inválido`)
  }
  if (typeof raw.blockName !== 'string' || !raw.blockName.trim()) {
    errors.push(`${sourceLabel}: campo "blockName" em falta ou inválido`)
  }
  if (typeof raw.type !== 'string' || !raw.type.trim()) {
    errors.push(`${sourceLabel}: campo "type" em falta ou inválido`)
  }
  if (typeof raw.name !== 'string' || raw.name.includes('_')) {
    errors.push(`${sourceLabel}: campo "name" inválido`)
  }
  if (!isRecord(raw.source) || raw.source.kind !== 'block') {
    errors.push(`${sourceLabel}: source.kind deve ser "block"`)
  } else if (typeof raw.source.nodeId !== 'string' || !raw.source.nodeId.trim()) {
    errors.push(`${sourceLabel}: source.nodeId em falta`)
  }
  if (typeof raw.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(raw.color)) {
    errors.push(`${sourceLabel}: campo "color" deve ser hex (#RRGGBB)`)
  }
  if (!Array.isArray(raw.headerSlots) || !raw.headerSlots.every((slot) => typeof slot === 'string')) {
    errors.push(`${sourceLabel}: headerSlots deve ser array de strings`)
  }
  if (
    !Array.isArray(raw.parameters) ||
    !raw.parameters.every((entry) => typeof entry === 'string')
  ) {
    errors.push(`${sourceLabel}: parameters deve ser array de strings`)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: raw as unknown as BlockDefinitionJsonDocument,
  }
}

const registry = new Map<string, BlockDefinitionJsonDocument>()

for (const [path, mod] of Object.entries(modules)) {
  const validated = validateBlockDefinitionDocument(mod.default, path)
  if (!validated.ok) {
    console.warn('[blockDefinitionRegistry]', validated.errors.join('; '))
    continue
  }
  registry.set(validated.value.id, validated.value)
}

export const blockDefinitionRegistry: ReadonlyMap<string, BlockDefinitionJsonDocument> = registry

export function blockDefinitionById(id: string): BlockDefinitionJsonDocument | undefined {
  return registry.get(id)
}

export function blockDefinitionByBlockName(blockName: string): BlockDefinitionJsonDocument | undefined {
  const target = blockName.trim()
  if (!target) {
    return undefined
  }
  for (const definition of registry.values()) {
    if (definition.blockName === target || definition.name === target) {
      return definition
    }
  }
  return undefined
}

export function sortBlockDefinitions(
  definitions: readonly BlockDefinitionJsonDocument[],
): BlockDefinitionJsonDocument[] {
  return [...definitions].sort((a, b) => {
    const titleCompare = a.name.localeCompare(b.name)
    if (titleCompare !== 0) {
      return titleCompare
    }
    return a.blockName.localeCompare(b.blockName)
  })
}

export function blockDefinitionsList(): BlockDefinitionJsonDocument[] {
  return sortBlockDefinitions([...registry.values()])
}

/** Regista bloco após gravação em disco (o glob eager não recarrega sozinho). */
export function registerBlockDefinitionInCatalog(doc: BlockDefinitionJsonDocument): void {
  registry.set(doc.id, doc)
}

export function unregisterBlockDefinitionInCatalog(id: string): void {
  registry.delete(id.trim())
}

export function matchesBlockDefinitionQuery(definition: BlockDefinitionJsonDocument, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }

  const haystack = [
    definition.id,
    definition.name,
    definition.blockName,
    definition.block,
    definition.type,
    ...definition.parameters,
    ...definition.headerSlots,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}
