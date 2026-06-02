import type { GroupTypeDefinition } from './groupSchema'

const modules = import.meta.glob<{ default: unknown }>('../groupStructures/**/*.json', { eager: true })

export type GroupTypeValidationResult =
  | { ok: true; value: GroupTypeDefinition }
  | { ok: false; errors: string[] }

export function validateGroupTypeDefinition(raw: unknown, sourceLabel = 'groupStructures JSON'): GroupTypeValidationResult {
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

  let icon: string | undefined
  if (record.icon !== undefined) {
    if (typeof record.icon !== 'string' || !record.icon.trim()) {
      errors.push(`${sourceLabel}: campo "icon" deve ser string não vazia`)
    } else {
      const trimmed = record.icon.trim()
      if (trimmed.toLowerCase() !== 'none') {
        icon = trimmed
      }
    }
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
      ...(icon ? { icon } : {}),
    },
  }
}

function isGroupTypeJson(value: unknown): value is GroupTypeDefinition {
  return validateGroupTypeDefinition(value).ok
}

export { isGroupTypeJson }

const registry = new Map<string, GroupTypeDefinition>()

for (const [path, mod] of Object.entries(modules)) {
  const raw = mod.default
  const validated = validateGroupTypeDefinition(raw, path)
  if (!validated.ok) {
    console.warn('[groupStructureRegistry]', validated.errors.join('; '))
    continue
  }
  registry.set(validated.value.id, validated.value)
}

export const groupTypeRegistry: ReadonlyMap<string, GroupTypeDefinition> = registry

export function groupTypeDefinitionById(id: string): GroupTypeDefinition | undefined {
  return registry.get(id)
}

export function groupTypeDefinitionsList(): GroupTypeDefinition[] {
  return [...registry.values()].sort((a, b) => a.title.localeCompare(b.title))
}

export function defaultGroupTypeForSchemaTitle(schemaTitle: string): GroupTypeDefinition | undefined {
  return registry.get(schemaTitle) ?? registry.get(schemaTitle.replace(/\s+/g, ''))
}

const FALLBACK_GROUP_TYPE: GroupTypeDefinition = {
  id: 'default',
  title: 'default',
  color: '#ffffff',
  headerSlots: [],
}

/** Tipo registado para o schema do nó, ou `default` quando não existe JSON correspondente. */
export function resolveGroupTypeForSchemaTitle(schemaTitle: string): GroupTypeDefinition {
  return defaultGroupTypeForSchemaTitle(schemaTitle) ?? registry.get('default') ?? FALLBACK_GROUP_TYPE
}
