import type { BlockTypeDefinition } from './blockSchema'

const modules = import.meta.glob<{ default: unknown }>(
  [
    '../blockStructures/**/*.json',
    '!../blockStructures/parameters/**',
    '!../blockStructures/blocks/**',
  ],
  { eager: true },
)

export type BlockTypeValidationResult =
  | { ok: true; value: BlockTypeDefinition }
  | { ok: false; errors: string[] }

export function validateBlockTypeDefinition(raw: unknown, sourceLabel = 'blockStructures JSON'): BlockTypeValidationResult {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [`${sourceLabel}: esperado objecto JSON`] }
  }

  const record = raw as Record<string, unknown>

  if (typeof record.id !== 'string' || !record.id.trim()) {
    errors.push(`${sourceLabel}: campo "id" em falta ou inválido`)
  }
  if (typeof record.title !== 'string' || !record.title.trim()) {
    errors.push(`${sourceLabel}: campo "title" em falta ou inválido`)
  }
  if (typeof record.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(record.color)) {
    errors.push(`${sourceLabel}: campo "color" deve ser hex (#RRGGBB)`)
  }
  if (!Array.isArray(record.headerSlots)) {
    errors.push(`${sourceLabel}: campo "headerSlots" deve ser array`)
  } else if (!record.headerSlots.every((slot) => typeof slot === 'string')) {
    errors.push(`${sourceLabel}: cada headerSlot deve ser string`)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      id: record.id as string,
      title: record.title as string,
      color: record.color as string,
      headerSlots: record.headerSlots as string[],
    },
  }
}

function isBlockTypeJson(value: unknown): value is BlockTypeDefinition {
  return validateBlockTypeDefinition(value).ok
}

export { isBlockTypeJson }

const registry = new Map<string, BlockTypeDefinition>()

for (const [path, mod] of Object.entries(modules)) {
  const normalizedPath = path.replace(/\\/g, '/')
  if (normalizedPath.includes('/parameters/') || normalizedPath.includes('/blocks/')) {
    continue
  }
  const raw = mod.default
  const validated = validateBlockTypeDefinition(raw, path)
  if (!validated.ok) {
    console.warn('[blockStructureRegistry]', validated.errors.join('; '))
    continue
  }
  registry.set(validated.value.id, validated.value)
}

export const blockTypeRegistry: ReadonlyMap<string, BlockTypeDefinition> = registry

export function blockTypeDefinitionById(id: string): BlockTypeDefinition | undefined {
  return registry.get(id)
}

export function blockTypeDefinitionsList(): BlockTypeDefinition[] {
  return [...registry.values()].sort((a, b) => a.title.localeCompare(b.title))
}

export function defaultBlockTypeForSchemaTitle(schemaTitle: string): BlockTypeDefinition | undefined {
  return registry.get(schemaTitle) ?? registry.get(schemaTitle.replace(/\s+/g, ''))
}
