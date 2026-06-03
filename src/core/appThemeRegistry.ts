import type { AppThemeDefinition } from './appThemeSchema'

const modules = import.meta.glob<{ default: unknown }>('../appThemes/**/*.json', { eager: true })

export type AppThemeValidationResult =
  | { ok: true; value: AppThemeDefinition }
  | { ok: false; errors: string[] }

export function validateAppThemeDefinition(raw: unknown, sourceLabel = 'appThemes JSON'): AppThemeValidationResult {
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
  if (record.description !== undefined && typeof record.description !== 'string') {
    errors.push(`${sourceLabel}: campo "description" deve ser string`)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      id: record.id as string,
      title: record.title as string,
      ...(typeof record.description === 'string' && record.description.trim()
        ? { description: record.description.trim() }
        : {}),
    },
  }
}

const registry = new Map<string, AppThemeDefinition>()

for (const [path, mod] of Object.entries(modules)) {
  const validated = validateAppThemeDefinition(mod.default, path)
  if (!validated.ok) {
    console.warn('[appThemeRegistry]', validated.errors.join('; '))
    continue
  }
  registry.set(validated.value.id, validated.value)
}

export const appThemeRegistry: ReadonlyMap<string, AppThemeDefinition> = registry

export const DEFAULT_APP_THEME_ID = 'default'

export function appThemeDefinitionById(id: string): AppThemeDefinition | undefined {
  return registry.get(id)
}

export function appThemeDefinitionsList(): AppThemeDefinition[] {
  return [...registry.values()].sort((a, b) => a.title.localeCompare(b.title))
}

export function resolveAppThemeId(preferredId?: string | null): string {
  if (preferredId && registry.has(preferredId)) {
    return preferredId
  }
  if (registry.has(DEFAULT_APP_THEME_ID)) {
    return DEFAULT_APP_THEME_ID
  }
  return registry.keys().next().value ?? DEFAULT_APP_THEME_ID
}
